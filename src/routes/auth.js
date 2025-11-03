const express = require('express');
const passport = require('../middleware/passport');
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// POST /api/auth/register
router.post('/register', 
  validateRegistration, 
  handleValidationErrors, 
  AuthController.register
);

// POST /api/auth/login
router.post('/login', 
  validateLogin, 
  handleValidationErrors, 
  AuthController.login
);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure',
    session: false 
  }),
  AuthController.googleAuth
);

// POST /api/auth/google (for mobile/SPA applications)
router.post('/google', AuthController.googleAuth);

// GET /api/auth/me (protected)
router.get('/me', authMiddleware, AuthController.getProfile);

module.exports = router;