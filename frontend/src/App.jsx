import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage    from './components/LoginPage.jsx';
import FormIngreso  from './components/FormIngreso.jsx';
import Dashboard    from './components/Dashboard.jsx';
import Reportes     from './components/Reportes.jsx';
import Usuarios     from './components/Usuarios.jsx';
import { apiFetch } from './api.js';

// ── Wrapper que decide si mostrar login o la app ───────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { usuario, logout } = useAuth();

  // Si no hay usuario autenticado → pantalla de login
  if (!usuario) return <LoginPage />;

  return <AppShell />;
}

const TABS = [
  { key: 'form',      label: '+ Registrar Ingreso',  shortLabel: 'Registrar', icon: '➕', roles: ['admin','operador'] },
  { key: 'dashboard', label: '📋 Dashboard del Día', shortLabel: 'Dashboard', icon: '📋', roles: ['admin','operador'] },
  { key: 'reportes',  label: '📊 Reportes',          shortLabel: 'Reportes',  icon: '📊', roles: ['admin'] },
  { key: 'usuarios',  label: '👥 Usuarios',           shortLabel: 'Usuarios',  icon: '👥', roles: ['admin'] },
];

// ── Shell principal de la app (solo si está autenticado) ───────────────────
function AppShell() {
  const { usuario, logout } = useAuth();
  const [tab, setTab]             = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalPass, setModalPass]   = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic afuera
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleRegistrado() {
    setRefreshKey(k => k + 1);
    setTab('dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--verde)',
        color: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        minHeight: 56,
      }}>
        <img src="/logo.png" alt="JKI Agro" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Agro Control</div>
          <div className="header-brand-sub" style={{ fontSize: 11, opacity: .75 }}>Sistema de Ingreso de Camiones</div>
        </div>

        {/* Tabs de navegación — solo visibles en desktop */}
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <div className="header-tabs">
            {TABS.filter(t => t.roles.includes(usuario.rol)).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: tab === t.key ? 'rgba(255,255,255,.25)' : 'transparent',
                  color: '#fff',
                  border: tab === t.key ? '1px solid rgba(255,255,255,.5)' : '1px solid transparent',
                  padding: '7px 16px',
                  fontSize: 13,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Menú de usuario */}
          <div ref={menuRef} style={{ position: 'relative', marginLeft: 12, paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,.25)' }}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              style={{
                background: menuAbierto ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,.3)',
                padding: '6px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <span className="header-user-name" style={{ fontSize: 13, fontWeight: 600 }}>
                {usuario.nombre || usuario.email.split('@')[0]}
              </span>
              <span style={{ fontSize: 10, opacity: .75 }}>
                {usuario.rol === 'admin' ? '⚙️ Administrador' : '⚖️ Operador'} ▾
              </span>
            </button>

            {/* Dropdown */}
            {menuAbierto && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#fff', borderRadius: 10, minWidth: 190,
                boxShadow: '0 8px 24px rgba(0,0,0,.2)',
                border: '1px solid #e5e7eb',
                overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 12, color: '#888' }}>
                  {usuario.email.split('@')[0]}
                </div>
                <button
                  onClick={() => { setModalPass(true); setMenuAbierto(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: '#333', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  🔑 Cambiar contraseña
                </button>
                <button
                  onClick={logout}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #f0f0f0' }}
                  onMouseEnter={e => e.target.style.background = '#fff5f5'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Modal cambiar contraseña */}
      {modalPass && <ModalCambiarPassword onClose={() => setModalPass(false)} />}

      {/* ── Contenido principal ────────────────────────────────────────── */}
      <main className="main-content" style={{ flex: 1, padding: '28px 24px', maxWidth: tab === 'reportes' ? 1200 : 960, margin: '0 auto', width: '100%' }}>
        {tab === 'form'      && <FormIngreso onRegistrado={handleRegistrado} />}
        {tab === 'dashboard' && <Dashboard key={refreshKey} />}
        {tab === 'reportes'  && <Reportes />}
        {tab === 'usuarios'  && <Usuarios />}
      </main>

      {/* ── Bottom nav (solo mobile) ───────────────────────────────── */}
      <nav className="bottom-nav">
        {TABS.filter(t => t.roles.includes(usuario.rol)).map(t => (
          <button
            key={t.key}
            className={`bottom-nav-btn${tab === t.key ? ' activo' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="bnav-icon">{t.icon}</span>
            {t.shortLabel}
          </button>
        ))}
        <button
          className="bottom-nav-btn"
          onClick={() => setMenuAbierto(v => !v)}
        >
          <span className="bnav-icon">👤</span>
          Cuenta
        </button>
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign: 'center', padding: '12px', fontSize: 12,
        color: 'var(--texto-suave)', borderTop: '1px solid var(--gris-borde)',
      }}>
        Agro Control MVP — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </footer>
    </div>
  );
}

// ── Modal: cambiar contraseña ──────────────────────────────────────────────
function ModalCambiarPassword({ onClose }) {
  const [actual,    setActual]    = useState('');
  const [nueva,     setNueva]     = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error,     setError]     = useState('');
  const [ok,        setOk]        = useState(false);
  const [cargando,  setCargando]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (nueva !== confirmar) { setError('Las contraseñas nuevas no coinciden.'); return; }
    if (nueva.length < 6)    { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }

    setCargando(true);
    try {
      const res  = await apiFetch('/api/auth/cambiar-password', {
        method: 'PUT',
        body:   JSON.stringify({ password_actual: actual, password_nuevo: nueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🔑 Cambiar contraseña</div>

        {ok ? (
          <>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600 }}>¡Contraseña actualizada!</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--verde)', color: '#fff', padding: '10px', width: '100%', fontSize: 15 }}>
              Cerrar
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'CONTRASEÑA ACTUAL',       val: actual,    set: setActual },
              { label: 'NUEVA CONTRASEÑA',         val: nueva,     set: setNueva },
              { label: 'CONFIRMAR NUEVA CONTRASEÑA', val: confirmar, set: setConfirmar },
            ].map(({ label, val, set }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>{label}</label>
                <input
                  type="password"
                  value={val}
                  onChange={e => { set(e.target.value); setError(''); }}
                  required
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gris-borde)', fontSize: 14 }}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#b91c1c' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ background: '#f0f2f4', color: '#444', padding: '9px 18px' }}>
                Cancelar
              </button>
              <button type="submit" disabled={cargando} style={{ background: 'var(--verde)', color: '#fff', padding: '9px 20px' }}>
                {cargando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
