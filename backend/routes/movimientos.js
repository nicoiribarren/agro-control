const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Humedad base estándar por grano (SENASA / uso habitual)
const HUMEDAD_BASE = { 'Soja': 13.5, 'Maíz': 14.0, 'Trigo': 11.0, 'Girasol': 9.0 };

// GET /api/movimientos — movimientos del día actual
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM movimientos
    WHERE date(fecha_ingreso) = date('now', 'localtime')
    ORDER BY fecha_ingreso DESC
  `).all();
  res.json(rows);
});

// GET /api/movimientos/stats — resumen del día
router.get('/stats', (req, res) => {
  const por_grano = db.prepare(`
    SELECT
      grano,
      COUNT(*) AS camiones,
      SUM(kg_brutos) AS kg_brutos_total,
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_netos    ELSE 0 END), 0) AS kg_netos_total,
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_liquidable ELSE 0 END), 0) AS kg_liquidable_total
    FROM movimientos
    WHERE date(fecha_ingreso) = date('now', 'localtime')
    GROUP BY grano
    ORDER BY kg_brutos_total DESC
  `).all();

  const totales = db.prepare(`
    SELECT
      COUNT(*)                                                               AS total_camiones,
      COALESCE(SUM(kg_brutos), 0)                                            AS kg_brutos_total,
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_netos    ELSE 0 END), 0) AS kg_netos_total,
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_liquidable ELSE 0 END), 0) AS kg_liquidable_total,
      SUM(CASE WHEN estado = 'en_planta'  THEN 1 ELSE 0 END)                AS en_planta,
      SUM(CASE WHEN estado = 'egresado'   THEN 1 ELSE 0 END)                AS egresados
    FROM movimientos
    WHERE date(fecha_ingreso) = date('now', 'localtime')
  `).get();

  res.json({ por_grano, totales });
});

// POST /api/movimientos — registrar nuevo ingreso
router.post('/', (req, res) => {
  const {
    // Campos requeridos
    patente, grano, productor, nro_carta_porte, ctg, kg_brutos, silo_destino,
    // Transporte (obligatorios principales)
    empresa_transporte, chofer, chofer_dni, patente_acoplado, kilometraje, tarifa_flete, moneda_flete, tarifa_facturacion,
    // Procedencia y destino
    localidad_procedencia, localidad_destino,
    // Tipo de movimiento
    tipo_movimiento,
    // Calidad (opcionales)
    humedad, granos_danados, granos_picados, impurezas, volatil, zaranda, obs_calidad,
  } = req.body;

  if (!patente || !grano || !productor || !nro_carta_porte || !ctg || !kg_brutos || !silo_destino) {
    return res.status(400).json({ error: 'Los campos obligatorios de la carta de porte están incompletos.' });
  }

  if (!empresa_transporte || !chofer || !chofer_dni || !patente_acoplado) {
    return res.status(400).json({ error: 'Los datos del transporte son obligatorios (empresa, chofer, DNI y patente acoplado).' });
  }

  if (!tipo_movimiento) {
    return res.status(400).json({ error: 'El tipo de movimiento es obligatorio.' });
  }

  const GRANOS_VALIDOS = ['Soja', 'Maíz', 'Trigo', 'Girasol'];
  if (!GRANOS_VALIDOS.includes(grano)) {
    return res.status(400).json({ error: 'Grano inválido.' });
  }

  if (kg_brutos <= 0 || kg_brutos > 60000) {
    return res.status(400).json({ error: 'Kg brutos fuera de rango (1–60 000).' });
  }

  const result = db.prepare(`
    INSERT INTO movimientos (
      patente, grano, productor, nro_carta_porte, ctg, kg_brutos, silo_destino, estado,
      tipo_movimiento, localidad_procedencia, localidad_destino,
      empresa_transporte, chofer, chofer_dni, patente_acoplado, kilometraje, tarifa_flete, moneda_flete, tarifa_facturacion,
      humedad, granos_danados, granos_picados, impurezas, volatil, zaranda, obs_calidad
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, 'en_planta',
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    patente.toUpperCase().trim(),
    grano,
    productor.trim(),
    nro_carta_porte.trim(),
    ctg.trim(),
    parseInt(kg_brutos),
    silo_destino.trim(),
    // tipo y procedencia/destino
    tipo_movimiento.trim(),
    localidad_procedencia?.trim() || null,
    localidad_destino?.trim()     || null,
    // transporte
    empresa_transporte.trim(),
    chofer.trim(),
    chofer_dni.trim(),
    patente_acoplado.toUpperCase().trim(),
    kilometraje        ? parseInt(kilometraje)        : null,
    tarifa_flete       ? parseFloat(tarifa_flete)     : null,
    moneda_flete       || 'ARS',
    tarifa_facturacion ? parseFloat(tarifa_facturacion): null,
    // calidad
    humedad       != null && humedad      !== '' ? parseFloat(humedad)       : null,
    granos_danados!= null && granos_danados!==''  ? parseFloat(granos_danados): null,
    granos_picados!= null && granos_picados!==''  ? parseFloat(granos_picados): null,
    impurezas     != null && impurezas    !== '' ? parseFloat(impurezas)     : null,
    volatil       != null && volatil      !== '' ? parseFloat(volatil)       : null,
    zaranda       != null && zaranda      !== '' ? parseFloat(zaranda)       : null,
    obs_calidad?.trim() || null,
  );

  const nuevo = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(nuevo);
});

// PUT /api/movimientos/:id/egreso — registrar tara y cerrar movimiento
router.put('/:id/egreso', (req, res) => {
  const id      = parseInt(req.params.id);
  const kg_tara = parseInt(req.body.kg_tara);

  if (!Number.isInteger(kg_tara) || kg_tara <= 0) {
    return res.status(400).json({ error: 'Kg tara inválido.' });
  }

  const mov = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(id);
  if (!mov) return res.status(404).json({ error: 'Movimiento no encontrado.' });
  if (mov.estado === 'egresado') {
    return res.status(409).json({ error: 'El camión ya fue registrado como egresado.' });
  }
  if (kg_tara >= mov.kg_brutos) {
    return res.status(400).json({
      error: `La tara (${kg_tara} kg) debe ser menor que los kg brutos (${mov.kg_brutos} kg).`
    });
  }

  const kg_netos = mov.kg_brutos - kg_tara;

  // ── Descuentos de calidad ──────────────────────────────────────────────
  const humBase  = HUMEDAD_BASE[mov.grano] ?? 13.5;
  const humReal  = mov.humedad  != null ? parseFloat(mov.humedad)  : 0;
  const volReal  = mov.volatil  != null ? parseFloat(mov.volatil)  : 0;
  const zarReal  = mov.zaranda  != null ? parseFloat(mov.zaranda)  : 0;

  // Solo se descuenta si supera la base; para volátil y zaranda la base es 0
  const kg_descuento_humedad = humReal > humBase
    ? Math.round(kg_netos * (humReal - humBase) / 100)
    : 0;
  const kg_descuento_volatil = volReal > 0
    ? Math.round(kg_netos * volReal / 100)
    : 0;
  const kg_descuento_zaranda = zarReal > 0
    ? Math.round(kg_netos * zarReal / 100)
    : 0;

  const kg_liquidable = kg_netos - kg_descuento_humedad - kg_descuento_volatil - kg_descuento_zaranda;

  db.prepare(`
    UPDATE movimientos
    SET kg_tara              = ?,
        kg_netos             = ?,
        hora_egreso          = datetime('now', 'localtime'),
        estado               = 'egresado',
        kg_descuento_humedad = ?,
        kg_descuento_volatil = ?,
        kg_descuento_zaranda = ?,
        kg_liquidable        = ?
    WHERE id = ?
  `).run(kg_tara, kg_netos, kg_descuento_humedad, kg_descuento_volatil, kg_descuento_zaranda, kg_liquidable, id);

  const actualizado = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(id);
  res.json(actualizado);
});

// GET /api/movimientos/historico — reportes con filtros (solo admin)
router.get('/historico', (req, res) => {
  const { fecha_desde, fecha_hasta, grano, estado, productor } = req.query;

  const hoy = new Date().toISOString().split('T')[0];
  const desde = fecha_desde || hoy;
  const hasta  = fecha_hasta || hoy;

  let where = `date(fecha_ingreso) BETWEEN ? AND ?`;
  const params = [desde, hasta];

  if (grano)    { where += ` AND grano = ?`;           params.push(grano); }
  if (estado)   { where += ` AND estado = ?`;          params.push(estado); }
  if (productor){ where += ` AND productor LIKE ?`;    params.push(`%${productor}%`); }

  const rows = db.prepare(`
    SELECT * FROM movimientos
    WHERE ${where}
    ORDER BY fecha_ingreso DESC
  `).all(...params);

  // Totales del conjunto filtrado
  const totales = {
    total_camiones:      rows.length,
    kg_brutos_total:     rows.reduce((s, r) => s + (r.kg_brutos  || 0), 0),
    kg_netos_total:      rows.reduce((s, r) => s + (r.kg_netos    || 0), 0),
    kg_liquidable_total: rows.reduce((s, r) => s + (r.kg_liquidable || 0), 0),
    egresados:           rows.filter(r => r.estado === 'egresado').length,
    en_planta:           rows.filter(r => r.estado === 'en_planta').length,
  };

  res.json({ movimientos: rows, totales });
});

module.exports = router;
