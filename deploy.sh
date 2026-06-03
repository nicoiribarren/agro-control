#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# deploy.sh — Script de deploy para Agro Control en VPS Ubuntu
#
# Uso normal:     bash deploy.sh
# Primera vez:    bash deploy.sh --first-run
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="agro-control"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/pm2"
BRANCH="${DEPLOY_BRANCH:-main}"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}▶ $*${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $*${NC}"; }
error() { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }

FIRST_RUN=false
[[ "${1:-}" == "--first-run" ]] && FIRST_RUN=true

# ── Validaciones ─────────────────────────────────────────────────
command -v node  >/dev/null || error "Node.js no está instalado"
command -v npm   >/dev/null || error "npm no está instalado"
command -v pm2   >/dev/null || error "PM2 no está instalado (npm i -g pm2)"
command -v git   >/dev/null || error "git no está instalado"

cd "$APP_DIR"

# ── Primera ejecución: setup inicial ─────────────────────────────
if $FIRST_RUN; then
    info "Primera instalación — setup inicial..."

    # Directorio de logs para PM2
    sudo mkdir -p "$LOG_DIR"
    sudo chown "$USER":"$USER" "$LOG_DIR"

    # Copiar .env si no existe
    if [[ ! -f .env ]]; then
        cp .env.example .env
        warn ".env creado desde .env.example — editalo antes de continuar"
        warn "  nano $APP_DIR/.env"
        exit 0
    fi
fi

# ── 1. Actualizar código ──────────────────────────────────────────
info "Actualizando código desde GitHub ($BRANCH)..."
git fetch origin
git reset --hard "origin/$BRANCH"

# ── 2. Instalar dependencias backend ─────────────────────────────
info "Instalando dependencias del backend..."
npm install --prefix backend --omit=dev

# ── 3. Build del frontend ─────────────────────────────────────────
info "Instalando dependencias del frontend..."
npm install --prefix frontend

info "Buildeando frontend (Vite)..."
npm run build --prefix frontend

# ── 4. Reiniciar proceso con PM2 ──────────────────────────────────
info "Reiniciando proceso con PM2..."

if pm2 describe "$APP_NAME" &>/dev/null; then
    pm2 restart "$APP_NAME" --update-env
else
    info "Primera vez con PM2 — iniciando proceso..."
    pm2 start ecosystem.config.js --env production
fi

pm2 save

# ── Resultado ─────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}✅ Deploy completado exitosamente${NC}"
echo ""
pm2 status "$APP_NAME"
echo ""
info "Logs en tiempo real: pm2 logs $APP_NAME"
info "Estado:              pm2 status"
