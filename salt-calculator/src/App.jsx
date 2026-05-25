import { useEffect, useMemo, useState } from 'react'
import meatData from './data/meatData.json'
import saltData from './data/saltData.json'
import { expandInstruction } from './instructions.js'
import { formatTablespoons } from './volume.js'
import { formatHours } from './brineTime.js'
import { QUESTIONS, recommend } from './decision.js'

const PROTEINS = Object.keys(meatData)
const SALTS = Object.keys(saltData)
const UNITS = ['lbs', 'kg']
const WATER_UNITS = ['lb', 'kg', 'oz', 'g']

const MODES = [
  { value: 'dry', label: 'Dry brine', subtext: '% of meat weight' },
  { value: 'wet', label: 'Wet — concentration', subtext: '% of water, time-driven' },
  { value: 'equilibrium', label: 'Wet — equilibrium', subtext: '% of meat + water' },
]

// Diffusion-based estimate of internal salt %, anchored to the smoked-salmon
// cooking logs (5% × 3h × 1″ → ~1.75% internal). Time scales with thickness².
function internalSaltPct(saltPctOfWater, hours, thickIn) {
  if (!saltPctOfWater || !hours || !thickIn) return 0
  const k = 0.144
  const fraction = 1 - Math.exp(-k * hours / (thickIn * thickIn))
  return saltPctOfWater * fraction
}

function gramsFromWater(value, unit) {
  const v = parseFloat(value)
  if (!isFinite(v) || v <= 0) return 0
  if (unit === 'g')  return v
  if (unit === 'kg') return v * 1000
  if (unit === 'oz') return v * 28.3495
  if (unit === 'lb') return v * 453.592
  return v
}

export default function App() {
  const [mode, setMode] = useState('dry')
  const [protein, setProtein] = useState('')
  const [cut, setCut] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [salt, setSalt] = useState('')
  const [salinity, setSalinity] = useState(1.1)  // dry-brine % of meat weight
  const [salinityTouched, setSalinityTouched] = useState(false)

  // Dry-brine sugar (lox-style cures)
  const [drySugar, setDrySugar] = useState(0)
  const [drySugarTouched, setDrySugarTouched] = useState(false)
  const [cureDays, setCureDays] = useState(4)
  const [cureDaysTouched, setCureDaysTouched] = useState(false)

  // Wet-brine (concentration) extras
  const [waterAmount, setWaterAmount] = useState('2')
  const [waterUnit, setWaterUnit] = useState('lb')
  const [saltPctOfWater, setSaltPctOfWater] = useState(5)
  const [saltPctTouched, setSaltPctTouched] = useState(false)
  const [sugarPctOfWater, setSugarPctOfWater] = useState(3)
  const [sugarTouched, setSugarTouched] = useState(false)
  const [brineHoursState, setBrineHoursState] = useState(2)
  const [brineHoursTouched, setBrineHoursTouched] = useState(false)
  const [thickness, setThickness] = useState('1.0')

  // Equilibrium-brine extras
  const [eqSaltPct, setEqSaltPct] = useState(1)
  const [eqSaltTouched, setEqSaltTouched] = useState(false)
  const [eqSugarPct, setEqSugarPct] = useState(0.5)
  const [eqSugarTouched, setEqSugarTouched] = useState(false)
  const [eqRatio, setEqRatio] = useState(1.5)
  const [eqRatioTouched, setEqRatioTouched] = useState(false)

  const meat = protein && cut ? meatData[protein]?.[cut] : null
  const wet = meat?.wetBrine
  const eq = meat?.equilibriumBrine
  const isWet = mode === 'wet' && !!wet
  const isEq = mode === 'equilibrium' && !!eq
  const isLox = !!meat?.defaultCureDays  // dry-cure cut with sugar + days

  // When user picks a new cut, snap dry-mode salinity to the cut's default
  // (unless they've moved the slider).
  useEffect(() => {
    if (!meat || isWet || isEq) return
    if (!salinityTouched && meat.defaultSaltByWeight != null) {
      setSalinity(meat.defaultSaltByWeight)
    }
    if (!drySugarTouched) {
      setDrySugar(meat.defaultSugarByWeight != null ? meat.defaultSugarByWeight : 0)
    }
    if (!cureDaysTouched && meat.defaultCureDays != null) {
      setCureDays(meat.defaultCureDays)
    }
  }, [meat, isWet, isEq, salinityTouched, drySugarTouched, cureDaysTouched])

  // Wet-mode defaults
  useEffect(() => {
    if (!isWet) return
    if (!saltPctTouched && wet?.defaultSaltPctOfWater != null) {
      setSaltPctOfWater(wet.defaultSaltPctOfWater)
    }
    if (!sugarTouched && wet?.defaultSugarPctOfWater != null) {
      setSugarPctOfWater(wet.defaultSugarPctOfWater)
    }
    if (!brineHoursTouched && wet?.defaultBrineHours != null) {
      setBrineHoursState(wet.defaultBrineHours)
    }
    if (wet?.thicknessInches != null) {
      setThickness(String(wet.thicknessInches))
    }
  }, [isWet, wet, saltPctTouched, sugarTouched, brineHoursTouched])

  // Equilibrium-mode defaults
  useEffect(() => {
    if (!isEq) return
    if (!eqSaltTouched && eq?.defaultSaltPctOfSystem != null) setEqSaltPct(eq.defaultSaltPctOfSystem)
    if (!eqSugarTouched && eq?.defaultSugarPctOfSystem != null) setEqSugarPct(eq.defaultSugarPctOfSystem)
    if (!eqRatioTouched && eq?.defaultRatio != null) setEqRatio(eq.defaultRatio)
  }, [isEq, eq, eqSaltTouched, eqSugarTouched, eqRatioTouched])

  // Reset cut when protein changes and the prior cut doesn't exist on the new one.
  useEffect(() => {
    if (protein && cut && !meatData[protein]?.[cut]) setCut('')
  }, [protein, cut])

  // If the active mode isn't supported by the chosen cut, bounce back to dry.
  useEffect(() => {
    if (mode === 'wet' && meat && !wet) setMode('dry')
    if (mode === 'equilibrium' && meat && !eq) setMode('dry')
  }, [mode, meat, wet, eq])

  const result = useMemo(() => {
    if (!meat || !salt) return null

    if (isWet) {
      const waterGrams = gramsFromWater(waterAmount, waterUnit)
      if (!waterGrams) return null
      const saltGrams = waterGrams * (saltPctOfWater / 100)
      const sugarGrams = waterGrams * (sugarPctOfWater / 100)
      const tbsp = saltGrams / saltData[salt].gramsPerTbsp
      const thickIn = parseFloat(thickness) || meat.wetBrine.thicknessInches
      return {
        type: 'wet',
        saltGrams,
        sugarGrams,
        waterGrams,
        tbsp,
        volume: formatTablespoons(tbsp),
        hours: brineHoursState,
        internalPct: internalSaltPct(saltPctOfWater, brineHoursState, thickIn),
      }
    }

    if (isEq) {
      const w = parseFloat(weight)
      if (!w || w <= 0) return null
      const meatGrams = unit === 'lbs' ? w * 453.592 : w * 1000
      const waterGrams = meatGrams * eqRatio
      const systemGrams = meatGrams + waterGrams
      const saltGrams = systemGrams * (eqSaltPct / 100)
      const sugarGrams = systemGrams * (eqSugarPct / 100)
      const tbsp = saltGrams / saltData[salt].gramsPerTbsp
      return {
        type: 'equilibrium',
        meatGrams,
        waterGrams,
        saltGrams,
        sugarGrams,
        tbsp,
        volume: formatTablespoons(tbsp),
      }
    }

    const w = parseFloat(weight)
    if (!w || w <= 0) return null
    const meatGrams = unit === 'lbs' ? w * 453.592 : w * 1000
    const totalSaltGrams = meatGrams * (salinity / 100)
    const sugarGrams = meatGrams * (drySugar / 100)
    const tbsp = totalSaltGrams / saltData[salt].gramsPerTbsp
    return {
      type: 'dry',
      meatGrams,
      saltGrams: totalSaltGrams,
      sugarGrams,
      tbsp,
      volume: formatTablespoons(tbsp),
      cureDays: isLox ? cureDays : null,
    }
  }, [meat, salt, weight, unit, salinity, drySugar, cureDays, isLox, mode, isWet, isEq, waterAmount, waterUnit, saltPctOfWater, sugarPctOfWater, brineHoursState, thickness, eqSaltPct, eqSugarPct, eqRatio])

  const ready = isWet
    ? meat && salt && gramsFromWater(waterAmount, waterUnit) > 0
    : meat && salt && weight && parseFloat(weight) > 0

  const resetTouched = () => {
    setSalinityTouched(false)
    setDrySugarTouched(false)
    setCureDaysTouched(false)
    setSaltPctTouched(false)
    setSugarTouched(false)
    setBrineHoursTouched(false)
    setEqSaltTouched(false)
    setEqSugarTouched(false)
    setEqRatioTouched(false)
  }

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

        <DecisionPanel onApply={(m) => { setMode(m); resetTouched() }} />

        <section className="step">
          <h2>1. Brining method</h2>
          <ChoiceGroup
            name="mode"
            options={MODES}
            value={mode}
            onChange={(v) => { setMode(v); resetTouched() }}
          />
          {mode === 'wet' && meat && !wet && (
            <p className="note" style={{ marginTop: '0.75rem' }}>
              This cut isn't a great wet-brine candidate. Switching back to dry.
            </p>
          )}
          {mode === 'equilibrium' && meat && !eq && (
            <p className="note" style={{ marginTop: '0.75rem' }}>
              No equilibrium-brine profile for this cut. Switching back to dry.
            </p>
          )}
        </section>

        <section className="step">
          <h2>2. What protein are you brining?</h2>
          <ChoiceGroup
            name="protein"
            options={PROTEINS.map(p => ({ value: p, label: p }))}
            value={protein}
            onChange={(v) => { setProtein(v); setCut(''); resetTouched() }}
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
                const supportsEq = !!cutData.equilibriumBrine
                const wetDisabled = mode === 'wet' && !supportsWet
                const eqDisabled = mode === 'equilibrium' && !supportsEq
                let subtext = null
                if (wetDisabled) subtext = 'no wet brine'
                else if (eqDisabled) subtext = 'no equilibrium'
                return {
                  value: c,
                  label: c,
                  subtext,
                  disabled: wetDisabled || eqDisabled,
                }
              })}
              value={cut}
              onChange={(v) => { setCut(v); resetTouched() }}
            />
          </section>
        )}

        {cut && !isWet && (
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
            <h2>{isWet ? '4.' : '5.'} Which salt are you using?</h2>
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

        {salt && meat && !isWet && !isEq && (
          <section className="step">
            <h2>6. {isLox ? 'Cure' : 'Salinity (% by weight)'}</h2>
            <p className="note">
              {isLox
                ? <>Heavy dry cure: salt and sugar are % of fillet weight. Anchored to the gravlax recipe — 5% salt, 2.5% sugar, 4 days.</>
                : <>The recommendation below is for total salinity. If your recipe has other salty ingredients, scale this down.</>}
            </p>
            <div className="brine-rows">
              <div className="brine-row">
                <label htmlFor="dry-salt" className="brine-row__label">Salt % of meat</label>
                <input
                  id="dry-salt"
                  type="range"
                  min="0"
                  max={isLox ? 8 : 3}
                  step="0.05"
                  value={salinity}
                  onChange={(e) => { setSalinity(parseFloat(e.target.value)); setSalinityTouched(true) }}
                />
                <span className="brine-row__readout">{Number(salinity).toFixed(2)}%</span>
              </div>
              {isLox && (
                <div className="brine-row">
                  <label htmlFor="dry-sugar" className="brine-row__label">Sugar % of meat</label>
                  <input
                    id="dry-sugar"
                    type="range"
                    min="0"
                    max="6"
                    step="0.05"
                    value={drySugar}
                    onChange={(e) => { setDrySugar(parseFloat(e.target.value)); setDrySugarTouched(true) }}
                  />
                  <span className="brine-row__readout">{Number(drySugar).toFixed(2)}%</span>
                </div>
              )}
              {isLox && (
                <div className="brine-row">
                  <label htmlFor="dry-days" className="brine-row__label">Cure time</label>
                  <input
                    id="dry-days"
                    type="range"
                    min="1"
                    max="7"
                    step="1"
                    value={cureDays}
                    onChange={(e) => { setCureDays(parseFloat(e.target.value)); setCureDaysTouched(true) }}
                  />
                  <span className="brine-row__readout">{cureDays} day{cureDays === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            {!isLox && (
              <div className="slider-labels">
                <span>← less</span>
                <span>
                  Recommended for {meat.type?.toLowerCase() || cut.toLowerCase()}: {meat.defaultSaltByWeight}%
                </span>
                <span>more →</span>
              </div>
            )}
          </section>
        )}

        {isEq && salt && (
          <section className="step">
            <h2>6. Brine (equilibrium)</h2>
            <p className="note">
              Equilibrium brine — salt and sugar are % of meat + water combined, so the meat can never get saltier than the brine. Recommended for {meat.type?.toLowerCase() || cut.toLowerCase()}: {eq.defaultSaltPctOfSystem}% salt, {eq.defaultRatio}× water.
            </p>
            <div className="brine-rows">
              <div className="brine-row">
                <label htmlFor="eq-ratio" className="brine-row__label">Water : meat ratio</label>
                <input
                  id="eq-ratio"
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={eqRatio}
                  onChange={(e) => { setEqRatio(parseFloat(e.target.value)); setEqRatioTouched(true) }}
                />
                <span className="brine-row__readout">{Number(eqRatio).toFixed(1)}×</span>
              </div>
              <div className="brine-row">
                <label htmlFor="eq-salt" className="brine-row__label">Salt % of system</label>
                <input
                  id="eq-salt"
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  value={eqSaltPct}
                  onChange={(e) => { setEqSaltPct(parseFloat(e.target.value)); setEqSaltTouched(true) }}
                />
                <span className="brine-row__readout">{Number(eqSaltPct).toFixed(2)}%</span>
              </div>
              <div className="brine-row">
                <label htmlFor="eq-sugar" className="brine-row__label">Sugar % of system</label>
                <input
                  id="eq-sugar"
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  value={eqSugarPct}
                  onChange={(e) => { setEqSugarPct(parseFloat(e.target.value)); setEqSugarTouched(true) }}
                />
                <span className="brine-row__readout">{Number(eqSugarPct).toFixed(2)}%</span>
              </div>
            </div>
          </section>
        )}

        {isWet && salt && (
          <section className="step">
            <h2>6. Brine</h2>
            <p className="note">
              Concentration (gradient) brine — the brine is much saltier than the target internal saltiness, and you pull the meat before it equilibrates. Salt and sugar are expressed as % of water weight. Recommended for {meat.type?.toLowerCase() || cut.toLowerCase()}: {wet.defaultSaltPctOfWater}% salt, {formatHours(wet.defaultBrineHours)}.
            </p>
            <div className="brine-rows">
              <div className="brine-row">
                <label htmlFor="brine-water" className="brine-row__label">Water</label>
                <input
                  id="brine-water"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="brine-row__num"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(e.target.value)}
                />
                <select
                  className="brine-row__unit"
                  value={waterUnit}
                  onChange={(e) => setWaterUnit(e.target.value)}
                >
                  {WATER_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="brine-row">
                <label htmlFor="brine-salt" className="brine-row__label">Salt % of water</label>
                <input
                  id="brine-salt"
                  type="range"
                  min="0"
                  max="8"
                  step="0.25"
                  value={saltPctOfWater}
                  onChange={(e) => { setSaltPctOfWater(parseFloat(e.target.value)); setSaltPctTouched(true) }}
                />
                <span className="brine-row__readout">{Number(saltPctOfWater).toFixed(2)}%</span>
              </div>

              <div className="brine-row">
                <label htmlFor="brine-sugar" className="brine-row__label">Sugar % of water</label>
                <input
                  id="brine-sugar"
                  type="range"
                  min="0"
                  max="8"
                  step="0.25"
                  value={sugarPctOfWater}
                  onChange={(e) => { setSugarPctOfWater(parseFloat(e.target.value)); setSugarTouched(true) }}
                />
                <span className="brine-row__readout">{Number(sugarPctOfWater).toFixed(2)}%</span>
              </div>

              <div className="brine-row">
                <label htmlFor="brine-time" className="brine-row__label">Brine time</label>
                <input
                  id="brine-time"
                  type="range"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={brineHoursState}
                  onChange={(e) => { setBrineHoursState(parseFloat(e.target.value)); setBrineHoursTouched(true) }}
                />
                <span className="brine-row__readout">{formatHours(brineHoursState)}</span>
              </div>

              <div className="brine-row">
                <label htmlFor="brine-thick" className="brine-row__label">Thickness (inches)</label>
                <input
                  id="brine-thick"
                  type="number"
                  inputMode="decimal"
                  min="0.25"
                  max="6"
                  step="0.25"
                  className="brine-row__num"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        <section className="result">
          <h2>Result</h2>
          {ready && result ? (
            result.type === 'wet' ? (
              <WetResult
                cut={cut}
                salt={salt}
                result={result}
                wet={wet}
                meat={meat}
                saltPctOfWater={saltPctOfWater}
                sugarPctOfWater={sugarPctOfWater}
              />
            ) : result.type === 'equilibrium' ? (
              <EquilibriumResult
                weight={weight}
                unit={unit}
                cut={cut}
                salt={salt}
                result={result}
                eq={eq}
                meat={meat}
                eqSaltPct={eqSaltPct}
                eqSugarPct={eqSugarPct}
                eqRatio={eqRatio}
              />
            ) : (
              <DryResult weight={weight} unit={unit} cut={cut} salt={salt} result={result} meat={meat} isLox={isLox} />
            )
          ) : (
            <ul className="todo">
              {!protein && <li>Pick a protein.</li>}
              {protein && !cut && <li>Pick a cut.</li>}
              {cut && !isWet && (!weight || parseFloat(weight) <= 0) && <li>Enter a weight.</li>}
              {cut && isWet && gramsFromWater(waterAmount, waterUnit) <= 0 && <li>Enter a water amount.</li>}
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

function DryResult({ weight, unit, cut, salt, result, meat, isLox }) {
  const weightLabel = unit === 'lbs' ? (Number(weight) === 1 ? 'lb' : 'lbs') : 'kg'
  return (
    <div className="result-body">
      <p className="answer">
        For {weight} {weightLabel} of {cut.toLowerCase()},
        use <strong>{result.saltGrams.toFixed(1)} g</strong>
        {result.volume && <> (<strong>{result.volume}</strong>)</>} of {salt.toLowerCase()}
        {isLox && result.sugarGrams > 0.5 && <> and <strong>{result.sugarGrams.toFixed(1)} g</strong> sugar</>}.
      </p>

      {isLox && (
        <>
          <h3>Cure for</h3>
          <p className="answer" style={{ margin: 0 }}>
            <strong>{result.cureDays} day{result.cureDays === 1 ? '' : 's'}</strong>
            <span className="aux"> in the fridge, flipping daily</span>
          </p>

          <h3>What's on the fillet</h3>
          <dl className="spec-grid">
            <div>
              <dt>Fillet</dt>
              <dd>{Math.round(result.meatGrams)} g</dd>
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
        </>
      )}

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

function EquilibriumResult({ weight, unit, cut, salt, result, eq, meat, eqSaltPct, eqSugarPct, eqRatio }) {
  const weightLabel = unit === 'lbs' ? (Number(weight) === 1 ? 'lb' : 'lbs') : 'kg'
  return (
    <div className="result-body">
      <p className="answer">
        For {weight} {weightLabel} of {cut.toLowerCase()}, mix
        {' '}<strong>{(result.waterGrams / 1000).toFixed(2)} L</strong> water
        {' '}with <strong>{result.saltGrams.toFixed(0)} g</strong>
        {result.volume && <> (<strong>{result.volume}</strong>)</>} of {salt.toLowerCase()}
        {result.sugarGrams > 0.5 && <> and <strong>{result.sugarGrams.toFixed(0)} g</strong> sugar</>},
        {' '}then submerge.
      </p>

      <h3>Brine for</h3>
      <p className="answer" style={{ margin: 0 }}>
        <strong>at least 8 hours</strong>
        <span className="aux"> in the fridge — equilibrium self-limits, so longer is fine</span>
      </p>

      <h3>What's in the bucket</h3>
      <dl className="spec-grid">
        <div>
          <dt>Meat</dt>
          <dd>{Math.round(result.meatGrams)} g</dd>
        </div>
        <div>
          <dt>Water</dt>
          <dd>{Math.round(result.waterGrams)} g <span className="aux">({Number(eqRatio).toFixed(1)}× meat)</span></dd>
        </div>
        <div>
          <dt>Salt</dt>
          <dd>{result.saltGrams.toFixed(0)} g <span className="aux">({Number(eqSaltPct).toFixed(2)}% of system)</span></dd>
        </div>
        {result.sugarGrams > 0.5 && (
          <div>
            <dt>Sugar</dt>
            <dd>{result.sugarGrams.toFixed(0)} g <span className="aux">({Number(eqSugarPct).toFixed(2)}% of system)</span></dd>
          </div>
        )}
      </dl>

      <h3>Notes</h3>
      <p className="howto">{eq.instruction}</p>

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

function WetResult({ cut, salt, result, wet, meat, saltPctOfWater, sugarPctOfWater }) {
  return (
    <div className="result-body">
      <p className="answer">
        For {cut.toLowerCase()}, dissolve <strong>{result.saltGrams.toFixed(0)} g</strong>
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
          <dt>Water</dt>
          <dd>{Math.round(result.waterGrams)} g</dd>
        </div>
        <div>
          <dt>Salt</dt>
          <dd>{result.saltGrams.toFixed(0)} g <span className="aux">({Number(saltPctOfWater).toFixed(2)}% of water)</span></dd>
        </div>
        {result.sugarGrams > 0.5 && (
          <div>
            <dt>Sugar</dt>
            <dd>{result.sugarGrams.toFixed(0)} g <span className="aux">({Number(sugarPctOfWater).toFixed(2)}% of water)</span></dd>
          </div>
        )}
        <div>
          <dt>≈ Internal salt at pull</dt>
          <dd>{result.internalPct.toFixed(2)}%</dd>
        </div>
      </dl>

      <p className="note" style={{ marginTop: '0.75rem' }}>
        Internal salt is a rough diffusion estimate (anchored to 5% × 3h × 1″ ≈ 1.75% internal). Use it to compare options, not as a precise readout.
      </p>

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
