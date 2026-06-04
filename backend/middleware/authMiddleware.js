const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';

/**
 * Middleware: verifica que el request tenga un JWT válido.
 * Si es válido, adjunta req.usuario = { id, nombre, email, rol }
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión expirada o inválida. Iniciá sesión nuevamente.' });
  }
}

/**
 * Middleware: solo permite acceso a administradores.
 * Usar DESPUÉS de requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
