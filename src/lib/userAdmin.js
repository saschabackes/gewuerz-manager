import { supabase } from './supabase'

const PROXY = '/.netlify/functions/user-admin'

async function callAdmin(action, householdId, params = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Nicht angemeldet')

  const res = await fetch(PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, accessToken: session.access_token, householdId, ...params }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`)
  return data
}

export const adminGetMembers    = (hId)              => callAdmin('getMembers',    hId)
export const adminResetPassword = (hId, email)       => callAdmin('resetPassword', hId, { email })
export const adminBanUser       = (hId, targetId, ban) => callAdmin('banUser',    hId, { targetId, ban })
export const adminRemoveMember  = (hId, targetId)    => callAdmin('removeMember', hId, { targetId })
export const adminChangeRole    = (hId, targetId, role) => callAdmin('changeRole', hId, { targetId, role })

// ── Super-Admin (App-Betreiber) – kein householdId nötig ──────────────────────
export const superListUsers     = ()             => callAdmin('superListUsers',    null)
export const superBanUser       = (targetId, ban) => callAdmin('superBanUser',     null, { targetId, ban })
export const superResetPassword = (email)        => callAdmin('superResetPassword', null, { email })
export const superDeleteUser    = (targetId)     => callAdmin('superDeleteUser',    null, { targetId })
export const superBackup        = ()             => callAdmin('superBackup',        null)
export const superStats         = ()             => callAdmin('superStats',         null)
