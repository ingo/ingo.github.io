import { useState } from 'react'

export function SiteMasthead({ currentHref }) {
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
