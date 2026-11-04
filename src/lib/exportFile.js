/*
 * Export to CSV or Excel (.xlsx) in the browser, from the data the API returned.
 * A "table" is { title, rows: [{ ...flat values }] }. API objects are flattened first
 * (staff { name } → "Staff name"); a list inside a row (an order's lines…) becomes its own table.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
// Numbers as numbers; long digit strings (barcodes, phones with a leading 0) stay text.
const NUMBER_RE = /^-?(0|[1-9]\d{0,11})(\.\d+)?$/

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)
const isRowList = (value) => Array.isArray(value) && value.some(isPlainObject)

/** "net_sales" / "staff.name" → "Net sales" / "Staff name". */
export function humanize(key) {
  const text = String(key).replaceAll(".", " ").replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function cellValue(value) {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof Date) return formatDate(value)
  if (typeof value === "string" && ISO_RE.test(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : formatDate(date)
  }
  return value
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** A row label for its child tables: its number, name or title. */
function rowLabel(row) {
  for (const key of ["order_number", "product_number", "session_number", "number", "id", "name", "title", "product", "method"]) {
    const value = row?.[key]
    if (value !== undefined && value !== null && typeof value !== "object" && !UUID_RE.test(String(value))) return String(value)
  }
  // A reference object: order { id }, product { id, title }…
  for (const value of Object.values(row || {})) {
    if (isPlainObject(value) && value.id != null && !UUID_RE.test(String(value.id))) return String(value.id)
  }
  return ""
}

function flattenInto(source, prefix, out, children, title, parent) {
  for (const [key, value] of Object.entries(source || {})) {
    const path = prefix ? `${prefix}.${key}` : key
    if (isRowList(value)) {
      children.push({ title: `${title} · ${humanize(key)}`, parent, rows: value })
    } else if (Array.isArray(value)) {
      out[path] = value.map((item) => cellValue(item)).join(", ")
    } else if (isPlainObject(value)) {
      flattenInto(value, path, out, children, title, parent)
    } else {
      out[path] = cellValue(value)
    }
  }
  return out
}

/** API rows → the table, plus one table per list found inside the rows. */
export function rowsToTables(title, rows) {
  const flat = []
  const childGroups = new Map()
  for (const row of rows || []) {
    if (!isPlainObject(row)) {
      flat.push({ value: cellValue(row) })
      continue
    }
    const children = []
    flat.push(flattenInto(row, "", {}, children, title, rowLabel(row)))
    for (const child of children) {
      const group = childGroups.get(child.title) || []
      for (const item of child.rows) group.push(isPlainObject(item) ? { parent: child.parent, ...item } : { parent: child.parent, value: item })
      childGroups.set(child.title, group)
    }
  }
  const tables = [{ title, rows: flat.map(humanizeRow) }]
  for (const [childTitle, childRows] of childGroups) tables.push(...rowsToTables(childTitle, childRows))
  return tables
}

function humanizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [humanize(key), value]))
}

/**
 * A report section (an object of totals and lists, or a list) → tables: the single values as a
 * Field / Value table, and every list as its own table.
 */
export function sectionToTables(title, section) {
  if (section === null || section === undefined) return []
  if (Array.isArray(section)) return rowsToTables(title, section)
  if (!isPlainObject(section)) return [{ title, rows: [{ Value: cellValue(section) }] }]
  const summary = {}
  const tables = []
  for (const [key, value] of Object.entries(section)) {
    // A section's own list ("rows") keeps the section's name.
    if (isRowList(value)) tables.push(...rowsToTables(key === "rows" ? title : `${title} · ${humanize(key)}`, value))
    else if (isPlainObject(value) && Object.values(value).some((inner) => isRowList(inner) || (isPlainObject(inner) && Object.values(inner).some(isRowList)))) {
      tables.push(...sectionToTables(`${title} · ${humanize(key)}`, value))
    } else if (isPlainObject(value)) flattenInto(value, key, summary, [], title, "")
    else if (Array.isArray(value)) summary[key] = value.map((item) => cellValue(item)).join(", ")
    else summary[key] = cellValue(value)
  }
  const summaryRows = Object.entries(summary).map(([key, value]) => ({ Field: humanize(key), Value: value }))
  return [...(summaryRows.length ? [{ title, rows: summaryRows }] : []), ...tables]
}

function columnsOf(rows) {
  const columns = []
  const seen = new Set()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }
  return columns
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---- CSV ----

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** One CSV: a single table as is; several one after another, each under its title. */
export function tablesToCsv(tables) {
  const parts = tables.map((table) => {
    const columns = columnsOf(table.rows)
    const lines = [columns.map(csvCell).join(","), ...table.rows.map((row) => columns.map((key) => csvCell(row[key])).join(","))]
    return tables.length > 1 ? [csvCell(table.title), ...lines].join("\r\n") : lines.join("\r\n")
  })
  return parts.join("\r\n\r\n")
}

// ---- XLSX (a zip of SpreadsheetML parts, stored without compression) ----

const xml = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    // Characters XML 1.0 does not allow.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

function columnName(index) {
  let name = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

function sheetXml(table) {
  const columns = columnsOf(table.rows)
  const cell = (value, ref, style) => {
    if (value === "" || value === null || value === undefined) return ""
    if (typeof value === "number" || (typeof value === "string" && NUMBER_RE.test(value))) {
      return `<c r="${ref}"${style}><v>${Number(value)}</v></c>`
    }
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(value)}</t></is></c>`
  }
  const rows = [
    `<row r="1">${columns.map((key, i) => cell(key, `${columnName(i)}1`, ' s="1"')).join("")}</row>`,
    ...table.rows.map((row, r) => `<row r="${r + 2}">${columns.map((key, i) => cell(row[key], `${columnName(i)}${r + 2}`, "")).join("")}</row>`),
  ]
  const widths = columns
    .map((key, i) => {
      const longest = Math.max(String(key).length, ...table.rows.slice(0, 200).map((row) => String(row[key] ?? "").length))
      return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, Math.max(8, longest + 2))}" customWidth="1"/>`
    })
    .join("")
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    (widths ? `<cols>${widths}</cols>` : "") +
    `<sheetData>${rows.join("")}</sheetData></worksheet>`
  )
}

/** Sheet names: at most 31 characters, none of : \ / ? * [ ], and unique. */
function sheetNames(tables) {
  const used = new Set()
  return tables.map((table, index) => {
    const base = (String(table.title || `Sheet ${index + 1}`).replace(/[:\\/?*[\]]/g, " ").trim() || `Sheet ${index + 1}`).slice(0, 31)
    let name = base
    for (let n = 2; used.has(name.toLowerCase()); n += 1) name = `${base.slice(0, 31 - String(n).length - 1)} ${n}`
    used.add(name.toLowerCase())
    return name
  })
}

export function tablesToXlsx(tables) {
  const names = sheetNames(tables)
  const files = [
    [
      "[Content_Types].xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        "</Types>",
    ],
    [
      "_rels/.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      "xl/workbook.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map((name, i) => `<sheet name="${xml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        "</sheets></workbook>",
    ],
    [
      "xl/_rels/workbook.xml.rels",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        "</styleSheet>",
    ],
    ...tables.map((table, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(table)]),
  ]
  return zipStored(files)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** A zip with every file stored (no compression) — enough for an .xlsx. */
function zipStored(files) {
  const encoder = new TextEncoder()
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    locals.push(new Uint8Array(local.buffer), nameBytes, data)

    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 20, true)
    central.setUint16(6, 20, true)
    central.setUint16(8, 0x0800, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, data.length, true)
    central.setUint32(24, data.length, true)
    central.setUint16(28, nameBytes.length, true)
    central.setUint32(42, offset, true)
    centrals.push(new Uint8Array(central.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...locals, ...centrals, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

/** Downloads the tables as name.csv or name.xlsx. */
export function downloadTables(tables, { name, format }) {
  const list = tables.filter((table) => table.rows.length)
  const safe = list.length ? list : [{ title: name, rows: [{ Note: "No data for this selection" }] }]
  const stamp = formatDate(new Date()).slice(0, 10)
  const base = `${String(name).replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-${stamp}`
  if (format === "xlsx") return saveBlob(tablesToXlsx(safe), `${base}.xlsx`)
  // The BOM lets Excel read the CSV as UTF-8.
  return saveBlob(new Blob(["﻿" + tablesToCsv(safe)], { type: "text/csv;charset=utf-8" }), `${base}.csv`)
}
