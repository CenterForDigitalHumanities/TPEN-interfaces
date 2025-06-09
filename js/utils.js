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
