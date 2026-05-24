// Wet-brine time as a function of cut thickness, taking the conservative
// (shorter) end of the AmazingRibs lookup so we under-brine rather than over-brine.
// 1/2"  → 30 min
// 1"    → 1 hour
// 2"    → 4 hours
// 3"    → 12 hours
// 4"+   → ~24 hours
const ANCHORS = [
  { thick: 0.5, hours: 0.5 },
  { thick: 1.0, hours: 1.0 },
  { thick: 2.0, hours: 4.0 },
  { thick: 3.0, hours: 12.0 },
  { thick: 4.0, hours: 24.0 },
]

export function brineHours(thicknessInches) {
  if (!thicknessInches || thicknessInches <= 0) return null
  if (thicknessInches <= ANCHORS[0].thick) return ANCHORS[0].hours
  if (thicknessInches >= ANCHORS[ANCHORS.length - 1].thick) {
    return ANCHORS[ANCHORS.length - 1].hours
  }
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i]
    const b = ANCHORS[i + 1]
    if (thicknessInches >= a.thick && thicknessInches <= b.thick) {
      const t = (thicknessInches - a.thick) / (b.thick - a.thick)
      return a.hours + t * (b.hours - a.hours)
    }
  }
  return null
}

export function formatHours(hours) {
  if (hours == null) return ''
  if (hours < 1) {
    const mins = Math.round(hours * 60 / 5) * 5
    return `${mins} minutes`
  }
  if (hours < 4) {
    const halves = Math.round(hours * 2) / 2
    return halves === 1 ? '1 hour' : `${halves} hours`
  }
  return `${Math.round(hours)} hours`
}
