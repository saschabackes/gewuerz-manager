const PROXY = '/.netlify/functions/cookidoo-fetch'

async function call(payload) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(data.error ?? `Fehler ${res.status}`)
  return data
}

// Login testen (beim Verbinden)
export async function cookidooVerify(email, password) {
  return call({ email, password })
}

// Rezept abrufen → { title, ingredients:[{name,amount}], steps:[str], thumbnailUrl }
export async function cookidooFetchRecipe(email, password, url) {
  const data = await call({ email, password, url })
  return {
    title: data.title ?? '',
    ingredients: data.ingredients ?? [],
    steps: data.steps ?? [],
    thumbnailUrl: data.thumbnailUrl ?? '',
  }
}
