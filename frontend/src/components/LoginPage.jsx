import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// Animación de brillo pulsante para el logo
const logoKeyframes = `
  @keyframes logoGlow {
    0%   { filter: drop-shadow(0 0 8px rgba(255,255,255,0.4)) drop-shadow(0 4px 16px rgba(0,0,0,0.3)); transform: translateY(0px); }
    50%  { filter: drop-shadow(0 0 22px rgba(255,255,255,0.75)) drop-shadow(0 8px 24px rgba(0,0,0,0.2)); transform: translateY(-4px); }
    100% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.4)) drop-shadow(0 4px 16px rgba(0,0,0,0.3)); transform: translateY(0px); }
  }
`;

export default function LoginPage() {
  const { login }             = useAuth();
  const [usuario, setUsuario] = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Si el usuario no incluye @, agrega @jkiagro.com automáticamente
      const email = usuario.trim().includes('@')
        ? usuario.trim()
        : `${usuario.trim()}@jkiagro.com`;
      await login(email, pass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{logoKeyframes}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a2f1c 0%, #111814 50%, #0a2f1c 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Letras JKI decorativas centradas en el fondo */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '2vw',
          pointerEvents: 'none', zIndex: 0, userSelect: 'none',
        }}>
          {['J','K','I'].map(letra => (
            <span key={letra} style={{
              fontSize: 'clamp(220px, 38vw, 520px)',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.04)',
              filter: 'blur(3px)',
              lineHeight: 1,
              letterSpacing: 0,
            }}>{letra}</span>
          ))}
        </div>

        {/* Contenido encima del fondo (z-index: 1) */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: '100%', maxWidth: 480 }}>

        {/* Logo animado sobre el fondo verde */}
        <img
          src="/logo.png"
          alt="JKI Agro"
          style={{
            height: 80,
            width: 'auto',
            objectFit: 'contain',
            animation: 'logoGlow 3s ease-in-out infinite',
          }}
        />

        {/* Tarjeta de login */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '36px 36px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>

          {/* Título */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#1a4d23' }}>Agro Control</div>
            <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 2 }}>
              Sistema de Ingreso de Camiones
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>
                USUARIO
              </label>
              <input
                type="text"
                value={usuario}
                onChange={e => { setUsuario(e.target.value); setError(''); }}
                placeholder="jkiagro"
                autoComplete="username"
                autoFocus
                required
                style={{ fontSize: 15, padding: '10px 14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={pass}
                onChange={e => { setPass(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ fontSize: 15, padding: '10px 14px' }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fff5f5', border: '1px solid #fca5a5',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#b91c1c',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? '#ca9a07' : '#eab308',
                color: '#111814',
                padding: '12px',
                fontSize: 15,
                fontWeight: 700,
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(234,179,8,.35)',
                letterSpacing: '0.02em',
              }}
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#bbb' }}>
            JKI Agro · Sistema interno
          </div>
        </div>

        </div>{/* cierre contenido z-index:1 */}
      </div>
    </>
  );
}
