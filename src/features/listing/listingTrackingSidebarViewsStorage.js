const LS_KEY = 'listing_tracking_sidebar_views'

export function loadListingSidebarViews() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { views: [], defaultId: null }
    const o = JSON.parse(raw)
    return {
      views: Array.isArray(o.views) ? o.views : [],
      defaultId: o.defaultId ?? null,
    }
  } catch {
    return { views: [], defaultId: null }
  }
}

export function saveListingSidebarViews(views, defaultId) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ views, defaultId }))
  } catch {
    /* ignore */
  }
}
