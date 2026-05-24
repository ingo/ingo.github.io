import { useMemo, useState } from 'react'
import tempData from './data/tempData.json'
import { SiteMasthead } from './SiteMasthead.jsx'

const COOKERS = [
  { value: 'kingsford', label: 'Kingsford', subtext: 'standard briquettes' },
  { value: 'weber', label: 'Weber', subtext: 'larger briquettes' },
]

// Two presets share the same target band (225–250°F). Treat them as one
// pickable temperature with a follow-up "how long are you cooking?" question.
const TEMP_OPTIONS = [
  { id: 'low', label: '225–250°F', subtitle: 'Low and slow', presets: ['low-short', 'low-long'] },
  ...tempData.presets
    .filter(p => !p.id.startsWith('low'))
    .map(p => ({ id: p.id, label: p.label, subtitle: p.subtitle, presets: [p.id] })),
]

const PRESETS_BY_ID = Object.fromEntries(tempData.presets.map(p => [p.id, p]))

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Up to ~6 hours', subtext: 'ribs, brisket flat', presetId: 'low-short' },
  { value: 'long',  label: '10–12 hours',     subtext: 'shoulder, brisket', presetId: 'low-long' },
]

export default function App() {
  const [cooker, setCooker] = useState('kingsford')
  const [tempId, setTempId] = useState('')
  const [length, setLength] = useState('short')

  const tempOption = TEMP_OPTIONS.find(t => t.id === tempId)
  const needsLength = tempOption && tempOption.id === 'low'

  const preset = useMemo(() => {
    if (!tempOption) return null
    if (tempOption.id === 'low') {
      const opt = LENGTH_OPTIONS.find(l => l.value === length)
      return PRESETS_BY_ID[opt.presetId]
    }
    return PRESETS_BY_ID[tempOption.presets[0]]
  }, [tempOption, length])

  const ready = !!preset

  return (
    <div className="page">
      <SiteMasthead currentHref="/grill-calculator/" />

      <main className="content">
        <div className="lede">
          <p className="kicker">Kitchen tools</p>
          <h1>Weber Kettle Temperature Calculator</h1>
          <p className="standfirst">
            Pick the target temp and which briquettes you're burning. The
            calculator returns how many lit coals to drop on, how much unlit
            fuel to bank, and where to set the top and bottom vents.
          </p>
        </div>

        <section className="step">
          <h2>1. Which briquettes?</h2>
          <p className="note">
            Weber briquettes are larger and burn longer per coal, so the counts are different.
          </p>
          <ChoiceGroup
            name="cooker"
            options={COOKERS}
            value={cooker}
            onChange={setCooker}
          />
        </section>

        <section className="step">
          <h2>2. What temperature are you aiming for?</h2>
          <div className="choices temp-grid">
            {TEMP_OPTIONS.map(opt => (
              <label key={opt.id} className={tempId === opt.id ? 'choice selected' : 'choice'}>
                <input
                  type="radio"
                  name="temp"
                  value={opt.id}
                  checked={tempId === opt.id}
                  onChange={(e) => setTempId(e.target.value)}
                />
                <span className="choice-label">{opt.label}</span>
                <span className="choice-subtext">{opt.subtitle}</span>
              </label>
            ))}
          </div>
        </section>

        {needsLength && (
          <section className="step">
            <h2>3. How long is the cook?</h2>
            <p className="note">
              Same temp, different fuel load. A long cook needs a bigger unlit
              pile, and you bank the lit coals on the edge so unlit fuel ignites slowly.
            </p>
            <ChoiceGroup
              name="length"
              options={LENGTH_OPTIONS}
              value={length}
              onChange={setLength}
            />
          </section>
        )}

        <section className="result">
          <h2>Result</h2>
          {ready ? (
            <ResultBody preset={preset} cooker={cooker} />
          ) : (
            <ul className="todo">
              {!tempId && <li>Pick a target temperature.</li>}
            </ul>
          )}
        </section>

        <footer className="colophon">
          <p>
            Built from the temperature/vent guide at{' '}
            <a href="https://handmadebbq.com/controlling-weber-kettle-temperature/" target="_blank" rel="noopener noreferrer">
              handmadebbq.com
            </a>{' '}
            — same lookup data, restyled to live next to the rest of the recipes here.
            Real cooks vary with weather, charcoal, and the kettle itself; these are starting points.
          </p>
          <p>
            Top vent shifts ≈ 10–15°F per ⅛ turn. Stabilise 15–20 min after every adjustment before judging.
          </p>
        </footer>
      </main>
    </div>
  )
}

function ResultBody({ preset, cooker }) {
  const litCoals  = cooker === 'kingsford' ? preset.litCoalsKingsford  : preset.litCoalsWeber
  const fuelCoals = cooker === 'kingsford' ? preset.fuelKingsford      : preset.fuelWeber

  return (
    <div className="result-body">
      <p className="summary">
        For <strong>{preset.tempF}°F</strong> ({preset.tempC}°C) on {cooker === 'kingsford' ? 'Kingsford' : 'Weber'}{' '}
        briquettes, light <strong>{litCoals}</strong> coals and bank <strong>{fuelCoals}</strong>{' '}
        unlit briquettes. Dump the lit coals <strong>{preset.minionPlacement}</strong> of the pile.
      </p>

      <h3>Vent settings</h3>
      <div className="vent-row">
        <VentCard label="Top vent" value={preset.topVent} />
        <VentCard label="Bottom vent" value={preset.bottomVent} />
      </div>
      <p className="note" style={{ marginTop: 0 }}>
        Start at the low end of any range. Adjust the top vent first; only crack the bottom further if the top
        is wide open and you still can't reach target.
      </p>

      <h3>Cook timing</h3>
      <dl className="spec-grid">
        <div>
          <dt>Lit coals</dt>
          <dd><span className="spec-strong">{litCoals}</span><span className="spec-aux">{cooker === 'kingsford' ? 'Kingsford briquettes' : 'Weber briquettes'}</span></dd>
        </div>
        <div>
          <dt>Unlit fuel pile</dt>
          <dd><span className="spec-strong">{fuelCoals}</span><span className="spec-aux">briquettes banked</span></dd>
        </div>
        <div>
          <dt>Stabilisation</dt>
          <dd><span className="spec-strong">{preset.stabilizeTime}</span><span className="spec-aux">before food goes on</span></dd>
        </div>
        <div>
          <dt>Cook window</dt>
          <dd><span className="spec-strong">{preset.cookTime}</span><span className="spec-aux">{preset.examples}</span></dd>
        </div>
      </dl>

      {preset.notes && (
        <>
          <h3>Notes</h3>
          <p className="howto">{preset.notes}</p>
        </>
      )}

      <h3>Adjusting on the fly</h3>
      <ul className="tips">
        <li>If temp is creeping up: close the top vent ⅛ at a time and wait 15–20 minutes.</li>
        <li>If temp is dying: open the bottom vent further. If that doesn't catch it, you need more lit coals.</li>
        <li>Cold day, wind, or humidity all push you toward more fuel and slightly more open vents.</li>
      </ul>
    </div>
  )
}

function VentCard({ label, value }) {
  return (
    <div className="vent-card">
      <VentDial value={value} />
      <div className="vent-meta">
        <span className="vent-label">{label}</span>
        <span className="vent-value">{value}</span>
      </div>
    </div>
  )
}

// Renders a top-down view of a kettle vent. The "value" is text like
// "1/8 to 1/4" or "1/2 to full"; we draw the *low end* of the range as a
// pie-slice cut-out so the picture matches the conservative starting point
// the calculator recommends.
function VentDial({ value }) {
  const fraction = lowEndFraction(value)
  const size = 72
  const r = size / 2 - 4
  const cx = size / 2
  const cy = size / 2
  const angle = fraction * 2 * Math.PI
  const slice = sliceArc(cx, cy, r, angle)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#383C50" strokeWidth="1.5" />
      {fraction > 0 && <path d={slice} fill="#383C50" />}
      <circle cx={cx} cy={cy} r="2" fill="#383C50" />
    </svg>
  )
}

function lowEndFraction(value) {
  if (!value) return 0
  const first = value.split(/\s+to\s+/i)[0].trim()
  if (first === 'full') return 1
  const m = first.match(/(\d+)\s*\/\s*(\d+)/)
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10)
  const f = parseFloat(first)
  return isNaN(f) ? 0 : f
}

function sliceArc(cx, cy, r, angle) {
  if (angle >= 2 * Math.PI - 1e-6) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
  }
  // Start at top (12 o'clock) and sweep clockwise
  const startX = cx
  const startY = cy - r
  const endX = cx + r * Math.sin(angle)
  const endY = cy - r * Math.cos(angle)
  const largeArc = angle > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`
}

function ChoiceGroup({ name, options, value, onChange, inline = false }) {
  return (
    <div className={inline ? 'choices choices-inline' : 'choices'}>
      {options.map((opt) => (
        <label key={opt.value} className={value === opt.value ? 'choice selected' : 'choice'}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="choice-label">{opt.label}</span>
          {opt.subtext && <span className="choice-subtext">{opt.subtext}</span>}
        </label>
      ))}
    </div>
  )
}
