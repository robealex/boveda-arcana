import { useEffect, useState } from 'react';

export default function ThemeToggle({ style }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: 'transparent', border: '1px solid var(--line)', borderRadius: 999,
        cursor: 'pointer', fontSize: '1rem', padding: '4px 10px', color: 'var(--parchment)',
        ...style
      }}
      aria-label="Cambiar tema claro/oscuro"
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
