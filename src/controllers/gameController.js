const prisma = require('../utils/database');

class GameController {
  // POST /api/game/start
  static async startGame(req, res) {
    try {
      const { deckId, mode = 'simple' } = req.body;
      const userId = req.user.id;

      // Check if user has access to the deck
      const userDeck = await prisma.userDeck.findUnique({
        where: {
          userId_deckId: {
            userId: BigInt(userId),
            deckId: BigInt(deckId)
          }
        }
      });

      if (!userDeck) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este mazo'
        });
      }

      // Check if deck exists and is active
      const deck = await prisma.deck.findUnique({
        where: { 
          id: BigInt(deckId),
          active: true 
        }
      });

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Mazo no encontrado'
        });
      }

      // Create new game
      const game = await prisma.game.create({
        data: {
          userId: BigInt(userId),
          deckId: BigInt(deckId),
          mode,
          status: 'started'
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true,
              theme: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Juego iniciado exitosamente',
        data: {
          game: {
            id: game.id.toString(),
            mode: game.mode,
            status: game.status,
            totalPoints: game.totalPoints,
            totalRounds: game.totalRounds,
            startedAt: game.startedAt,
            deck: {
              ...game.deck,
              id: game.deck.id.toString()
            }
          }
        }
      });
    } catch (error) {
      console.error('Error iniciando juego:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/game/:id/round
  static async submitRound(req, res) {
    try {
      const { id: gameId } = req.params;
      const { 
        cardId, 
        songGuess, 
        artistGuess, 
        albumGuess 
      } = req.body;
      const userId = req.user.id;

      // Find game and verify ownership
      const game = await prisma.game.findUnique({
        where: { 
          id: BigInt(gameId),
          userId: BigInt(userId),
          status: 'started'
        }
      });

      if (!game) {
        return res.status(404).json({
          success: false,
          message: 'Juego no encontrado o ya finalizado'
        });
      }

      // Find the card and get correct answers
      const card = await prisma.card.findUnique({
        where: { id: BigInt(cardId) },
        include: {
          artist: true,
          album: true
        }
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada'
        });
      }

      // Check if this card was already played in this game
      const existingRound = await prisma.gameRound.findUnique({
        where: {
          gameId_cardId: {
            gameId: BigInt(gameId),
            cardId: BigInt(cardId)
          }
        }
      });

      if (existingRound) {
        return res.status(400).json({
          success: false,
          message: 'Esta carta ya fue jugada en esta partida'
        });
      }

      // Normalize function for comparison
      const normalize = (str) => str?.toLowerCase().trim().replace(/[^\w\s]/g, '') || '';

      // Check answers
      const songCorrect = normalize(songGuess) === normalize(card.songName);
      const artistCorrect = normalize(artistGuess) === normalize(card.artist.name);
      const albumCorrect = card.album ? 
        normalize(albumGuess) === normalize(card.album.title) : 
        !albumGuess; // If no album exists, correct if no guess was made

      // Calculate points based on difficulty and correct answers
      let points = 0;
      if (songCorrect) points += 1;
      if (artistCorrect) points += 1;
      if (albumCorrect && card.album) points += 1;

      // Bonus points based on difficulty
      if (points > 0) {
        switch (card.difficulty) {
          case 'easy':
            break; // No bonus
          case 'medium':
            points += 0.5;
            break;
          case 'hard':
            points += 1;
            break;
        }
      }

      // Round points to integer
      points = Math.round(points);

      // Create game round
      const gameRound = await prisma.gameRound.create({
        data: {
          gameId: BigInt(gameId),
          cardId: BigInt(cardId),
          songCorrect,
          artistCorrect,
          albumCorrect,
          points
        }
      });

      // Update game totals
      const updatedGame = await prisma.game.update({
        where: { id: BigInt(gameId) },
        data: {
          totalPoints: {
            increment: points
          },
          totalRounds: {
            increment: 1
          }
        }
      });

      res.json({
        success: true,
        message: 'Ronda enviada exitosamente',
        data: {
          round: {
            id: gameRound.id.toString(),
            songCorrect,
            artistCorrect,
            albumCorrect,
            points,
            correctAnswers: {
              song: card.songName,
              artist: card.artist.name,
              album: card.album?.title || null
            }
          },
          game: {
            totalPoints: updatedGame.totalPoints,
            totalRounds: updatedGame.totalRounds
          }
        }
      });
    } catch (error) {
      console.error('Error enviando ronda:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/game/:id/finish
  static async finishGame(req, res) {
    try {
      const { id: gameId } = req.params;
      const userId = req.user.id;

      // Find game and verify ownership
      const game = await prisma.game.findUnique({
        where: { 
          id: BigInt(gameId),
          userId: BigInt(userId),
          status: 'started'
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!game) {
        return res.status(404).json({
          success: false,
          message: 'Juego no encontrado o ya finalizado'
        });
      }

      // Update game status
      const finishedGame = await prisma.game.update({
        where: { id: BigInt(gameId) },
        data: {
          status: 'finished',
          endedAt: new Date()
        }
      });

      // Update or create ranking entry
      const existingRanking = await prisma.ranking.findUnique({
        where: {
          userId_deckId: {
            userId: BigInt(userId),
            deckId: game.deckId
          }
        }
      });

      if (existingRanking) {
        await prisma.ranking.update({
          where: { id: existingRanking.id },
          data: {
            pointsTotal: {
              increment: finishedGame.totalPoints
            },
            gamesPlayed: {
              increment: 1
            },
            lastPlayedAt: new Date()
          }
        });
      } else {
        await prisma.ranking.create({
          data: {
            userId: BigInt(userId),
            deckId: game.deckId,
            pointsTotal: finishedGame.totalPoints,
            gamesPlayed: 1,
            lastPlayedAt: new Date()
          }
        });
      }

      // Get final game summary with rounds
      const gameRounds = await prisma.gameRound.findMany({
        where: { gameId: BigInt(gameId) },
        orderBy: { playedAt: 'asc' }
      });

      res.json({
        success: true,
        message: 'Juego finalizado exitosamente',
        data: {
          game: {
            id: finishedGame.id.toString(),
            status: finishedGame.status,
            totalPoints: finishedGame.totalPoints,
            totalRounds: finishedGame.totalRounds,
            startedAt: finishedGame.startedAt,
            endedAt: finishedGame.endedAt,
            deck: {
              ...game.deck,
              id: game.deck.id.toString()
            }
          },
          rounds: gameRounds.map(round => ({
            id: round.id.toString(),
            songCorrect: round.songCorrect,
            artistCorrect: round.artistCorrect,
            albumCorrect: round.albumCorrect,
            points: round.points,
            playedAt: round.playedAt
          }))
        }
      });
    } catch (error) {
      console.error('Error finalizando juego:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/game/:id (bonus endpoint to get game status)
  static async getGame(req, res) {
    try {
      const { id: gameId } = req.params;
      const userId = req.user.id;

      const game = await prisma.game.findUnique({
        where: { 
          id: BigInt(gameId),
          userId: BigInt(userId)
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true,
              theme: true
            }
          },
          rounds: {
            orderBy: { playedAt: 'asc' },
            select: {
              id: true,
              songCorrect: true,
              artistCorrect: true,
              albumCorrect: true,
              points: true,
              playedAt: true
            }
          }
        }
      });

      if (!game) {
        return res.status(404).json({
          success: false,
          message: 'Juego no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          game: {
            id: game.id.toString(),
            mode: game.mode,
            status: game.status,
            totalPoints: game.totalPoints,
            totalRounds: game.totalRounds,
            startedAt: game.startedAt,
            endedAt: game.endedAt,
            deck: {
              ...game.deck,
              id: game.deck.id.toString()
            },
            rounds: game.rounds.map(round => ({
              ...round,
              id: round.id.toString()
            }))
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo juego:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = GameController;