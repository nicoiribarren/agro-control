const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const db      = require('../db');
const { requireAuth, requireAdmin, JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email.toLowerCase().trim());
  if (!usuario) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }

  const passwordOk = bcrypt.compareSync(password, usuario.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
  }

  // Token válido por 12 horas (un turno de trabajo)
  const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
  const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

  res.json({ token, usuario: payload });
});

// GET /api/auth/me — verifica token y devuelve datos del usuario actual
router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.usuario });
});

// ── Gestión de usuarios (solo admin) ──────────────────────────────────────

// GET /api/auth/usuarios
router.get('/usuarios', requireAuth, requireAdmin, (req, res) => {
  const usuarios = db.prepare(`
    SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id
  `).all();
  res.json(usuarios);
});

// POST /api/auth/usuarios — crear nuevo usuario
router.post('/usuarios', requireAuth, requireAdmin, (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (!['admin', 'operador'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Debe ser "admin" u "operador".' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());
  if (existe) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)
  `).run(nombre.trim(), email.toLowerCase().trim(), hash, rol);

  const nuevo = db.prepare('SELECT id, nombre, email, rol, activo, created_at FROM usuarios WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(nuevo);
});

// PUT /api/auth/usuarios/:id — editar usuario
router.put('/usuarios/:id', requireAuth, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre, rol, activo, password } = req.body;

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

  // No permitir desactivar el último admin
  if (activo === 0 || rol === 'operador') {
    const admins = db.prepare(`SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id != ?`).get(id);
    if (admins.n === 0) {
      return res.status(400).json({ error: 'No podés desactivar o degradar al único administrador.' });
    }
  }

  const updates = [];
  const params  = [];

  if (nombre)           { updates.push('nombre = ?');        params.push(nombre.trim()); }
  if (rol)              { updates.push('rol = ?');           params.push(rol); }
  if (activo !== undefined) { updates.push('activo = ?');    params.push(activo ? 1 : 0); }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar.' });

  params.push(id);
  db.prepare(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const actualizado = db.prepare('SELECT id, nombre, email, rol, activo, created_at FROM usuarios WHERE id = ?').get(id);
  res.json(actualizado);
});

module.exports = router;
