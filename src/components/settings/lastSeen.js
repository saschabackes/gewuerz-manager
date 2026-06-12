// Merkt sich, wann der Super-Admin zuletzt die Nutzerliste gesehen hat
const LAST_SEEN_KEY = 'gewuerz_superadmin_lastseen'

export function getLastSeen() {
  return localStorage.getItem(LAST_SEEN_KEY) || '1970-01-01T00:00:00Z'
}

export function markSeen() {
  localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
}
