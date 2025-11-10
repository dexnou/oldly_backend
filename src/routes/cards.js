const express = require('express');
const CardController = require('../controllers/cardController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/cards/:id - Get card details with QR redirect logic (optional auth)
router.get('/:id', optionalAuthMiddleware, CardController.getCardDetails);

// GET /api/cards/:id/play - Play card (by ID or QR token) - requires auth
router.get('/:id/play', authMiddleware, CardController.playCard);

// GET /api/cards/:id/casual-play - Casual play mode (no scoring) - requires auth
router.get('/:id/casual-play', authMiddleware, CardController.casualPlay);

// GET /api/cards/:id/reveal - Get full card info (bonus endpoint) - requires auth
router.get('/:id/reveal', authMiddleware, CardController.revealCard);

// GET /api/cards - List all cards (test endpoint)
router.get('/', optionalAuthMiddleware, CardController.getAllCards);

module.exports = router;