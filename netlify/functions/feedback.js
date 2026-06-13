const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) }
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
