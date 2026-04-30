// test/helpers/fetch-mock.js
// Helper to create mock fetch responses
export function jsonResponse(data, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    headers: {
      get(name) {
        return name?.toLowerCase() === 'content-type' ? 'application/json' : null
      }
    },
    async json() {
      return data
    },
    async text() {
      return JSON.stringify(data)
    }
  }
}
