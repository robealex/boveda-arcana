import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Header({ active, cartCount, onCartClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'CARTAS', href: '/' },
    { label: 'MAZOS', href: '/decks' },
    { label: 'CUENTA', href: '/cuenta' },
    { label: 'PRIVACIDAD', href: '/aviso-privacidad' }
  ];

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--ink)', opacity: 0.97, backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--line)'
    }}>
      <div style={{
        maxWidth: 1180, margin: '0 auto', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: '0.03em' }}>
            BÓVEDA ARCANA
          </span>
        </a>

        <nav className="header-nav-desktop">
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.href}
              style={{
                textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em',
                fontSize: '0.875rem', fontWeight: 600, paddingBottom: 4,
                color: active === item.label ? 'var(--gold)' : 'var(--muted)',
                borderBottom: active === item.label ? '2px solid var(--gold)' : '2px solid transparent'
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-nav-desktop" style={{ gap: 14 }}>
          <ThemeToggle />
          <button onClick={onCartClick} style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--parchment)', padding: 4 }} aria-label="Carrito">
            🛒
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--gold)', color: 'var(--ink)', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <button className="header-mobile-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Menú">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className={`header-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={{ color: active === item.label ? 'var(--gold)' : 'var(--parchment)' }}>
            {item.label}
          </a>
        ))}
        <button className="mm-btn" onClick={() => { setMobileOpen(false); onCartClick(); }}>
          🛒 Carrito {cartCount > 0 ? `(${cartCount})` : ''}
        </button>
        <div className="mm-btn" style={{ cursor: 'default' }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
