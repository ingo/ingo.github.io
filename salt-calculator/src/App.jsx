import { useEffect, useMemo, useState } from 'react'
import meatData from './data/meatData.json'
import saltData from './data/saltData.json'
import { expandInstruction } from './instructions.js'
import { formatTablespoons } from './volume.js'

const PROTEINS = Object.keys(meatData)
const SALTS = Object.keys(saltData)
const UNITS = ['lbs', 'kg']

export default function App() {
  const [protein, setProtein] = useState('')
  const [cut, setCut] = useState('')
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [salt, setSalt] = useState('')
  const [salinity, setSalinity] = useState(1.1)
  const [salinityTouched, setSalinityTouched] = useState(false)

  const meat = protein && cut ? meatData[protein]?.[cut] : null

  // Whenever you pick a new cut, snap the slider to the recommended salinity
  // for that cut — unless you've already pulled the slider yourself, in which
  // case keep your value.
  useEffect(() => {
    if (!meat) return
    if (!salinityTouched && meat.defaultSaltByWeight != null) {
      setSalinity(meat.defaultSaltByWeight)
    }
  }, [meat, salinityTouched])

  // Reset cut if you change protein and the prior cut doesn't exist on the new one.
  useEffect(() => {
    if (protein && cut && !meatData[protein]?.[cut]) setCut('')
  }, [protein, cut])

  const result = useMemo(() => {
    const w = parseFloat(weight)
    if (!meat || !salt || !w || w <= 0) return null
    const grams = unit === 'lbs' ? w * 453.592 : w * 1000
    const totalSaltGrams = grams * (salinity / 100)
    const tbsp = totalSaltGrams / saltData[salt].gramsPerTbsp
    return {
      grams: totalSaltGrams,
      tbsp,
      volume: formatTablespoons(tbsp),
    }
  }, [meat, salt, weight, unit, salinity])

  const ready = meat && salt && weight && parseFloat(weight) > 0

  return (
    <div className="page">
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
        <nav>
          <a href="/">Recipes</a>
          <a href="/salt-calculator/" aria-current="page">Tools</a>
          <a href="/about.html">About</a>
        </nav>
      </header>

      <main className="content">
        <div className="lede">
          <p className="kicker">Kitchen tools</p>
          <h1>Dry-Brining Salt Calculator</h1>
          <p className="standfirst">
            Pick the protein, weigh it, choose your salt. The calculator returns
            both grams and a volume measurement so you can use whichever works
            in your kitchen. Recommended salinities are loaded per cut and you
            can fine-tune with the slider.
          </p>
        </div>

        <section className="step">
          <h2>1. What protein are you brining?</h2>
          <ChoiceGroup
            name="protein"
            options={PROTEINS.map(p => ({ value: p, label: p }))}
            value={protein}
            onChange={(v) => { setProtein(v); setCut(''); setSalinityTouched(false) }}
          />
        </section>

        {protein && (
          <section className="step">
            <h2>2. What cut?</h2>
            <ChoiceGroup
              name="cut"
              options={Object.keys(meatData[protein]).map(c => ({ value: c, label: c }))}
              value={cut}
              onChange={(v) => { setCut(v); setSalinityTouched(false) }}
            />
          </section>
        )}

        {cut && (
          <section className="step">
            <h2>3. How much does it weigh?</h2>
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
            <h2>4. Which salt are you using?</h2>
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
            <h2>5. Salinity (% by weight)</h2>
            <p className="note">
              The recommendation below is for <em>total</em> salinity. If your
              recipe has other salty ingredients, scale this down.
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
                Recommended for {meat.type?.toLowerCase() || cut.toLowerCase()}: {meat.defaultSaltByWeight}%
              </span>
              <span>more →</span>
            </div>
          </section>
        )}

        <section className="result">
          <h2>Result</h2>
          {ready && result ? (
            <div className="result-body">
              <p className="answer">
                For {weight} {unit === 'lbs' ? (Number(weight) === 1 ? 'lb' : 'lbs') : (Number(weight) === 1 ? 'kg' : 'kg')} of {cut.toLowerCase()},
                use <strong>{result.grams.toFixed(1)} g</strong>
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
            An homage to <a href="https://www.saltyourmeat.com/" target="_blank" rel="noopener noreferrer">saltyourmeat.com</a> by Will Liu —
            same per-cut salinities and salt density data, rebuilt to live alongside the rest of the recipes here.
            All cooking advice originates with the source; any errors in transcription are mine.
          </p>
        </footer>
      </main>
    </div>
  )
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
