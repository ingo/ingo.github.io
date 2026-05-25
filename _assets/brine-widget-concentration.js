// Concentration (gradient) brine widget. Time-dependent: salt and sugar are
// expressed as % of water weight, and the brine is pulled at a chosen time
// before the fish equilibrates. Used for hot-smoked fish, classic poultry
// brines, etc. — anything where the brine is much saltier than the target
// internal saltiness and you stop the clock early.
//
// The widget is recipe-driven: defaults come from data-* attributes on the
// host element, not from the salt-calculator's meat data.
(function () {
  if (typeof window === 'undefined') return

  // Estimate the internal salt % a fillet ends up at after a given brine
  // time. Anchored to the smoked-salmon cooking logs: a 5% brine on a 1"
  // fillet for 3 hours lands ≈ 1.75% internal. Asymptotically the fish
  // approaches the brine concentration; thicker fillets approach more
  // slowly (Fick's law: time scales with thickness²).
  function internalPct(saltPct, hours, thickIn) {
    if (!saltPct || !hours || !thickIn) return 0
    var k = 0.144  // tuned so 5% × 3h × 1" -> ~1.75%
    var fraction = 1 - Math.exp(-k * hours / (thickIn * thickIn))
    return saltPct * fraction
  }

  function fmtGrams(g) {
    if (g >= 100) return g.toFixed(0) + ' g'
    if (g >= 10) return g.toFixed(1) + ' g'
    return g.toFixed(2) + ' g'
  }

  function fmtPct(p) { return p.toFixed(2) + '%' }

  function fmtHours(h) {
    if (h == null || !isFinite(h) || h <= 0) return ''
    if (h < 1) return Math.round(h * 60) + ' min'
    if (h < 4) {
      var hv = Math.round(h * 2) / 2
      return hv === 1 ? '1 hour' : hv + ' hours'
    }
    return Math.round(h) + ' hours'
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

  function num(host, attr, fallback) {
    var v = parseFloat(host.getAttribute(attr))
    return isFinite(v) ? v : fallback
  }

  function build(host) {
    var label = host.getAttribute('data-label') || 'Concentration brine'
    var state = {
      water: num(host, 'data-default-water', 4),
      waterUnit: host.getAttribute('data-default-water-unit') || 'lb',
      saltPct: num(host, 'data-default-salt', 5),
      sugarPct: num(host, 'data-default-sugar', 0),
      hours: num(host, 'data-default-hours', 3),
      thickness: num(host, 'data-thickness', 1),
    }

    host.innerHTML = ''
    host.className = (host.className || '') + ' brine-widget'

    host.appendChild(el('div', { class: 'brine-widget__head' }, [
      el('strong', null, [label]),
      el('span', { class: 'brine-widget__small' }, ['Gradient brine — time-dependent']),
    ]))

    var bodyHost = el('div', { class: 'brine-widget__body' })
    host.appendChild(bodyHost)

    function row(labelText, control, readout) {
      return el('div', { class: 'brine-widget__row' }, [
        el('label', { class: 'brine-widget__label' }, [labelText]),
        control,
        readout || null,
      ])
    }

    function rangeRow(labelText, min, max, step, value, onChange, formatter) {
      var slider = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) })
      var readout = el('span', { class: 'brine-widget__readout' }, [formatter(value)])
      slider.addEventListener('input', function () {
        var v = parseFloat(slider.value)
        readout.textContent = formatter(v)
        onChange(v)
      })
      return row(labelText, slider, readout)
    }

    // Water
    var waterInput = el('input', { type: 'number', step: '0.01', min: '0', value: String(state.water), class: 'brine-widget__num' })
    waterInput.addEventListener('input', function () {
      state.water = parseFloat(waterInput.value)
      recompute()
    })
    var waterUnitSel = el('select', { class: 'brine-widget__unit' })
    ;['lb', 'kg', 'oz', 'g'].forEach(function (u) {
      var opt = el('option', { value: u }, [u])
      if (u === state.waterUnit) opt.selected = true
      waterUnitSel.appendChild(opt)
    })
    waterUnitSel.addEventListener('change', function () {
      state.waterUnit = waterUnitSel.value
      recompute()
    })
    bodyHost.appendChild(el('div', { class: 'brine-widget__row' }, [
      el('label', { class: 'brine-widget__label' }, ['Water']),
      waterInput,
      waterUnitSel,
    ]))

    // Salt % and Sugar % share the same range so the same number lines up
    // visually on both sliders.
    bodyHost.appendChild(rangeRow(
      'Salt % of water', 0, 8, 0.25, state.saltPct,
      function (v) { state.saltPct = v; recompute() },
      fmtPct
    ))

    bodyHost.appendChild(rangeRow(
      'Sugar % of water', 0, 8, 0.25, state.sugarPct,
      function (v) { state.sugarPct = v; recompute() },
      fmtPct
    ))

    // Brine time
    bodyHost.appendChild(rangeRow(
      'Brine time', 0.25, 12, 0.25, state.hours,
      function (v) { state.hours = v; recompute() },
      fmtHours
    ))

    // Thickness
    var thickInput = el('input', { type: 'number', step: '0.25', min: '0.25', value: String(state.thickness), class: 'brine-widget__num' })
    thickInput.addEventListener('input', function () {
      state.thickness = parseFloat(thickInput.value)
      recompute()
    })
    bodyHost.appendChild(el('div', { class: 'brine-widget__row' }, [
      el('label', { class: 'brine-widget__label' }, ['Thickness (inches)']),
      thickInput,
    ]))

    // Outputs
    var outSalt = el('span', { class: 'brine-widget__big' })
    var outSugar = el('span', { class: 'brine-widget__big' })
    var outInternal = el('span', { class: 'brine-widget__big' })
    var resultGrid = el('div', { class: 'brine-widget__result brine-widget__result--grid' }, [
      el('div', null, [el('span', { class: 'brine-widget__small' }, ['Salt to dissolve']), outSalt]),
      el('div', null, [el('span', { class: 'brine-widget__small' }, ['Sugar to dissolve']), outSugar]),
      el('div', null, [el('span', { class: 'brine-widget__small' }, ['≈ Internal salt at pull']), outInternal]),
    ])
    bodyHost.appendChild(resultGrid)

    var caveat = el('p', { class: 'brine-widget__note' }, [
      'Internal salt is a rough estimate based on diffusion (anchored to 5% × 3h × 1″ ≈ 1.75% internal). Use it to compare options, not as a precise readout.',
    ])
    bodyHost.appendChild(caveat)

    function recompute() {
      var waterG = gramsFromInput(state.water, state.waterUnit)
      var saltG = waterG * state.saltPct / 100
      var sugarG = waterG * state.sugarPct / 100
      outSalt.textContent = fmtGrams(saltG)
      outSugar.textContent = state.sugarPct > 0 ? fmtGrams(sugarG) : '—'
      var pct = internalPct(state.saltPct, state.hours, state.thickness)
      outInternal.textContent = fmtPct(pct)
    }

    recompute()
  }

  function init() {
    var hosts = document.querySelectorAll('[data-brine-concentration]')
    for (var i = 0; i < hosts.length; i++) build(hosts[i])
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
