require('dotenv').config();

// Validate critical environment variables
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined!');
  console.error('Please set DATABASE_URL in your environment variables or .env file');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('./middleware/passport');

// Import routes
const authRoutes = require('./routes/auth');
const deckRoutes = require('./routes/decks');
const cardRoutes = require('./routes/cards');
const gameRoutes = require('./routes/game');
const rankingRoutes = require('./routes/rankings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001; // Asegúrate que sea 3001 o diferente al front

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Disable CORP explicitly to allow images from anywhere
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`🌐 CORS check for origin: ${origin}`);

    // For debugging/production fix: Allow ALL origins temporarily to verify connection
    // We will reflect the origin if it exists, or true if not
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Authorization']
};

// Handle preflight OPTIONS requests explicitly with the same config
app.options('*', cors(corsOptions));

// CORS configuration for all requests
app.use(cors(corsOptions));

// Debug middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  next();
});

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Oldly Fun Music Box API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Welcome to Oldly Fun Music Box API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Error occurred:', err);

  // CORS error specific handling
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado por política de CORS',
      errorCode: 'CORS_ERROR'
    });
  }

  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      message: 'Violación de restricción única',
      errorCode: 'UNIQUE_CONSTRAINT_VIOLATION'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    errorCode: 'INTERNAL_ERROR'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Oldly Fun Music Box API running on port ${PORT}`);
});

module.exports = app;