import api from './axios'

// Every dashboard/list page independently calls GET /projects on mount, and
// React StrictMode double-invokes effects in dev — so a single page visit
// was firing this ~540KB query twice, and hopping between pages re-fetched
// the whole project list from scratch every time even though nothing had
// changed. This cache dedupes those calls for a few seconds and is cleared
// automatically whenever a mutation touches /projects, so it never serves
// stale data after an edit.
const TTL_MS = 90000

let cache = new Map() // key -> { data, timestamp }
let inFlight = new Map() // key -> Promise

function keyFor(params) {
  return JSON.stringify(params || {})
}

export function fetchProjectsCached(params) {
  const key = keyFor(params)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < TTL_MS) {
    return Promise.resolve(cached.data)
  }

  const pending = inFlight.get(key)
  if (pending) {
    return pending
  }

  const request = api.get('/projects', { params }).then((response) => {
    cache.set(key, { data: response, timestamp: Date.now() })
    inFlight.delete(key)
    return response
  }, (error) => {
    inFlight.delete(key)
    throw error
  })

  inFlight.set(key, request)
  return request
}

export function invalidateProjectsCache() {
  cache.clear()
  inFlight.clear()
}
