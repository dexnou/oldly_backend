const express = require('express');
const RankingController = require('../controllers/rankingController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/rankings - Get rankings (global or by deck)
router.get('/', RankingController.getRankings);

// GET /api/rankings/user/:userId - Get user specific rankings (protected)
router.get('/user/:userId', authMiddleware, RankingController.getUserRankings);

// GET /api/rankings/deck/:deckId/top - Get top players for a deck
router.get('/deck/:deckId/top', RankingController.getDeckTopPlayers);

module.exports = router;