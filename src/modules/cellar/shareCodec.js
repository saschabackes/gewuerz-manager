const SHORT = {
  name:'n', winery:'w', vintage:'v', region:'r', country:'co', grape:'g',
  color:'c', rating:'rt', tastingNotes:'t', drinkFrom:'df', drinkUntil:'du',
  aromas:'a', priceEur:'p', note:'no', senderName:'sn', message:'msg',
}
const LONG = Object.fromEntries(Object.entries(SHORT).map(([k,v]) => [v,k]))

function shorten(bottles, meta = {}) {
  const items = bottles.map(b => {
    const o = {}
    for (const [long, short] of Object.entries(SHORT)) {
      const val = b[long]
      if (val !== undefined && val !== null && val !== '' && val !== 0
          && !(Array.isArray(val) && val.length === 0)) {
        o[short] = val
      }
    }
    return o
  })
  return { i: items, ...meta }
}

function expand(data) {
  const meta = { ...data }
  delete meta.i
  const bottles = (data.i || []).map(o => {
    const b = {}
    for (const [short, val] of Object.entries(o)) {
      b[LONG[short] || short] = val
    }
    return b
  })
  return { bottles, meta }
}

export function encodeShareData(bottles, meta = {}) {
  const json = JSON.stringify(shorten(bottles, meta))
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeShareData(encoded) {
  const pad = encoded.length % 4
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, pad ? 4 - pad : 0)
  const json = decodeURIComponent(escape(atob(b64)))
  return expand(JSON.parse(json))
}
