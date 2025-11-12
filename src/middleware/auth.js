const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔍 AUTH DEBUG - Token present:', !!token);
    console.log('🔍 AUTH DEBUG - Token preview:', token ? token.substring(0, 50) + '...' : 'none');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 AUTH DEBUG - Decoded token:', decoded);
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.id) },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        isActive: true,
        googleId: true  // Add this to see if user is from Google
      }
    });

    console.log('🔍 AUTH DEBUG - User found:', user);

    if (!user || !user.isActive) {
      console.log('🚨 AUTH DEBUG - User not found or inactive:', { user: !!user, isActive: user?.isActive });
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o usuario inactivo.' 
      });
    }

    req.user = user;
    console.log('🔍 AUTH DEBUG - User authenticated:', { id: user.id, email: user.email, isGoogle: !!user.googleId });
    next();
  } catch (error) {
    // Manejo específico de errores JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        errorCode: 'TOKEN_EXPIRED',
        action: 'REDIRECT_TO_LOGIN'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de autenticación malformado.',
        errorCode: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token aún no es válido.',
        errorCode: 'TOKEN_NOT_ACTIVE'
      });
    }
    
    // Error genérico para casos no específicos
    res.status(401).json({ 
      success: false, 
      message: 'Error de autenticación.',
      errorCode: 'AUTH_ERROR'
    });
  }
};

// Middleware de autenticación opcional - no falla si no hay token
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      // No hay token, continuar sin autenticación
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.id) },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      // Token inválido, continuar sin autenticación
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    // Manejo específico de errores JWT para auth opcional
    if (error.name === 'TokenExpiredError') {
      // Token expirado en auth opcional - continuar sin autenticación pero avisar
      req.user = null;
      req.tokenExpired = true;
      return next();
    }
    
    if (error.name === 'JsonWebTokenError') {
      // Token malformado en auth opcional - continuar sin autenticación
      req.user = null;
      req.tokenInvalid = true;
      return next();
    }
    
    // Para otros errores, continuar sin autenticación
    req.user = null;
    next();
  }
};

const adminMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Permisos de administrador requeridos.' 
      });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: parseInt(decoded.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido.' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    // Manejo específico de errores JWT para admin
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Tu sesión de administrador ha expirado. Por favor, inicia sesión nuevamente.',
        errorCode: 'ADMIN_TOKEN_EXPIRED',
        action: 'REDIRECT_TO_ADMIN_LOGIN'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de administrador malformado.',
        errorCode: 'INVALID_ADMIN_TOKEN'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de administrador aún no es válido.',
        errorCode: 'ADMIN_TOKEN_NOT_ACTIVE'
      });
    }
    
    // Error genérico para admin
    res.status(401).json({ 
      success: false, 
      message: 'Error de autenticación de administrador.',
      errorCode: 'ADMIN_AUTH_ERROR'
    });
  }
};

module.exports = { authMiddleware, optionalAuthMiddleware, adminMiddleware };