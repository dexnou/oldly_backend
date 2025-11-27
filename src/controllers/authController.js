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
          message: 'El email ya está registrado',
          errorCode: 'EMAIL_EXISTS',
          action: 'REDIRECT_TO_LOGIN'
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
      const tokenPayload = {
        id: user.id.toString(),
        email: user.email,
        type: 'user'
      };
      
      console.log('🔍 NORMAL LOGIN - Generating token for user:', { 
        id: user.id, 
        email: user.email, 
        isGoogle: !!user.googleId,
        payload: tokenPayload 
      });
      
      const token = AuthService.generateToken(tokenPayload);

      res.json({
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
          message: 'Credenciales inválidas',
          errorCode: 'INVALID_CREDENTIALS'
        });
      }

      if (!user.passwordHash) {
        return res.status(401).json({
          success: false,
          message: 'Esta cuenta fue creada con Google. Usa el login de Google.',
          errorCode: 'GOOGLE_ACCOUNT_ONLY',
          action: 'USE_GOOGLE_LOGIN'
        });
      }

      // Verify password
      const isValidPassword = await AuthService.comparePassword(password, user.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
          errorCode: 'INVALID_CREDENTIALS'
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
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
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
          message: 'Error en autenticación con Google',
          errorCode: 'GOOGLE_AUTH_FAILED',
          action: 'RETRY_GOOGLE_AUTH'
        });
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id.toString(),
        email: user.email,
        type: 'user'
      };
      
      console.log('🔍 GOOGLE AUTH - Generating token for user:', { 
        id: user.id, 
        email: user.email, 
        isGoogle: !!user.googleId,
        payload: tokenPayload 
      });
      
      const token = AuthService.generateToken(tokenPayload);

      // If this is a callback from OAuth (GET request), redirect to frontend with token
      if (req.method === 'GET') {
        const redirectUrl = req.query.redirect || '/';
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        
        // Redirect to frontend callback page with token and redirect info
        return res.redirect(`${frontendUrl}/auth/callback?token=${token}&redirect=${encodeURIComponent(redirectUrl)}`);
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
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
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
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = AuthController;