module.exports = {
  apps: [
    {
      name: 'neon-pong',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 3000,
      max_restarts: 20,

      env: {
        NODE_ENV: 'production',
      },

      // Logging
      error_file: './logs/error.log',
      out_file:   './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
