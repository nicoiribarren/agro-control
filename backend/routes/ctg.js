const express = require('express');
const router = express.Router();

// Datos de prueba que simulan la respuesta de AFIP/SENASA
// Reemplazar por llamada real a la API de AFIP cuando esté disponible
const MOCK_PRODUCTORES = {
  '1': {
    razon_social_remitente: 'AGROPECUARIA HERNANDEZ S.A.',
    cuit_remitente: '30-70123456-8',
    especie: 'Soja',
    kg_autorizados: 30000,
    localidad_origen: 'Rosario, Santa Fe',
  },
  '2': {
    razon_social_remitente: 'LOS MOLINOS AGRO S.R.L.',
    cuit_remitente: '30-65432100-5',
    especie: 'Maíz',
    kg_autorizados: 32500,
    localidad_origen: 'Río Cuarto, Córdoba',
  },
  '3': {
    razon_social_remitente: 'CAMPO VERDE HNOS.',
    cuit_remitente: '20-22345678-9',
    especie: 'Trigo',
    kg_autorizados: 28500,
    localidad_origen: 'Pergamino, Buenos Aires',
  },
  '4': {
    razon_social_remitente: 'EL GIRASOL S.A.',
    cuit_remitente: '30-61234567-4',
    especie: 'Girasol',
    kg_autorizados: 26000,
    localidad_origen: 'General Villegas, Buenos Aires',
  },
  '5': {
    razon_social_remitente: 'ESTABLECIMIENTO LA PAMPA S.A.',
    cuit_remitente: '30-55512345-1',
    especie: 'Soja',
    kg_autorizados: 31200,
    localidad_origen: 'Venado Tuerto, Santa Fe',
  },
};

const DESTINO = {
  cuit_destino: '30-64956368-9',
  establecimiento_destino: 'ACOPIO EL TREBOL S.A.',
};

router.get('/:codigo', (req, res) => {
  const { codigo } = req.params;

  if (!/^\d{8,14}$/.test(codigo)) {
    return res.status(400).json({ error: 'Código CTG inválido. Debe tener entre 8 y 14 dígitos.' });
  }

  // Vencimiento: 30 días desde hoy
  const vencimiento = new Date();
  vencimiento.setDate(vencimiento.getDate() + 30);
  const fecha_vencimiento = vencimiento.toISOString().split('T')[0];

  const key = codigo[0];
  const productor = MOCK_PRODUCTORES[key] || MOCK_PRODUCTORES['1'];

  // Simula latencia de la API de AFIP (~400ms)
  setTimeout(() => {
    res.json({
      ok: true,
      ctg: codigo,
      estado: 'Activo',
      cosecha: '2024/2025',
      nro_carta_porte: `004500${codigo.slice(0, 8).padStart(8, '0')}`,
      fecha_vencimiento,
      ...productor,
      ...DESTINO,
    });
  }, 400);
});

module.exports = router;
