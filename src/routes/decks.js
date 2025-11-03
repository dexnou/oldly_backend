const express = require('express');
const DeckController = require('../controllers/deckController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/decks - Public endpoint (shows available decks)
router.get('/', DeckController.getDecks);

// GET /api/decks/:id - Public endpoint (deck details)
router.get('/:id', DeckController.getDeckById);

// GET /api/decks/:id/cards - Protected endpoint (requires access to deck)
router.get('/:id/cards', authMiddleware, DeckController.getDeckCards);

// POST /api/decks/:id/activate - Protected endpoint (activate deck access)
router.post('/:id/activate', authMiddleware, DeckController.activateDeck);

module.exports = router;