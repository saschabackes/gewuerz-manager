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
  if (!accessToken) return err('accessToken erforderlich', 400)

  // ── JWT verifizieren (Supabase prüft Signatur) ────────────────────────────
  var verifyRes = await fetch(sbUrl + '/auth/v1/user', {
    headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + accessToken },
  })
  var caller = await verifyRes.json().catch(function() { return {} })
  if (!verifyRes.ok || !caller.id) return err('Ungültiges oder abgelaufenes Token', 401)
  var callerId    = caller.id
  var callerEmail = (caller.email || '').toLowerCase()

  // ── Helper: Auth-User-Details laden ──────────────────────────────────────
  async function getAuthUser(userId) {
    var r = await fetch(sbUrl + '/auth/v1/admin/users/' + userId, { headers: authH })
    return r.ok ? r.json() : null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPER-ADMIN-AKTIONEN (App-Betreiber) – Auth via SUPER_ADMIN_EMAIL
  // ═══════════════════════════════════════════════════════════════════════════
  if (action && action.indexOf('super') === 0) {
    var superEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase()
    if (!superEmail) return err('Super-Admin nicht konfiguriert (SUPER_ADMIN_EMAIL fehlt)')
    if (callerEmail !== superEmail) return err('Keine Berechtigung – nur der App-Betreiber', 403)

    // Alle Nutzer der App auflisten (paginiert, max 200)
    if (action === 'superListUsers') {
      var allUsers = []
      var page = 1
      while (page <= 4) {
        var lr = await fetch(sbUrl + '/auth/v1/admin/users?page=' + page + '&per_page=50', { headers: authH })
        if (!lr.ok) break
        var ld = await lr.json().catch(function() { return {} })
        var batch = (ld && ld.users) || []
        allUsers = allUsers.concat(batch)
        if (batch.length < 50) break
        page++
      }

      // Haushalts-Mitgliedschaften für alle Nutzer laden (Name des Haushalts)
      var membRes = await fetch(
        sbUrl + '/rest/v1/household_members?select=user_id,role,household_id,households(name)',
        { headers: dbH }
      )
      var memberships = await membRes.json().catch(function() { return [] })
      var byUser = {}
      var householdCounts = {}
      if (Array.isArray(memberships)) {
        // Mitglieder pro Haushalt zählen
        memberships.forEach(function(m) {
          householdCounts[m.household_id] = (householdCounts[m.household_id] || 0) + 1
        })
        memberships.forEach(function(m) {
          byUser[m.user_id] = {
            role:           m.role,
            householdId:    m.household_id,
            householdName:  (m.households && m.households.name) || '—',
            householdSize:  householdCounts[m.household_id] || 1,
          }
        })
      }

      var now = new Date()
      var result = allUsers.map(function(u) {
        var hm = byUser[u.id] || {}
        return {
          id:            u.id,
          email:         u.email || '',
          name:          (u.user_metadata && u.user_metadata.name) || (u.email && u.email.split('@')[0]) || 'Unbekannt',
          createdAt:     u.created_at || null,
          lastSignIn:    u.last_sign_in_at || null,
          confirmed:     !!u.email_confirmed_at,
          isBanned:      !!(u.banned_until && new Date(u.banned_until) > now),
          householdName: hm.householdName || '—',
          role:          hm.role || '—',
          householdSize: hm.householdSize || 0,
        }
      })
      return ok(result)
    }

    // Beliebigen Nutzer sperren / entsperren
    if (action === 'superBanUser') {
      if (!body.targetId) return err('targetId erforderlich')
      if (body.targetId === callerId) return err('Du kannst dich nicht selbst sperren')
      var sbanRes = await fetch(sbUrl + '/auth/v1/admin/users/' + body.targetId, {
        method: 'PUT', headers: authH,
        body: JSON.stringify({ ban_duration: body.ban ? '876000h' : 'none' }),
      })
      if (!sbanRes.ok) return err('Sperren fehlgeschlagen: ' + sbanRes.status)
      return ok({ banned: body.ban })
    }

    // Passwort-Reset-Mail an beliebigen Nutzer
    if (action === 'superResetPassword') {
      if (!body.email) return err('E-Mail erforderlich')
      var srRes = await fetch(sbUrl + '/auth/v1/recover', {
        method: 'POST', headers: authH,
        body: JSON.stringify({ email: body.email }),
      })
      if (!srRes.ok) {
        var sre = await srRes.json().catch(function() { return {} })
        return err('Reset fehlgeschlagen: ' + (sre.error_description || sre.msg || srRes.status))
      }
      return ok({ sent: true })
    }

    // Nutzer komplett löschen (inkl. Auth-Konto)
    if (action === 'superDeleteUser') {
      if (!body.targetId) return err('targetId erforderlich')
      if (body.targetId === callerId) return err('Du kannst dich nicht selbst löschen')
      var delRes = await fetch(sbUrl + '/auth/v1/admin/users/' + body.targetId, {
        method: 'DELETE', headers: authH,
      })
      if (!delRes.ok) return err('Löschen fehlgeschlagen: ' + delRes.status)
      return ok({ deleted: true })
    }

    // App-weites Voll-Backup (alle Tabellen als JSON)
    if (action === 'superBackup') {
      var tables = ['households', 'household_members', 'spices', 'spice_categories', 'storage_locations', 'shopping_items']
      var dump = {}
      for (var t = 0; t < tables.length; t++) {
        var tr = await fetch(sbUrl + '/rest/v1/' + tables[t] + '?select=*', { headers: dbH })
        dump[tables[t]] = tr.ok ? await tr.json().catch(function() { return [] }) : []
      }
      return ok({ exportedAt: new Date().toISOString(), tables: dump })
    }

    // App-Statistiken
    if (action === 'superStats') {
      async function countOf(table) {
        var cr = await fetch(sbUrl + '/rest/v1/' + table + '?select=id', {
          headers: Object.assign({}, dbH, { 'Prefer': 'count=exact', 'Range': '0-0' }),
        })
        var range = cr.headers.get('content-range') || '0/0'
        return parseInt(range.split('/')[1] || '0', 10)
      }
      var stats = {
        households: await countOf('households'),
        spices:     await countOf('spices'),
      }
      return ok(stats)
    }

    return err('Unbekannte Super-Aktion: ' + action)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HAUSHALTS-AKTIONEN – brauchen householdId + Owner-Rolle
  // ═══════════════════════════════════════════════════════════════════════════
  if (!householdId) return err('householdId erforderlich', 400)

  // ── Prüfen ob Caller Owner des Haushalts ist ──────────────────────────────
  var chkRes = await fetch(
    sbUrl + '/rest/v1/household_members?user_id=eq.' + callerId + '&household_id=eq.' + householdId + '&select=role',
    { headers: dbH }
  )
  var chkData = await chkRes.json().catch(function() { return [] })
  if (!Array.isArray(chkData) || chkData.length === 0 || chkData[0].role !== 'owner') {
    return err('Keine Berechtigung – nur Haushaltsinhaber können Mitglieder verwalten', 403)
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
