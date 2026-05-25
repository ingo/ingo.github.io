// Inline brine calculator. Reads meat/salt data from window.__BRINE_DATA__ and
// window.__SALT_DATA__ which the build pipeline injects from
// salt-calculator/src/data/*.json so the widget and the full calculator stay
// in lockstep.
(function () {
  if (typeof window === 'undefined') return

  // Diffusion model anchored to 5% × 3h × 1″ → ~1.75% internal salt.
  function internalSaltPct(saltPctOfWater, hours, thickIn) {
    if (!saltPctOfWater || !hours || !thickIn) return 0
    var k = 0.144
    var fraction = 1 - Math.exp(-k * hours / (thickIn * thickIn))
    return saltPctOfWater * fraction
  }

  function formatHours(h) {
    if (h == null) return ''
    if (h < 1) {
      var m = Math.round(h * 60 / 5) * 5
      return m + ' minutes'
    }
    if (h < 4) {
      var hv = Math.round(h * 4) / 4
      return hv === 1 ? '1 hour' : hv + ' hours'
    }
    return Math.round(h) + ' hours'
  }

  function fmtGrams(g) {
    if (!isFinite(g) || g <= 0) return '0 g'
    if (g >= 1000) return (g / 1000).toFixed(2) + ' kg'
    if (g >= 100) return g.toFixed(0) + ' g'
    if (g >= 10) return g.toFixed(1) + ' g'
    return g.toFixed(2) + ' g'
  }

  // Imperial-aware mass formatter for meat/salt/sugar — e.g. "113 g · 4.0 oz".
  function fmtMass(g, imperial) {
    var base = fmtGrams(g)
    if (!imperial || !isFinite(g) || g <= 0) return base
    var oz = g / 28.3495
    if (oz >= 16) {
      var lb = oz / 16
      return base + ' · ' + lb.toFixed(2) + ' lb'
    }
    return base + ' · ' + oz.toFixed(2) + ' oz'
  }

  // Water mass → cups/quarts when imperial. 1 US cup of water ≈ 236.59 g.
  function fmtWater(g, imperial) {
    var base = fmtGrams(g)
    if (!imperial || !isFinite(g) || g <= 0) return base
    var cups = g / 236.59
    if (cups >= 4) {
      var qts = cups / 4
      return base + ' · ' + cups.toFixed(1) + ' cups (' + qts.toFixed(2) + ' qt)'
    }
    return base + ' · ' + cups.toFixed(2) + ' cups'
  }

  // Pretty-print Tbsp rounded to nearest ¼.
  function fmtTbsp(tbsp) {
    var q = Math.round(tbsp * 4) / 4
    var whole = Math.floor(q)
    var frac = q - whole
    var fracStr = ''
    if (frac === 0.25) fracStr = '¼'
    else if (frac === 0.5) fracStr = '½'
    else if (frac === 0.75) fracStr = '¾'
    if (whole === 0) return (fracStr || '0') + ' Tbsp'
    if (frac === 0) return whole + ' Tbsp'
    return whole + fracStr + ' Tbsp'
  }

  // Salt-specific: append a volume conversion if the chosen salt has a density.
  function fmtSalt(g, saltType, imperial) {
    var base = fmtMass(g, imperial)
    var salt = findSalt(saltType)
    if (!salt || !salt.gramsPerTbsp || !isFinite(g) || g <= 0) return base
    var tbsp = g / salt.gramsPerTbsp
    var vol
    if (tbsp >= 16) {
      var cups = tbsp / 16
      vol = cups.toFixed(2) + ' cups'
    } else if (tbsp >= 1) {
      vol = fmtTbsp(tbsp)
    } else {
      var tsp = tbsp * 3
      vol = tsp.toFixed(1) + ' tsp'
    }
    return base + ' · ' + vol + ' ' + saltType
  }

  function gramsFromInput(value, unit) {
    var v = parseFloat(value)
    if (!isFinite(v) || v <= 0) return 0
    if (unit === 'g')  return v
    if (unit === 'kg') return v * 1000
    if (unit === 'oz') return v * 28.3495
    if (unit === 'lb') return v * 453.592
    return v
  }

  function findCut(category, cut) {
    var data = window.__BRINE_DATA__ || {}
    var cat = data[category]
    return cat ? cat[cut] : null
  }

  function findSalt(name) {
    var data = window.__SALT_DATA__ || {}
    return data && name ? data[name] : null
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag)
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') n.className = attrs[k]
        else if (k === 'html') n.innerHTML = attrs[k]
        else n.setAttribute(k, attrs[k])
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i]
        if (c == null) continue
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
      }
    }
    return n
  }

  function attr(host, name) {
    var v = host.getAttribute(name)
    if (v == null) return ''
    // Pandoc occasionally line-wraps long attribute values; normalize whitespace.
    return v.replace(/\s+/g, ' ').trim()
  }

  function build(host) {
    var category = attr(host, 'data-category')
    var cut = attr(host, 'data-cut')
    var defaultMode = attr(host, 'data-mode') || 'dry'
    var info = findCut(category, cut)
    if (!info) {
      host.innerHTML = '<p class="brine-widget__error">Brine widget: missing cut "' + category + ' / ' + cut + '".</p>'
      return
    }

    var hasWet = !!info.wetBrine
    var hasEq = !!info.equilibriumBrine
    var isLox = info.defaultCureDays != null

    var initialMode = defaultMode
    if (initialMode === 'wet' && !hasWet) initialMode = 'dry'
    if (initialMode === 'equilibrium' && !hasEq) initialMode = 'dry'

    // Per-recipe defaults for weight + salt brand.
    var defWeight = parseFloat(attr(host, 'data-default-weight'))
    var defWeightUnit = attr(host, 'data-default-weight-unit')
    var defSaltType = attr(host, 'data-salt-type')

    var weightUnits = ['lb', 'kg', 'oz', 'g']
    var startUnit = weightUnits.indexOf(defWeightUnit) >= 0 ? defWeightUnit : 'lb'
    var startWeight = isFinite(defWeight) && defWeight > 0 ? defWeight : 2

    var saltData = window.__SALT_DATA__ || {}
    var saltNames = Object.keys(saltData)
    var startSalt = defSaltType && saltData[defSaltType] ? defSaltType
      : (saltNames.indexOf('Diamond Kosher') >= 0 ? 'Diamond Kosher' : (saltNames[0] || ''))

    var state = {
      mode: initialMode,
      weight: startWeight,
      weightUnit: startUnit,
      saltType: startSalt,
      // Dry
      drySalt: info.defaultSaltByWeight || 1,
      drySugar: info.defaultSugarByWeight || 0,
      cureDays: info.defaultCureDays || 4,
      // Wet (concentration)
      waterAmount: 2,
      waterUnit: 'lb',
      saltPctOfWater: hasWet ? info.wetBrine.defaultSaltPctOfWater : 5,
      sugarPctOfWater: hasWet ? info.wetBrine.defaultSugarPctOfWater : 3,
      brineHours: hasWet ? info.wetBrine.defaultBrineHours : 2,
      thickness: hasWet ? info.wetBrine.thicknessInches : 1,
      // Equilibrium
      eqSaltPct: hasEq ? info.equilibriumBrine.defaultSaltPctOfSystem : 1,
      eqSugarPct: hasEq ? info.equilibriumBrine.defaultSugarPctOfSystem : 0.5,
      eqRatio: hasEq ? info.equilibriumBrine.defaultRatio : 1.5,
    }

    function isImperial() {
      // The wet-concentration tab has no meat input — fall back to the brine
      // water unit so the readout still tracks what the user is typing.
      var u = state.mode === 'wet' ? state.waterUnit : state.weightUnit
      return u === 'lb' || u === 'oz'
    }

    host.innerHTML = ''
    host.className = (host.className || '') + ' brine-widget'

    host.appendChild(el('div', { class: 'brine-widget__head' }, [
      el('strong', null, [category + ' · ' + cut]),
      el('a', { class: 'brine-widget__link', href: '/salt-calculator/', target: '_blank', rel: 'noopener' }, ['Open full calculator →']),
    ]))

    var modeRow = el('div', { class: 'brine-widget__modes' })
    var nameSeed = 'bw-mode-' + Math.random().toString(36).slice(2, 8)
    function makeModeBtn(label, value, disabled) {
      var btn = el('label', { class: 'brine-widget__mode' + (disabled ? ' is-disabled' : '') + (value === state.mode ? ' is-active' : '') })
      var input = el('input', { type: 'radio', value: value })
      input.name = nameSeed
      if (value === state.mode) input.checked = true
      if (disabled) input.disabled = true
      input.addEventListener('change', function () {
        if (input.checked) {
          state.mode = value
          renderBody()
        }
      })
      btn.appendChild(input)
      btn.appendChild(document.createTextNode(' ' + label))
      return btn
    }
    modeRow.appendChild(makeModeBtn(isLox ? 'Dry cure' : 'Dry brine', 'dry', false))
    modeRow.appendChild(makeModeBtn('Wet — concentration', 'wet', !hasWet))
    modeRow.appendChild(makeModeBtn('Wet — equilibrium', 'equilibrium', !hasEq))
    host.appendChild(modeRow)

    var bodyHost = el('div', { class: 'brine-widget__body' })
    host.appendChild(bodyHost)

    function rangeRow(labelText, min, max, step, value, onChange, formatter) {
      var slider = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) })
      var readout = el('span', { class: 'brine-widget__readout' }, [formatter(value)])
      slider.addEventListener('input', function () {
        var v = parseFloat(slider.value)
        readout.textContent = formatter(v)
        onChange(v)
      })
      return el('div', { class: 'brine-widget__row' }, [
        el('label', { class: 'brine-widget__label' }, [labelText]),
        slider,
        readout,
      ])
    }

    function numberRow(labelText, value, unitOptions, currentUnit, onValue, onUnit) {
      var num = el('input', { type: 'number', step: '0.01', min: '0', value: String(value), class: 'brine-widget__num' })
      num.addEventListener('input', function () { onValue(parseFloat(num.value)) })
      var children = [el('label', { class: 'brine-widget__label' }, [labelText]), num]
      if (unitOptions) {
        var sel = el('select', { class: 'brine-widget__unit' })
        unitOptions.forEach(function (u) {
          var opt = el('option', { value: u }, [u])
          if (u === currentUnit) opt.selected = true
          sel.appendChild(opt)
        })
        sel.addEventListener('change', function () { onUnit(sel.value) })
        children.push(sel)
      }
      return el('div', { class: 'brine-widget__row' }, children)
    }

    function pctFmt(v) { return parseFloat(v).toFixed(2) + '%' }
    function ratioFmt(v) { return parseFloat(v).toFixed(2) + '×' }
    function hoursFmt(v) { return formatHours(parseFloat(v)) }
    function daysFmt(v) {
      var n = parseFloat(v)
      return n + ' day' + (n === 1 ? '' : 's')
    }
    function inFmt(v) { return parseFloat(v).toFixed(2) + '″' }

    function setActiveMode() {
      var labels = modeRow.querySelectorAll('label.brine-widget__mode')
      for (var i = 0; i < labels.length; i++) {
        var input = labels[i].querySelector('input')
        labels[i].classList.toggle('is-active', input && input.value === state.mode)
      }
    }

    var outSalt, outSugar, outWater, outMeat, outTime, outInternal, outDays, weightInputEl, weightUnitEl

    function renderWeight() {
      weightInputEl = el('input', { type: 'number', step: '0.01', min: '0', value: String(state.weight), class: 'brine-widget__num' })
      weightUnitEl = el('select', { class: 'brine-widget__unit' })
      weightUnits.forEach(function (u) {
        var opt = el('option', { value: u }, [u])
        if (u === state.weightUnit) opt.selected = true
        weightUnitEl.appendChild(opt)
      })
      weightInputEl.addEventListener('input', function () {
        state.weight = parseFloat(weightInputEl.value)
        recompute()
      })
      weightUnitEl.addEventListener('change', function () {
        state.weightUnit = weightUnitEl.value
        recompute()
      })
      return el('div', { class: 'brine-widget__row' }, [
        el('label', { class: 'brine-widget__label' }, [isLox ? 'Fillet weight' : 'Meat weight']),
        weightInputEl,
        weightUnitEl,
      ])
    }

    function renderSaltType() {
      if (!saltNames.length) return null
      var sel = el('select', { class: 'brine-widget__unit brine-widget__salt-type' })
      saltNames.forEach(function (n) {
        var opt = el('option', { value: n }, [n])
        if (n === state.saltType) opt.selected = true
        sel.appendChild(opt)
      })
      sel.addEventListener('change', function () {
        state.saltType = sel.value
        recompute()
      })
      return el('div', { class: 'brine-widget__row' }, [
        el('label', { class: 'brine-widget__label' }, ['Salt type']),
        sel,
      ])
    }

    function renderBody() {
      bodyHost.innerHTML = ''
      setActiveMode()

      if (state.mode === 'dry') {
        bodyHost.appendChild(renderWeight())
        var saltRow = renderSaltType()
        if (saltRow) bodyHost.appendChild(saltRow)
        bodyHost.appendChild(rangeRow(
          'Salt % of meat', 0, isLox ? 8 : 3, 0.05, state.drySalt,
          function (v) { state.drySalt = v; recompute() },
          pctFmt
        ))
        if (isLox) {
          bodyHost.appendChild(rangeRow(
            'Sugar % of meat', 0, 6, 0.05, state.drySugar,
            function (v) { state.drySugar = v; recompute() },
            pctFmt
          ))
          bodyHost.appendChild(rangeRow(
            'Cure time', 1, 7, 1, state.cureDays,
            function (v) { state.cureDays = v; recompute() },
            daysFmt
          ))
        }
        outSalt = el('span', { class: 'brine-widget__big' })
        outSugar = el('span', { class: 'brine-widget__big' })
        outDays = el('span', { class: 'brine-widget__big' })
        var dryGrid = [
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt to apply']), outSalt]),
        ]
        if (isLox) {
          dryGrid.push(el('div', null, [el('span', { class: 'brine-widget__small' }, ['Sugar to apply']), outSugar]))
          dryGrid.push(el('div', null, [el('span', { class: 'brine-widget__small' }, ['Cure for']), outDays]))
        }
        bodyHost.appendChild(el('div', { class: 'brine-widget__result brine-widget__result--grid' }, dryGrid))

      } else if (state.mode === 'wet') {
        bodyHost.appendChild(numberRow(
          'Water', state.waterAmount, weightUnits, state.waterUnit,
          function (v) { state.waterAmount = v; recompute() },
          function (u) { state.waterUnit = u; recompute() }
        ))
        var saltRow2 = renderSaltType()
        if (saltRow2) bodyHost.appendChild(saltRow2)
        bodyHost.appendChild(rangeRow(
          'Salt % of water', 0, 8, 0.25, state.saltPctOfWater,
          function (v) { state.saltPctOfWater = v; recompute() },
          pctFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Sugar % of water', 0, 8, 0.25, state.sugarPctOfWater,
          function (v) { state.sugarPctOfWater = v; recompute() },
          pctFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Brine time', 0.25, 24, 0.25, state.brineHours,
          function (v) { state.brineHours = v; recompute() },
          hoursFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Thickness', 0.25, 6, 0.25, state.thickness,
          function (v) { state.thickness = v; recompute() },
          inFmt
        ))
        outSalt = el('span', { class: 'brine-widget__big' })
        outSugar = el('span', { class: 'brine-widget__big' })
        outWater = el('span', { class: 'brine-widget__big' })
        outTime = el('span', { class: 'brine-widget__big' })
        outInternal = el('span', { class: 'brine-widget__big' })
        bodyHost.appendChild(el('div', { class: 'brine-widget__result brine-widget__result--grid' }, [
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt']), outSalt]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Sugar']), outSugar]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Water']), outWater]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Brine for']), outTime]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['≈ Internal salt']), outInternal]),
        ]))

      } else { // equilibrium
        bodyHost.appendChild(renderWeight())
        var saltRow3 = renderSaltType()
        if (saltRow3) bodyHost.appendChild(saltRow3)
        bodyHost.appendChild(rangeRow(
          'Water : meat ratio', 0.5, 3, 0.05, state.eqRatio,
          function (v) { state.eqRatio = v; recompute() },
          ratioFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Salt % of system', 0, 3, 0.05, state.eqSaltPct,
          function (v) { state.eqSaltPct = v; recompute() },
          pctFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Sugar % of system', 0, 3, 0.05, state.eqSugarPct,
          function (v) { state.eqSugarPct = v; recompute() },
          pctFmt
        ))
        outSalt = el('span', { class: 'brine-widget__big' })
        outSugar = el('span', { class: 'brine-widget__big' })
        outWater = el('span', { class: 'brine-widget__big' })
        outMeat = el('span', { class: 'brine-widget__big' })
        bodyHost.appendChild(el('div', { class: 'brine-widget__result brine-widget__result--grid' }, [
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Meat']), outMeat]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Water']), outWater]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt']), outSalt]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Sugar']), outSugar]),
        ]))
      }
      recompute()
    }

    function recompute() {
      var imp = isImperial()
      if (state.mode === 'dry') {
        var meatGrams = gramsFromInput(state.weight, state.weightUnit)
        var saltG = meatGrams * state.drySalt / 100
        var sugarG = meatGrams * state.drySugar / 100
        if (outSalt) outSalt.textContent = fmtSalt(saltG, state.saltType, imp)
        if (outSugar) outSugar.textContent = fmtMass(sugarG, imp)
        if (outDays) outDays.textContent = state.cureDays + ' day' + (state.cureDays === 1 ? '' : 's')
      } else if (state.mode === 'wet') {
        var waterG = gramsFromInput(state.waterAmount, state.waterUnit)
        var saltG2 = waterG * state.saltPctOfWater / 100
        var sugarG2 = waterG * state.sugarPctOfWater / 100
        var internal = internalSaltPct(state.saltPctOfWater, state.brineHours, state.thickness)
        if (outSalt) outSalt.textContent = fmtSalt(saltG2, state.saltType, imp)
        if (outSugar) outSugar.textContent = fmtMass(sugarG2, imp)
        if (outWater) outWater.textContent = fmtWater(waterG, imp)
        if (outTime) outTime.textContent = formatHours(state.brineHours)
        if (outInternal) outInternal.textContent = internal.toFixed(2) + '%'
      } else {
        var meatG3 = gramsFromInput(state.weight, state.weightUnit)
        var waterG3 = meatG3 * state.eqRatio
        var systemG = meatG3 + waterG3
        var saltG3 = systemG * state.eqSaltPct / 100
        var sugarG3 = systemG * state.eqSugarPct / 100
        if (outMeat) outMeat.textContent = fmtMass(meatG3, imp)
        if (outWater) outWater.textContent = fmtWater(waterG3, imp)
        if (outSalt) outSalt.textContent = fmtSalt(saltG3, state.saltType, imp)
        if (outSugar) outSugar.textContent = fmtMass(sugarG3, imp)
      }
    }

    renderBody()
  }

  function init() {
    var hosts = document.querySelectorAll('[data-brine-widget]')
    for (var i = 0; i < hosts.length; i++) build(hosts[i])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
