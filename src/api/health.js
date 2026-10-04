import { apiGet } from "../lib/http.js"

export function getHealth() {
  return apiGet("/api/v1/health")
}
