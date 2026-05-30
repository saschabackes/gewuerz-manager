// User-Admin Proxy – serverseitig, benutzt Service Role Key (bypasses RLS)
// Nur Haushalts-Inhaber dürfen diese Actions ausführen.

var CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

function ok(data)       { return { statusCode: 200, headers: CORS, body: JSON.stringify(data) } }
function err(msg, code) { return { statusCode: code || 500, headers: CORS, body: JSON.stringify({ error: msg }) } }

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: Object.assign({}, CORS, { 'Access-Control-Allow-Methods': 'POST, OPTIONS' }), body: '' }
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405)

  var sbUrl = (process.env.SUPABASE_URL           || '').trim().replace(/\/$/, '')
  var sbKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!sbUrl || !sbKey) return err('Admin nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen)')

  // Auth-API Headers (Service Role)
  var authH = {
    'apikey':        sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type':  'application/json',
  }
  // PostgREST Headers (Service Role)
  var dbH = {
    'apikey':        sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
  }

  var body
  try { body = JSON.parse(event.body || '{}') } catch (e) { return err('Invalid JSON') }

  var action      = body.action
  var accessToken = body.accessToken
  var householdId = body.householdId
  if (!accessToken || !householdId) return err('accessToken und householdId erforderlich', 400)

  // ── JWT verifizieren (Supabase prüft Signatur) ────────────────────────────
  var verifyRes = await fetch(sbUrl + '/auth/v1/user', {
    headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + accessToken },
  })
  var caller = await verifyRes.json().catch(function() { return {} })
  if (!verifyRes.ok || !caller.id) return err('Ungültiges oder abgelaufenes Token', 401)
  var callerId = caller.id

  // ── Prüfen ob Caller Owner des Haushalts ist ──────────────────────────────
  var chkRes = await fetch(
    sbUrl + '/rest/v1/household_members?user_id=eq.' + callerId + '&household_id=eq.' + householdId + '&select=role',
    { headers: dbH }
  )
  var chkData = await chkRes.json().catch(function() { return [] })
  if (!Array.isArray(chkData) || chkData.length === 0 || chkData[0].role !== 'owner') {
    return err('Keine Berechtigung – nur Haushaltsinhaber können Mitglieder verwalten', 403)
  }

  // ── Helper: Auth-User-Details laden ──────────────────────────────────────
  async function getAuthUser(userId) {
    var r = await fetch(sbUrl + '/auth/v1/admin/users/' + userId, { headers: authH })
    return r.ok ? r.json() : null
  }

  // ── Mitglieder abrufen ────────────────────────────────────────────────────
  if (action === 'getMembers') {
    var membRes = await fetch(
      sbUrl + '/rest/v1/household_members?household_id=eq.' + householdId + '&select=user_id,role,joined_at&order=joined_at',
      { headers: dbH }
    )
    var members = await membRes.json().catch(function() { return null })
    if (!Array.isArray(members)) return err('Fehler beim Laden der Mitglieder')

    var details = await Promise.all(members.map(async function(m) {
      var u = await getAuthUser(m.user_id)
      return {
        id:         m.user_id,
        role:       m.role,
        joinedAt:   m.joined_at,
        name:       (u && u.user_metadata && u.user_metadata.name) || (u && u.email && u.email.split('@')[0]) || 'Unbekannt',
        email:      (u && u.email) || '',
        isBanned:   !!(u && u.banned_until && new Date(u.banned_until) > new Date()),
        lastSignIn: (u && u.last_sign_in_at) || null,
      }
    }))
    return ok(details)
  }

  // ── Passwort-Reset-Mail senden ────────────────────────────────────────────
  if (action === 'resetPassword') {
    var email = body.email
    if (!email) return err('E-Mail erforderlich')
    var resetRes = await fetch(sbUrl + '/auth/v1/recover', {
      method: 'POST', headers: authH,
      body: JSON.stringify({ email: email }),
    })
    if (!resetRes.ok) {
      var re = await resetRes.json().catch(function() { return {} })
      return err('Reset fehlgeschlagen: ' + (re.error_description || re.msg || resetRes.status))
    }
    return ok({ sent: true })
  }

  // ── Benutzer sperren / entsperren ─────────────────────────────────────────
  if (action === 'banUser') {
    var targetId = body.targetId
    var ban      = body.ban
    if (!targetId) return err('targetId erforderlich')
    if (targetId === callerId) return err('Du kannst dich nicht selbst sperren')
    var banRes = await fetch(sbUrl + '/auth/v1/admin/users/' + targetId, {
      method: 'PUT', headers: authH,
      body: JSON.stringify({ ban_duration: ban ? '876000h' : 'none' }),
    })
    if (!banRes.ok) {
      var be = await banRes.json().catch(function() { return {} })
      return err('Sperren fehlgeschlagen: ' + (be.message || banRes.status))
    }
    return ok({ banned: ban })
  }

  // ── Aus Haushalt entfernen ────────────────────────────────────────────────
  if (action === 'removeMember') {
    var rmId = body.targetId
    if (!rmId) return err('targetId erforderlich')
    if (rmId === callerId) return err('Nutze „Haushalt verlassen" in den Einstellungen um dich selbst zu entfernen')
    var rmRes = await fetch(
      sbUrl + '/rest/v1/household_members?user_id=eq.' + rmId + '&household_id=eq.' + householdId,
      { method: 'DELETE', headers: dbH }
    )
    if (!rmRes.ok) return err('Entfernen fehlgeschlagen: ' + rmRes.status)
    return ok({ removed: true })
  }

  // ── Rolle ändern ──────────────────────────────────────────────────────────
  if (action === 'changeRole') {
    var roleTargetId = body.targetId
    var newRole      = body.role
    if (!roleTargetId || !newRole) return err('targetId und role erforderlich')
    if (roleTargetId === callerId) return err('Du kannst deine eigene Rolle nicht ändern')
    if (newRole !== 'owner' && newRole !== 'member') return err('Ungültige Rolle')
    var roleRes = await fetch(
      sbUrl + '/rest/v1/household_members?user_id=eq.' + roleTargetId + '&household_id=eq.' + householdId,
      { method: 'PATCH', headers: dbH, body: JSON.stringify({ role: newRole }) }
    )
    if (!roleRes.ok) return err('Rollenänderung fehlgeschlagen: ' + roleRes.status)
    return ok({ role: newRole })
  }

  return err('Unbekannte Aktion: ' + action)
}
