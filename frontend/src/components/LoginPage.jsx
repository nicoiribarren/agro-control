import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login }           = useAuth();
  const [email, setEmail]   = useState('');
  const [pass,  setPass]    = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), pass);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a4d23 0%, #2d7a3a 60%, #3a9e4a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>

        {/* Logo + título */}
        <div style={{ textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="JKI Agro"
            style={{ height: 56, width: 'auto', objectFit: 'contain', marginBottom: 12 }}
          />
          <div style={{ fontWeight: 800, fontSize: 20, color: '#1a4d23' }}>Agro Control</div>
          <div style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 2 }}>
            Sistema de Ingreso de Camiones
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="tu@email.com"
              autoComplete="email"
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
    </div>
  );
}
