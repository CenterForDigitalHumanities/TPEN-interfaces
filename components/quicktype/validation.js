/**
 * Shared validation utilities for quicktype shortcuts
 * Used by both the quicktype manager and editor dialog
 */

/**
 * Evaluates whether a shortcut entry is valid
 * @param {string} value - The shortcut to evaluate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
export function evaluateEntry(value) {
    const candidate = `${value ?? ''}`
    const trimmed = candidate.trim()

    if (trimmed.length === 0) {
        return { valid: false, reason: "Shortcut cannot be empty." }
    }

    const controlChars = /[\u0000-\u001F\u007F]/
    if (controlChars.test(candidate)) {
        return { valid: false, reason: "Contains unsupported control characters." }
    }

    const suspiciousSequences = [
        { pattern: /<\s*script/i, reason: "Script tags are not allowed." },
        { pattern: /(?:^|["'\s])javascript:/i, reason: "Avoid javascript: URLs inside shortcuts." },
        { pattern: /^(?:\s*)data:/i, reason: "Data URLs are not supported." },
        { pattern: /(?:^|[\s<"'])on[a-z]+\s*=/i, reason: "Event handler attributes are not allowed." }
    ]

    const violatedSequence = suspiciousSequences.find(entry => entry.pattern.test(candidate))
    if (violatedSequence) {
        return { valid: false, reason: violatedSequence.reason }
    }

    if (trimmed.startsWith('<')) {
        if (!trimmed.endsWith('>')) {
            return { valid: false, reason: "HTML shortcuts must end with a closing '>'." }
        }

        const selfClosingPattern = /^<([a-z][\w-]*)(\s[^<>]*)?\s*\/\s*>$/i
        const pairedPattern = /^<([a-z][\w-]*)(\s[^<>]*)?>([\s\S]*)<\/\1\s*>$/i
        const selfClosingMatch = trimmed.match(selfClosingPattern)
        const pairedMatch = trimmed.match(pairedPattern)

        if (!selfClosingMatch && !pairedMatch) {
            return { valid: false, reason: "HTML must include a full opening and closing tag or be self-closing." }
        }

        const tagName = (selfClosingMatch ? selfClosingMatch[1] : pairedMatch[1]).toLowerCase()
        const forbiddenTags = new Set(["html", "head", "body"])
        if (forbiddenTags.has(tagName)) {
            return { valid: false, reason: `<${tagName}> tags are not allowed in shortcuts.` }
        }
    }

    return { valid: true }
}
