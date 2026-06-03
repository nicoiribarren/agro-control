// Configuración PM2 para Agro Control
// Uso:
//   pm2 start ecosystem.config.js --env production
//   pm2 restart agro-control
//   pm2 logs agro-control

module.exports = {
  apps: [
    {
      name:   'agro-control',
      script: './backend/server.js',

      // Reinicio automático si el proceso cae
      autorestart: true,
      watch:       false,       // no watchear archivos en prod
      max_memory_restart: '300M',

      // Variables de entorno por defecto (desarrollo)
      env: {
        NODE_ENV: 'development',
        PORT:     3001,
      },

      // Variables para producción  →  pm2 start ... --env production
      env_production: {
        NODE_ENV: 'production',
        PORT:     3001,
      },

      // Logs
      out_file:  '/var/log/pm2/agro-control.out.log',
      error_file: '/var/log/pm2/agro-control.error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
