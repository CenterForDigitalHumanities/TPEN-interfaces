/**
 * Normalize a IIIF Image service block to a base service URL.
 * @param {object|string|null|undefined} service
 * @returns {string|null}
 */
function getIIIFServiceBase(service) {
  if (!service) return null

  if (typeof service === 'string') {
    return service.replace(/\/$/, '')
  }

  const id = service.id ?? service['@id']
  if (!id || typeof id !== 'string') return null

  return id.replace(/\/$/, '')
}

/**
 * Infer the IIIF Image API major version from a service block.
 * @param {object|string|null|undefined} service
 * @returns {2|3|null}
 */
function getIIIFImageApiMajorVersion(service) {
  if (!service || typeof service === 'string') return null

  const type = service.type ?? ''
  if (typeof type === 'string') {
    if (type.includes('ImageService3')) return 3
    if (type.includes('ImageService2')) return 2
  }

  const context = service['@context'] ?? service.context
  const contexts = Array.isArray(context) ? context : [context]
  for (const entry of contexts) {
    if (typeof entry !== 'string') continue
    if (entry.includes('/image/3/context.json')) return 3
    if (entry.includes('/image/2/context.json')) return 2
  }

  const profile = service.profile
  const profiles = Array.isArray(profile) ? profile : [profile]
  for (const entry of profiles) {
    if (typeof entry !== 'string') continue
    if (entry.includes('/image/3/')) return 3
    if (entry.includes('/image/2/')) return 2
  }

  return null
}

/**
 * Build URL candidates using an IIIF Image service.
 * @param {string|null} imageUrl
 * @param {object|string|null|undefined} service
 * @param {number} requestedWidth
 * @returns {string[]}
 */
function buildServiceCandidates(imageUrl, service, requestedWidth) {
  const serviceBase = getIIIFServiceBase(service)
  if (!serviceBase) return []

  const version = getIIIFImageApiMajorVersion(service)
  const fullSizeToken = version === 2 ? 'full' : 'max'
  const width = requestedWidth > 2000 ? fullSizeToken : Math.max(1, Math.floor(requestedWidth))
  const sizeSegment = typeof width === 'number' ? `${width},` : width
  const candidates = [
    `${serviceBase}/full/${sizeSegment}/0/default.jpg`,
    `${serviceBase}/full/${sizeSegment}/0/default.png`,
    `${serviceBase}/full/${sizeSegment}/0/native.jpg`
  ]

  // Some manifests point imageUrl directly to a service endpoint.
  if (imageUrl && imageUrl !== serviceBase) {
    candidates.unshift(imageUrl)
  }

  return candidates
}

/**
 * Build URL candidates by rewriting known IIIF path segments.
 * @param {string|null} imageUrl
 * @param {number} requestedWidth
 * @returns {string[]}
 */
function buildPathCandidates(imageUrl, requestedWidth) {
  if (!imageUrl) return []

  const width = Math.max(1, Math.floor(requestedWidth))
  const candidates = []
  const iiifPathRegex = /(\/full\/)([^/]+)(\/[^/]+\/[^/?#]+)/

  if (iiifPathRegex.test(imageUrl)) {
    candidates.push(imageUrl.replace(iiifPathRegex, `$1${width},$3`))
  }

  return candidates
}

/**
 * Build URL candidates by increasing common width/zoom query params.
 * @param {string|null} imageUrl
 * @param {number} requestedWidth
 * @returns {string[]}
 */
function buildQueryCandidates(imageUrl, requestedWidth) {
  if (!imageUrl) return []

  let parsed
  try {
    parsed = new URL(imageUrl, globalThis.location?.href)
  } catch {
    return []
  }

  const width = Math.max(1, Math.floor(requestedWidth))
  const widthParams = ['w', 'width', 'size']
  const zoomParams = ['zoom', 'scale', 'resolution']
  const out = []

  for (const key of widthParams) {
    if (!parsed.searchParams.has(key)) continue
    const next = new URL(parsed.toString())
    next.searchParams.set(key, String(width))
    out.push(next.toString())
  }

  for (const key of zoomParams) {
    if (!parsed.searchParams.has(key)) continue
    const current = Number(parsed.searchParams.get(key))
    if (!Number.isFinite(current)) continue
    const next = new URL(parsed.toString())
    next.searchParams.set(key, String(Math.max(current * 1.5, 2)))
    out.push(next.toString())
  }

  return out
}

/**
 * Return unique higher-resolution URL candidates in priority order.
 * @param {{
 *   imageUrl: string | null,
 *   imageService?: object | string | null,
 *   requestedWidth: number
 * }} options
 * @returns {string[]}
 */
export function getHigherResolutionImageCandidates(options) {
  const { imageUrl, imageService = null, requestedWidth } = options
  const candidates = [
    ...buildServiceCandidates(imageUrl, imageService, requestedWidth),
    ...buildPathCandidates(imageUrl, requestedWidth),
    ...buildQueryCandidates(imageUrl, requestedWidth)
  ]

  const seen = new Set()
  const deduped = []

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    deduped.push(candidate)
  }

  return deduped
}
