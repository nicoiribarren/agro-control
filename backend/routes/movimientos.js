const express = require('express');
const router = express.Router();
const db = require('../db');

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
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_netos ELSE 0 END), 0) AS kg_netos_total
    FROM movimientos
    WHERE date(fecha_ingreso) = date('now', 'localtime')
    GROUP BY grano
    ORDER BY kg_brutos_total DESC
  `).all();

  const totales = db.prepare(`
    SELECT
      COUNT(*)                                                          AS total_camiones,
      COALESCE(SUM(kg_brutos), 0)                                       AS kg_brutos_total,
      COALESCE(SUM(CASE WHEN estado = 'egresado' THEN kg_netos ELSE 0 END), 0) AS kg_netos_total,
      SUM(CASE WHEN estado = 'en_planta'  THEN 1 ELSE 0 END)           AS en_planta,
      SUM(CASE WHEN estado = 'egresado'   THEN 1 ELSE 0 END)           AS egresados
    FROM movimientos
    WHERE date(fecha_ingreso) = date('now', 'localtime')
  `).get();

  res.json({ por_grano, totales });
});

// POST /api/movimientos — registrar nuevo ingreso
router.post('/', (req, res) => {
  const { patente, grano, productor, nro_carta_porte, ctg, kg_brutos, silo_destino } = req.body;

  if (!patente || !grano || !productor || !nro_carta_porte || !ctg || !kg_brutos || !silo_destino) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const GRANOS_VALIDOS = ['Soja', 'Maíz', 'Trigo', 'Girasol'];
  if (!GRANOS_VALIDOS.includes(grano)) {
    return res.status(400).json({ error: 'Grano inválido.' });
  }

  if (kg_brutos <= 0 || kg_brutos > 60000) {
    return res.status(400).json({ error: 'Kg brutos fuera de rango.' });
  }

  const result = db.prepare(`
    INSERT INTO movimientos (patente, grano, productor, nro_carta_porte, ctg, kg_brutos, silo_destino, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'en_planta')
  `).run(
    patente.toUpperCase().trim(),
    grano,
    productor.trim(),
    nro_carta_porte.trim(),
    ctg.trim(),
    parseInt(kg_brutos),
    silo_destino.trim()
  );

  const nuevo = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(nuevo);
});

// PUT /api/movimientos/:id/egreso — registrar tara y cerrar movimiento
router.put('/:id/egreso', (req, res) => {
  const id = parseInt(req.params.id);
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
    return res.status(400).json({ error: `La tara (${kg_tara} kg) debe ser menor que los kg brutos (${mov.kg_brutos} kg).` });
  }

  const kg_netos = mov.kg_brutos - kg_tara;

  db.prepare(`
    UPDATE movimientos
    SET kg_tara     = ?,
        kg_netos    = ?,
        hora_egreso = datetime('now', 'localtime'),
        estado      = 'egresado'
    WHERE id = ?
  `).run(kg_tara, kg_netos, id);

  const actualizado = db.prepare('SELECT * FROM movimientos WHERE id = ?').get(id);
  res.json(actualizado);
});

module.exports = router;
