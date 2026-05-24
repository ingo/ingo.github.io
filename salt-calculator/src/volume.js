const FRACTIONS = {
  '.00': '',
  '.13': '⅛',  '.17': '⅛',  '.25': '¼',
  '.33': '⅓',  '.38': '⅜',  '.50': '½',
  '.63': '⅝',  '.67': '⅔',  '.75': '¾',
  '.83': '¾',  '.88': '⅞',
}

function nearestQuarter(x) { return Math.floor(x * 4) / 4 }
function nearestThird(x)  { return Math.floor(x * 3) / 3 }
function nearestHalf(x)   { return Math.floor(x * 2) / 2 }

// Convert a tablespoon count into "1¼ cup + ½ tablespoon + ¼ teaspoon" style.
// Mirrors the breakdown logic from saltyourmeat.com so output stays familiar.
export function formatTablespoons(totalTbsp) {
  if (!totalTbsp || totalTbsp <= 0) return null

  let tbsp = totalTbsp
  const cupsRaw = tbsp / 16
  let cups = 0

  if (cupsRaw > 0.25) {
    const q = nearestQuarter(cupsRaw)
    const t = nearestThird(cupsRaw)
    cups = (cupsRaw - q) > (cupsRaw - t) ? t : q
    tbsp = 16 * (cupsRaw - cups)
  }

  const tbspBefore = tbsp
  const halved = nearestHalf(tbsp)
  const floored = Math.floor(tbsp)
  tbsp = (tbsp - halved) < (tbsp - floored) ? halved : floored

  const tspRaw = 3 * (tbspBefore - tbsp)
  const tsp =
    Math.abs(tspRaw - Math.round(8 * tspRaw) / 8) <
    Math.abs(tspRaw - Math.round(6 * tspRaw) / 6)
      ? Math.round(8 * tspRaw) / 8
      : Math.round(6 * tspRaw) / 6

  const parts = []
  add(parts, 'cup', cups)
  add(parts, 'tablespoon', tbsp)
  add(parts, 'teaspoon', tsp)
  return parts.length > 0 ? parts.join(' + ') : null
}

function add(parts, label, value) {
  if (value <= 0) return
  let s = value.toFixed(2)
  const unit = Number(s) > 1 ? `${label}s` : label
  if (s.startsWith('0')) s = s.slice(1)
  const tail = s.slice(-3)
  if (tail in FRACTIONS) s = s.slice(0, -3) + FRACTIONS[tail]
  parts.push(`${s} ${unit}`.trim())
}
