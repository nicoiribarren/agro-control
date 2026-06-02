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

// Migración: agregar columnas de egreso sin perder datos existentes
// SQLite no soporta ADD COLUMN IF NOT EXISTS → verificamos con PRAGMA
const colsExistentes = db.prepare('PRAGMA table_info(movimientos)').all().map(c => c.name);
for (const [col, tipo] of [
  ['kg_tara',     'INTEGER'],
  ['kg_netos',    'INTEGER'],
  ['hora_egreso', 'TEXT'],
]) {
  if (!colsExistentes.includes(col)) {
    db.exec(`ALTER TABLE movimientos ADD COLUMN ${col} ${tipo}`);
  }
}

// Normalizar estado legado: 'ingresado' → 'en_planta'
db.exec(`UPDATE movimientos SET estado = 'en_planta' WHERE estado = 'ingresado'`);

module.exports = db;
