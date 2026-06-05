/**
 * ModalTicket — Ticket de pesada imprimible
 *
 * Muestra el ticket completo y llama a window.print().
 * El CSS @media print (en index.css) oculta todo excepto .ticket-imprimible.
 */
import { Printer, X } from 'lucide-react';

export default function ModalTicket({ mov, onClose }) {
  function imprimir() {
    window.print();
  }

  const fecha = mov.fecha_ingreso?.slice(0, 10) || '';
  const horaIngreso = mov.fecha_ingreso?.slice(11, 16) || '—';
  const horaEgreso  = mov.hora_egreso?.slice(11, 16)   || '—';

  const humBase = { Soja: 13.5, Maíz: 14.0, Trigo: 11.0, Girasol: 9.0 }[mov.grano] ?? 13.5;
  const tieneCalidad = mov.humedad != null || mov.volatil != null || mov.zaranda != null;
  const tieneDescuentos = (mov.kg_descuento_humedad > 0) || (mov.kg_descuento_volatil > 0) || (mov.kg_descuento_zaranda > 0);

  return (
    <>
      {/* ── Overlay (se oculta al imprimir) ── */}
      <div
        className="ticket-overlay"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 480 }}>

          {/* Botones de acción (se ocultan al imprimir) */}
          <div className="ticket-acciones" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.4)', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={14} /> Cerrar
            </button>
            <button onClick={imprimir}
              style={{ background: '#fff', color: '#1a4d23', fontWeight: 800, padding: '8px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Printer size={14} /> Imprimir / Guardar PDF
            </button>
          </div>

          {/* ── TICKET ── */}
          <div className="ticket-imprimible" style={estiloTicket}>

            {/* Encabezado */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1a4d23', paddingBottom: 12, marginBottom: 14 }}>
              <img src="/logo.png" alt="JKI Agro" style={{ height: 48, objectFit: 'contain', marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>jkiagro.com</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, color: '#1a4d23' }}>TICKET DE PESADA</div>
              <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>
                N° <strong>#{String(mov.id).padStart(4, '0')}</strong> · {formatFecha(fecha)}
              </div>
            </div>

            {/* Transporte */}
            <Seccion titulo="TRANSPORTE">
              <Fila label="Patente camión"   valor={mov.patente} mono bold />
              {mov.patente_acoplado && <Fila label="Patente acoplado" valor={mov.patente_acoplado} mono />}
              {mov.empresa_transporte && <Fila label="Empresa"   valor={mov.empresa_transporte} />}
              {mov.chofer && <Fila label="Chofer"    valor={mov.chofer} />}
              {mov.chofer_dni && <Fila label="DNI"  valor={formatDNI(mov.chofer_dni)} />}
              {mov.kilometraje && <Fila label="Kilometraje" valor={`${Number(mov.kilometraje).toLocaleString('es-AR')} km`} />}
              {mov.tarifa_flete && (
                <Fila label="Tarifa referencia" valor={`${mov.moneda_flete === 'USD' ? 'U$S' : '$'} ${Number(mov.tarifa_flete).toLocaleString('es-AR')}`} />
              )}
              {mov.tarifa_facturacion && (
                <Fila label="Tarifa facturación" valor={`${mov.moneda_flete === 'USD' ? 'U$S' : '$'} ${Number(mov.tarifa_facturacion).toLocaleString('es-AR')}`} />
              )}
            </Seccion>

            {/* Mercadería */}
            <Seccion titulo="MERCADERÍA">
              <Fila label="Grano"          valor={mov.grano} bold />
              <Fila label="Productor"      valor={mov.productor} />
              <Fila label="Carta de porte" valor={mov.nro_carta_porte} mono />
              <Fila label="CTG"            valor={mov.ctg} mono />
              <Fila label="Silo destino"   valor={mov.silo_destino} />
              {mov.tipo_movimiento       && <Fila label="Tipo de movimiento" valor={mov.tipo_movimiento} />}
              {mov.localidad_procedencia && <Fila label="Procedencia"        valor={mov.localidad_procedencia} />}
              {mov.localidad_destino     && <Fila label="Destino"            valor={mov.localidad_destino} />}
            </Seccion>

            {/* Pesada */}
            <Seccion titulo="PESADA">
              <Fila label="Ingreso"   valor={horaIngreso} />
              <Fila label="Egreso"    valor={horaEgreso} />
              <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
              <Fila label="Kg brutos" valor={`${(mov.kg_brutos || 0).toLocaleString('es-AR')} kg`} bold />
              <Fila label="Kg tara"   valor={mov.kg_tara != null ? `${mov.kg_tara.toLocaleString('es-AR')} kg` : 'Pendiente'} />
              <Fila label="Kg netos"  valor={mov.kg_netos != null ? `${mov.kg_netos.toLocaleString('es-AR')} kg` : 'Pendiente'} bold />
            </Seccion>

            {/* Calidad */}
            {tieneCalidad && (
              <Seccion titulo="ANÁLISIS DE CALIDAD">
                {mov.humedad    != null && <Fila label={`Humedad (base ${humBase}%)`} valor={`${mov.humedad}%`} />}
                {mov.granos_danados != null && <Fila label="Granos dañados"  valor={`${mov.granos_danados}%`} />}
                {mov.granos_picados != null && <Fila label="Granos picados"  valor={`${mov.granos_picados}%`} />}
                {mov.impurezas  != null && <Fila label="Impurezas / M.E."   valor={`${mov.impurezas}%`} />}
                {mov.volatil    != null && <Fila label="Volátil"             valor={`${mov.volatil}%`} />}
                {mov.zaranda    != null && <Fila label="Zaranda"             valor={`${mov.zaranda}%`} />}
                {mov.obs_calidad && <Fila label="Observaciones" valor={mov.obs_calidad} />}
              </Seccion>
            )}

            {/* Liquidación */}
            {mov.kg_liquidable != null && (
              <Seccion titulo="LIQUIDACIÓN">
                <Fila label="Kg netos" valor={`${mov.kg_netos.toLocaleString('es-AR')} kg`} />
                {mov.kg_descuento_humedad > 0 && (
                  <Fila label={`Desc. humedad (${mov.humedad}% → ${humBase}%)`} valor={`- ${mov.kg_descuento_humedad.toLocaleString('es-AR')} kg`} negativo />
                )}
                {mov.kg_descuento_volatil > 0 && (
                  <Fila label={`Desc. volátil (${mov.volatil}%)`} valor={`- ${mov.kg_descuento_volatil.toLocaleString('es-AR')} kg`} negativo />
                )}
                {mov.kg_descuento_zaranda > 0 && (
                  <Fila label={`Desc. zaranda (${mov.zaranda}%)`} valor={`- ${mov.kg_descuento_zaranda.toLocaleString('es-AR')} kg`} negativo />
                )}
                {!tieneDescuentos && <Fila label="Sin descuentos de calidad" valor="—" />}

                {/* Total liquidable — destacado */}
                <div style={{
                  marginTop: 10, padding: '10px 14px',
                  background: '#1a4d23', color: '#fff',
                  borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>KG LIQUIDABLE</span>
                  <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: .5 }}>
                    {mov.kg_liquidable.toLocaleString('es-AR')} kg
                  </span>
                </div>
              </Seccion>
            )}

            {/* Pie */}
            <div style={{ borderTop: '1px solid #ddd', marginTop: 14, paddingTop: 10, textAlign: 'center', fontSize: 10, color: '#999' }}>
              Emitido el {formatFecha(fecha)} a las {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · JKI Agro Control
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: '#1a4d23',
        textTransform: 'uppercase', borderBottom: '1px solid #1a4d2340',
        paddingBottom: 4, marginBottom: 8,
      }}>
        {titulo}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function Fila({ label, valor, bold, mono, negativo }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
      <span style={{ color: '#666', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 500,
        fontFamily: mono ? 'monospace' : 'inherit',
        color: negativo ? '#b91c1c' : '#111',
        textAlign: 'right',
      }}>
        {valor}
      </span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatDNI(dni) {
  if (!dni) return '';
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const estiloTicket = {
  background: '#fff',
  borderRadius: 10,
  padding: '20px 24px',
  boxShadow: '0 4px 24px rgba(0,0,0,.15)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: '#111',
};
