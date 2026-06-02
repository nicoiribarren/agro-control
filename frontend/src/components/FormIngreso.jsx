import { useState } from 'react';
import QrScanner from './QrScanner.jsx';

const SILOS = ['Silo 1', 'Silo 2', 'Silo 3', 'Silo 4', 'Silo 5', 'Celda A', 'Celda B', 'Planta'];
const GRANOS = ['Soja', 'Maíz', 'Trigo', 'Girasol'];

const vacío = {
  patente: '',
  ctg: '',
  grano: '',
  productor: '',
  nro_carta_porte: '',
  kg_brutos: '',
  silo_destino: '',
};

export default function FormIngreso({ onRegistrado }) {
  const [form, setForm] = useState(vacío);
  const [ctgData, setCtgData] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  // codigoParam permite llamar desde el scanner QR sin esperar actualización de estado
  async function consultarCTG(codigoParam) {
    const codigo = codigoParam ?? form.ctg;
    if (!codigo || !/^\d{8,14}$/.test(codigo)) {
      setError('Ingresá un código CTG válido (8 a 14 dígitos).');
      return;
    }
    setConsultando(true);
    setError('');
    setCtgData(null);
    try {
      const res = await fetch(`/api/ctg/${codigo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCtgData(data);
      setForm(f => ({
        ...f,
        ctg: codigo,
        grano: data.especie,
        productor: data.razon_social_remitente,
        nro_carta_porte: data.nro_carta_porte,
      }));
    } catch (e) {
      setError('Error al consultar CTG: ' + e.message);
    } finally {
      setConsultando(false);
    }
  }

  function handleCTGDetected(ctg) {
    setError('');
    set('ctg', ctg);
    consultarCTG(ctg);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setExito('');

    const campos = Object.entries(form);
    const vacio = campos.find(([, v]) => !v);
    if (vacio) { setError('Completá todos los campos.'); return; }

    setEnviando(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kg_brutos: Number(form.kg_brutos) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExito(`✅ Camión ${data.patente} registrado con ID #${data.id}`);
      setForm(vacío);
      setCtgData(null);
      onRegistrado?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Registrar Ingreso de Camión</h2>

      {error && (
        <div style={alertStyle('var(--rojo)')}>⚠️ {error}</div>
      )}
      {exito && (
        <div style={alertStyle('var(--verde)')}>{exito}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>

        {/* Escáner QR */}
        <QrScanner onDetected={handleCTGDetected} />

        {/* Fila 1: Patente + CTG */}
        <div style={fila}>
          <div style={campo}>
            <label>PATENTE *</label>
            <input
              value={form.patente}
              onChange={e => set('patente', e.target.value.toUpperCase())}
              placeholder="AB 123 CD"
              maxLength={10}
              style={{ textTransform: 'uppercase', letterSpacing: 1 }}
            />
          </div>

          <div style={campo}>
            <label>CÓDIGO CTG *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.ctg}
                onChange={e => set('ctg', e.target.value.replace(/\D/g, ''))}
                placeholder="12345678"
                maxLength={14}
              />
              <button
                type="button"
                onClick={consultarCTG}
                disabled={consultando || !form.ctg}
                style={{ background: 'var(--verde)', color: '#fff', whiteSpace: 'nowrap', minWidth: 110 }}
              >
                {consultando ? '⏳ Consultando…' : '🔍 Consultar'}
              </button>
            </div>
          </div>
        </div>

        {/* Banner CTG si se consultó */}
        {ctgData && (
          <div style={{
            background: 'var(--verde-claro)',
            border: '1px solid var(--verde-borde)',
            borderRadius: 'var(--radio)',
            padding: '12px 16px',
            fontSize: 13,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '6px 20px',
          }}>
            <InfoItem label="Estado" value={ctgData.estado} color="var(--verde)" />
            <InfoItem label="Cosecha" value={ctgData.cosecha} />
            <InfoItem label="Kg autorizados" value={ctgData.kg_autorizados?.toLocaleString('es-AR')} />
            <InfoItem label="Vencimiento" value={ctgData.fecha_vencimiento} />
            <InfoItem label="Origen" value={ctgData.localidad_origen} />
            <InfoItem label="Destino" value={ctgData.establecimiento_destino} />
          </div>
        )}

        {/* Fila 2: Grano + Productor */}
        <div style={fila}>
          <div style={campo}>
            <label>GRANO *</label>
            <select value={form.grano} onChange={e => set('grano', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {GRANOS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div style={campo}>
            <label>PRODUCTOR / RAZÓN SOCIAL *</label>
            <input
              value={form.productor}
              onChange={e => set('productor', e.target.value)}
              placeholder="Nombre del productor"
            />
          </div>
        </div>

        {/* Fila 3: Carta de porte + Kg + Silo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={campo}>
            <label>NRO CARTA DE PORTE *</label>
            <input
              value={form.nro_carta_porte}
              onChange={e => set('nro_carta_porte', e.target.value)}
              placeholder="00450012345678"
            />
          </div>

          <div style={campo}>
            <label>KG BRUTOS *</label>
            <input
              type="number"
              value={form.kg_brutos}
              onChange={e => set('kg_brutos', e.target.value)}
              placeholder="30000"
              min={1}
              max={60000}
            />
          </div>

          <div style={campo}>
            <label>SILO DESTINO *</label>
            <select value={form.silo_destino} onChange={e => set('silo_destino', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {SILOS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="submit"
            disabled={enviando}
            style={{
              background: 'var(--verde)',
              color: '#fff',
              padding: '11px 32px',
              fontSize: 15,
              boxShadow: '0 2px 8px rgba(45,122,58,.35)',
            }}
          >
            {enviando ? 'Registrando…' : '✅ Registrar Ingreso'}
          </button>
        </div>

      </form>
    </div>
  );
}

function InfoItem({ label, value, color }) {
  return (
    <div>
      <span style={{ color: 'var(--texto-suave)', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>{label}: </span>
      <span style={{ fontWeight: 600, color: color || 'var(--texto)' }}>{value}</span>
    </div>
  );
}

const fila = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
const campo = {};
const alertStyle = (color) => ({
  background: color + '18',
  border: `1px solid ${color}55`,
  color: color === 'var(--rojo)' ? '#8b0000' : '#1a4d23',
  borderRadius: 'var(--radio)',
  padding: '10px 14px',
  fontSize: 14,
  marginBottom: 4,
});
