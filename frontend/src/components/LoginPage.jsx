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
        background: 'linear-gradient(135deg, #1a4d23 0%, #2d7a3a 60%, #3a9e4a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Letras JKI decorativas en el fondo */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, userSelect: 'none' }}>
          <span style={{
            position: 'absolute', top: '-4%', left: '-8%',
            fontSize: 'clamp(180px, 35vw, 340px)', fontWeight: 900,
            color: 'rgba(0,0,0,0.18)', filter: 'blur(6px)',
            lineHeight: 1,
          }}>J</span>
          <span style={{
            position: 'absolute', top: '30%', right: '-8%',
            fontSize: 'clamp(160px, 32vw, 300px)', fontWeight: 900,
            color: 'rgba(0,0,0,0.13)', filter: 'blur(9px)',
            lineHeight: 1,
          }}>K</span>
          <span style={{
            position: 'absolute', bottom: '-6%', left: '32%',
            fontSize: 'clamp(140px, 28vw, 280px)', fontWeight: 900,
            color: 'rgba(0,0,0,0.15)', filter: 'blur(5px)',
            lineHeight: 1,
          }}>I</span>
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
                background: loading ? '#6b9e74' : 'var(--verde)',
                color: '#fff',
                padding: '12px',
                fontSize: 15,
                fontWeight: 700,
                marginTop: 4,
                boxShadow: '0 4px 12px rgba(45,122,58,.4)',
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
