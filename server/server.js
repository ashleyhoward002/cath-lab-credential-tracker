const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');

const config = require('./config');
const { pool, initializeDatabase, createDefaultUsers } = require('./database');
const { seedDatabase } = require('./seedData');

const app = express();

// Trust Railway's reverse proxy (required for secure cookies over HTTPS)
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
  proxy: config.isProduction,
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check (no auth, returns 200 when server is running)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public config endpoint (no auth required)
app.get('/api/config', (req, res) => {
  res.json({ demoMode: config.isDemoMode, version: '1.0.0' });
});

// Mount routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/setup', require('./routes/setup'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/credential-types', require('./routes/credentials').typesRouter);
app.use('/api/staff-credentials', require('./routes/credentials').credentialsRouter);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/users', require('./routes/users'));
app.use('/api/import', require('./routes/import'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/audit', require('./routes/audit'));

// Backward-compatible alias: some frontend code uses /api/documents/upload
// The documents router is mounted at /api/documents

// Serve frontend in production
if (config.isProduction) {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// Start server
async function startServer() {
  console.log('Starting server...');
  console.log('  PORT:', config.port);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  DEMO_MODE:', config.isDemoMode);
  console.log('  DATABASE_URL:', config.databaseUrl ? '***set***' : 'MISSING');
  console.log('  SESSION_SECRET:', config.sessionSecret ? '***set***' : 'MISSING');

  try {
    console.log('Connecting to database...');
    await initializeDatabase();
    console.log('Database initialized successfully.');

    if (config.isDemoMode) {
      await createDefaultUsers();
      const { rows } = await pool.query('SELECT COUNT(*) as count FROM credential_types');
      if (parseInt(rows[0].count) === 0) {
        console.log('Database is empty, seeding demo data...');
        await seedDatabase();
      }
      console.log('Running in DEMO MODE');
    }

    const HOST = config.isProduction ? '0.0.0.0' : 'localhost';
    app.listen(config.port, HOST, () => {
      console.log(`\n✓ Server running on http://${HOST}:${config.port}`);
      if (config.isDemoMode) {
        console.log('\nDemo credentials:');
        console.log('  Coordinator: coordinator / demo123');
        console.log('  Manager: manager / demo123\n');
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
