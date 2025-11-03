const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso denegado. Token no proporcionado.' 
      });
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
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o usuario inactivo.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
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
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido.' 
    });
  }
};

module.exports = { authMiddleware, adminMiddleware };