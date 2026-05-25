// Lightweight click-to-expand for mobile nav submenus.
// The vendored julia-lite theme expects an `is-active` class on
// `.menu-item-has-children` to reveal the sub-menu, but the original
// JS that toggles it relies on a chain of WP-specific machinery that
// isn't all wired up here. This handles just the click case so
// "Tools → Salt Calculator" actually works on mobile.
(function () {
  if (typeof document === 'undefined') return

  function init() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a')
      if (!link) return
      var li = link.parentElement
      if (!li || !li.classList.contains('menu-item-has-children')) return
      if (link !== li.querySelector(':scope > a')) return
      // Only intercept the pure-toggle links (href="#"); real links
      // (e.g. a parent that points to a category page) should still navigate.
      var href = link.getAttribute('href') || ''
      if (href !== '' && href !== '#') return
      e.preventDefault()
      li.classList.toggle('is-active')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
