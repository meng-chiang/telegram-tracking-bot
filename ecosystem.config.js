module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: 'dist/index.js',
      cwd: '/home/charles/project/telegram-bot',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
