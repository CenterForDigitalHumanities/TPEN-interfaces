/**
 * Utility functions for ordering page items by column membership.
 * @module columnOrdering
 */

/**
 * Orders page items by column membership, with unordered lines at the end.
 * @param {Object} projectPage - The page object from project.layers containing columns array
 * @param {Object} page - The resolved annotation page with items array
 * @returns {Object} Object containing { orderedItems, columnsInPage, allColumnLines }
 */
export function orderPageItemsByColumns(projectPage, page) {
    const columnsInPage = [...(projectPage?.columns || [])]
    let allColumnLines = columnsInPage.flatMap(c => c.lines || [])
    const remainingUnorderedLines = page.items?.map(i => i.id)
        .filter(id => !allColumnLines.includes(id)) || []

    if (remainingUnorderedLines.length > 0) {
        columnsInPage.push({
            id: "unordered-lines",
            label: "Unordered Lines",
            lines: remainingUnorderedLines
        })
    }

    allColumnLines = [...allColumnLines, ...remainingUnorderedLines]

    const orderedItems = []
    allColumnLines.forEach(lineId => {
        const line = page.items.find(item => item.id === lineId)
        if (line) orderedItems.push(line)
    })

    return { orderedItems, columnsInPage, allColumnLines }
}
