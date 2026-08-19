import { useState } from 'react';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return; }
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setError('Falta el link completo, revisa el correo de nuevo.'); return; }
    const r = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error || 'Error'); return; }
    setDone(true);
  }

  return (
    <div>
      <div className="hero">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}><ThemeToggle /></div>
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Nueva contraseña</h1>
        <p style={{ marginTop: 10 }}><a href="/cuenta" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>← Volver a mi cuenta</a></p>
      </div>
      <main style={{ maxWidth: 380 }}>
        {done ? (
          <p>Tu contraseña se actualizó. Ya puedes <a href="/cuenta" style={{ color: 'var(--gold)' }}>iniciar sesión</a>.</p>
        ) : (
          <>
            <div className="field"><label>Nueva contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            <div className="field"><label>Repite la contraseña</label><input type="password" value={password2} onChange={e => setPassword2(e.target.value)} /></div>
            {error && <p className="hint" style={{ color: 'var(--blood)' }}>{error}</p>}
            <button className="primary" style={{ width: '100%' }} onClick={submit}>Guardar nueva contraseña</button>
          </>
        )}
      </main>
      <footer>Bóveda Arcana</footer>
    </div>
  );
}
