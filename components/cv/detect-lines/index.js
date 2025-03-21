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

export async function detectHandwritingLines(imageUrl) {
    try {
        // Use CORS proxy for the image
        const proxiedUrl = getProxiedUrl(imageUrl)
        
        const image = new Image()
        image.crossOrigin = "anonymous"
        
        // Set up image loading promise before setting src
        const imageLoadPromise = new Promise(resolve => {
            image.onload = resolve
            image.onerror = err => {
                console.error("Image failed to load:", err)
                resolve() // Resolve anyway to prevent hanging
            }
        })
        
        // Set src after event handlers are in place
        image.src = proxiedUrl
        
        // Wait for image to load
        await imageLoadPromise

        // Check if image loaded successfully
        if (!image.complete || image.naturalWidth === 0) {
            console.error("Image failed to load completely")
            return []
        }

        // Resize large images to reduce memory usage
        const resizedImage = resizeImageIfNeeded(image, 5012)

        // Use custom line detection instead of COCO-SSD
        const handwritingLines = await detectLines(resizedImage)
        
        // Scale coordinates back to original image if resized
        if (resizedImage !== image) {
            const scaleX = image.width / resizedImage.width
            const scaleY = image.height / resizedImage.height
            
            return handwritingLines.map(line => ({
                x: line.x * scaleX,
                y: line.y * scaleY,
                width: line.width * scaleX,
                height: line.height * scaleY
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
        // Convert coordinates to percentages for responsive scaling
        const percentageBoxes = handwritingLines.map(line => {
            // We'll convert all coordinates to percentages of the original image dimensions
            return {
                xPercent: (line.x / line.width) * 100,
                yPercent: (line.y / line.height) * 100,
                widthPercent: 100, // Full width
                heightPercent: (line.height / line.height) * 100
            }
        })
        
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
            </style>
            <div class="container">
                <img src="${imageUrl}" alt="Handwriting Image" crossorigin="anonymous">
                ${handwritingLines.map(line => `
                    <div class="bounding-box" style="
                        left: 0%
                        top: ${(line.y / line.height) * 100}%
                        width: 100%
                        height: ${(line.height / line.height) * 100}%
                    "></div>
                `).join('')}
            </div>
        `
    
        // Get the image element to fix calculation issues
        const img = this.shadowRoot.querySelector('img')
        
        // Properly adjust boxes after image loads
        img.onload = () => {
            const container = this.shadowRoot.querySelector('.container')
            const boxes = this.shadowRoot.querySelectorAll('.bounding-box')
            
            // Wait for image dimensions to be available
            if (!img.naturalHeight) return
            
            // Update each box position based on the actual image dimensions
            boxes.forEach((box, i) => {
                const line = handwritingLines[i]
                
                // Calculate percentages based on actual image dimensions
                const yPercent = (line.y / img.naturalHeight) * 100
                const heightPercent = (line.height / img.naturalHeight) * 100
                
                // Apply percentage-based positioning
                box.style.left = '0%'
                box.style.top = `${yPercent}%` 
                box.style.width = '100%'
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
