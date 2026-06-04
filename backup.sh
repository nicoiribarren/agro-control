#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — Backup automático de la base de datos Agro Control
#
# Ejecuta:
#   - Copia local comprimida con fecha (retención 30 días)
#   - Upload a Supabase Storage (si las credenciales están configuradas)
#
# Cron sugerido (23:00 hora Argentina = 02:00 UTC):
#   0 2 * * * /var/www/agro-control/backup.sh >> /var/log/agro-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Cargar variables de entorno desde .env ────────────────────────────────────
APP_DIR="/var/www/agro-control"
if [[ -f "$APP_DIR/.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$APP_DIR/.env" | grep -v '^$' | xargs)
fi
DB_PATH="$APP_DIR/backend/agro.db"
BACKUP_DIR="/var/backups/agro-control"
RETENTION_DAYS=30
FECHA=$(date '+%Y-%m-%d')
HORA=$(date '+%H:%M')
BACKUP_FILE="agro_${FECHA}.db.gz"

# Supabase Storage (configurar en .env del servidor)
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"
SUPABASE_BUCKET="agro-backups"

# ── Monitoreo healthchecks.io ─────────────────────────────────────────────────
HC_URL="https://hc-ping.com/dfd1bba5-ce50-4e24-b81a-870f09afd5f8"

# Si el script termina con error → ping /fail → email de alerta automático
trap 'curl -fsS --retry 3 "$HC_URL/fail" > /dev/null 2>&1' ERR

# ── Colores para log ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${RED}[ERROR]${NC} $*"; }

echo ""
echo "════════════════════════════════════════════════"
echo "  Agro Control — Backup $FECHA $HORA"
echo "════════════════════════════════════════════════"

# Ping de inicio (healthchecks sabe que el job arrancó)
curl -fsS --retry 3 "$HC_URL/start" > /dev/null 2>&1 || true

# ── 1. Verificar que existe la base de datos ──────────────────────────────────
if [[ ! -f "$DB_PATH" ]]; then
  error "Base de datos no encontrada: $DB_PATH"
  exit 1
fi

# ── 2. Crear directorio de backups locales ────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── 3. Backup local comprimido ────────────────────────────────────────────────
info "Creando backup local..."
# SQLite WAL checkpoint antes de copiar
node -e "
  const db = require('$APP_DIR/backend/db');
  db.pragma('wal_checkpoint(FULL)');
  db.close();
  console.log('WAL checkpoint OK');
" 2>/dev/null || true

cp "$DB_PATH" "/tmp/agro_backup_tmp.db"
gzip -f "/tmp/agro_backup_tmp.db"
mv "/tmp/agro_backup_tmp.db.gz" "$BACKUP_DIR/$BACKUP_FILE"

TAMANIO=$(du -sh "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
info "Backup local guardado: $BACKUP_DIR/$BACKUP_FILE ($TAMANIO)"

# ── 4. Limpiar backups locales viejos (>30 días) ──────────────────────────────
info "Limpiando backups locales de más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -name "agro_*.db.gz" -mtime +$RETENTION_DAYS -delete
TOTAL=$(ls "$BACKUP_DIR"/agro_*.db.gz 2>/dev/null | wc -l)
info "Backups locales disponibles: $TOTAL"

# ── 5. Upload a Supabase Storage ──────────────────────────────────────────────
if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_SERVICE_KEY" ]]; then
  info "Subiendo a Supabase Storage..."

  HTTP_STATUS=$(curl -s -o /tmp/supabase_resp.txt -w "%{http_code}" \
    -X POST \
    "$SUPABASE_URL/storage/v1/object/$SUPABASE_BUCKET/$BACKUP_FILE" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/octet-stream" \
    -H "x-upsert: true" \
    --data-binary "@$BACKUP_DIR/$BACKUP_FILE")

  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
    info "Upload a Supabase exitoso ✅"
  else
    RESP=$(cat /tmp/supabase_resp.txt)
    warn "Upload a Supabase falló (HTTP $HTTP_STATUS): $RESP"
    warn "El backup local sigue disponible en $BACKUP_DIR/$BACKUP_FILE"
  fi

  # Limpiar backups viejos en Supabase (>30 días)
  FECHA_LIMITE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d' 2>/dev/null || \
                 date -v-${RETENTION_DAYS}d '+%Y-%m-%d' 2>/dev/null || echo "")
  if [[ -n "$FECHA_LIMITE" ]]; then
    info "Límite de retención remota: archivos antes de $FECHA_LIMITE"
    # Lista y borra archivos viejos en Supabase
    curl -s -X POST \
      "$SUPABASE_URL/storage/v1/object/list/$SUPABASE_BUCKET" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{"prefix":"agro_","limit":100}' 2>/dev/null | \
    node -e "
      const data = require('fs').readFileSync('/dev/stdin','utf8');
      let files;
      try { files = JSON.parse(data); } catch { process.exit(0); }
      if (!Array.isArray(files)) process.exit(0);
      const limite = '$FECHA_LIMITE';
      const viejos = files.filter(f => f.name && f.name < 'agro_' + limite);
      if (viejos.length) console.log(viejos.map(f=>f.name).join('\n'));
    " 2>/dev/null | while read -r fname; do
      curl -s -X DELETE \
        "$SUPABASE_URL/storage/v1/object/$SUPABASE_BUCKET/$fname" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" > /dev/null
      info "Archivo viejo eliminado de Supabase: $fname"
    done
  fi
else
  warn "SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados — solo backup local"
fi

# ── Resumen final ─────────────────────────────────────────────────────────────
echo ""
info "════ Backup completado ════"
info "Archivo: $BACKUP_FILE ($TAMANIO)"
info "Local:   $BACKUP_DIR/"
[[ -n "$SUPABASE_URL" ]] && info "Remoto:  Supabase Storage / $SUPABASE_BUCKET"
echo ""

# Ping de éxito → healthchecks marca el check como OK
curl -fsS --retry 3 "$HC_URL" > /dev/null 2>&1 || true
