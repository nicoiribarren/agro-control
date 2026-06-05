import { useState, useEffect } from 'react';
import { apiFetch } from '../api.js';
import { Settings, Scale, UserPlus, Pencil, Users, AlertTriangle } from 'lucide-react';

export default function Usuarios() {
  const [usuarios,  setUsuarios]  = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');
  const [modal,     setModal]     = useState(null); // null | { modo: 'crear' | 'editar', usuario? }

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res  = await apiFetch('/api/auth/usuarios');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsuarios(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const activos   = usuarios.filter(u => u.activo);
  const inactivos = usuarios.filter(u => !u.activo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Gestión de Usuarios</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
            {activos.length} usuario{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ modo: 'crear' })}
          style={{ background: 'var(--verde)', color: '#fff', padding: '9px 20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <UserPlus size={15} /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--texto-suave)' }}>Cargando…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--sombra)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--gris-bg)', borderBottom: '2px solid var(--gris-borde)' }}>
                {['Nombre', 'Usuario', 'Rol', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--texto-suave)', fontSize: 11, textTransform: 'uppercase', letterSpacing: .4 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: '1px solid var(--gris-borde)',
                    background: !u.activo ? '#fafafa' : i % 2 === 0 ? '#fff' : '#fafbfc',
                    opacity: u.activo ? 1 : 0.6,
                  }}
                >
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{u.nombre}</span>
                  </td>
                  <td style={td}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--texto-suave)', fontSize: 13 }}>
                      {u.email.split('@')[0]}
                    </span>
                  </td>
                  <td style={td}>
                    {u.rol === 'admin'
                      ? <Badge label="Administrador" icon={<Settings size={11}/>} bg="#fef3c7" color="#92400e" border="#fcd34d" />
                      : <Badge label="Operador"      icon={<Scale size={11}/>}    bg="#ede9fe" color="#5b21b6" border="#c4b5fd" />}
                  </td>
                  <td style={td}>
                    {u.activo
                      ? <Badge label="● Activo"   bg="#d1fae5" color="#065f46" border="#6ee7b7" />
                      : <Badge label="○ Inactivo" bg="#f3f4f6" color="#6b7280" border="#d1d5db" />}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={() => setModal({ modo: 'editar', usuario: u })}
                      style={{ background: 'var(--gris-bg)', color: 'var(--texto)', padding: '5px 14px', fontSize: 12, border: '1px solid var(--gris-borde)', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <ModalUsuario
          modo={modal.modo}
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

// ── Modal crear / editar usuario ──────────────────────────────────────────────
function ModalUsuario({ modo, usuario, onClose, onGuardado }) {
  const esEdicion = modo === 'editar';

  const [nombre,   setNombre]   = useState(usuario?.nombre  || '');
  const [userSlug, setUserSlug] = useState(usuario ? usuario.email.split('@')[0] : '');
  const [rol,      setRol]      = useState(usuario?.rol      || 'operador');
  const [activo,   setActivo]   = useState(usuario?.activo ?? 1);
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (esEdicion) {
        // Editar usuario existente
        const body = { nombre, rol, activo };
        if (password) body.password = password;

        const res  = await apiFetch(`/api/auth/usuarios/${usuario.id}`, {
          method: 'PUT',
          body:   JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        // Crear usuario nuevo
        if (!password) { setError('La contraseña es obligatoria.'); setGuardando(false); return; }
        const email = userSlug.trim().includes('@') ? userSlug.trim() : `${userSlug.trim()}@jkiagro.com`;
        const res   = await apiFetch('/api/auth/usuarios', {
          method: 'POST',
          body:   JSON.stringify({ nombre, email, password, rol }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
          {esEdicion ? <><Pencil size={16}/> Editar usuario</> : <><UserPlus size={16}/> Nuevo usuario</>}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>

          <Campo label="NOMBRE COMPLETO">
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Mario García"
              required
              autoFocus
            />
          </Campo>

          <Campo label="USUARIO">
            <div style={{ position: 'relative' }}>
              <input
                value={userSlug}
                onChange={e => setUserSlug(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="mario"
                required
                disabled={esEdicion}
                style={{ paddingRight: 110, ...(esEdicion ? { background: '#f5f5f5', color: '#888' } : {}) }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa', pointerEvents: 'none' }}>
                @jkiagro.com
              </span>
            </div>
          </Campo>

          <Campo label="ROL">
            <select value={rol} onChange={e => setRol(e.target.value)}>
              <option value="operador">⚖️ Operador de balanza</option>
              <option value="admin">⚙️ Administrador</option>
            </select>
          </Campo>

          <Campo label={esEdicion ? 'NUEVA CONTRASEÑA (dejar vacío para no cambiar)' : 'CONTRASEÑA *'}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={esEdicion ? 'Nueva contraseña (opcional)' : 'Mínimo 6 caracteres'}
              minLength={password ? 6 : undefined}
            />
          </Campo>

          {esEdicion && (
            <Campo label="ESTADO">
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: 1, label: '● Activo' }, { val: 0, label: '○ Inactivo' }].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setActivo(opt.val)}
                    style={{
                      flex: 1, padding: '8px',
                      background: activo === opt.val ? (opt.val ? '#d1fae5' : '#f3f4f6') : '#fff',
                      color:      activo === opt.val ? (opt.val ? '#065f46' : '#374151') : '#888',
                      border:     `2px solid ${activo === opt.val ? (opt.val ? '#6ee7b7' : '#9ca3af') : '#e5e7eb'}`,
                      fontWeight: activo === opt.val ? 700 : 500,
                      borderRadius: 8,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Campo>
          )}

          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#b91c1c' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: '#f0f2f4', color: '#444', padding: '9px 18px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} style={{ background: 'var(--verde)', color: '#fff', padding: '9px 24px' }}>
              {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────────
function Campo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ label, icon, bg, color, border }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {icon}{label}
    </span>
  );
}

const td = { padding: '12px 16px', verticalAlign: 'middle' };
