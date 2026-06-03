# Agro Control 🌾

Sistema de control de ingreso y egreso de camiones con carta de porte electrónica (CPE AFIP) para empresas agrocomerciales argentinas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite |
| Base de datos | SQLite (dev) → PostgreSQL (prod) |
| Web server | Nginx (reverse proxy) |
| Proceso | PM2 |

## Funcionalidades

- **Ingreso de camiones** con patente, grano, productor, CTG, carta de porte, kg brutos y silo destino
- **Consulta CTG** al endpoint AFIP (mock incluido, reemplazable por API real)
- **Escáner QR** de Carta de Porte Electrónica desde la cámara
- **Egreso y pesada de tara** con cálculo automático de kg netos
- **Dashboard del día** con tarjetas de resumen, camiones en planta y tabla de movimientos

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NODE_ENV` | Entorno (`production` / `development`) | `development` |
| `PORT` | Puerto del servidor Express | `3001` |

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/TU_USUARIO/agro-control.git
cd agro-control

# 2. Instalar dependencias
npm install --prefix backend
npm install --prefix frontend

# 3. Correr en desarrollo (ambos servidores)
npm run dev
```

Abre `http://localhost:5173` — el frontend hace proxy al backend en `:3001`.

## Build de producción

```bash
# Buildea el frontend y lo deja en frontend/dist/
npm run build

# Inicia el servidor (Express sirve React + API desde un solo puerto)
npm start
```

## Deploy en VPS (Hostinger Ubuntu 22.04)

Ver [`deploy.sh`](./deploy.sh) para el script de deploy automático.

```bash
# Primera vez en el servidor
bash deploy.sh --first-run

# Deploys subsiguientes
bash deploy.sh
```

Requiere: Node.js 20+, PM2, Nginx instalados en el servidor.  
Ver guía completa en `docs/vps-setup.md` (próximamente).

## Estructura del proyecto

```
agro-control/
├── backend/
│   ├── server.js          # Express app + static serving en prod
│   ├── db.js              # SQLite + migración automática
│   └── routes/
│       ├── ctg.js         # GET /api/ctg/:codigo (mock AFIP)
│       └── movimientos.js # CRUD movimientos + egreso
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── FormIngreso.jsx  # Formulario con escáner QR
│   │       ├── Dashboard.jsx    # Dashboard del día
│   │       └── QrScanner.jsx    # Lector QR (CPE AFIP)
│   └── vite.config.js
├── deploy.sh              # Script de deploy automático
├── railway.json           # Config Railway (alternativa cloud)
└── nginx/
    └── agro-control.conf  # Config Nginx para VPS
```

## API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/ctg/:codigo` | Consulta CTG (mock AFIP) |
| `GET` | `/api/movimientos` | Movimientos del día |
| `GET` | `/api/movimientos/stats` | Resumen estadístico del día |
| `POST` | `/api/movimientos` | Registrar ingreso |
| `PUT` | `/api/movimientos/:id/egreso` | Registrar egreso y tara |

## Licencia

Uso interno. Todos los derechos reservados.
