import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage    from './components/LoginPage.jsx';
import FormIngreso  from './components/FormIngreso.jsx';
import Dashboard    from './components/Dashboard.jsx';

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

// ── Shell principal de la app (solo si está autenticado) ───────────────────
function AppShell() {
  const { usuario, logout } = useAuth();
  const [tab, setTab]         = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);

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
          <div style={{ fontSize: 11, opacity: .75 }}>Sistema de Ingreso de Camiones</div>
        </div>

        {/* Tabs de navegación */}
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            { key: 'form',      label: '+ Registrar Ingreso' },
            { key: 'dashboard', label: '📋 Dashboard del Día' },
          ].map(t => (
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

          {/* Info de sesión */}
          <div style={{
            marginLeft: 12,
            paddingLeft: 16,
            borderLeft: '1px solid rgba(255,255,255,.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{usuario.nombre}</div>
              <div style={{ fontSize: 10, opacity: .7, textTransform: 'capitalize' }}>
                {usuario.rol === 'admin' ? '⚙️ Administrador' : '⚖️ Operador de balanza'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              style={{
                background: 'rgba(255,255,255,.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,.3)',
                padding: '5px 12px',
                fontSize: 12,
                borderRadius: 6,
              }}
            >
              Salir
            </button>
          </div>
        </nav>
      </header>

      {/* ── Contenido principal ────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {tab === 'form'
          ? <FormIngreso onRegistrado={handleRegistrado} />
          : <Dashboard key={refreshKey} />
        }
      </main>

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
