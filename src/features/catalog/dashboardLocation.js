export function resolveDashboardLocation({ user, location, locations }) {
  if (user?.role === "manager") return location || null
  const rows = Array.isArray(locations) ? locations : []
  return rows.find((row) => row.is_default) || rows[0] || location || null
}
