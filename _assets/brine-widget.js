// Inline brine calculator. Reads meat data from window.__BRINE_DATA__ which
// the build pipeline injects from salt-calculator/src/data/meatData.json so
// the widget and the full calculator stay in lockstep.
(function () {
  if (typeof window === 'undefined') return

  // Same anchor table as salt-calculator/src/brineTime.js (conservative end).
  var ANCHORS = [
    { thick: 0.5, hours: 0.5 },
    { thick: 1.0, hours: 1.0 },
    { thick: 2.0, hours: 4.0 },
    { thick: 3.0, hours: 12.0 },
    { thick: 4.0, hours: 24.0 },
  ]

  function brineHours(t) {
    if (!t || t <= 0) return null
    if (t <= ANCHORS[0].thick) return ANCHORS[0].hours
    if (t >= ANCHORS[ANCHORS.length - 1].thick) return ANCHORS[ANCHORS.length - 1].hours
    for (var i = 0; i < ANCHORS.length - 1; i++) {
      var a = ANCHORS[i], b = ANCHORS[i + 1]
      if (t >= a.thick && t <= b.thick) {
        var k = (t - a.thick) / (b.thick - a.thick)
        return a.hours + k * (b.hours - a.hours)
      }
    }
    return null
  }

  function formatHours(h) {
    if (h == null) return ''
    if (h < 1) {
      var m = Math.round(h * 60 / 5) * 5
      return m + ' minutes'
    }
    if (h < 4) {
      var hv = Math.round(h * 2) / 2
      return hv === 1 ? '1 hour' : hv + ' hours'
    }
    return Math.round(h) + ' hours'
  }

  function fmtGrams(g) {
    if (g >= 100) return g.toFixed(0) + ' g'
    if (g >= 10) return g.toFixed(1) + ' g'
    return g.toFixed(2) + ' g'
  }

  function lbozFromGrams(g) {
    var oz = g / 28.3495
    if (oz < 16) return oz.toFixed(1) + ' oz'
    var lbs = Math.floor(oz / 16)
    var rem = oz - lbs * 16
    return lbs + ' lb ' + rem.toFixed(1) + ' oz'
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

  function build(host) {
    var category = host.getAttribute('data-category')
    var cut = host.getAttribute('data-cut')
    var defaultMode = host.getAttribute('data-mode') || 'dry'
    var info = findCut(category, cut)
    if (!info) {
      host.innerHTML = '<p class="brine-widget__error">Brine widget: missing cut "' + category + ' / ' + cut + '".</p>'
      return
    }

    var hasWet = !!info.wetBrine
    var state = {
      mode: (defaultMode === 'wet' && hasWet) ? 'wet' : 'dry',
      weight: 2,
      weightUnit: 'lb',
      drySalt: info.defaultSaltByWeight,
      wetSalt: hasWet ? info.wetBrine.defaultSaltByWeight : 1,
      wetSugar: hasWet ? info.wetBrine.defaultSugarByWeight : 0.5,
      ratio: 1,
      thickness: hasWet ? info.wetBrine.thicknessInches : 1,
    }

    host.innerHTML = ''
    host.className = (host.className || '') + ' brine-widget'

    // Heading
    host.appendChild(el('div', { class: 'brine-widget__head' }, [
      el('strong', null, [category + ' · ' + cut]),
      el('a', { class: 'brine-widget__link', href: '/salt-calculator/', target: '_blank', rel: 'noopener' }, ['Open full calculator →']),
    ]))

    // Mode buttons
    var modeRow = el('div', { class: 'brine-widget__modes' })
    function makeModeBtn(label, value, disabled) {
      var btn = el('label', { class: 'brine-widget__mode' + (disabled ? ' is-disabled' : '') + (value === state.mode ? ' is-active' : '') })
      var input = el('input', { type: 'radio', value: value })
      input.name = 'bw-mode-' + Math.random().toString(36).slice(2, 8)
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
    modeRow.appendChild(makeModeBtn('Dry brine', 'dry', false))
    modeRow.appendChild(makeModeBtn('Wet brine', 'wet', !hasWet))
    host.appendChild(modeRow)

    // Weight row (always visible)
    var weightInput = el('input', { type: 'number', step: '0.01', min: '0', value: String(state.weight), class: 'brine-widget__num' })
    var weightUnit = el('select', { class: 'brine-widget__unit' })
    ;['lb', 'kg', 'oz', 'g'].forEach(function (u) {
      var opt = el('option', { value: u }, [u])
      if (u === state.weightUnit) opt.selected = true
      weightUnit.appendChild(opt)
    })
    weightInput.addEventListener('input', function () {
      state.weight = parseFloat(weightInput.value)
      recompute()
    })
    weightUnit.addEventListener('change', function () {
      state.weightUnit = weightUnit.value
      recompute()
    })
    host.appendChild(el('div', { class: 'brine-widget__row' }, [
      el('label', { class: 'brine-widget__label' }, ['Meat weight']),
      weightInput,
      weightUnit,
    ]))

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

    function pctFmt(v) { return parseFloat(v).toFixed(2) + '%' }
    function ratioFmt(v) { return parseFloat(v).toFixed(1) + '×' }

    function setActiveMode() {
      var labels = modeRow.querySelectorAll('label.brine-widget__mode')
      for (var i = 0; i < labels.length; i++) {
        var input = labels[i].querySelector('input')
        labels[i].classList.toggle('is-active', input && input.value === state.mode)
      }
    }

    var outSalt, outSugar, outWater, outTime

    function renderBody() {
      bodyHost.innerHTML = ''
      setActiveMode()

      if (state.mode === 'dry') {
        bodyHost.appendChild(rangeRow(
          'Salt %', 0.5, 2, 0.05, state.drySalt,
          function (v) { state.drySalt = v; recompute() },
          pctFmt
        ))
        outSalt = el('span', { class: 'brine-widget__big' })
        bodyHost.appendChild(el('div', { class: 'brine-widget__result' }, [
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt to apply']), outSalt]),
        ]))
      } else {
        bodyHost.appendChild(rangeRow(
          'Salt % of meat + water', 0.5, 2, 0.05, state.wetSalt,
          function (v) { state.wetSalt = v; recompute() },
          pctFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Sugar % of meat + water', 0, 1.5, 0.05, state.wetSugar,
          function (v) { state.wetSugar = v; recompute() },
          pctFmt
        ))
        bodyHost.appendChild(rangeRow(
          'Water:meat ratio', 0.5, 3, 0.1, state.ratio,
          function (v) { state.ratio = v; recompute() },
          ratioFmt
        ))
        var thickInput = el('input', { type: 'number', step: '0.25', min: '0.25', value: String(state.thickness), class: 'brine-widget__num' })
        thickInput.addEventListener('input', function () {
          state.thickness = parseFloat(thickInput.value)
          recompute()
        })
        bodyHost.appendChild(el('div', { class: 'brine-widget__row' }, [
          el('label', { class: 'brine-widget__label' }, ['Thickness (inches)']),
          thickInput,
        ]))
        outSalt = el('span', { class: 'brine-widget__big' })
        outSugar = el('span', { class: 'brine-widget__big' })
        outWater = el('span', { class: 'brine-widget__big' })
        outTime = el('span', { class: 'brine-widget__big' })
        bodyHost.appendChild(el('div', { class: 'brine-widget__result brine-widget__result--grid' }, [
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt']), outSalt]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Sugar']), outSugar]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Water']), outWater]),
          el('div', null, [el('span', { class: 'brine-widget__small' }, ['Brine time']), outTime]),
        ]))
      }
      recompute()
    }

    function recompute() {
      var meatGrams = gramsFromInput(state.weight, state.weightUnit)
      if (state.mode === 'dry') {
        var saltG = meatGrams * state.drySalt / 100
        if (outSalt) outSalt.textContent = fmtGrams(saltG) + '  (' + lbozFromGrams(saltG) + ')'
      } else {
        var waterG = meatGrams * state.ratio
        var totalG = meatGrams + waterG
        var saltG2 = totalG * state.wetSalt / 100
        var sugarG = totalG * state.wetSugar / 100
        if (outSalt) outSalt.textContent = fmtGrams(saltG2)
        if (outSugar) outSugar.textContent = fmtGrams(sugarG)
        if (outWater) outWater.textContent = fmtGrams(waterG)
        if (outTime) outTime.textContent = formatHours(brineHours(state.thickness))
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
