const ALLOWED_ORIGINS = ['https://depotapp.online', 'https://depotapp.netlify.app']
function corsHeaders(event) {
  const origin = (event?.headers?.origin || '').toLowerCase()
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

async function verifyJwt(event) {
  const sbUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const sbKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const accessToken = (event.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!accessToken || !sbUrl || !sbKey) return null
  const res = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const user = await res.json().catch(() => null)
  return user?.id ? user : null
}

exports.handler = async function (event) {
  const CORS = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const caller = await verifyJwt(event)
  if (!caller) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Nicht autorisiert' }) }
  }

  const token = (process.env.GITHUB_FEEDBACK_TOKEN || '').trim()
  if (!token) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Feedback ist momentan nicht verfügbar.' }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') } catch (e) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { type, title, description, userEmail, appVersion } = body
  if (!title || !title.trim()) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Titel erforderlich' }) }
  }

  const label = type === 'bug' ? 'bug' : 'enhancement'
  const emoji = type === 'bug' ? '🐛' : '💡'
  const issueTitle = `${emoji} ${title.trim()}`

  const parts = []
  if (description?.trim()) parts.push(description.trim())
  parts.push('')
  parts.push('---')
  parts.push(`**App-Version:** ${appVersion || 'unbekannt'}`)
  if (userEmail) parts.push(`**Nutzer:** ${userEmail}`)
  parts.push(`**Quelle:** In-App Feedback`)

  const res = await fetch('https://api.github.com/repos/saschabackes/depot-app/issues', {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      title: issueTitle,
      body: parts.join('\n'),
      labels: [label, 'user-feedback'],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Feedback konnte nicht gesendet werden.' }) }
  }

  const issue = await res.json()
  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, issueNumber: issue.number }),
  }
}
