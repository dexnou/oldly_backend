const prisma = require('../utils/database');
const AuthService = require('../services/authService');

class AuthController {
  // POST /api/auth/register
  static async register(req, res) {
    try {
      const { firstname, lastname, email, password, whatsapp } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya existe con este email'
        });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          firstname,
          lastname,
          email,
          passwordHash,
          whatsapp,
          lastLoginAt: new Date()
        },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          whatsapp: true,
          avatarUrl: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = AuthService.generateToken({
        id: user.id.toString(),
        email: user.email,
        type: 'user'
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            ...user,
            id: user.id.toString()
          },
          token
        }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/auth/login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          whatsapp: true,
          passwordHash: true,
          avatarUrl: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      if (!user.passwordHash) {
        return res.status(401).json({
          success: false,
          message: 'Esta cuenta fue creada con Google. Usa el login de Google.'
        });
      }

      // Verify password
      const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate JWT token
      const token = AuthService.generateToken({
        id: user.id.toString(),
        email: user.email,
        type: 'user'
      });

      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            ...userWithoutPassword,
            id: user.id.toString()
          },
          token
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/auth/google (also handles GET callback from OAuth)
  static async googleAuth(req, res) {
    try {
      // This should be called after Google OAuth callback
      // The user should be set by passport middleware
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Error en autenticación con Google'
        });
      }

      // Generate JWT token
      const token = AuthService.generateToken({
        id: user.id.toString(),
        email: user.email,
        type: 'user'
      });

      // If this is a callback from OAuth (GET request), redirect to frontend with token
      if (req.method === 'GET') {
        // For testing, redirect to our test page with token
        return res.redirect(`${process.env.FRONTEND_URL}/test-oauth.html?token=${token}`);
      }

      // For API calls (POST), return JSON
      res.json({
        success: true,
        message: 'Login con Google exitoso',
        data: {
          user: {
            id: user.id.toString(),
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            whatsapp: user.whatsapp,
            avatarUrl: user.avatarUrl
          },
          token
        }
      });
    } catch (error) {
      console.error('Error en Google auth:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/auth/me (protected route)
  static async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(req.user.id) },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          whatsapp: true,
          avatarUrl: true,
          createdAt: true,
          lastLoginAt: true
        }
      });

      res.json({
        success: true,
        data: {
          user: {
            ...user,
            id: user.id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AuthController;