import { useState } from 'react';

export default function PasswordInput({ value, onChange, onKeyDown, placeholder, style, disabled }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ paddingRight: 38, width: '100%', ...style }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        tabIndex={-1}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', padding: 2
        }}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
