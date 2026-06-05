import { useState } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../api.js';
import ModalTicket from './ModalTicket.jsx';
import { BarChart2, Truck, CheckCircle2, Building2, Scale, TrendingDown, Search, Loader2, Printer, AlertTriangle, FileSpreadsheet, ClipboardList } from 'lucide-react';

const GRANOS  = ['Soja', 'Maíz', 'Trigo', 'Girasol'];
const GRANO_COLOR = { Soja: '#f0a500', Maíz: '#e8c840', Trigo: '#c8a050', Girasol: '#e06820' };

// Fecha local en formato YYYY-MM-DD
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Reportes() {
  const [filtros, setFiltros] = useState({
    fecha_desde: hace30Dias(),
    fecha_hasta: hoyLocal(),
    grano:       '',
    estado:      '',
    productor:   '',
  });
  const [resultado,  setResultado]  = useState(null);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState('');
  const [ticketMov,  setTicketMov]  = useState(null);

  function setF(k, v) { setFiltros(f => ({ ...f, [k]: v })); }

  async function buscar(e) {
    e?.preventDefault();
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res  = await apiFetch(`/api/movimientos/historico?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResultado(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function exportarExcel() {
    if (!resultado?.movimientos?.length) return;

    const filas = resultado.movimientos.map(m => ({
      'Fecha ingreso':      m.fecha_ingreso?.replace('T', ' ').slice(0, 16) || '',
      'Hora egreso':        m.hora_egreso?.slice(11, 16) || '',
      'Patente camión':     m.patente || '',
      'Patente acoplado':   m.patente_acoplado || '',
      'Grano':              m.grano || '',
      'Productor':          m.productor || '',
      'Nro carta de porte': m.nro_carta_porte || '',
      'CTG':                m.ctg || '',
      'Empresa transporte': m.empresa_transporte || '',
      'Chofer':             m.chofer || '',
      'DNI chofer':         m.chofer_dni || '',
      'Silo destino':       m.silo_destino || '',
      'Kg brutos':          m.kg_brutos || 0,
      'Kg tara':            m.kg_tara || '',
      'Kg netos':           m.kg_netos || '',
      'Desc. humedad (kg)': m.kg_descuento_humedad || '',
      'Desc. volátil (kg)': m.kg_descuento_volatil || '',
      'Desc. zaranda (kg)': m.kg_descuento_zaranda || '',
      'Kg liquidable':      m.kg_liquidable || '',
      'Humedad (%)':        m.humedad || '',
      'Granos dañados (%)': m.granos_danados || '',
      'Granos picados (%)': m.granos_picados || '',
      'Impurezas (%)':      m.impurezas || '',
      'Volátil (%)':        m.volatil || '',
      'Zaranda (%)':        m.zaranda || '',
      'Obs. calidad':       m.obs_calidad || '',
      'Kilometraje':        m.kilometraje || '',
      'Tarifa flete':       m.tarifa_flete || '',
      'Moneda flete':       m.moneda_flete || '',
      'Estado':             m.estado === 'egresado' ? 'Egresado' : 'En planta',
    }));

    // Fila de totales al final
    filas.push({});
    filas.push({
      'Fecha ingreso':  'TOTALES',
      'Kg brutos':      resultado.totales.kg_brutos_total,
      'Kg netos':       resultado.totales.kg_netos_total,
      'Kg liquidable':  resultado.totales.kg_liquidable_total,
      'Estado':         `${resultado.totales.total_camiones} movimientos`,
    });

    const ws = XLSX.utils.json_to_sheet(filas);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
      { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const fecha = `${filtros.fecha_desde}_${filtros.fecha_hasta}`;
    XLSX.writeFile(wb, `JKI_Agro_Movimientos_${fecha}.xlsx`);
  }

  const movs = resultado?.movimientos || [];
  const tots = resultado?.totales;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={20} /> Reportes Históricos</h2>
        <p style={{ fontSize: 13, color: 'var(--texto-suave)' }}>Filtrá y exportá los movimientos de cualquier período</p>
      </div>

      {/* ── Filtros ── */}
      <form onSubmit={buscar} style={{
        background: '#fff', border: '1px solid var(--gris-borde)',
        borderRadius: 12, padding: '20px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 14, alignItems: 'end',
        boxShadow: 'var(--sombra)',
      }}>
        <Campo label="DESDE">
          <input type="date" value={filtros.fecha_desde} onChange={e => setF('fecha_desde', e.target.value)} />
        </Campo>
        <Campo label="HASTA">
          <input type="date" value={filtros.fecha_hasta} onChange={e => setF('fecha_hasta', e.target.value)} />
        </Campo>
        <Campo label="GRANO">
          <select value={filtros.grano} onChange={e => setF('grano', e.target.value)}>
            <option value="">Todos</option>
            {GRANOS.map(g => <option key={g}>{g}</option>)}
          </select>
        </Campo>
        <Campo label="ESTADO">
          <select value={filtros.estado} onChange={e => setF('estado', e.target.value)}>
            <option value="">Todos</option>
            <option value="egresado">Egresado</option>
            <option value="en_planta">En planta</option>
          </select>
        </Campo>
        <Campo label="PRODUCTOR">
          <input
            type="text" value={filtros.productor}
            onChange={e => setF('productor', e.target.value)}
            placeholder="Nombre parcial…"
          />
        </Campo>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={cargando}
            style={{ flex: 1, background: 'var(--verde)', color: '#fff', padding: '9px 0', fontWeight: 700 }}>
            {cargando ? <><Loader2 size={13} style={{animation:'spin 1s linear infinite'}}/> Buscando…</> : <><Search size={13}/> Buscar</>}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Resultados ── */}
      {resultado && (
        <>
          {/* Tarjetas de totales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
            <StatCard Icon={Truck}        label="Movimientos"   value={tots.total_camiones}                                        color="var(--verde)" />
            <StatCard Icon={CheckCircle2} label="Egresados"     value={tots.egresados}                                             color="#059669" />
            <StatCard Icon={Building2}    label="En planta"     value={tots.en_planta}                                             color="#2563eb" />
            <StatCard Icon={Scale}        label="Kg netos"      value={(tots.kg_netos_total || 0).toLocaleString('es-AR') + ' kg'} color="#7c3aed" />
            <StatCard Icon={TrendingDown} label="Kg liquidable" value={(tots.kg_liquidable_total || 0).toLocaleString('es-AR') + ' kg'} color="#b45309" />
          </div>

          {/* Tabla + botón export */}
          <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--sombra)' }}>

            {/* Header de la tabla */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gris-borde)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {movs.length} movimiento{movs.length !== 1 ? 's' : ''} encontrado{movs.length !== 1 ? 's' : ''}
              </span>
              {movs.length > 0 && (
                <button
                  onClick={exportarExcel}
                  style={{ background: '#16a34a', color: '#fff', padding: '7px 18px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FileSpreadsheet size={14}/> Exportar Excel
                </button>
              )}
            </div>

            {movs.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--texto-suave)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <ClipboardList size={36} style={{ opacity: .25 }} />
                <div style={{ fontWeight: 600 }}>Sin resultados para los filtros seleccionados</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--gris-bg)', borderBottom: '2px solid var(--gris-borde)' }}>
                      {['Fecha', 'Patente', 'Grano', 'Productor', 'Empresa transp.', 'Chofer', 'Silo', 'Kg brutos', 'Kg netos', 'Kg liq.', 'Egreso', 'Estado', ''].map(h => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--texto-suave)', fontSize: 10, textTransform: 'uppercase', letterSpacing: .4, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movs.map((m, i) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--gris-borde)', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={td}>{m.fecha_ingreso?.slice(0, 10)} {m.fecha_ingreso?.slice(11, 16)}</td>
                        <td style={td}><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>{m.patente}</span></td>
                        <td style={td}><GranoBadge grano={m.grano} /></td>
                        <td style={{ ...td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.productor}</td>
                        <td style={{ ...td, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--texto-suave)' }}>{m.empresa_transporte || '—'}</td>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--texto-suave)' }}>{m.chofer || '—'}</td>
                        <td style={td}>{m.silo_destino}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{m.kg_brutos?.toLocaleString('es-AR')}</td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          {m.kg_netos != null
                            ? <span style={{ fontWeight: 700, color: '#7c3aed' }}>{m.kg_netos.toLocaleString('es-AR')}</span>
                            : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          {m.kg_liquidable != null
                            ? <span style={{ fontWeight: 700, color: '#b45309' }}>{m.kg_liquidable.toLocaleString('es-AR')}</span>
                            : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td style={td}>{m.hora_egreso?.slice(11, 16) || <span style={{ color: '#ccc' }}>—</span>}</td>
                        <td style={td}>
                          {m.estado === 'egresado'
                            ? <Badge label="Egresado" bg="#d1fae5" color="#065f46" border="#6ee7b7" />
                            : <Badge label="En planta" bg="#dbeafe" color="#1e40af" border="#93c5fd" />}
                        </td>
                        <td style={td}>
                          {m.estado === 'egresado' && (
                            <button
                              onClick={() => setTicketMov(m)}
                              style={{ background: '#1a4d23', color: '#fff', padding: '5px 12px', fontSize: 12, borderRadius: 6, whiteSpace: 'nowrap' }}
                            >
                              <Printer size={12}/> Imprimir remito
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot>
                    <tr style={{ background: '#f8f4ff', borderTop: '2px solid #c4b5fd' }}>
                      <td colSpan={7} style={{ ...td, fontWeight: 700, color: '#5b21b6' }}>TOTALES ({tots.total_camiones} movimientos)</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800 }}>{tots.kg_brutos_total?.toLocaleString('es-AR')}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>{tots.kg_netos_total?.toLocaleString('es-AR')}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 800, color: '#b45309' }}>{tots.kg_liquidable_total?.toLocaleString('es-AR')}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {ticketMov && <ModalTicket mov={ticketMov} onClose={() => setTicketMov(null)} />}
    </div>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Campo({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-suave)', letterSpacing: .4 }}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ Icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--gris-borde)', borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '12px 16px', boxShadow: 'var(--sombra)' }}>
      <div style={{ marginBottom: 4, color }}><Icon size={18} /></div>
      <div style={{ fontSize: 17, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--texto-suave)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function GranoBadge({ grano }) {
  const color = GRANO_COLOR[grano] || '#888';
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}55`, borderRadius: 20, padding: '2px 8px', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
      {grano}
    </span>
  );
}

function Badge({ label, bg, color, border }) {
  return (
    <span style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
      {label}
    </span>
  );
}

const td = { padding: '9px 10px', verticalAlign: 'middle' };
