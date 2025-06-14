module.exports = {
  apps: [{
    name: 'aegisum-backend',
    script: './backend/src/server.js',
    cwd: '/home/daimond/AEGT',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    env_file: './backend/.env.production',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    autorestart: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
