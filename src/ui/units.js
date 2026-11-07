// How a product's unit (PRODUCT_UNIT on the backend) is written next to a quantity: "1000 gm".
const UNIT_SHORT = {
  piece: "pcs",
  kg: "kg",
  gram: "gm",
  liter: "L",
  ml: "ml",
  packet: "packets",
  box: "boxes",
  dozen: "dozen",
  pair: "pairs",
  meter: "m",
  yard: "yd",
  roll: "rolls",
  set: "sets",
  carton: "cartons",
  bag: "bags",
  bottle: "bottles",
  can: "cans",
}

/** "gm" for gram, "pcs" for piece… (no unit = "pcs"). */
export const unitShort = (unit) => UNIT_SHORT[unit] || unit || "pcs"

/** "1000 gm", "25 bottles". */
export const withUnit = (qty, unit) => `${qty} ${unitShort(unit)}`
