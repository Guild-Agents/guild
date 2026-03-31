module.exports = {
  apps: [{
    name: 'guild-watchdog',
    script: 'dist/index.js',
    cwd: __dirname,
    node_args: '--env-file=.env',
    env: {
      NODE_ENV: 'production',
    },
    max_restarts: 10,
    restart_delay: 5000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: 'logs/watchdog-out.log',
    error_file: 'logs/watchdog-error.log',
    merge_logs: true,
  }],
};
