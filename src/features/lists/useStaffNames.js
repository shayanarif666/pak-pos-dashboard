import { useMemo } from "react"
import { useStaffQuery } from "../operations/operationsQuery.js"

/** Staff name by user UUID or user number (tables show names, not ids). */
export function useStaffNames() {
  const staffQuery = useStaffQuery()
  return useMemo(() => {
    const rows = staffQuery.data || []
    const byId = new Map(rows.map((row) => [row.id, row.name]))
    const byNumber = new Map(rows.map((row) => [Number(row.user_number), row.name]))
    return (idOrNumber) => {
      if (idOrNumber === null || idOrNumber === undefined || idOrNumber === "") return "—"
      return byId.get(idOrNumber) || byNumber.get(Number(idOrNumber)) || `#${idOrNumber}`
    }
  }, [staffQuery.data])
}
