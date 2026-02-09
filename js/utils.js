import TPEN from "../api/TPEN.js"

export function stringFromDate(date) {
    if (!date) return ''
    if (date === -1) return 'Never'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffDays < 7) {
        if (diffDays === 0) {
            if (diffHours === 0) return 'Today'
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        }
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    }
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}

export function urlFromIdAndType(id, type, { projectId, pageId, layerId}) {
    if (!id || !type) return ''
    if (typeof id === 'string' && (id.startsWith('http://') || id.startsWith('https://'))) return id
    switch (type) {
        case 'annotationpage':
            if (!projectId) return ''
            return `${TPEN.servicesURL}/project/${projectId}/page/${id}`
        case 'annotation':
            if (!projectId || !pageId) return ''
            return `${TPEN.servicesURL}/project/${projectId}/page/${pageId}/line/${id}`
        case 'annotationcollection':
            if (!projectId) return ''
            return `${TPEN.servicesURL}/project/${projectId}/layer/${id}`
        case 'canvas':
        case 'manifest':
        case 'collection':
            // These should come from external IIIF manifests or be full URLs already
            // If they're hex strings without a URL, they're embedded and shouldn't be fetched
            // Return null to indicate no URL exists (semantically clearer than empty string)
            return null
        default:
            return `${TPEN.RERUMURL}/id/${id}`
    }
}

export function escapeHtml(value) {
    const safeValue = `${value ?? ''}`
    return safeValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
