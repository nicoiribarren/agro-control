const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/ctg', require('./routes/ctg'));
app.use('/api/movimientos', require('./routes/movimientos'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// En producción, Express sirve el build de React como SPA
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
