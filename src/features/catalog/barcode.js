/** A random 13-digit EAN-13 starting with 2 (the in-store range); the last digit is its check digit. */
export function generateBarcode() {
  let digits = "2"
  const random = new Uint32Array(11)
  crypto.getRandomValues(random)
  for (const value of random) digits += String(value % 10)
  const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0)
  return digits + String((10 - (sum % 10)) % 10)
}
