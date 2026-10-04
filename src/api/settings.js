import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../lib/http.js"

const auth = { auth: true }

// Store profile (General settings, FBR flags)
export function getMyStore() {
  return apiGet("/api/v1/stores/me", auth)
}

export function updateMyStore(body) {
  return apiPatch("/api/v1/stores/me", body, auth)
}

// My account
export function updateMe(body) {
  return apiPatch("/api/v1/auth/me", body, auth)
}

// Website
export function getTheme() {
  return apiGet("/api/v1/stores/me/theme", auth)
}

export function putTheme(body) {
  return apiPut("/api/v1/stores/me/theme", body, auth)
}

export function getContent() {
  return apiGet("/api/v1/stores/me/content", auth)
}

export function putContent(body) {
  return apiPut("/api/v1/stores/me/content", body, auth)
}

export function getShipping() {
  return apiGet("/api/v1/stores/me/shipping", auth)
}

export function putShipping(body) {
  return apiPut("/api/v1/stores/me/shipping", body, auth)
}

export function listBanners() {
  return apiGet("/api/v1/store-banners", auth)
}

export function createBanner(body) {
  return apiPost("/api/v1/store-banners", body, auth)
}

export function updateBanner(id, body) {
  return apiPatch(`/api/v1/store-banners/${id}`, body, auth)
}

export function deleteBanner(id) {
  return apiDelete(`/api/v1/store-banners/${id}`, auth)
}

// Backup & restore (plan gated on the server)
export function listBackups() {
  return apiGet("/api/v1/store-backups", auth)
}

export function createBackup(body) {
  return apiPost("/api/v1/store-backups", body, auth)
}

export function restoreBackup(id) {
  return apiPost(`/api/v1/store-backups/${id}/restore`, {}, auth)
}

// Super Admin data tools
export function listDataModules() {
  return apiGet("/api/v1/admin/data/modules", auth)
}

export function wipeDataModule(module) {
  return apiDelete(`/api/v1/admin/data/${module}`, auth)
}
