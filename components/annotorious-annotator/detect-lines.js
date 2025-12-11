export function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function removeOutlierLines(lines, toleranceRatio = 1.5) {
  if (lines.length <= 2) return lines

  const spacings = lines.slice(1).map((l, i) => l[0] - lines[i][0])
  const avgSpacing = median(spacings)

  const validIndices = new Set()
  spacings.forEach((spacing, i) => {
    if (spacing >= 0.5 * avgSpacing && spacing <= toleranceRatio * avgSpacing) {
      validIndices.add(i)
      validIndices.add(i + 1)
    }
  })

  return lines.filter((_, i) => validIndices.has(i))
}

export function detectColumns(binary, minColumnWidth = 50, spaceThreshold = 0.1) {
  const verticalProj = new cv.Mat()
  cv.reduce(binary, verticalProj, 0, cv.REDUCE_SUM, cv.CV_32S)
  const maxVal = Math.max(...verticalProj.data32S)
  const threshold = maxVal * spaceThreshold

  let columns = []
  let inCol = false
  let start = 0

  for (let i = 0; i < verticalProj.cols; i++) {
    const isSpace = verticalProj.intAt(0, i) < threshold
    if (!isSpace && !inCol) {
      start = i
      inCol = true
    } else if (isSpace && inCol) {
      const end = i
      if (end - start >= minColumnWidth) columns.push([start, end])
      inCol = false
    }
  }

  if (inCol) {
    const end = verticalProj.cols
    if (end - start >= minColumnWidth) columns.push([start, end])
  }

  if (columns.length > 1) {
    const merged = []
    let [curStart, curEnd] = columns[0]
    for (const [s, e] of columns.slice(1)) {
      if (s - curEnd < 3) curEnd = e
      else {
        merged.push([curStart, curEnd])
        [curStart, curEnd] = [s, e]
      }
    }
    merged.push([curStart, curEnd])
    columns = merged
  }

  const totalWidth = columns.reduce((sum, [s, e]) => sum + (e - s), 0)
  if (columns.length === 0 || totalWidth > 0.85 * binary.cols) {
    columns = [[0, binary.cols]]
  }

  verticalProj.delete()
  return columns
}

export function detectLinesInColumn(binary, colRange, minSpaceHeight = 5, minWhitePixels = 5) {
  const [xStart, xEnd] = colRange
  const colCrop = binary.roi(new cv.Rect(xStart, 0, xEnd - xStart, binary.rows))

  const horizontalProj = new cv.Mat()
  cv.reduce(colCrop, horizontalProj, 1, cv.REDUCE_SUM, cv.CV_32S)
  const maxVal = Math.max(...horizontalProj.data32S)
  const threshold = 0.15 * maxVal

  const lines = []
  let inLine = false
  let startY = 0

  for (let y = 0; y < horizontalProj.rows; y++) {
    const isSpace = horizontalProj.intAt(y, 0) < threshold
    if (!isSpace && !inLine) {
      startY = y
      inLine = true
    } else if (isSpace && inLine) {
      const endY = y
      const whitePixels = cv.countNonZero(colCrop.rowRange(startY, endY))
      if (endY - startY > minSpaceHeight && whitePixels >= minWhitePixels) lines.push([startY, endY])
      inLine = false
    }
  }

  if (inLine) {
    const endY = colCrop.rows
    const whitePixels = cv.countNonZero(colCrop.rowRange(startY, endY))
    if (endY - startY > minSpaceHeight && whitePixels >= minWhitePixels) lines.push([startY, endY])
  }

  colCrop.delete()
  horizontalProj.delete()

  return removeOutlierLines(lines)
}

export async function loadImageToMat(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`)
  const blob = await response.blob()

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const img = new Image()
  img.src = dataUrl
  await img.decode()

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const mat = cv.matFromImageData(imgData)
  return mat
}

export async function detectTextLinesCombined(url, expandY = true) {
  const image = await loadImageToMat(url)

  const gray = new cv.Mat()
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY, 0)
  cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0)

  const binary = new cv.Mat()
  cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 55, 35)

  const h = binary.rows
  const w = binary.cols

  binary.rowRange(0, Math.floor(0.05 * h)).setTo(new cv.Scalar(0))
  binary.rowRange(Math.floor(0.95 * h), h).setTo(new cv.Scalar(0))

  const columns = detectColumns(binary)
  const boxes = []

  for (const [xStart, xEnd] of columns) {
    const lines = detectLinesInColumn(binary, [xStart, xEnd])
    const lineBoxes = []

    for (let i = 0; i < lines.length; i++) {
      const [start, end] = lines[i]
      const lineImg = binary.roi(new cv.Rect(xStart, start, xEnd - xStart, end - start))

      const kernel = cv.Mat.ones(1, 3, cv.CV_8U)
      const lineImgClosed = new cv.Mat()
      cv.morphologyEx(lineImg, lineImgClosed, cv.MORPH_CLOSE, kernel)

      const colSum = new cv.Mat()
      cv.reduce(lineImgClosed, colSum, 0, cv.REDUCE_SUM, cv.CV_32S)
      const maxColSum = Math.max(...colSum.data32S)
      const sigCols = []
      // Threshold ratio for considering a column "significant" in the line region.
      // Columns with a sum greater than this ratio times the maximum column sum are included.
      // Lowering this value makes the detection more sensitive (more columns included), raising it makes it stricter.
      // This value was empirically chosen; adjust as needed for your images.
      const SIGNIFICANT_COL_THRESHOLD_RATIO = 0.05
      colSum.data32S.forEach((v, idx) => {
        if (v > SIGNIFICANT_COL_THRESHOLD_RATIO * maxColSum) sigCols.push(idx)
      })

      if (sigCols.length === 0) continue

      let x1 = xStart + sigCols[0]
      let x2 = xStart + sigCols[sigCols.length - 1]
      const pad = 2
      x1 = Math.max(0, x1 - pad)
      x2 = Math.min(w - 1, x2 + pad)

      let y1, y2
      if (expandY) {
        const nextStart = i + 1 < lines.length ? lines[i + 1][0] : end
        const mid = Math.floor((nextStart - end) / 2)
        y1 = Math.max(0, start - mid)
        y2 = Math.min(h, end + mid)
      } else {
        y1 = start
        y2 = end
      }

      if (i === lines.length - 1 && lines.length > 1) {
        const prevEnd = lines[i - 1][1]
        const mid = Math.floor((start - prevEnd) / 2)
        y1 = Math.max(0, start - mid)
        y2 = Math.min(h, end + mid)
      }

      lineBoxes.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })

      lineImg.delete()
      lineImgClosed.delete()
      colSum.delete()
      kernel.delete()
    }

    if (lineBoxes.length > 0) {
      const minX = Math.min(...lineBoxes.map(b => b.x))
      const maxX = Math.max(...lineBoxes.map(b => b.x + b.w))
      lineBoxes.forEach(b => {
        b.x = minX
        b.w = maxX - minX
      })
      boxes.push(...lineBoxes)
    }
  }

  image.delete()
  gray.delete()
  binary.delete()

  return boxes
}
