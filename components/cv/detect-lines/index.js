// import * as tf from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js'
// import * as cocoSsd from 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js'

// CORS proxy function to help with cross-origin image loading
function getProxiedUrl(url) {
    return `http://localhost:3009/proxy/${url}`
}

// Function to resize large images before processing
function resizeImageIfNeeded(image, maxDimension = 102400) {
    // If image is small enough, use it directly
    if (image.width <= maxDimension && image.height <= maxDimension) {
        return image
    }
    
    // Calculate new dimensions maintaining aspect ratio
    let newWidth, newHeight
    if (image.width > image.height) {
        newWidth = maxDimension
        newHeight = Math.floor(image.height * (maxDimension / image.width))
    } else {
        newHeight = maxDimension
        newWidth = Math.floor(image.width * (maxDimension / image.height))
    }
    
    // Create canvas for resized image
    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    
    // Draw resized image to canvas
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, newWidth, newHeight)
    
    console.log(`Resized image from ${image.width}x${image.height} to ${newWidth}x${newHeight}`)
    return canvas
}

// Function to detect peaks and valleys in the projection profile
function analyzeProjection(smoothedProjection, height, width) {
    // Calculate mean and standard deviation
    const mean = smoothedProjection.reduce((sum, val) => sum + val, 0) / height
    const variance = smoothedProjection.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / height
    const stdDev = Math.sqrt(variance)
    
    // Adaptive threshold based on statistics of the projection
    // More sensitive for documents with less contrast between lines
    const threshold = mean + (stdDev * 0.5)
    
    // Find derivative (rate of change) to detect transitions better
    const derivatives = []
    for (let i = 1; i < height; i++) {
        derivatives.push(smoothedProjection[i] - smoothedProjection[i-1])
    }
    
    // Smooth derivatives
    const smoothedDerivatives = []
    const derivSmoothWindow = 3
    
    for (let i = 0; i < derivatives.length; i++) {
        let sum = 0
        let count = 0
        
        for (let j = Math.max(0, i - derivSmoothWindow); j < Math.min(derivatives.length, i + derivSmoothWindow + 1); j++) {
            sum += derivatives[j]
            count++
        }
        
        smoothedDerivatives[i] = sum / count
    }
    
    // Detect lines using both projection values and derivatives
    const lines = []
    let inLine = false
    let startY = 0
    let lineMax = 0
    
    // First identify candidate line regions using projection values
    for (let y = 0; y < height; y++) {
        // Start of line: projection above threshold or strong positive derivative
        if (!inLine && 
            (smoothedProjection[y] > threshold || 
             (y > 0 && smoothedDerivatives[y-1] > stdDev * 0.3))) {
            inLine = true
            startY = y
            lineMax = smoothedProjection[y]
        } 
        // End of line: projection below threshold or strong negative derivative
        else if (inLine && 
                (smoothedProjection[y] < threshold * 0.8 || 
                 (y > 0 && smoothedDerivatives[y-1] < -stdDev * 0.3))) {
            inLine = false
            
            // Ensure minimum line height (avoid noise)
            const lineHeight = y - startY
            if (lineHeight > 5 && lineMax > threshold * 1.2) {
                lines.push({
                    x: 0,
                    y: startY,
                    width: width,
                    height: lineHeight
                })
            }
        }
        
        // Update maximum value for current line
        if (inLine) {
            lineMax = Math.max(lineMax, smoothedProjection[y])
        }
    }
    
    // Handle case where the last line extends to the bottom
    if (inLine) {
        const lineHeight = height - startY
        if (lineHeight > 5 && lineMax > threshold * 1.2) {
            lines.push({
                x: 0,
                y: startY,
                width: width,
                height: lineHeight
            })
        }
    }
    
    // If we detected no lines or just one large line, try with a more aggressive approach
    if (lines.length <= 1) {
        return findLinesWithLocalMaxima(smoothedProjection, height, width)
    }
    
    return lines
}

// Alternative approach using local maxima to find text lines
function findLinesWithLocalMaxima(smoothedProjection, height, width) {
    // Find local maxima (peaks) in the projection
    const peaks = []
    const minPeakDistance = Math.round(height * 0.02) // Minimum distance between peaks
    
    for (let i = 1; i < height - 1; i++) {
        if (smoothedProjection[i] > smoothedProjection[i-1] && 
            smoothedProjection[i] > smoothedProjection[i+1]) {
            // Found local maximum
            peaks.push({
                y: i,
                value: smoothedProjection[i]
            })
        }
    }
    
    // Sort peaks by value (highest first)
    peaks.sort((a, b) => b.value - a.value)
    
    // Filter peaks to keep only significant ones
    const significantPeaks = []
    const usedPositions = new Set()
    
    for (const peak of peaks) {
        // Check if this peak is far enough from already selected peaks
        let isFarEnough = true
        for (const y of usedPositions) {
            if (Math.abs(peak.y - y) < minPeakDistance) {
                isFarEnough = false
                break
            }
        }
        
        if (isFarEnough) {
            significantPeaks.push(peak)
            usedPositions.add(peak.y)
        }
    }
    
    // Sort peaks by position (top to bottom)
    significantPeaks.sort((a, b) => a.y - b.y)
    
    // Convert peaks to line boundaries
    const lines = []
    for (let i = 0; i < significantPeaks.length; i++) {
        const current = significantPeaks[i]
        
        // Calculate line boundaries
        let startY = i === 0 ? 0 : Math.floor((significantPeaks[i-1].y + current.y) / 2)
        let endY = i === significantPeaks.length - 1 ? 
                  height : 
                  Math.floor((current.y + significantPeaks[i+1].y) / 2)
        
        // Ensure minimum line height
        if (endY - startY > 5) {
            lines.push({
                x: 0,
                y: startY,
                width: width,
                height: endY - startY
            })
        }
    }
    
    return lines
}

// Function to detect horizontal lines in an image using image processing techniques
async function detectLines(imageElement) {
    // Get image data from the element
    const canvas = document.createElement('canvas')
    const width = imageElement.width ?? imageElement.naturalWidth
    const height = imageElement.height ?? imageElement.naturalHeight
    
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageElement, 0, 0, width, height)
    
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Convert to grayscale and calculate horizontal projection profile
    const projection = new Array(height).fill(0)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            // Grayscale conversion
            const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
            // For handwriting, dark pixels are text (invert value)
            projection[y] += (255 - gray) > 30 ? 1 : 0
        }
    }
    
    // Smooth the projection profile
    const smoothedProjection = []
    const smoothingWindow = 3
    
    for (let i = 0; i < height; i++) {
        let sum = 0
        let count = 0
        
        for (let j = Math.max(0, i - smoothingWindow); j < Math.min(height, i + smoothingWindow + 1); j++) {
            sum += projection[j]
            count++
        }
        
        smoothedProjection[i] = sum / count
    }
    
    // Use the enhanced analysis to find lines
    return analyzeProjection(smoothedProjection, height, width)
}

// Function to detect horizontal lines using blockwise pixel busyness analysis
async function detectLinesWithBusyness(imageElement) {
    // Get image dimensions
    const width = imageElement.width ?? imageElement.naturalWidth
    const height = imageElement.height ?? imageElement.naturalHeight
    
    // Create canvas for processing
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageElement, 0, 0, width, height)
    
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Initialize busyness profile for each row
    const busynessProfile = new Array(height).fill(0)
    
    // Block size for analysis (adjust for different text sizes)
    const blockSize = Math.max(3, Math.floor(height / 200))
    
    // Calculate busyness using blockwise comparison
    for (let y = blockSize; y < height - blockSize; y++) {
        for (let x = blockSize; x < width - blockSize; x += blockSize) {
            const currentIdx = (y * width + x) * 4
            const leftIdx = (y * width + (x - blockSize)) * 4
            
            // Compare blocks horizontally for all three color channels
            const rDiff = Math.abs(data[currentIdx] - data[leftIdx])
            const gDiff = Math.abs(data[currentIdx+1] - data[leftIdx+1])
            const bDiff = Math.abs(data[currentIdx+2] - data[leftIdx+2])
            
            const totalDiff = rDiff + gDiff + bDiff
            
            // Only count significant changes to reduce noise
            if (totalDiff < 30) continue
            
            // Add to busyness profile with higher weight for rows with more variation
            busynessProfile[y] += totalDiff / 3
            
            // Add contribution to nearby rows (to create a smoother profile)
            for (let offset = 1; offset <= blockSize/2; offset++) {
                if (y - offset >= 0) {
                    busynessProfile[y - offset] += (totalDiff / 3) * (1 - offset/(blockSize/2))
                }
                if (y + offset < height) {
                    busynessProfile[y + offset] += (totalDiff / 3) * (1 - offset/(blockSize/2))
                }
            }
        }
        
        // Normalize by width to avoid bias for wider images
        busynessProfile[y] = busynessProfile[y] / width
    }
    
    // Smooth the busyness profile
    const smoothedBusyness = []
    const smoothingWindow = Math.max(5, Math.floor(height / 150))
    
    for (let i = 0; i < height; i++) {
        let sum = 0
        let count = 0
        
        for (let j = Math.max(0, i - smoothingWindow); j < Math.min(height, i + smoothingWindow + 1); j++) {
            sum += busynessProfile[j]
            count++
        }
        
        smoothedBusyness[i] = sum / count
    }
    
    return analyzeBusynessProfile(smoothedBusyness, height, width)
}

// Improved function to detect lines from busyness profile
function analyzeBusynessProfile(busynessProfile, height, width) {
    // Calculate statistics of the busyness profile
    const mean = busynessProfile.reduce((sum, val) => sum + val, 0) / height
    const variance = busynessProfile.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / height
    const stdDev = Math.sqrt(variance)
    
    // Adaptive threshold for busyness
    const threshold = mean + (stdDev * 0.75)
    
    // Find lines by looking for regions of high busyness
    const lines = []
    let inLine = false
    let startY = 0
    let peakBusyness = 0
    
    for (let y = 0; y < height; y++) {
        // Start of line: busyness above threshold
        if (!inLine && busynessProfile[y] > threshold) {
            inLine = true
            startY = y
            peakBusyness = busynessProfile[y]
            continue
        }
        
        // End of line: busyness below threshold
        if (inLine && busynessProfile[y] < threshold * 0.6) {
            inLine = false
            
            const lineHeight = y - startY
            // Ensure minimum line height and significant busyness
            if (lineHeight <= 4 || peakBusyness <= threshold * 1.1) continue
            
            lines.push({
                x: 0,
                y: startY,
                width,
                height: lineHeight
            })
            continue
        }
        
        // Track maximum busyness in current line
        if (inLine) {
            peakBusyness = Math.max(peakBusyness, busynessProfile[y])
        }
    }
    
    // Handle case where the last line extends to the bottom
    if (inLine) {
        const lineHeight = height - startY
        if (lineHeight > 4 && peakBusyness > threshold * 1.1) {
            lines.push({
                x: 0,
                y: startY,
                width,
                height: lineHeight
            })
        }
    }
    
    // If detection failed, fall back to a more lenient approach
    if (lines.length === 0) {
        return findLinesWithLocalMaxima(busynessProfile, height, width)
    }
    
    return lines
}

// Function to detect text regions with performance optimizations
async function detectTextRegions(imageElement) {
    const width = imageElement.width ?? imageElement.naturalWidth
    const height = imageElement.height ?? imageElement.naturalHeight
    
    // Create canvas for processing
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    ctx.drawImage(imageElement, 0, 0, width, height)
    
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // Downsample for faster processing
    const downsampleFactor = Math.max(1, Math.floor(Math.max(width, height) / 1000))
    const dsWidth = Math.floor(width / downsampleFactor)
    const dsHeight = Math.floor(height / downsampleFactor)
    
    // Create a binary image at reduced resolution
    const binaryImage = new Array(dsHeight).fill().map(() => new Array(dsWidth).fill(0))
    
    // Adaptive threshold based on image statistics
    let sum = 0
    let count = 0
    
    // Sample pixels to determine threshold
    for (let y = 0; y < height; y += downsampleFactor * 2) {
        for (let x = 0; x < width; x += downsampleFactor * 2) {
            const idx = (y * width + x) * 4
            const intensity = (data[idx] + data[idx+1] + data[idx+2]) / 3
            sum += intensity
            count++
        }
    }
    
    const avgIntensity = sum / count
    const threshold = Math.min(40, avgIntensity * 0.5)
    
    // Convert to binary image with downsampling
    for (let y = 0; y < dsHeight; y++) {
        for (let x = 0; x < dsWidth; x++) {
            const origX = x * downsampleFactor
            const origY = y * downsampleFactor
            const idx = (origY * width + origX) * 4
            
            const intensity = (data[idx] + data[idx+1] + data[idx+2]) / 3
            binaryImage[y][x] = intensity < (255 - threshold) ? 1 : 0
        }
    }
    
    // Apply morphological operations to connect nearby text
    const dilatedImage = dilate(binaryImage, 2, dsWidth, dsHeight)
    const erodedImage = erode(dilatedImage, 1, dsWidth, dsHeight)
    
    // Find connected components (text regions)
    const regions = findConnectedComponents(erodedImage, dsWidth, dsHeight)
    
    // Scale regions back to original image size
    return regions.map(region => ({
        x: region.x * downsampleFactor,
        y: region.y * downsampleFactor,
        width: region.width * downsampleFactor,
        height: region.height * downsampleFactor,
        density: region.density
    }))
}

// Dilation operation to connect nearby text components
function dilate(image, kernelSize, width, height) {
    const result = new Array(height).fill().map(() => new Array(width).fill(0))
    const halfKernel = Math.floor(kernelSize / 2)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Check neighborhood
            let hasTextNeighbor = false
            
            for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                    const ny = y + ky
                    const nx = x + kx
                    
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue
                    
                    if (image[ny][nx] === 1) {
                        hasTextNeighbor = true
                        break
                    }
                }
                if (hasTextNeighbor) break
            }
            
            result[y][x] = hasTextNeighbor ? 1 : 0
        }
    }
    
    return result
}

// Erosion operation to remove noise
function erode(image, kernelSize, width, height) {
    const result = new Array(height).fill().map(() => new Array(width).fill(0))
    const halfKernel = Math.floor(kernelSize / 2)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Check if all pixels in neighborhood are 1
            let allNeighborsAreText = true
            
            for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                    const ny = y + ky
                    const nx = x + kx
                    
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue
                    
                    if (image[ny][nx] === 0) {
                        allNeighborsAreText = false
                        break
                    }
                }
                if (!allNeighborsAreText) break
            }
            
            result[y][x] = allNeighborsAreText ? 1 : 0
        }
    }
    
    return result
}

// Find connected components with optimized two-pass algorithm
function findConnectedComponents(binaryImage, width, height) {
    // Maximum number of labels to process (protection against excessive memory usage)
    const MAX_LABELS = 1000
    
    // Fast union-find data structure
    const labels = new Array(MAX_LABELS).fill(0)
    for (let i = 0; i < MAX_LABELS; i++) {
        labels[i] = i
    }
    
    function find(x) {
        if (labels[x] !== x) {
            labels[x] = find(labels[x])
        }
        return labels[x]
    }
    
    function union(x, y) {
        labels[find(x)] = find(y)
    }
    
    // First pass: assign temporary labels
    const labelImg = new Array(height).fill().map(() => new Array(width).fill(0))
    let nextLabel = 1
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (binaryImage[y][x] !== 1) continue
            
            // Check neighbors
            const neighbors = []
            
            if (y > 0 && labelImg[y-1][x] > 0) neighbors.push(labelImg[y-1][x])
            if (x > 0 && labelImg[y][x-1] > 0) neighbors.push(labelImg[y][x-1])
            
            if (neighbors.length === 0) {
                // Prevent exceeding label limit
                if (nextLabel >= MAX_LABELS) {
                    labelImg[y][x] = find(1) // Use existing label
                } else {
                    labelImg[y][x] = nextLabel++
                }
            } else {
                // Use the first neighbor's label
                const firstLabel = neighbors[0]
                labelImg[y][x] = firstLabel
                
                // Union all neighbor labels
                for (let i = 1; i < neighbors.length; i++) {
                    union(firstLabel, neighbors[i])
                }
            }
        }
    }
    
    // Second pass: resolve label equivalences
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (labelImg[y][x] > 0) {
                labelImg[y][x] = find(labelImg[y][x])
            }
        }
    }
    
    // Count pixels for each label
    const counts = {}
    const minX = {}, minY = {}, maxX = {}, maxY = {}
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const label = labelImg[y][x]
            if (label === 0) continue
            
            if (!counts[label]) {
                counts[label] = 0
                minX[label] = width
                minY[label] = height
                maxX[label] = 0
                maxY[label] = 0
            }
            
            counts[label]++
            minX[label] = Math.min(minX[label], x)
            minY[label] = Math.min(minY[label], y)
            maxX[label] = Math.max(maxX[label], x)
            maxY[label] = Math.max(maxY[label], y)
        }
    }
    
    // Extract regions (limit to 50 largest regions)
    const regions = []
    
    // Put all labels in an array and sort by area
    const labelArray = Object.keys(counts).map(label => ({
        label: parseInt(label),
        count: counts[label]
    }))
    
    labelArray.sort((a, b) => b.count - a.count)
    
    // Take only the most significant components (limit to 50)
    const significantLabels = labelArray.slice(0, 50)
    
    for (const item of significantLabels) {
        const label = item.label
        const width = maxX[label] - minX[label] + 1
        const height = maxY[label] - minY[label] + 1
        
        // Ignore very small regions
        if (width < 10 || height < 10) continue
        
        // Calculate density
        const area = width * height
        const density = counts[label] / area
        
        // Only keep dense enough regions
        if (density < 0.08) continue
        
        regions.push({
            x: minX[label],
            y: minY[label],
            width,
            height,
            density
        })
    }
    
    return regions
}

// Detect if the document has multiple columns
function detectColumns(regions, width, height) {
    // If too few regions, no columns
    if (regions.length <= 2) return regions
    
    // Create a lower resolution horizontal projection
    const projectionRes = Math.max(1, Math.floor(width / 200))
    const projWidth = Math.ceil(width / projectionRes)
    const horizontalProjection = new Array(projWidth).fill(0)
    
    // Add each region's contribution to the projection
    for (const region of regions) {
        const startX = Math.floor(region.x / projectionRes)
        const endX = Math.ceil((region.x + region.width) / projectionRes)
        
        for (let x = startX; x < endX && x < projWidth; x++) {
            horizontalProjection[x] += region.height
        }
    }
    
    // Smooth the projection
    const smoothedProjection = []
    const smoothingWindow = Math.max(2, Math.floor(projWidth / 30))
    
    for (let i = 0; i < projWidth; i++) {
        let sum = 0
        let count = 0
        
        for (let j = Math.max(0, i - smoothingWindow); j < Math.min(projWidth, i + smoothingWindow + 1); j++) {
            sum += horizontalProjection[j]
            count++
        }
        
        smoothedProjection[i] = sum / count
    }
    
    // Calculate mean for valley detection
    let sum = 0
    for (let x = 0; x < projWidth; x++) {
        sum += smoothedProjection[x]
    }
    const mean = sum / projWidth
    
    // Find significant valleys (column separators)
    const valleys = []
    let inValley = false
    let valleyStart = 0
    let minValleyValue = Infinity
    
    for (let x = 0; x < projWidth; x++) {
        if (!inValley && smoothedProjection[x] < mean * 0.4) {
            inValley = true
            valleyStart = x
            minValleyValue = smoothedProjection[x]
        } else if (inValley) {
            if (smoothedProjection[x] < minValleyValue) {
                minValleyValue = smoothedProjection[x]
            }
            
            if (smoothedProjection[x] > mean * 0.4) {
                inValley = false
                
                // Valley must be wide enough to be a column separator
                if (x - valleyStart > projWidth * 0.03) {
                    valleys.push({
                        start: valleyStart * projectionRes,
                        end: (x - 1) * projectionRes,
                        center: Math.floor(((valleyStart + x - 1) / 2) * projectionRes)
                    })
                }
            }
        }
    }
    
    // If we found potential column separators
    if (valleys.length > 0 && valleys.length < 5) {
        return organizeRegionsByColumns(regions, valleys, width)
    }
    
    return regions
}

// Organize regions into columns with performance improvements
function organizeRegionsByColumns(regions, valleys, width) {
    // Define column boundaries
    const columnBoundaries = [0, ...valleys.map(v => v.center), width]
    const columnRegions = []
    
    // For each column
    for (let i = 0; i < columnBoundaries.length - 1; i++) {
        const colStart = columnBoundaries[i]
        const colEnd = columnBoundaries[i + 1]
        
        // Find regions that belong primarily to this column
        const regionsInColumn = regions.filter(region => {
            const regionCenter = region.x + region.width / 2
            return regionCenter >= colStart && regionCenter <= colEnd
        })
        
        // If column has regions, create a column region
        if (regionsInColumn.length === 0) continue
            
        // Find column boundaries efficiently
        let colMinX = width
        let colMaxX = 0
        let colMinY = height
        let colMaxY = 0
        
        for (const region of regionsInColumn) {
            colMinX = Math.min(colMinX, region.x)
            colMaxX = Math.max(colMaxX, region.x + region.width)
            colMinY = Math.min(colMinY, region.y)
            colMaxY = Math.max(colMaxY, region.y + region.height)
        }
        
        columnRegions.push({
            x: colMinX,
            y: colMinY,
            width: colMaxX - colMinX,
            height: colMaxY - colMinY,
            isColumn: true,
            subRegions: regionsInColumn
        })
    }
    
    return columnRegions.length > 0 ? columnRegions : regions
}

// Enhanced line detection function that respects text regions
async function detectHandwritingLinesInRegions(imageElement) {
    try {
        // First detect text regions
        const regions = await detectTextRegions(imageElement)
        
        // If no regions found, fall back to full-image detection
        if (regions.length === 0) {
            return await detectLinesWithBusyness(imageElement)
        }
        
        // For each region, detect lines (limit concurrent processing)
        const allLines = []
        
        for (const region of regions) {
            // Skip very small regions
            if (region.width < 50 || region.height < 50) continue
            
            // Create a canvas with just this region
            const regionCanvas = document.createElement('canvas')
            regionCanvas.width = region.width
            regionCanvas.height = region.height
            
            const ctx = regionCanvas.getContext('2d')
            ctx.drawImage(
                imageElement, 
                region.x, region.y, region.width, region.height,
                0, 0, region.width, region.height
            )
            
            // Detect lines in this region
            const regionLines = await detectLinesWithBusyness(regionCanvas)
            
            // Adjust line coordinates to be relative to the original image
            for (const line of regionLines) {
                allLines.push({
                    x: line.x + region.x,
                    y: line.y + region.y,
                    width: line.width,
                    height: line.height,
                    regionWidth: region.width
                })
            }
        }
        
        return allLines
    } catch (error) {
        console.error("Error in region-based line detection:", error)
        // Fall back to simpler method if something goes wrong
        return await detectLinesWithBusyness(imageElement)
    }
}

// Update the main detection function to use both methods
export async function detectHandwritingLines(imageUrl) {
    try {
        const proxiedUrl = getProxiedUrl(imageUrl)
        
        const image = new Image()
        image.crossOrigin = "anonymous"
        
        const imageLoadPromise = new Promise(resolve => {
            image.onload = resolve
            image.onerror = err => {
                console.error("Image failed to load:", err)
                resolve()
            }
        })
        
        image.src = proxiedUrl
        await imageLoadPromise

        if (!image.complete || image.naturalWidth === 0) {
            console.error("Image failed to load completely")
            return []
        }

        const resizedImage = resizeImageIfNeeded(image, 2048)

        // Use region-aware line detection
        const handwritingLines = await detectHandwritingLinesInRegions(resizedImage)
        
        // Scale coordinates if image was resized
        if (resizedImage !== image) {
            const scaleX = image.width / resizedImage.width
            const scaleY = image.height / resizedImage.height
            
            return handwritingLines.map(line => ({
                x: line.x * scaleX,
                y: line.y * scaleY,
                width: line.width * scaleX,
                height: line.height * scaleY,
                // If region width exists, scale it too
                regionWidth: line.regionWidth ? line.regionWidth * scaleX : image.width
            }))
        }

        return handwritingLines
    } catch (error) {
        console.error("Error detecting handwriting lines:", error)
        return []
    }
}

class HandwritingLineDetector extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({ mode: 'open' })
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    position: relative;
                    display: inline-block;
                }
                img {
                    display: block;
                    max-width: 100%;
                }
                .bounding-box {
                    position: absolute;
                    border: 2px solid red;
                    pointer-events: none;
                }
                .loading {
                    padding: 20px;
                    text-align: center;
                }
                .error {
                    padding: 20px;
                    color: red;
                    text-align: center;
                }
            </style>
            <div class="loading">Loading image...</div>
        `
    }

    static get observedAttributes() {
        return ['src', 'boxes']
    }

    async attributeChangedCallback(name, _, newValue) {
        if (name !== 'src') return
        await this.processImage(newValue)
    }

    async processImage(imageUrl) {
        try {
            // Show loading state
            this.shadowRoot.innerHTML = `
                <style>
                    .loading {
                        padding: 20px;
                        text-align: center;
                    }
                </style>
                <div class="loading">Processing image...<br>This may take a moment as the TensorFlow model loads.</div>
            `
            
            // Original image for display (no need for CORS proxy)
            const displayImage = `<img src="${imageUrl}" alt="Handwriting Image" crossorigin="anonymous">`
            
            const handwritingLines = await detectHandwritingLines(imageUrl)
            this.render(imageUrl, handwritingLines)
        } catch (error) {
            console.error("Error in processImage:", error)
            this.shadowRoot.innerHTML = `
                <style>
                    .error {
                        padding: 20px;
                        color: red;
                        text-align: center;
                    }
                </style>
                <div class="error">
                    Error processing image: ${error.message}<br>
                    This might be due to CORS restrictions.
                </div>
            `
        }
    }

    render(imageUrl, handwritingLines) {
        this.shadowRoot.innerHTML = `
            <style>
                .container {
                    position: relative;
                    display: inline-block;
                    max-width: 100%;
                }
                img {
                    display: block;
                    max-width: 100%;
                    width: 100%;
                    height: auto;
                }
                .bounding-box {
                    position: absolute;
                    border: 2px solid red;
                    pointer-events: none;
                    box-sizing: border-box;
                }
                .text-region {
                    position: absolute;
                    border: 1px dashed blue;
                    pointer-events: none;
                    opacity: 0.5;
                }
            </style>
            <div class="container">
                <img src="${imageUrl}" alt="Handwriting Image" crossorigin="anonymous">
                ${handwritingLines.map(line => `
                    <div class="bounding-box" style="
                        left: ${(line.x / line.regionWidth) * 100}%;
                        top: ${(line.y / line.height) * 100}%;
                        width: ${(line.width / line.regionWidth) * 100}%;
                        height: ${(line.height / line.height) * 100}%;
                    "></div>
                `).join('')}
            </div>
        `

        // Get the image element to fix calculation issues
        const img = this.shadowRoot.querySelector('img')
        
        // Properly adjust boxes after image loads
        img.onload = () => {
            const boxes = this.shadowRoot.querySelectorAll('.bounding-box')
            
            // Wait for image dimensions to be available
            if (!img.naturalHeight) return
            
            // Update each box position based on the actual image dimensions
            boxes.forEach((box, i) => {
                const line = handwritingLines[i]
                
                // Use region width if available, otherwise use full image width
                const regionWidth = line.regionWidth || img.naturalWidth
                
                // Calculate percentages based on actual image dimensions
                const xPercent = (line.x / img.naturalWidth) * 100
                const yPercent = (line.y / img.naturalHeight) * 100
                const widthPercent = (line.width / img.naturalWidth) * 100
                const heightPercent = (line.height / img.naturalHeight) * 100
                
                // Apply percentage-based positioning
                box.style.left = `${xPercent}%`
                box.style.top = `${yPercent}%` 
                box.style.width = `${widthPercent}%`
                box.style.height = `${heightPercent}%`
            })
        }
        
        // Handle case where image is already loaded from cache
        if (img.complete) {
            img.onload()
        }
    }
}

customElements.define('handwriting-line-detector', HandwritingLineDetector)
