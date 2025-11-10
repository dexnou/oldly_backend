const express = require('express');
const AdminController = require('../controllers/adminController');
const { adminMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation for deck creation/update
const validateDeck = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('El título debe tener entre 1 y 100 caracteres'),
  body('description')
    .optional()
    .trim(),
  body('theme')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El tema debe tener entre 1 y 50 caracteres'),
  body('buyLink')
    .optional()
    .isURL()
    .withMessage('El enlace de compra debe ser una URL válida'),
  body('coverImage')
    .optional()
    .isURL()
    .withMessage('La imagen de portada debe ser una URL válida'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser booleano')
];

// Validation for card creation
const validateCard = [
  body('deckId')
    .notEmpty()
    .isNumeric()
    .withMessage('ID del mazo es requerido y debe ser numérico'),
  body('artistName')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre del artista es requerido y debe tener máximo 150 caracteres'),
  body('artistCountry')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('El país del artista debe tener máximo 80 caracteres'),
  body('artistGenre')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('El género del artista debe tener máximo 80 caracteres'),
  body('albumTitle')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('El título del álbum debe tener máximo 150 caracteres'),
  body('albumReleaseYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('El año de lanzamiento debe ser válido'),
  body('albumCoverUrl')
    .optional()
    .isURL()
    .withMessage('La URL de la portada del álbum debe ser válida'),
  body('songName')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre de la canción es requerido y debe tener máximo 150 caracteres'),
  body('spotifyUrl')
    .optional()
    .isURL()
    .withMessage('La URL de Spotify debe ser válida'),
  body('previewUrl')
    .optional()
    .isURL()
    .withMessage('La URL de preview debe ser válida'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('La dificultad debe ser easy, medium o hard')
];

// Validation for admin registration
const validateAdminRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('El nombre debe tener entre 2 y 80 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['super', 'editor'])
    .withMessage('El rol debe ser super o editor')
];

// Validation for admin login
const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Admin registration (not protected - for initial setup)
router.post('/register', 
  validateAdminRegister, 
  handleValidationErrors, 
  AdminController.registerAdmin
);

// Admin login (not protected)
router.post('/login', 
  validateAdminLogin, 
  handleValidationErrors, 
  AdminController.adminLogin
);

// Protected admin routes
router.use(adminMiddleware);

// POST /api/admin/decks - Create or update deck
router.post('/decks', 
  validateDeck, 
  handleValidationErrors, 
  AdminController.createOrUpdateDeck
);

// POST /api/admin/cards - Create card
router.post('/cards', 
  validateCard, 
  handleValidationErrors, 
  AdminController.createCard
);

// GET /api/admin/users/export - Export users data
router.get('/users/export', AdminController.exportUsers);

// GET /api/admin/stats - Get dashboard stats
router.get('/stats', AdminController.getStats);

// DELETE /api/admin/decks/:id - Delete deck
router.delete('/decks/:id', AdminController.deleteDeck);

// DELETE /api/admin/cards/:id - Delete card
router.delete('/cards/:id', AdminController.deleteCard);

module.exports = router;