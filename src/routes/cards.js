const express = require('express');
const CardController = require('../controllers/cardController');

const router = express.Router();

// GET /api/cards/:id - Get card details with QR redirect logic
router.get('/:id', CardController.getCardDetails);

// GET /api/cards/:id/play - Play card (by ID or QR token)
router.get('/:id/play', CardController.playCard);

// GET /api/cards/:id/reveal - Get full card info (bonus endpoint)
router.get('/:id/reveal', CardController.revealCard);

module.exports = router;