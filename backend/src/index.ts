import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       House Design Studio API                ║
║  Environment : ${config.nodeEnv.padEnd(28)}║
║  Port        : ${String(config.port).padEnd(28)}║
╚══════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
