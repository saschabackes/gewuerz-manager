const MODULES_ENABLED = import.meta.env.VITE_ENABLE_MODULES === '1' || import.meta.env.DEV

export { MODULES_ENABLED }

export const APP_NAME        = MODULES_ENABLED ? 'Depot' : 'Gewürzmanager'
export const APP_TAGLINE     = MODULES_ENABLED ? 'Dein Haushalt, organisiert' : 'Deine Gewürze im Griff'
export const APP_DESCRIPTION = MODULES_ENABLED
  ? 'Depot — Dein Haushalt, organisiert. Gewürze, Tiefkühl, Wein & Einkauf.'
  : 'Gewürzmanager — Gewürze, MHD, Füllstände und Einkaufsliste.'

export const APP_URL = MODULES_ENABLED
  ? 'https://depotapp.online'
  : 'https://gewuerzmanager.netlify.app'

