import { useState } from 'react';
import QrScanner from './QrScanner.jsx';
import { apiFetch } from '../api.js';
import { FileText, Truck, FlaskConical, BarChart2, Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const SILOS  = ['Silo 1', 'Silo 2', 'Silo 3', 'Silo 4', 'Silo 5', 'Celda A', 'Celda B', 'Planta'];
const GRANOS = ['Soja', 'Maíz', 'Trigo', 'Girasol'];

// Humedad base estándar por grano (espejo del backend)
const HUMEDAD_BASE = { 'Soja': 13.5, 'Maíz': 14.0, 'Trigo': 11.0, 'Girasol': 9.0 };

const CAMPOS_REQUERIDOS = [
  // Carta de porte
  'patente', 'ctg', 'grano', 'productor', 'nro_carta_porte', 'kg_brutos', 'silo_destino',
  // Transporte
  'empresa_transporte', 'chofer', 'chofer_dni', 'patente_acoplado',
];

const vacío = {
  // — Identificación —
  patente: '',
  ctg: '',
  grano: '',
  productor: '',
  nro_carta_porte: '',
  kg_brutos: '',
  silo_destino: '',
  // — Transporte —
  empresa_transporte: '',
  chofer: '',
  chofer_dni: '',
  patente_acoplado: '',
  kilometraje: '',
  tarifa_flete: '',
  moneda_flete: 'ARS',
  // — Calidad —
  humedad: '',
  granos_danados: '',
  granos_picados: '',
  impurezas: '',
  volatil: '',
  zaranda: '',
  obs_calidad: '',
};

export default function FormIngreso({ onRegistrado }) {
  const [form, setForm]             = useState(vacío);
  const [ctgData, setCtgData]       = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [enviando, setEnviando]     = useState(false);
  const [error, setError]           = useState('');
  const [exito, setExito]           = useState('');

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
      const res  = await apiFetch(`/api/ctg/${codigo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCtgData(data);
      setForm(f => ({
        ...f,
        ctg:            codigo,
        grano:          data.especie,
        productor:      data.razon_social_remitente,
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

    const faltantes = CAMPOS_REQUERIDOS.filter(k => !form[k]);
    if (faltantes.length) {
      setError('Completá todos los campos obligatorios (*).');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        ...form,
        kg_brutos:   Number(form.kg_brutos),
        kilometraje: form.kilometraje ? Number(form.kilometraje) : undefined,
        tarifa_flete: form.tarifa_flete ? Number(form.tarifa_flete) : undefined,
      };
      const res  = await apiFetch('/api/movimientos', {
        method: 'POST',
        body:   JSON.stringify(payload),
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

  // ── Cálculo de resumen de liquidación (estimado sobre kg brutos) ──────
  const kgB     = parseInt(form.kg_brutos) || 0;
  const humBase = HUMEDAD_BASE[form.grano] ?? 13.5;
  const humReal = parseFloat(form.humedad)       || 0;
  const volReal = parseFloat(form.volatil)       || 0;
  const zarReal = parseFloat(form.zaranda)       || 0;
  const descHum = kgB > 0 && humReal > humBase ? Math.round(kgB * (humReal - humBase) / 100) : 0;
  const descVol = kgB > 0 && volReal > 0        ? Math.round(kgB * volReal / 100) : 0;
  const descZar = kgB > 0 && zarReal > 0        ? Math.round(kgB * zarReal / 100) : 0;
  const kgLiq   = kgB - descHum - descVol - descZar;
  const hayCalidad = form.humedad !== '' || form.volatil !== '' || form.zaranda !== '';

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 700 }}>Registrar Ingreso de Camión</h2>

      {error && <div style={{...alertStyle('var(--rojo)'), display:'flex', alignItems:'center', gap:8}}><AlertTriangle size={14}/> {error}</div>}
      {exito && <div style={{...alertStyle('var(--verde)'), display:'flex', alignItems:'center', gap:8}}><CheckCircle2 size={14}/> {exito.replace('✅ ','')}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 24 }}>

        {/* ══ Escáner QR ══════════════════════════════════════════════ */}
        <QrScanner onDetected={handleCTGDetected} />

        {/* ══ SECCIÓN: Carta de Porte ══════════════════════════════════ */}
        <Seccion titulo="Carta de Porte" Icon={FileText}>

          {/* Fila: Patente + CTG */}
          <div style={fila2}>
            <Campo label="PATENTE *">
              <input
                value={form.patente}
                onChange={e => set('patente', e.target.value.toUpperCase())}
                placeholder="AB 123 CD"
                maxLength={10}
                style={{ textTransform: 'uppercase', letterSpacing: 1 }}
              />
            </Campo>

            <Campo label="CÓDIGO CTG *">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={form.ctg}
                  onChange={e => set('ctg', e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678"
                  maxLength={14}
                />
                <button
                  type="button"
                  onClick={() => consultarCTG()}
                  disabled={consultando || !form.ctg}
                  style={{ background: 'var(--verde)', color: '#fff', whiteSpace: 'nowrap', minWidth: 110 }}
                >
                  {consultando ? <><Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> Consultando…</> : <><Search size={13}/> Consultar</>}
                </button>
              </div>
            </Campo>
          </div>

          {/* Banner CTG */}
          {ctgData && (
            <div style={{
              background: 'var(--verde-claro)', border: '1px solid var(--verde-borde)',
              borderRadius: 'var(--radio)', padding: '12px 16px', fontSize: 13,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px 20px',
            }}>
              <InfoItem label="Estado"       value={ctgData.estado}          color="var(--verde)" />
              <InfoItem label="Cosecha"      value={ctgData.cosecha} />
              <InfoItem label="Kg autorizados" value={ctgData.kg_autorizados?.toLocaleString('es-AR')} />
              <InfoItem label="Vencimiento"  value={ctgData.fecha_vencimiento} />
              <InfoItem label="Origen"       value={ctgData.localidad_origen} />
              <InfoItem label="Destino"      value={ctgData.establecimiento_destino} />
            </div>
          )}

          {/* Fila: Grano + Productor */}
          <div style={fila2}>
            <Campo label="GRANO *">
              <select value={form.grano} onChange={e => set('grano', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {GRANOS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Campo>
            <Campo label="PRODUCTOR / RAZÓN SOCIAL *">
              <input
                value={form.productor}
                onChange={e => set('productor', e.target.value)}
                placeholder="Nombre del productor"
              />
            </Campo>
          </div>

          {/* Fila: Carta + Kg + Silo */}
          <div style={fila3}>
            <Campo label="NRO CARTA DE PORTE *">
              <input
                value={form.nro_carta_porte}
                onChange={e => set('nro_carta_porte', e.target.value)}
                placeholder="00450012345678"
              />
            </Campo>
            <Campo label="KG BRUTOS *">
              <input
                type="number" value={form.kg_brutos}
                onChange={e => set('kg_brutos', e.target.value)}
                placeholder="30000" min={1} max={60000}
              />
            </Campo>
            <Campo label="SILO DESTINO *">
              <select value={form.silo_destino} onChange={e => set('silo_destino', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {SILOS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Campo>
          </div>
        </Seccion>

        {/* ══ SECCIÓN: Transporte ══════════════════════════════════════ */}
        <Seccion titulo="Datos del Transporte" Icon={Truck}>

          <div style={fila2}>
            <Campo label="EMPRESA DE TRANSPORTE *">
              <input
                value={form.empresa_transporte}
                onChange={e => set('empresa_transporte', e.target.value)}
                placeholder="Transporte El Campo S.A."
              />
            </Campo>
            <Campo label="NOMBRE DEL CHOFER *">
              <input
                value={form.chofer}
                onChange={e => set('chofer', e.target.value)}
                placeholder="Juan Pérez"
              />
            </Campo>
          </div>

          <div style={fila2}>
            <Campo label="DNI DEL CHOFER *">
              <input
                value={form.chofer_dni}
                onChange={e => set('chofer_dni', e.target.value.replace(/\D/g, ''))}
                placeholder="30123456"
                maxLength={9}
                inputMode="numeric"
              />
            </Campo>
            <Campo label="PATENTE ACOPLADO *">
              <input
                value={form.patente_acoplado}
                onChange={e => set('patente_acoplado', e.target.value.toUpperCase())}
                placeholder="AB 1234"
                maxLength={10}
                style={{ textTransform: 'uppercase', letterSpacing: 1 }}
              />
            </Campo>
          </div>

          <div style={fila2}>
            <Campo label="PATENTE CAMIÓN" sub="ya ingresada arriba">
              <input value={form.patente} readOnly style={{ background: '#f5f5f5', color: '#888', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }} />
            </Campo>
            <Campo label="KILOMETRAJE (km)">
              <input
                type="number" value={form.kilometraje}
                onChange={e => set('kilometraje', e.target.value)}
                placeholder="350" min={0}
              />
            </Campo>
          </div>

          <div style={fila2}>
            <Campo label="TARIFA DE FLETE">
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={form.moneda_flete}
                  onChange={e => set('moneda_flete', e.target.value)}
                  style={{ width: 80, flexShrink: 0 }}
                >
                  <option value="ARS">ARS $</option>
                  <option value="USD">USD U$S</option>
                </select>
                <input
                  type="number" value={form.tarifa_flete}
                  onChange={e => set('tarifa_flete', e.target.value)}
                  placeholder="0.00" min={0} step="0.01"
                  style={{ flex: 1 }}
                />
              </div>
            </Campo>
          </div>
        </Seccion>

        {/* ══ SECCIÓN: Calidad ══════════════════════════════════════════ */}
        <Seccion titulo="Análisis de Calidad" Icon={FlaskConical} opcional>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { key: 'humedad',       label: 'HUMEDAD',             hint: form.grano ? `Base: ${humBase}%` : '' },
              { key: 'granos_danados', label: 'GRANOS DAÑADOS' },
              { key: 'granos_picados', label: 'GRANOS PICADOS' },
              { key: 'impurezas',     label: 'IMPUREZAS / M.E.' },
              { key: 'volatil',       label: 'VOLÁTIL' },
              { key: 'zaranda',       label: 'ZARANDA' },
            ].map(({ key, label, hint }) => (
              <Campo key={key} label={label} sub={hint}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="0.0"
                    min={0} max={100} step="0.1"
                    style={{ paddingRight: 28 }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-suave)', fontSize: 13, pointerEvents: 'none' }}>%</span>
                </div>
              </Campo>
            ))}
          </div>

          <Campo label="OBSERVACIONES DE CALIDAD">
            <textarea
              value={form.obs_calidad}
              onChange={e => set('obs_calidad', e.target.value)}
              placeholder="Color, olor, presencia de insectos, etc."
              rows={2}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Campo>
        </Seccion>

        {/* ══ RESUMEN DE LIQUIDACIÓN (estimado) ═══════════════════════ */}
        {kgB > 0 && hayCalidad && (
          <div style={{
            background: '#f8f4ff',
            border: '2px solid #c4b5fd',
            borderRadius: 10,
            padding: '16px 20px',
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={15} /> Resumen de liquidación estimado
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              (El peso neto y el liquidable definitivo se calculan al registrar el egreso con la tara real)
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 4 }}>
              <FilaResumen label="Peso bruto" valor={kgB} unidad="kg" />
              <FilaResumen label="Peso tara" valor="—" pendiente />
              <FilaResumen label="Peso neto" valor="—" pendiente />
              <div style={{ borderTop: '1px dashed #c4b5fd', margin: '6px 0' }} />
              {descHum > 0 && <FilaResumen label={`Descuento humedad (${humReal}% → base ${humBase}%)`} valor={-descHum} unidad="kg" negativo />}
              {descVol > 0 && <FilaResumen label={`Descuento volátil (${volReal}%)`}  valor={-descVol} unidad="kg" negativo />}
              {descZar > 0 && <FilaResumen label={`Descuento zaranda (${zarReal}%)`}   valor={-descZar} unidad="kg" negativo />}
              {descHum === 0 && descVol === 0 && descZar === 0 && (
                <FilaResumen label="Sin descuentos de calidad" valor={0} unidad="kg" />
              )}
              <div style={{ borderTop: '2px solid #c4b5fd', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#5b21b6' }}>
                <span>Peso liquidable (estimado s/brutos)</span>
                <span>{kgLiq.toLocaleString('es-AR')} kg</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ Botón submit ═════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="submit"
            disabled={enviando}
            style={{
              background: 'var(--verde)', color: '#fff',
              padding: '11px 32px', fontSize: 15,
              boxShadow: '0 2px 8px rgba(45,122,58,.35)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {enviando ? <><Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/> Registrando…</> : <><CheckCircle2 size={15}/> Registrar Ingreso</>}
          </button>
        </div>

      </form>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Seccion({ titulo, Icon, opcional, children }) {
  return (
    <fieldset style={{
      border: '1px solid var(--gris-borde)',
      borderRadius: 10,
      padding: '16px 20px',
      display: 'grid',
      gap: 14,
    }}>
      <legend style={{
        fontWeight: 700, fontSize: 14, color: 'var(--texto)',
        padding: '0 8px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {Icon && <Icon size={14} />}
        {titulo}
        {opcional && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--texto-suave)', background: '#f0f2f4', borderRadius: 4, padding: '1px 6px' }}>
            opcional
          </span>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

function Campo({ label, sub, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>
        {label}
        {sub && <span style={{ fontWeight: 400, marginLeft: 4, color: '#aaa' }}>· {sub}</span>}
      </label>
      {children}
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

function FilaResumen({ label, valor, unidad, negativo, pendiente }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
      <span style={{ color: negativo ? '#b91c1c' : '#444' }}>{negativo ? '−' : ''} {label}</span>
      <span style={{ fontWeight: 600, color: pendiente ? '#aaa' : negativo ? '#b91c1c' : '#222', fontFamily: pendiente ? 'inherit' : 'monospace' }}>
        {pendiente ? valor : (typeof valor === 'number' ? Math.abs(valor).toLocaleString('es-AR') : valor)}
        {unidad && !pendiente ? ` ${unidad}` : ''}
      </span>
    </div>
  );
}

const fila2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const fila3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };

const alertStyle = (color) => ({
  background: color + '18',
  border: `1px solid ${color}55`,
  color: color === 'var(--rojo)' ? '#8b0000' : '#1a4d23',
  borderRadius: 'var(--radio)',
  padding: '10px 14px',
  fontSize: 14,
  marginBottom: 8,
});
