require('dotenv').config();
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
const PORT = process.env.PORT || 3000;

// Trust proxy (importante para ngrok, v0, y otros proxies)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // More permissive for development
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en unos minutos.',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  console.log(`🔍 PREFLIGHT OPTIONS request from origin: ${origin} for ${req.path}`);
  
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-File-Name');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '3600');
  res.sendStatus(200);
});

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    console.log(`🌐 CORS check for origin: ${origin}`);
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3001',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ];
    
    // Expresiones regulares para dominios permitidos
    const v0PreviewRegex = /^https:\/\/.*\.vusercontent\.net$/;
    const vercelRegex = /^https:\/\/.*\.vercel\.app$/;
    const ngrokRegex = /^https:\/\/.*\.ngrok/;
    
    // Verificar con regex
    const isV0Preview = origin && v0PreviewRegex.test(origin);
    const isVercel = origin && vercelRegex.test(origin);
    const isNgrok = origin && ngrokRegex.test(origin);
    
    // Permitir si está en la lista, es v0, vercel, ngrok, o no hay origin (requests del servidor)
    if (!origin || allowedOrigins.includes(origin) || isV0Preview || isVercel || isNgrok) {
      console.log(`✅ CORS allowed for origin: ${origin}`);
      callback(null, true);
    } else {
      console.log('🚨 CORS blocked origin:', origin);
      callback(new Error('No permitido por CORS'));
    }
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
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200 // Para algunos navegadores legacy
}));

// Debug middleware (temporal)
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
  if (req.path === '/api/decks') {
    console.log(`🎯 DECKS REQUEST - Method: ${req.method}, Query:`, req.query);
  }
  next();
});

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Oldly Fun Music Box API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint with API info
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Oldly Fun Music Box API',
    version: '1.0.0',
    documentation: {
      health: '/health',
      auth: '/api/auth',
      decks: '/api/decks',
      cards: '/api/cards',
      games: '/api/game',
      rankings: '/api/rankings',
      admin: '/api/admin'
    }
  });
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
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Error occurred:');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  console.error('Request body:', req.body);
  console.error('Request headers:', req.headers);
  
  // Prisma errors
  if (err.code) {
    console.error('Prisma error code:', err.code);
    switch (err.code) {
      case 'P2002':
        return res.status(400).json({
          success: false,
          message: 'Violación de restricción única',
          errorCode: 'UNIQUE_CONSTRAINT_VIOLATION'
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Registro no encontrado',
          errorCode: 'RECORD_NOT_FOUND'
        });
      default:
        return res.status(500).json({
          success: false,
          message: 'Error de base de datos',
          errorCode: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      details: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    errorCode: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      name: err.name
    } : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 Oldly Fun Music Box API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 API Documentation available at: http://localhost:${PORT}/health`);
});

module.exports = app;