const express = require('express');
const DeckController = require('../controllers/deckController');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/decks - Public endpoint with optional auth (shows available decks)
router.get('/', optionalAuthMiddleware, DeckController.getDecks);

// GET /api/decks/:id - Public endpoint with optional auth (deck details)
router.get('/:id', optionalAuthMiddleware, DeckController.getDeckById);

// GET /api/decks/:id/cards - Protected endpoint (requires access to deck)
router.get('/:id/cards', authMiddleware, DeckController.getDeckCards);

// POST /api/decks/:id/activate - Protected endpoint (activate deck access)
router.post('/:id/activate', authMiddleware, DeckController.activateDeck);

module.exports = router;