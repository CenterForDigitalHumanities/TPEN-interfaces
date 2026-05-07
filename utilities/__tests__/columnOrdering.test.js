import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const { orderPageItemsByColumns } = await import('../columnOrdering.js')

describe('orderPageItemsByColumns', () => {
    const items = [
        { id: 'line-a' },
        { id: 'line-b' },
        { id: 'line-c' },
        { id: 'line-d' }
    ]

    it('returns items ordered by column definitions', () => {
        const projectPage = {
            columns: [
                { id: 'col-1', lines: ['line-c', 'line-a'] },
                { id: 'col-2', lines: ['line-b'] }
            ],
            items: [{ id: 'line-a' }, { id: 'line-b' }, { id: 'line-c' }]
        }
        const page = { items }
        const { orderedItems } = orderPageItemsByColumns(projectPage, page)
        assert.deepEqual(orderedItems.map(i => i.id), ['line-c', 'line-a', 'line-b'])
    })

    it('appends unordered lines at the end under an "unordered-lines" column', () => {
        const projectPage = {
            columns: [
                { id: 'col-1', lines: ['line-a'] }
            ],
            items: [{ id: 'line-a' }, { id: 'line-b' }, { id: 'line-c' }]
        }
        const page = { items }
        const { orderedItems, columnsInPage } = orderPageItemsByColumns(projectPage, page)
        const ids = orderedItems.map(i => i.id)
        assert.ok(ids.includes('line-a'))
        assert.ok(ids.includes('line-b'))
        assert.ok(ids.includes('line-c'))
        assert.ok(columnsInPage.some(c => c.id === 'unordered-lines'))
    })

    it('returns empty orderedItems when page has no items', () => {
        const projectPage = {
            columns: [{ id: 'col-1', lines: ['line-a'] }],
            items: [{ id: 'line-a' }]
        }
        const page = { items: [] }
        const { orderedItems } = orderPageItemsByColumns(projectPage, page)
        assert.deepEqual(orderedItems, [])
    })

    it('handles missing columns gracefully', () => {
        const projectPage = {
            items: [{ id: 'line-a' }, { id: 'line-b' }]
        }
        const page = { items }
        const { orderedItems, columnsInPage } = orderPageItemsByColumns(projectPage, page)
        assert.ok(columnsInPage.some(c => c.id === 'unordered-lines'))
        assert.ok(orderedItems.length > 0)
    })

    it('returns allColumnLines that matches orderedItems IDs', () => {
        const projectPage = {
            columns: [
                { id: 'col-1', lines: ['line-b', 'line-a'] }
            ],
            items: [{ id: 'line-a' }, { id: 'line-b' }]
        }
        const page = { items }
        const { orderedItems, allColumnLines } = orderPageItemsByColumns(projectPage, page)
        assert.deepEqual(orderedItems.map(i => i.id), allColumnLines.slice(0, orderedItems.length))
    })
})
