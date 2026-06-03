import { useState } from 'react';
import FormIngreso from './components/FormIngreso.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [tab, setTab] = useState('form');
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRegistrado() {
    setRefreshKey(k => k + 1);
    setTab('dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      }}>
        <img src="/logo.png" alt="JKI Agro" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Agro Control</div>
          <div style={{ fontSize: 11, opacity: .75 }}>Sistema de Ingreso de Camiones</div>
        </div>

        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[
            { key: 'form', label: '+ Registrar Ingreso' },
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
        </nav>
      </header>

      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {tab === 'form'
          ? <FormIngreso onRegistrado={handleRegistrado} />
          : <Dashboard key={refreshKey} />
        }
      </main>

      <footer style={{ textAlign: 'center', padding: '12px', fontSize: 12, color: 'var(--texto-suave)', borderTop: '1px solid var(--gris-borde)' }}>
        Agro Control MVP — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </footer>
    </div>
  );
}
