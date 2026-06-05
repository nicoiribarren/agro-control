import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api.js';
import ModalTicket from './ModalTicket.jsx';
import { Truck, Building2, CheckCircle2, Scale, TrendingDown, Leaf, RefreshCw, Clock, MapPin, Printer, AlertTriangle } from 'lucide-react';

const GRANO_COLOR = { Soja: '#f0a500', Maíz: '#e8c840', Trigo: '#c8a050', Girasol: '#e06820' };

// ─────────────────────────────────────────────
// Modal de egreso
// ─────────────────────────────────────────────
function ModalEgreso({ mov, onClose, onEgresado }) {
  const [kgTara, setKgTara]      = useState('');
  const [procesando, setProc]    = useState(false);
  const [error, setError]        = useState('');
  const [resultado, setResult]   = useState(null);
  const [movFinal, setMovFinal]  = useState(null);
  const [verTicket, setVerTicket] = useState(false);

  const tara    = parseInt(kgTara) || 0;
  const kgNetos = tara > 0 && tara < mov.kg_brutos ? mov.kg_brutos - tara : null;

  // Estimación de descuentos si el movimiento tiene datos de calidad
  const HUMEDAD_BASE = { 'Soja': 13.5, 'Maíz': 14.0, 'Trigo': 11.0, 'Girasol': 9.0 };
  const humBase  = HUMEDAD_BASE[mov.grano] ?? 13.5;
  const humReal  = parseFloat(mov.humedad)  || 0;
  const volReal  = parseFloat(mov.volatil)  || 0;
  const zarReal  = parseFloat(mov.zaranda)  || 0;

  const descHum  = kgNetos != null && humReal > humBase ? Math.round(kgNetos * (humReal - humBase) / 100) : 0;
  const descVol  = kgNetos != null && volReal > 0       ? Math.round(kgNetos * volReal / 100)            : 0;
  const descZar  = kgNetos != null && zarReal > 0       ? Math.round(kgNetos * zarReal / 100)            : 0;
  const kgLiq    = kgNetos != null ? kgNetos - descHum - descVol - descZar : null;
  const hayDesc  = descHum > 0 || descVol > 0 || descZar > 0;

  async function confirmar() {
    if (!tara || tara <= 0) { setError('Ingresá los kg de tara.'); return; }
    if (tara >= mov.kg_brutos) {
      setError(`La tara debe ser menor a los kg brutos (${mov.kg_brutos.toLocaleString('es-AR')} kg).`);
      return;
    }
    setProc(true);
    setError('');
    try {
      const res  = await apiFetch(`/api/movimientos/${mov.id}/egreso`, {
        method: 'PUT',
        body:   JSON.stringify({ kg_tara: tara }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({
        kg_netos:            data.kg_netos,
        kg_liquidable:       data.kg_liquidable,
        kg_descuento_humedad: data.kg_descuento_humedad,
        kg_descuento_volatil: data.kg_descuento_volatil,
        kg_descuento_zaranda: data.kg_descuento_zaranda,
        hora_egreso:         data.hora_egreso,
      });
      setMovFinal(data);
      onEgresado();
    } catch (e) {
      setError(e.message);
    } finally {
      setProc(false);
    }
  }

  return (
    <>
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget && !procesando) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, padding: 28,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', gap: 16,
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Registrar Egreso</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{mov.patente}</span>
            <GranoBadge grano={mov.grano} />
            <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{mov.silo_destino}</span>
          </div>
        </div>

        {!resultado ? (
          <>
            {/* Kg brutos */}
            <div style={{ background: 'var(--gris-bg)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: 'var(--texto-suave)' }}>Kg brutos</span>
              <strong>{mov.kg_brutos.toLocaleString('es-AR')} kg</strong>
            </div>

            {/* Input tara */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 6 }}>
                KG TARA (peso camión vacío) *
              </label>
              <input
                type="number"
                value={kgTara}
                onChange={e => { setKgTara(e.target.value); setError(''); }}
                placeholder="Ej: 18500"
                min={1} max={mov.kg_brutos - 1}
                autoFocus
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gris-borde)', fontSize: 15 }}
              />
            </div>

            {/* Preview liquidación */}
            {kgNetos !== null && (
              <div style={{
                background: '#f8f4ff', border: '1px solid #c4b5fd',
                borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <FilaModal label="Kg brutos"     valor={mov.kg_brutos} />
                <FilaModal label="Kg tara"        valor={tara} />
                <FilaModal label="Kg netos"       valor={kgNetos} bold />
                {hayDesc && <div style={{ borderTop: '1px dashed #c4b5fd', margin: '2px 0' }} />}
                {descHum > 0 && <FilaModal label={`Desc. humedad (${humReal}% → base ${humBase}%)`} valor={-descHum} negativo />}
                {descVol > 0 && <FilaModal label={`Desc. volátil (${volReal}%)`}  valor={-descVol} negativo />}
                {descZar > 0 && <FilaModal label={`Desc. zaranda (${zarReal}%)`}   valor={-descZar} negativo />}
                <div style={{ borderTop: '2px solid #c4b5fd', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#5b21b6' }}>
                  <span>Kg liquidable</span>
                  <span>{kgLiq?.toLocaleString('es-AR')} kg</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} disabled={procesando}
                style={{ background: '#f0f2f4', color: '#444', padding: '9px 20px' }}>
                Cancelar
              </button>
              <button type="button" onClick={confirmar} disabled={procesando || !kgNetos}
                style={{ background: 'var(--verde)', color: '#fff', padding: '9px 24px' }}>
                {procesando ? 'Guardando…' : '✅ Confirmar egreso'}
              </button>
            </div>
          </>
        ) : (
          /* Estado de éxito */
          <>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Egreso registrado</div>
              <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>
                {resultado.hora_egreso?.split(' ')[1]?.slice(0, 5) || 'Ahora'}
              </div>
            </div>

            {/* Resumen final */}
            <div style={{
              background: '#f8f4ff', border: '2px solid #c4b5fd',
              borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <FilaModal label="Kg netos" valor={resultado.kg_netos} bold />
              {resultado.kg_descuento_humedad > 0 && <FilaModal label="Desc. humedad" valor={-resultado.kg_descuento_humedad} negativo />}
              {resultado.kg_descuento_volatil > 0 && <FilaModal label="Desc. volátil"  valor={-resultado.kg_descuento_volatil} negativo />}
              {resultado.kg_descuento_zaranda > 0 && <FilaModal label="Desc. zaranda"  valor={-resultado.kg_descuento_zaranda} negativo />}
              <div style={{ borderTop: '2px solid #c4b5fd', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: '#5b21b6' }}>
                <span>Kg liquidable</span>
                <span>{resultado.kg_liquidable?.toLocaleString('es-AR')} kg</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setVerTicket(true)}
                style={{ flex: 1, background: '#1a4d23', color: '#fff', padding: '10px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Printer size={15} /> Imprimir remito
              </button>
              <button type="button" onClick={onClose}
                style={{ flex: 1, background: 'var(--verde)', color: '#fff', padding: '10px', fontSize: 14 }}>
                Cerrar
              </button>
            </div>
          </>
        )}

      </div>
    </div>

    {verTicket && movFinal && (
      <ModalTicket mov={movFinal} onClose={() => setVerTicket(false)} />
    )}
    </>
  );
}

// ─────────────────────────────────────────────
// Dashboard principal
// ─────────────────────────────────────────────
export default function Dashboard() {
  const [movimientos, setMovimientos] = useState([]);
  const [stats, setStats]             = useState(null);
  const [cargando, setCargando]       = useState(true);
  const [error, setError]             = useState('');
  const [egresoMov, setEgresoMov]     = useState(null);
  const [ticketMov, setTicketMov]     = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [resM, resS] = await Promise.all([
        apiFetch('/api/movimientos'),
        apiFetch('/api/movimientos/stats'),
      ]);
      if (!resM.ok || !resS.ok) throw new Error('Error al cargar datos');
      setMovimientos(await resM.json());
      setStats(await resS.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const enPlanta  = movimientos.filter(m => m.estado === 'en_planta');
  const egresados = movimientos.filter(m => m.estado === 'egresado');
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (cargando) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--texto-suave)' }}>Cargando…</div>;
  if (error)    return <div style={{ color: 'var(--rojo)', padding: 24 }}>⚠️ {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>Dashboard del Día</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-suave)', textTransform: 'capitalize' }}>{hoy}</p>
        </div>
        <button onClick={cargar} style={{ background: 'var(--verde)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {/* ── Tarjetas de resumen ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12 }}>
          <StatCard label="Total ingresos"     value={stats.totales.total_camiones}  Icon={Truck}         color="var(--verde)" />
          <StatCard
            label="En planta ahora"
            value={stats.totales.en_planta}
            Icon={Building2}
            color={stats.totales.en_planta > 0 ? '#2563eb' : 'var(--texto-suave)'}
          />
          <StatCard label="Egresados hoy"      value={stats.totales.egresados}       Icon={CheckCircle2}  color="#059669" />
          <StatCard
            label="Kg netos (cerrados)"
            value={(stats.totales.kg_netos_total || 0).toLocaleString('es-AR') + ' kg'}
            Icon={Scale}
            color="#7c3aed"
          />
          <StatCard
            label="Kg liquidables"
            value={(stats.totales.kg_liquidable_total || 0).toLocaleString('es-AR') + ' kg'}
            Icon={TrendingDown}
            color="#b45309"
            sub="con descuentos calidad"
          />
          {stats.por_grano.map(g => (
            <StatCard
              key={g.grano}
              label={g.grano}
              value={`${g.camiones} camión${g.camiones !== 1 ? 'es' : ''}`}
              sub={g.kg_liquidable_total > 0
                ? `${g.kg_liquidable_total.toLocaleString('es-AR')} kg liq.`
                : g.kg_netos_total > 0
                  ? `${g.kg_netos_total.toLocaleString('es-AR')} kg netos`
                  : `${g.kg_brutos_total.toLocaleString('es-AR')} kg brutos`}
              Icon={Leaf}
              color={GRANO_COLOR[g.grano] || '#888'}
            />
          ))}
        </div>
      )}

      {/* ── Camiones en planta ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={16} /> Camiones en planta</h3>
          {enPlanta.length > 0 && (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              {enPlanta.length}
            </span>
          )}
        </div>

        {enPlanta.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderRadius: 10, padding: '28px 24px', textAlign: 'center', color: 'var(--texto-suave)', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Truck size={28} style={{ opacity: .3 }} />
            No hay camiones en planta en este momento
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {enPlanta.map(m => (
              <CardEnPlanta key={m.id} mov={m} onEgreso={() => setEgresoMov(m)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Tabla general del día ── */}
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Truck size={16} /> Todos los movimientos del día</h3>

        {movimientos.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', color: 'var(--texto-suave)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Truck size={40} style={{ opacity: .25 }} />
            <div style={{ fontWeight: 600 }}>Sin movimientos hoy</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--sombra)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gris-bg)', borderBottom: '2px solid var(--gris-borde)' }}>
                    {['#', 'Ingreso', 'Patente', 'Grano', 'Productor', 'Kg brutos', 'Kg netos', 'Kg liq.', 'Egreso', 'Silo', 'Estado', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--texto-suave)', fontSize: 11, textTransform: 'uppercase', letterSpacing: .4, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--gris-borde)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={td}><span style={{ color: 'var(--texto-suave)', fontWeight: 500 }}>#{m.id}</span></td>
                      <td style={td}>{hora(m.fecha_ingreso)}</td>
                      <td style={td}><span style={{ fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace', fontSize: 13 }}>{m.patente}</span></td>
                      <td style={td}><GranoBadge grano={m.grano} /></td>
                      <td style={{ ...td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.productor}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{m.kg_brutos.toLocaleString('es-AR')}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.kg_netos != null
                          ? <strong style={{ color: '#7c3aed' }}>{m.kg_netos.toLocaleString('es-AR')}</strong>
                          : <span style={{ color: 'var(--texto-suave)' }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.kg_liquidable != null
                          ? <strong style={{ color: '#b45309' }}>{m.kg_liquidable.toLocaleString('es-AR')}</strong>
                          : <span style={{ color: 'var(--texto-suave)' }}>—</span>}
                      </td>
                      <td style={td}>{hora(m.hora_egreso) || <span style={{ color: 'var(--texto-suave)' }}>—</span>}</td>
                      <td style={td}>{m.silo_destino}</td>
                      <td style={td}>
                        {m.estado === 'egresado'
                          ? <Badge label="Egresado" bg="#d1fae5" color="#065f46" border="#6ee7b7" />
                          : <Badge label="En planta" bg="#dbeafe" color="#1e40af" border="#93c5fd" />}
                      </td>
                      <td style={td}>
                        {m.estado === 'egresado' && (
                          <button
                            onClick={() => setTicketMov(m)}
                            style={{ background: '#1a4d23', color: '#fff', padding: '5px 12px', fontSize: 12, borderRadius: 6, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <Printer size={12} /> Imprimir remito
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--texto-suave)', borderTop: '1px solid var(--gris-borde)', background: 'var(--gris-bg)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <span>{movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} hoy</span>
              {egresados.length > 0 && (
                <span>
                  {egresados.length} egresado{egresados.length !== 1 ? 's' : ''} ·{' '}
                  {stats?.totales.kg_netos_total?.toLocaleString('es-AR')} kg netos ·{' '}
                  <strong style={{ color: '#b45309' }}>{stats?.totales.kg_liquidable_total?.toLocaleString('es-AR')} kg liq.</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Modal de egreso ── */}
      {egresoMov && (
        <ModalEgreso
          mov={egresoMov}
          onClose={() => setEgresoMov(null)}
          onEgresado={cargar}
        />
      )}

      {/* ── Modal de ticket ── */}
      {ticketMov && (
        <ModalTicket mov={ticketMov} onClose={() => setTicketMov(null)} />
      )}

    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────
function CardEnPlanta({ mov, onEgreso }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--gris-borde)',
      borderLeft: '4px solid #2563eb', borderRadius: 10,
      padding: '16px 18px', boxShadow: 'var(--sombra)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>{mov.patente}</span>
        <GranoBadge grano={mov.grano} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--texto-suave)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mov.productor}
      </div>
      {mov.chofer && (
        <div style={{ fontSize: 12, color: 'var(--texto-suave)' }}>🚗 {mov.chofer}</div>
      )}
      <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
        <InfoLine icon={<Clock size={13} />} label={hora(mov.fecha_ingreso)} />
        <InfoLine icon={<MapPin size={13} />} label={mov.silo_destino} />
        <InfoLine icon={<Scale size={13} />} label={mov.kg_brutos.toLocaleString('es-AR') + ' kg'} />
      </div>
      <button type="button" onClick={onEgreso}
        style={{ background: 'var(--verde)', color: '#fff', width: '100%', padding: '8px', fontSize: 13, marginTop: 2 }}>
        Registrar egreso →
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, Icon, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--gris-borde)',
      borderLeft: `4px solid ${color}`, borderRadius: 10,
      padding: '14px 16px', boxShadow: 'var(--sombra)',
    }}>
      <div style={{ marginBottom: 5, color }}><Icon size={18} /></div>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--texto-suave)', marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function GranoBadge({ grano }) {
  const color = GRANO_COLOR[grano] || '#888';
  const icon  = GRANO_ICON[grano]  || '🌱';
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}55`,
      borderRadius: 20, padding: '2px 10px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
    }}>
      {icon} {grano}
    </span>
  );
}

function Badge({ label, bg, color, border }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 10px', fontWeight: 600, fontSize: 11 }}>
      {label}
    </span>
  );
}

function InfoLine({ icon, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--texto-suave)' }}>
      <span>{icon}</span>{label}
    </span>
  );
}

function FilaModal({ label, valor, negativo, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '1px 0' }}>
      <span style={{ color: negativo ? '#b91c1c' : '#555' }}>{negativo ? '− ' : ''}{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, fontFamily: 'monospace', color: negativo ? '#b91c1c' : '#222' }}>
        {typeof valor === 'number' ? Math.abs(valor).toLocaleString('es-AR') : valor} kg
      </span>
    </div>
  );
}

const hora = (ts) => ts?.split(' ')[1]?.slice(0, 5) || '';
const td   = { padding: '10px 12px', verticalAlign: 'middle' };
