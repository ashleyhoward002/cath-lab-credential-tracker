const isDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  isDemoMode,
  isProduction,
  port: parseInt(process.env.PORT) || 3001,
  sessionSecret: process.env.SESSION_SECRET || (isDemoMode ? 'demo-session-secret-key' : null),
  databaseUrl: process.env.DATABASE_URL || null,
};

// Validate required config in production (non-demo) mode
if (!isDemoMode) {
  if (!config.sessionSecret) {
    console.error('FATAL: SESSION_SECRET environment variable is required in production mode');
    process.exit(1);
  }
  if (!config.databaseUrl) {
    console.error('FATAL: DATABASE_URL environment variable is required');
    process.exit(1);
  }
} else {
  if (!config.databaseUrl) {
    console.error('FATAL: DATABASE_URL environment variable is required (even in demo mode)');
    process.exit(1);
  }
}

module.exports = config;
