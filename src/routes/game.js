const express = require('express');
const GameController = require('../controllers/gameController');
const { authMiddleware } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware for starting a game
const validateStartGame = [
  body('deckId')
    .notEmpty()
    .withMessage('ID del mazo es requerido')
    .isNumeric()
    .withMessage('ID del mazo debe ser numérico'),
  body('mode')
    .optional()
    .isIn(['simple', 'score'])
    .withMessage('Modo debe ser simple o score'),
  body('participants')
    .optional()
    .isArray()
    .withMessage('Los participantes deben ser un array'),
  body('participants.*.name')
    .if(body('participants').exists())
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('El nombre del participante debe tener entre 1 y 80 caracteres')
];

// Validation middleware for submitting a round
const validateRound = [
  body('cardId')
    .notEmpty()
    .withMessage('ID de la carta es requerido')
    .isNumeric()
    .withMessage('ID de la carta debe ser numérico'),
  // For simple mode
  body('songGuess')
    .optional()
    .isString()
    .trim(),
  body('artistGuess')
    .optional()
    .isString()
    .trim(),
  body('albumGuess')
    .optional()
    .isString()
    .trim(),
  // For score mode
  body('participantAnswers')
    .optional()
    .isArray()
    .withMessage('Las respuestas de participantes deben ser un array'),
  body('participantAnswers.*.participantId')
    .if(body('participantAnswers').exists())
    .isNumeric()
    .withMessage('ID del participante debe ser numérico'),
  body('participantAnswers.*.songGuess')
    .if(body('participantAnswers').exists())
    .optional()
    .isString()
    .trim(),
  body('participantAnswers.*.artistGuess')
    .if(body('participantAnswers').exists())
    .optional()
    .isString()
    .trim(),
  body('participantAnswers.*.albumGuess')
    .if(body('participantAnswers').exists())
    .optional()
    .isString()
    .trim()
];

// Validation middleware for starting a competitive game
const validateStartCompetitive = [
  body('deckId')
    .notEmpty()
    .withMessage('ID del mazo es requerido')
    .isNumeric()
    .withMessage('ID del mazo debe ser numérico'),
  body('participants')
    .isArray({ min: 1, max: 8 })
    .withMessage('Debe haber entre 1 y 8 participantes'),
  body('participants.*.name')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('El nombre del participante debe tener entre 1 y 80 caracteres')
];

// Validation middleware for competitive round
const validateCompetitiveRound = [
  body('cardId')
    .notEmpty()
    .withMessage('ID de la carta es requerido')
    .isNumeric()
    .withMessage('ID de la carta debe ser numérico'),
  body('participantAnswers')
    .isArray({ min: 1 })
    .withMessage('Se requieren respuestas de participantes'),
  body('participantAnswers.*.participantId')
    .isNumeric()
    .withMessage('ID del participante debe ser numérico'),
  body('participantAnswers.*.userKnew')
    .isObject()
    .withMessage('userKnew debe ser un objeto'),
  // Note: More specific validation for nested userKnew properties is done in the controller
];

// Validation middleware for scoring a card
const validateScoreCard = [
  body('cardId')
    .notEmpty()
    .withMessage('ID de la carta es requerido')
    .isNumeric()
    .withMessage('ID de la carta debe ser numérico'),
  body('userKnew.songKnew')
    .optional()
    .isBoolean()
    .withMessage('songKnew debe ser verdadero o falso'),
  body('userKnew.artistKnew')
    .optional()
    .isBoolean()
    .withMessage('artistKnew debe ser verdadero o falso'),
  body('userKnew.albumKnew')
    .optional()
    .isBoolean()
    .withMessage('albumKnew debe ser verdadero o falso')
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

// POST /api/game/start
router.post('/start', 
  authMiddleware, 
  validateStartGame, 
  handleValidationErrors, 
  GameController.startGame
);

// GET /api/game/active-competitive/:deckId
router.get('/active-competitive/:deckId',
  authMiddleware,
  GameController.getActiveCompetitiveGame
);

// POST /api/game/start-competitive
router.post('/start-competitive',
  authMiddleware,
  validateStartCompetitive,
  handleValidationErrors,
  GameController.startCompetitive
);

// POST /api/game/score-card
router.post('/score-card',
  authMiddleware,
  validateScoreCard,
  handleValidationErrors,
  GameController.scoreCard
);

// GET /api/game/:id
router.get('/:id', authMiddleware, GameController.getGame);

// POST /api/game/:id/round
router.post('/:id/round', 
  authMiddleware, 
  validateRound, 
  handleValidationErrors, 
  GameController.submitRound
);

// POST /api/game/:id/submit-competitive-round
router.post('/:id/submit-competitive-round',
  authMiddleware,
  validateCompetitiveRound,
  handleValidationErrors,
  GameController.submitCompetitiveRound
);

// POST /api/game/:id/finish
router.post('/:id/finish', authMiddleware, GameController.finishGame);

module.exports = router;