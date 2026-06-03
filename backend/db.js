const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'agro.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS movimientos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    patente          TEXT    NOT NULL,
    grano            TEXT    NOT NULL,
    productor        TEXT    NOT NULL,
    nro_carta_porte  TEXT    NOT NULL,
    ctg              TEXT    NOT NULL,
    kg_brutos        INTEGER NOT NULL,
    silo_destino     TEXT    NOT NULL,
    fecha_ingreso    TEXT    DEFAULT (datetime('now', 'localtime')),
    estado           TEXT    DEFAULT 'en_planta'
  )
`);

// Migración no-destructiva: agrega columnas faltantes sin perder datos
// SQLite no soporta ADD COLUMN IF NOT EXISTS → verificamos con PRAGMA
const colsExistentes = db.prepare('PRAGMA table_info(movimientos)').all().map(c => c.name);

const columnasMigracion = [
  // Egreso / pesada
  ['kg_tara',               'INTEGER'],
  ['kg_netos',              'INTEGER'],
  ['hora_egreso',           'TEXT'],

  // Datos de transporte
  ['empresa_transporte',    'TEXT'],
  ['chofer',                'TEXT'],
  ['chofer_dni',            'TEXT'],
  ['patente_acoplado',      'TEXT'],
  ['kilometraje',           'INTEGER'],
  ['tarifa_flete',          'REAL'],
  ['moneda_flete',          'TEXT'],

  // Análisis de calidad (porcentajes)
  ['humedad',               'REAL'],
  ['granos_danados',        'REAL'],
  ['granos_picados',        'REAL'],
  ['impurezas',             'REAL'],
  ['volatil',               'REAL'],
  ['zaranda',               'REAL'],
  ['obs_calidad',           'TEXT'],

  // Liquidación con descuentos de calidad
  ['kg_descuento_humedad',  'REAL'],
  ['kg_descuento_volatil',  'REAL'],
  ['kg_descuento_zaranda',  'REAL'],
  ['kg_liquidable',         'INTEGER'],
];

for (const [col, tipo] of columnasMigracion) {
  if (!colsExistentes.includes(col)) {
    db.exec(`ALTER TABLE movimientos ADD COLUMN ${col} ${tipo}`);
  }
}

// Normalizar estado legado: 'ingresado' → 'en_planta'
db.exec(`UPDATE movimientos SET estado = 'en_planta' WHERE estado = 'ingresado'`);

module.exports = db;
