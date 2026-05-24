import { useEffect, useMemo, useState } from 'react'
import meatData from './data/meatData.json'
import saltData from './data/saltData.json'
import { expandInstruction } from './instructions.js'
import { formatTablespoons } from './volume.js'
import { brineHours, formatHours } from './brineTime.js'
import { QUESTIONS, recommend } from './decision.js'

const PROTEINS = Object.keys(meatData)
const SALTS = Object.keys(saltData)
const UNITS = ['lbs', 'kg']

const MODES = [
  { value: 'dry', label: 'Dry brine', subtext: '% of meat weight' },
  { value: 'wet', label: 'Wet brine', subtext: '% of meat + water' },
]

export default function App() {
  const [mode, setMode] = useState('dry')
  const [protein, setProtein] = useState('')
  const [cut, setCut] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [salt, setSalt] = useState('')
  const [salinity, setSalinity] = useState(1.1)
  const [salinityTouched, setSalinityTouched] = useState(false)

  // Wet-brine extras
  const [brineRatio, setBrineRatio] = useState(1.5)  // grams of water per gram of meat
  const [sugarPct, setSugarPct] = useState(0.5)
  const [sugarTouched, setSugarTouched] = useState(false)
  const [thickness, setThickness] = useState('1.0')

  const meat = protein && cut ? meatData[protein]?.[cut] : null
  const wet = meat?.wetBrine
  const isWet = mode === 'wet' && !!wet

  // When user picks a new cut, snap salinity / sugar / thickness to the cut's
  // recommended values for the active mode (unless they've moved that slider).
  useEffect(() => {
    if (!meat) return
    const target = isWet ? wet?.defaultSaltByWeight : meat.defaultSaltByWeight
    if (!salinityTouched && target != null) setSalinity(target)
  }, [meat, isWet, salinityTouched])

  useEffect(() => {
    if (!isWet) return
    if (!sugarTouched && wet?.defaultSugarByWeight != null) {
      setSugarPct(wet.defaultSugarByWeight)
    }
    if (wet?.thicknessInches != null) {
      setThickness(String(wet.thicknessInches))
    }
  }, [isWet, wet, sugarTouched])

  // Reset cut when protein changes and the prior cut doesn't exist on the new one.
  useEffect(() => {
    if (protein && cut && !meatData[protein]?.[cut]) setCut('')
  }, [protein, cut])

  // If the user is on "wet" mode but the chosen cut doesn't support wet brining,
  // bounce them back to dry. Better than silently showing dry results under a wet header.
  useEffect(() => {
    if (mode === 'wet' && meat && !wet) setMode('dry')
  }, [mode, meat, wet])

  const result = useMemo(() => {
    const w = parseFloat(weight)
    if (!meat || !salt || !w || w <= 0) return null
    const meatGrams = unit === 'lbs' ? w * 453.592 : w * 1000

    if (isWet) {
      const ratio = parseFloat(brineRatio) || 1
      const waterGrams = meatGrams * ratio
      const systemGrams = meatGrams + waterGrams
      const saltGrams = systemGrams * (salinity / 100)
      const sugarGrams = systemGrams * (sugarPct / 100)
      const tbsp = saltGrams / saltData[salt].gramsPerTbsp
      const thickIn = parseFloat(thickness) || meat.wetBrine.thicknessInches
      return {
        type: 'wet',
        saltGrams,
        sugarGrams,
        waterGrams,
        meatGrams,
        tbsp,
        volume: formatTablespoons(tbsp),
        hours: brineHours(thickIn),
      }
    }

    const totalSaltGrams = meatGrams * (salinity / 100)
    const tbsp = totalSaltGrams / saltData[salt].gramsPerTbsp
    return {
      type: 'dry',
      saltGrams: totalSaltGrams,
      tbsp,
      volume: formatTablespoons(tbsp),
    }
  }, [meat, salt, weight, unit, salinity, mode, isWet, brineRatio, sugarPct, thickness])

  const ready = meat && salt && weight && parseFloat(weight) > 0

  return (
    <div className="page">
      <SiteMasthead currentHref="/salt-calculator/" />

      <main className="content">
        <div className="lede">
          <p className="kicker">Kitchen tools</p>
          <h1>Brining Salt Calculator</h1>
          <p className="standfirst">
            Pick the protein, weigh it, choose your salt. Use dry mode for most cuts;
            switch to wet mode for lean poultry, pork loin, or fillets when you'd rather
            soak than salt-and-rest.
          </p>
        </div>

        <DecisionPanel onApply={(m) => { setMode(m); setSalinityTouched(false); setSugarTouched(false) }} />

        <section className="step">
          <h2>1. Brining method</h2>
          <ChoiceGroup
            name="mode"
            options={MODES}
            value={mode}
            onChange={(v) => { setMode(v); setSalinityTouched(false); setSugarTouched(false) }}
          />
          {mode === 'wet' && meat && !wet && (
            <p className="note" style={{ marginTop: '0.75rem' }}>
              This cut isn't a great wet-brine candidate. Switching back to dry.
            </p>
          )}
        </section>

        <section className="step">
          <h2>2. What protein are you brining?</h2>
          <ChoiceGroup
            name="protein"
            options={PROTEINS.map(p => ({ value: p, label: p }))}
            value={protein}
            onChange={(v) => { setProtein(v); setCut(''); setSalinityTouched(false); setSugarTouched(false) }}
          />
        </section>

        {protein && (
          <section className="step">
            <h2>3. What cut?</h2>
            <ChoiceGroup
              name="cut"
              options={Object.keys(meatData[protein]).map(c => {
                const cutData = meatData[protein][c]
                const supportsWet = !!cutData.wetBrine
                return {
                  value: c,
                  label: c,
                  subtext: mode === 'wet' && !supportsWet ? 'dry only' : null,
                  disabled: mode === 'wet' && !supportsWet,
                }
              })}
              value={cut}
              onChange={(v) => { setCut(v); setSalinityTouched(false); setSugarTouched(false) }}
            />
          </section>
        )}

        {cut && (
          <section className="step">
            <h2>4. How much does it weigh?</h2>
            <div className="weight-row">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <ChoiceGroup
                name="unit"
                options={UNITS.map(u => ({ value: u, label: u }))}
                value={unit}
                onChange={setUnit}
                inline
              />
            </div>
          </section>
        )}

        {cut && (
          <section className="step">
            <h2>5. Which salt are you using?</h2>
            <ChoiceGroup
              name="salt"
              options={SALTS.map(s => ({
                value: s,
                label: saltData[s].name,
                subtext: `${saltData[s].gramsPerTbsp} g / tbsp`,
              }))}
              value={salt}
              onChange={setSalt}
            />
          </section>
        )}

        {salt && meat && (
          <section className="step">
            <h2>6. Salinity (% by weight)</h2>
            <p className="note">
              {isWet
                ? 'Equilibrium brine: this percentage is of meat + water together. The recommended default is conservative — under-salting a brine is easier to fix than over-salting.'
                : 'The recommendation below is for total salinity. If your recipe has other salty ingredients, scale this down.'}
            </p>
            <div className="slider-row">
              <input
                type="range"
                min="0"
                max="3"
                step="0.05"
                value={salinity}
                onChange={(e) => { setSalinity(parseFloat(e.target.value)); setSalinityTouched(true) }}
              />
              <span className="salinity-value">{Number(salinity).toFixed(2)}%</span>
            </div>
            <div className="slider-labels">
              <span>← less</span>
              <span>
                Recommended for {meat.type?.toLowerCase() || cut.toLowerCase()}: {(isWet ? wet.defaultSaltByWeight : meat.defaultSaltByWeight)}%
              </span>
              <span>more →</span>
            </div>
          </section>
        )}

        {isWet && salt && (
          <section className="step">
            <h2>7. Wet-brine specifics</h2>
            <div className="wet-grid">
              <label className="wet-field">
                <span className="wet-field-label">Brine-to-meat ratio</span>
                <span className="wet-field-help">grams of water per gram of meat (1 means equal weights)</span>
                <div className="slider-row compact">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={brineRatio}
                    onChange={(e) => setBrineRatio(parseFloat(e.target.value))}
                  />
                  <span className="salinity-value">{Number(brineRatio).toFixed(1)}×</span>
                </div>
              </label>

              <label className="wet-field">
                <span className="wet-field-label">Sugar (% of system)</span>
                <span className="wet-field-help">optional — balances flavor and aids browning</span>
                <div className="slider-row compact">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={sugarPct}
                    onChange={(e) => { setSugarPct(parseFloat(e.target.value)); setSugarTouched(true) }}
                  />
                  <span className="salinity-value">{Number(sugarPct).toFixed(1)}%</span>
                </div>
              </label>

              <label className="wet-field">
                <span className="wet-field-label">Cut thickness (inches)</span>
                <span className="wet-field-help">drives the brine time below — thicker = longer</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.25"
                  max="6"
                  step="0.25"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                />
              </label>
            </div>
          </section>
        )}

        <section className="result">
          <h2>Result</h2>
          {ready && result ? (
            result.type === 'wet' ? (
              <WetResult
                weight={weight}
                unit={unit}
                cut={cut}
                salt={salt}
                result={result}
                wet={wet}
                meat={meat}
                ratio={brineRatio}
              />
            ) : (
              <DryResult weight={weight} unit={unit} cut={cut} salt={salt} result={result} meat={meat} />
            )
          ) : (
            <ul className="todo">
              {!protein && <li>Pick a protein.</li>}
              {protein && !cut && <li>Pick a cut.</li>}
              {cut && (!weight || parseFloat(weight) <= 0) && <li>Enter a weight.</li>}
              {cut && !salt && <li>Pick a salt.</li>}
            </ul>
          )}
        </section>

        <footer className="colophon">
          <p>
            Dry-brine data is an homage to{' '}
            <a href="https://www.saltyourmeat.com/" target="_blank" rel="noopener noreferrer">saltyourmeat.com</a>{' '}
            by Will Liu. Wet-brine math borrows from{' '}
            <a href="https://destination-bbq.com/brining-calculator/" target="_blank" rel="noopener noreferrer">destination-bbq.com</a>{' '}
            with the more conservative defaults. The decision tree follows{' '}
            <a href="https://amazingribs.com/tested-recipes/salting-brining-curing-and-injecting/salting-and-wet-brining/" target="_blank" rel="noopener noreferrer">AmazingRibs</a>.
            All cooking judgement originates with those sources; any errors in transcription are mine.
          </p>
        </footer>
      </main>
    </div>
  )
}

function DryResult({ weight, unit, cut, salt, result, meat }) {
  return (
    <div className="result-body">
      <p className="answer">
        For {weight} {unit === 'lbs' ? (Number(weight) === 1 ? 'lb' : 'lbs') : 'kg'} of {cut.toLowerCase()},
        use <strong>{result.saltGrams.toFixed(1)} g</strong>
        {result.volume && <> (<strong>{result.volume}</strong>)</>} of {salt.toLowerCase()}.
      </p>
      <p className="howto">{expandInstruction(meat.instruction)}</p>

      {meat.resources && Object.keys(meat.resources).length > 0 && (
        <>
          <h3>Further reading</h3>
          <ul className="resources">
            {Object.entries(meat.resources).map(([title, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">{title}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function WetResult({ weight, unit, cut, salt, result, wet, meat, ratio }) {
  return (
    <div className="result-body">
      <p className="answer">
        For {weight} {unit === 'lbs' ? (Number(weight) === 1 ? 'lb' : 'lbs') : 'kg'} of {cut.toLowerCase()},
        dissolve <strong>{result.saltGrams.toFixed(0)} g</strong>
        {result.volume && <> (<strong>{result.volume}</strong>)</>} of {salt.toLowerCase()}
        {result.sugarGrams > 0.5 && <> and <strong>{result.sugarGrams.toFixed(0)} g</strong> sugar</>}
        {' '}in <strong>{(result.waterGrams / 1000).toFixed(2)} L</strong> of water, then submerge.
      </p>

      <h3>Brine for</h3>
      <p className="answer" style={{ margin: 0 }}>
        <strong>{formatHours(result.hours)}</strong>
        <span className="aux"> in the fridge (≤ 40°F / 4°C)</span>
      </p>

      <h3>What's in the bucket</h3>
      <dl className="spec-grid">
        <div>
          <dt>Meat</dt>
          <dd>{Math.round(result.meatGrams)} g</dd>
        </div>
        <div>
          <dt>Water</dt>
          <dd>{Math.round(result.waterGrams)} g <span className="aux">({Number(ratio).toFixed(1)}× meat)</span></dd>
        </div>
        <div>
          <dt>Salt</dt>
          <dd>{result.saltGrams.toFixed(0)} g</dd>
        </div>
        {result.sugarGrams > 0.5 && (
          <div>
            <dt>Sugar</dt>
            <dd>{result.sugarGrams.toFixed(0)} g</dd>
          </div>
        )}
      </dl>

      <h3>Notes</h3>
      <p className="howto">{wet.instruction}</p>

      {meat.resources && Object.keys(meat.resources).length > 0 && (
        <>
          <h3>Further reading</h3>
          <ul className="resources">
            {Object.entries(meat.resources).map(([title, url]) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">{title}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function DecisionPanel({ onApply }) {
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState({})
  const allAnswered = QUESTIONS.every(q => answers[q.id])
  const rec = allAnswered ? recommend(answers) : null

  return (
    <details className="decision" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>Help me decide which method to use</span>
        <span className="decision-chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </summary>
      <div className="decision-body">
        <p className="note" style={{ marginTop: 0 }}>
          A few yes/no questions, then a recommendation. Based on the AmazingRibs guidance.
        </p>
        {QUESTIONS.map((q) => (
          <div className="decision-q" key={q.id}>
            <p className="decision-q-label">{q.label}</p>
            <p className="decision-q-help">{q.help}</p>
            <ChoiceGroup
              name={`q-${q.id}`}
              options={q.options}
              value={answers[q.id] || ''}
              onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
              inline
            />
          </div>
        ))}
        {rec && (
          <div className={`decision-rec decision-rec--${rec.method}`}>
            <h3>{rec.title}</h3>
            <p>{rec.reason}</p>
            {(rec.method === 'dry' || rec.method === 'wet') && (
              <button type="button" className="decision-apply" onClick={() => onApply(rec.method)}>
                Use {rec.method} brine in the calculator below
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  )
}

function SiteMasthead({ currentHref }) {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <header className="masthead">
      <a className="brand" href="/" rel="home" aria-label="Table M home">
        <img
          src="/assets/images/tablem-logo2x-300x80.png"
          srcSet="/assets/images/tablem-logo2x-300x80.png 300w, /assets/images/tablem-logo2x-450x120.png 450w"
          sizes="150px"
          alt="Table M"
          width="150"
          height="40"
        />
      </a>
      <button
        type="button"
        className="nav-toggle"
        aria-label={navOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={navOpen}
        onClick={() => setNavOpen(o => !o)}
      >
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
      </button>
      <nav className={navOpen ? 'is-open' : ''}>
        <a href="/">Recipes</a>
        <a href={currentHref} aria-current="page">Tools</a>
        <a href="/about.html">About</a>
      </nav>
    </header>
  )
}

function ChoiceGroup({ name, options, value, onChange, inline = false }) {
  return (
    <div className={inline ? 'choices choices-inline' : 'choices'}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={[
            'choice',
            value === opt.value ? 'selected' : '',
            opt.disabled ? 'disabled' : '',
          ].filter(Boolean).join(' ')}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={!!opt.disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="choice-label">{opt.label}</span>
          {opt.subtext && <span className="choice-subtext">{opt.subtext}</span>}
        </label>
      ))}
    </div>
  )
}
