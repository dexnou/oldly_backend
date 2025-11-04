const prisma = require('../utils/database');

class GameController {
  // POST /api/game/start
  static async startGame(req, res) {
    try {
      const { deckId, mode = 'simple', participants = [] } = req.body;
      const userId = req.user.id;

      // Validate deckId
      if (!deckId || isNaN(parseInt(deckId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de mazo inválido'
        });
      }

      // Validate participants for score mode
      if (mode === 'score' && participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El modo con puntaje requiere al menos un participante'
        });
      }

      // Validate participant names
      if (participants.length > 0) {
        for (let participant of participants) {
          if (!participant.name || participant.name.trim().length === 0) {
            return res.status(400).json({
              success: false,
              message: 'Todos los participantes deben tener un nombre válido'
            });
          }
        }
      }

      // Check if user has access to the deck
      const userDeck = await prisma.userDeck.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
            deckId: parseInt(deckId)
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
          id: parseInt(deckId),
          active: true 
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Mazo no encontrado'
        });
      }

      if (deck._count.cards === 0) {
        return res.status(400).json({
          success: false,
          message: 'Este mazo no tiene cartas disponibles'
        });
      }

      // Check if user has an active game in this deck
      const activeGame = await prisma.game.findFirst({
        where: {
          userId: parseInt(userId),
          deckId: parseInt(deckId),
          status: 'started'
        }
      });

      if (activeGame) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un juego activo en este mazo',
          data: {
            activeGameId: activeGame.id.toString()
          }
        });
      }

      // Create new game
      const game = await prisma.game.create({
        data: {
          userId: parseInt(userId),
          deckId: parseInt(deckId),
          mode,
          status: 'started',
          participants: mode === 'score' && participants.length > 0 ? {
            create: participants.map(p => ({
              name: p.name.trim()
            }))
          } : undefined
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true,
              theme: true,
              _count: {
                select: { cards: true }
              }
            }
          },
          participants: mode === 'score' ? {
            select: {
              id: true,
              name: true,
              totalPoints: true,
              totalRounds: true
            }
          } : false
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
              id: game.deck.id.toString(),
              totalCards: game.deck._count.cards
            },
            participants: game.participants ? game.participants.map(p => ({
              id: p.id.toString(),
              name: p.name,
              totalPoints: p.totalPoints,
              totalRounds: p.totalRounds
            })) : []
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
        albumGuess,
        participantAnswers // Array for score mode: [{ participantId, songGuess, artistGuess, albumGuess }]
      } = req.body;
      const userId = req.user.id;

      // Validate inputs
      if (!cardId || isNaN(parseInt(cardId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de carta inválido'
        });
      }

      // Find game and verify ownership
      const game = await prisma.game.findUnique({
        where: { 
          id: parseInt(gameId),
          userId: parseInt(userId),
          status: 'started'
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              totalPoints: true,
              totalRounds: true
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

      // Find the card and get correct answers
      const card = await prisma.card.findUnique({
        where: { id: parseInt(cardId) },
        include: {
          artist: true,
          album: true,
          deck: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada'
        });
      }

      // Verify card belongs to the same deck as the game
      if (card.deckId !== game.deckId) {
        return res.status(400).json({
          success: false,
          message: 'Esta carta no pertenece al mazo del juego actual'
        });
      }

      // Normalize function for comparison
      const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase()
                 .trim()
                 .replace(/[^\w\s]/g, '')
                 .replace(/\s+/g, ' ');
      };

      // Calculate points function
      const calculatePoints = (songGuess, artistGuess, albumGuess) => {
        const songCorrect = normalize(songGuess) === normalize(card.songName);
        const artistCorrect = normalize(artistGuess) === normalize(card.artist.name);
        const albumCorrect = card.album ? 
          normalize(albumGuess) === normalize(card.album.title) : 
          !albumGuess;

        let points = 0;
        let pointsBreakdown = {
          song: 0,
          artist: 0,
          album: 0,
          difficultyBonus: 0
        };

        if (songCorrect) {
          points += 1;
          pointsBreakdown.song = 1;
        }
        if (artistCorrect) {
          points += 1;
          pointsBreakdown.artist = 1;
        }
        if (albumCorrect && card.album) {
          points += 1;
          pointsBreakdown.album = 1;
        }

        // Difficulty multiplier
        let difficultyMultiplier = 1;
        switch (card.difficulty) {
          case 'easy':
            difficultyMultiplier = 1;
            break;
          case 'medium':
            difficultyMultiplier = 1.5;
            break;
          case 'hard':
            difficultyMultiplier = 2;
            break;
        }

        if (points > 0) {
          const bonus = Math.round((points * difficultyMultiplier) - points);
          points = Math.round(points * difficultyMultiplier);
          pointsBreakdown.difficultyBonus = bonus;
        }

        return {
          songCorrect,
          artistCorrect,
          albumCorrect,
          points,
          pointsBreakdown,
          difficultyMultiplier
        };
      };

      // Handle different game modes
      if (game.mode === 'simple') {
        // Simple mode - single player
        // Check if this card was already played
        const existingRound = await prisma.gameRound.findUnique({
          where: {
            gameId_cardId: {
              gameId: parseInt(gameId),
              cardId: parseInt(cardId)
            }
          }
        });

        if (existingRound) {
          return res.status(400).json({
            success: false,
            message: 'Esta carta ya fue jugada en esta partida'
          });
        }

        const result = calculatePoints(songGuess, artistGuess, albumGuess);

        // Create game round
        const gameRound = await prisma.gameRound.create({
          data: {
            gameId: parseInt(gameId),
            cardId: parseInt(cardId),
            songCorrect: result.songCorrect,
            artistCorrect: result.artistCorrect,
            albumCorrect: result.albumCorrect,
            points: result.points
          }
        });

        // Update game totals
        const updatedGame = await prisma.game.update({
          where: { id: parseInt(gameId) },
          data: {
            totalPoints: {
              increment: result.points
            },
            totalRounds: {
              increment: 1
            }
          }
        });

        // Get total cards in deck for progress tracking
        const totalCardsInDeck = await prisma.card.count({
          where: { deckId: game.deckId }
        });

        res.json({
          success: true,
          message: 'Ronda enviada exitosamente (modo simple)',
          data: {
            round: {
              id: gameRound.id.toString(),
              cardId: cardId.toString(),
              card: {
                id: card.id.toString(),
                songName: card.songName,
                artist: card.artist.name,
                album: card.album?.title || null,
                difficulty: card.difficulty,
                preview: card.previewUrl,
                qrCode: card.qrCode
              },
              answers: {
                song: {
                  guess: songGuess,
                  correct: card.songName,
                  isCorrect: result.songCorrect
                },
                artist: {
                  guess: artistGuess,
                  correct: card.artist.name,
                  isCorrect: result.artistCorrect
                },
                album: {
                  guess: albumGuess || null,
                  correct: card.album?.title || null,
                  isCorrect: result.albumCorrect
                }
              },
              points: result.points,
              pointsBreakdown: result.pointsBreakdown,
              difficultyMultiplier: result.difficultyMultiplier,
              playedAt: gameRound.playedAt
            },
            game: {
              id: gameId.toString(),
              deck: game.deck,
              status: 'started',
              totalPoints: updatedGame.totalPoints,
              totalRounds: updatedGame.totalRounds,
              progress: {
                roundsPlayed: updatedGame.totalRounds,
                totalCards: totalCardsInDeck,
                percentage: Math.round((updatedGame.totalRounds / totalCardsInDeck) * 100)
              },
              startedAt: updatedGame.startedAt
            }
          }
        });

      } else if (game.mode === 'score') {
        // Score mode - multiple participants
        if (!participantAnswers || !Array.isArray(participantAnswers) || participantAnswers.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El modo con puntaje requiere respuestas de los participantes'
          });
        }

        // Validate participants exist
        const participantIds = participantAnswers.map(p => parseInt(p.participantId));
        const validParticipants = await prisma.gameParticipant.findMany({
          where: {
            gameId: parseInt(gameId),
            id: { in: participantIds }
          }
        });

        if (validParticipants.length !== participantIds.length) {
          return res.status(400).json({
            success: false,
            message: 'Algunos participantes no son válidos para este juego'
          });
        }

        // Check if any participant already played this card
        const existingParticipantRounds = await prisma.gameParticipantRound.findMany({
          where: {
            participantId: { in: participantIds },
            cardId: parseInt(cardId)
          }
        });

        if (existingParticipantRounds.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Algunos participantes ya jugaron esta carta'
          });
        }

        // Process each participant's answers
        const participantResults = [];
        const participantRounds = [];

        for (const answer of participantAnswers) {
          const result = calculatePoints(answer.songGuess, answer.artistGuess, answer.albumGuess);
          
          const participantRound = {
            participantId: parseInt(answer.participantId),
            cardId: parseInt(cardId),
            songCorrect: result.songCorrect,
            artistCorrect: result.artistCorrect,
            albumCorrect: result.albumCorrect,
            points: result.points
          };

          participantRounds.push(participantRound);
          participantResults.push({
            participantId: answer.participantId,
            ...result,
            answers: {
              song: {
                guess: answer.songGuess,
                correct: card.songName,
                isCorrect: result.songCorrect
              },
              artist: {
                guess: answer.artistGuess,
                correct: card.artist.name,
                isCorrect: result.artistCorrect
              },
              album: {
                guess: answer.albumGuess || null,
                correct: card.album?.title || null,
                isCorrect: result.albumCorrect
              }
            }
          });
        }

        // Create all participant rounds in a transaction
        await prisma.$transaction(async (tx) => {
          // Create participant rounds
          await tx.gameParticipantRound.createMany({
            data: participantRounds
          });

          // Update participant totals
          for (const round of participantRounds) {
            await tx.gameParticipant.update({
              where: { id: round.participantId },
              data: {
                totalPoints: { increment: round.points },
                totalRounds: { increment: 1 }
              }
            });
          }

          // Update game totals
          const totalPoints = participantRounds.reduce((sum, round) => sum + round.points, 0);
          await tx.game.update({
            where: { id: parseInt(gameId) },
            data: {
              totalPoints: { increment: totalPoints },
              totalRounds: { increment: 1 }
            }
          });
        });

        // Get updated participants and game data
        const updatedParticipants = await prisma.gameParticipant.findMany({
          where: { gameId: parseInt(gameId) },
          orderBy: { totalPoints: 'desc' }
        });

        const updatedGame = await prisma.game.findUnique({
          where: { id: parseInt(gameId) }
        });

        // Get total cards in deck for progress tracking
        const totalCardsInDeck = await prisma.card.count({
          where: { deckId: game.deckId }
        });

        res.json({
          success: true,
          message: 'Ronda enviada exitosamente (modo con puntaje)',
          data: {
            round: {
              cardId: cardId.toString(),
              card: {
                id: card.id.toString(),
                songName: card.songName,
                artist: card.artist.name,
                album: card.album?.title || null,
                difficulty: card.difficulty,
                preview: card.previewUrl,
                qrCode: card.qrCode
              },
              participantResults: participantResults.map(result => ({
                participantId: result.participantId.toString(),
                points: result.points,
                pointsBreakdown: result.pointsBreakdown,
                difficultyMultiplier: result.difficultyMultiplier,
                answers: result.answers
              }))
            },
            game: {
              id: gameId.toString(),
              deck: game.deck,
              status: 'started',
              totalPoints: updatedGame.totalPoints,
              totalRounds: updatedGame.totalRounds,
              progress: {
                roundsPlayed: updatedGame.totalRounds,
                totalCards: totalCardsInDeck,
                percentage: Math.round((updatedGame.totalRounds / totalCardsInDeck) * 100)
              },
              startedAt: updatedGame.startedAt,
              participants: updatedParticipants.map(p => ({
                id: p.id.toString(),
                name: p.name,
                totalPoints: p.totalPoints,
                totalRounds: p.totalRounds
              }))
            }
          }
        });
      }

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
          id: parseInt(gameId),
          userId: parseInt(userId),
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
        where: { id: parseInt(gameId) },
        data: {
          status: 'finished',
          endedAt: new Date()
        }
      });

      // Update or create ranking entry
      const existingRanking = await prisma.ranking.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
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
            userId: parseInt(userId),
            deckId: game.deckId,
            pointsTotal: finishedGame.totalPoints,
            gamesPlayed: 1,
            lastPlayedAt: new Date()
          }
        });
      }

      // Get final game summary with rounds
      const gameRounds = await prisma.gameRound.findMany({
        where: { gameId: parseInt(gameId) },
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
          id: parseInt(gameId),
          userId: parseInt(userId)
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