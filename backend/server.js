const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { requireAuth } = require('./middleware/authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// ── Rutas públicas ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Rutas protegidas (requieren JWT válido) ───────────────────────────────
app.use('/api/ctg',          requireAuth, require('./routes/ctg'));
app.use('/api/movimientos',  requireAuth, require('./routes/movimientos'));

// ── En producción, Express sirve el build de React como SPA ──────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) =>
    res.sendFile(path.join(distPath, 'index.html'))
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
