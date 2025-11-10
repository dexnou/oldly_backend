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

  // GET /api/game/active-competitive/:deckId
  static async getActiveCompetitiveGame(req, res) {
    try {
      const { deckId } = req.params;
      const userId = req.user.id;

      // Validate deckId parameter
      if (!deckId || isNaN(parseInt(deckId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de deck inválido',
          errorCode: 'INVALID_DECK_ID'
        });
      }

      // Find active competitive game for this user in this specific deck
      const activeGame = await prisma.game.findFirst({
        where: {
          userId: parseInt(userId),
          deckId: parseInt(deckId),
          mode: 'competitive',
          status: 'started'
        },
        include: {
          deck: {
            select: {
              id: true,
              title: true,
              theme: true
            }
          },
          participants: {
            select: {
              id: true,
              name: true,
              totalPoints: true,
              totalRounds: true
            },
            orderBy: {
              totalPoints: 'desc'
            }
          }
        }
      });

      if (!activeGame) {
        return res.status(404).json({
          success: false,
          message: 'No active competitive game found for this deck'
        });
      }

      // Check if game has expired (1 hour = 3600000 milliseconds)
      const now = new Date();
      const gameStartTime = new Date(activeGame.startedAt);
      const hoursSinceStart = (now - gameStartTime) / (1000 * 60 * 60);
      
      if (hoursSinceStart >= 1) {
        // Game has expired, mark it as finished
        await prisma.game.update({
          where: { id: activeGame.id },
          data: {
            status: 'expired',
            endedAt: now
          }
        });

        return res.status(404).json({
          success: false,
          message: 'La partida ha expirado (más de 1 hora de inactividad)',
          errorCode: 'GAME_EXPIRED'
        });
      }

      res.json({
        success: true,
        message: 'Active competitive game found for this deck',
        data: {
          game: {
            id: activeGame.id.toString(),
            mode: activeGame.mode,
            status: activeGame.status,
            totalPoints: activeGame.totalPoints,
            totalRounds: activeGame.totalRounds,
            startedAt: activeGame.startedAt,
            deck: {
              id: activeGame.deck.id.toString(),
              title: activeGame.deck.title,
              theme: activeGame.deck.theme
            },
            participants: activeGame.participants.map(p => ({
              id: p.id.toString(),
              name: p.name,
              totalPoints: p.totalPoints,
              totalRounds: p.totalRounds
            }))
          }
        }
      });
    } catch (error) {
      console.error('Error getting active competitive game:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  // POST /api/game/start-competitive
  static async startCompetitive(req, res) {
    try {
      const { deckId, participants = [] } = req.body;
      const userId = req.user.id;

      // Validate deckId
      if (!deckId || isNaN(parseInt(deckId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de mazo inválido',
          errorCode: 'INVALID_DECK_ID'
        });
      }

      // Validate participants
      if (participants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El modo competitivo requiere al menos un participante',
          errorCode: 'NO_PARTICIPANTS'
        });
      }

      if (participants.length > 8) {
        return res.status(400).json({
          success: false,
          message: 'Máximo 8 participantes permitidos',
          errorCode: 'TOO_MANY_PARTICIPANTS'
        });
      }

      // Validate participant names
      for (let participant of participants) {
        if (!participant.name || participant.name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Todos los participantes deben tener un nombre válido',
            errorCode: 'INVALID_PARTICIPANT_NAME'
          });
        }
        if (participant.name.trim().length > 80) {
          return res.status(400).json({
            success: false,
            message: 'Los nombres de participantes no pueden exceder 80 caracteres',
            errorCode: 'PARTICIPANT_NAME_TOO_LONG'
          });
        }
      }

      // Check for duplicate names
      const names = participants.map(p => p.name.trim().toLowerCase());
      const uniqueNames = new Set(names);
      if (names.length !== uniqueNames.size) {
        return res.status(400).json({
          success: false,
          message: 'No se permiten nombres duplicados de participantes',
          errorCode: 'DUPLICATE_PARTICIPANT_NAMES'
        });
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
          message: 'No tienes acceso a este mazo',
          errorCode: 'DECK_ACCESS_DENIED'
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
          message: 'Mazo no encontrado o inactivo',
          errorCode: 'DECK_NOT_FOUND'
        });
      }

      if (deck._count.cards === 0) {
        return res.status(400).json({
          success: false,
          message: 'Este mazo no tiene cartas disponibles',
          errorCode: 'NO_CARDS_IN_DECK'
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
        // Check if the active game has expired (1 hour = 3600000 milliseconds)
        const now = new Date();
        const gameStartTime = new Date(activeGame.startedAt);
        const hoursSinceStart = (now - gameStartTime) / (1000 * 60 * 60);
        
        if (hoursSinceStart >= 1) {
          // Game has expired, mark it as finished and allow new game
          await prisma.game.update({
            where: { id: activeGame.id },
            data: {
              status: 'expired',
              endedAt: now
            }
          });
        } else {
          // Game is still active and not expired
          return res.status(400).json({
            success: false,
            message: 'Ya tienes un juego activo en este mazo. Finaliza el juego actual primero.',
            errorCode: 'ACTIVE_GAME_EXISTS',
            data: {
              activeGameId: activeGame.id.toString()
            }
          });
        }
      }

      // Create competitive game
      const game = await prisma.game.create({
        data: {
          userId: parseInt(userId),
          deckId: parseInt(deckId),
          mode: 'competitive',
          status: 'started',
          participants: {
            create: participants.map(p => ({
              name: p.name.trim()
            }))
          }
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
          participants: {
            select: {
              id: true,
              name: true,
              totalPoints: true,
              totalRounds: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Juego competitivo iniciado exitosamente',
        data: {
          game: {
            id: game.id.toString(),
            mode: game.mode,
            status: game.status,
            totalPoints: game.totalPoints,
            totalRounds: game.totalRounds,
            startedAt: game.startedAt,
            deck: {
              id: game.deck.id.toString(),
              title: game.deck.title,
              theme: game.deck.theme,
              totalCards: game.deck._count.cards
            },
            participants: game.participants.map(p => ({
              id: p.id.toString(),
              name: p.name,
              totalPoints: p.totalPoints,
              totalRounds: p.totalRounds
            }))
          }
        }
      });
    } catch (error) {
      console.error('Error iniciando juego competitivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  // POST /api/game/:id/submit-competitive-round
  static async submitCompetitiveRound(req, res) {
    try {
      const { id: gameId } = req.params;
      const { cardId, participantAnswers = [] } = req.body;
      const userId = req.user.id;

      // Validate inputs
      if (!cardId || isNaN(parseInt(cardId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de carta inválido',
          errorCode: 'INVALID_CARD_ID'
        });
      }

      if (!participantAnswers || !Array.isArray(participantAnswers) || participantAnswers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren respuestas de los participantes',
          errorCode: 'NO_PARTICIPANT_ANSWERS'
        });
      }

      // Find game and verify ownership + mode
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
              title: true,
              theme: true
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
          message: 'Juego no encontrado o ya finalizado',
          errorCode: 'GAME_NOT_FOUND'
        });
      }

      if (game.mode !== 'competitive') {
        return res.status(400).json({
          success: false,
          message: 'Este endpoint es solo para juegos competitivos',
          errorCode: 'INVALID_GAME_MODE'
        });
      }

      // Find the card
      const card = await prisma.card.findUnique({
        where: { id: parseInt(cardId) },
        include: {
          artist: true,
          album: true
        }
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada',
          errorCode: 'CARD_NOT_FOUND'
        });
      }

      // Verify card belongs to the same deck as the game
      if (card.deckId !== game.deckId) {
        return res.status(400).json({
          success: false,
          message: 'Esta carta no pertenece al mazo del juego actual',
          errorCode: 'CARD_DECK_MISMATCH'
        });
      }

      // Validate participants exist and answers format
      const participantIds = participantAnswers.map(p => parseInt(p.participantId));
      
      // Validate the structure of participantAnswers
      for (const answer of participantAnswers) {
        if (!answer.userKnew || typeof answer.userKnew !== 'object') {
          return res.status(400).json({
            success: false,
            message: 'Cada respuesta de participante debe incluir un objeto userKnew válido',
            errorCode: 'INVALID_USER_KNEW_STRUCTURE'
          });
        }
        
        // Validate boolean values if they exist
        const { songKnew, artistKnew, albumKnew } = answer.userKnew;
        if (songKnew !== undefined && typeof songKnew !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'songKnew debe ser verdadero o falso',
            errorCode: 'INVALID_SONG_KNEW'
          });
        }
        if (artistKnew !== undefined && typeof artistKnew !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'artistKnew debe ser verdadero o falso',
            errorCode: 'INVALID_ARTIST_KNEW'
          });
        }
        if (albumKnew !== undefined && typeof albumKnew !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'albumKnew debe ser verdadero o falso',
            errorCode: 'INVALID_ALBUM_KNEW'
          });
        }
      }
      
      const validParticipants = await prisma.gameParticipant.findMany({
        where: {
          gameId: parseInt(gameId),
          id: { in: participantIds }
        }
      });

      if (validParticipants.length !== participantIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Algunos participantes no son válidos para este juego',
          errorCode: 'INVALID_PARTICIPANTS'
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
          message: 'Algunos participantes ya jugaron esta carta',
          errorCode: 'CARD_ALREADY_PLAYED'
        });
      }

      // Calculate points function
      const calculatePoints = (userKnew) => {
        const {
          songKnew = false,
          artistKnew = false,
          albumKnew = false
        } = userKnew;

        let points = 0;
        let pointsBreakdown = {
          song: 0,
          artist: 0,
          album: 0,
          difficultyBonus: 0
        };

        if (songKnew) {
          points += 1;
          pointsBreakdown.song = 1;
        }
        if (artistKnew) {
          points += 1;
          pointsBreakdown.artist = 1;
        }
        if (albumKnew && card.album) {
          points += 1;
          pointsBreakdown.album = 1;
        }

        // Apply difficulty multiplier
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
          songCorrect: songKnew,
          artistCorrect: artistKnew,
          albumCorrect: albumKnew,
          points,
          pointsBreakdown,
          difficultyMultiplier
        };
      };

      // Process each participant's answers
      const participantResults = [];
      const participantRounds = [];

      for (const answer of participantAnswers) {
        const result = calculatePoints(answer.userKnew || {});
        
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
          participantName: validParticipants.find(p => p.id === parseInt(answer.participantId))?.name,
          ...result,
          userKnew: answer.userKnew || {}
        });
      }

      // Save all rounds in a transaction
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
        message: 'Ronda competitiva enviada exitosamente',
        data: {
          round: {
            cardId: cardId.toString(),
            card: {
              id: card.id.toString(),
              songName: card.songName,
              artist: card.artist.name,
              album: card.album?.title || null,
              difficulty: card.difficulty,
              previewUrl: card.previewUrl,
              spotifyUrl: card.spotifyUrl
            },
            participantResults: participantResults.map(result => ({
              participantId: result.participantId.toString(),
              participantName: result.participantName,
              points: result.points,
              pointsBreakdown: result.pointsBreakdown,
              difficultyMultiplier: result.difficultyMultiplier,
              userKnew: result.userKnew
            }))
          },
          game: {
            id: gameId.toString(),
            deck: game.deck,
            mode: game.mode,
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
    } catch (error) {
      console.error('Error enviando ronda competitiva:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  // POST /api/game/score-card
  static async scoreCard(req, res) {
    try {
      const { 
        cardId, 
        userKnew = {} 
      } = req.body;
      const userId = req.user.id;

      // Validate inputs
      if (!cardId || isNaN(parseInt(cardId))) {
        return res.status(400).json({
          success: false,
          message: 'ID de carta inválido',
          errorCode: 'INVALID_CARD_ID'
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
              title: true,
              theme: true
            }
          }
        }
      });

      console.log('🔍 DEBUG scoreCard - Card found:', {
        cardId: cardId,
        cardName: card?.songName,
        deckId: card?.deckId,
        deckTitle: card?.deck?.title
      });

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada',
          errorCode: 'CARD_NOT_FOUND'
        });
      }

      // Verify user has access to this deck
      const userDeck = await prisma.userDeck.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
            deckId: card.deckId
          }
        }
      });

      if (!userDeck) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este mazo',
          errorCode: 'DECK_ACCESS_DENIED'
        });
      }

      // Extract user's self-assessment
      const {
        songKnew = false,
        artistKnew = false,
        albumKnew = false
      } = userKnew;

      // Calculate points based on what user says they knew
      let points = 0;
      let pointsBreakdown = {
        song: 0,
        artist: 0,
        album: 0,
        difficultyBonus: 0
      };

      if (songKnew) {
        points += 1;
        pointsBreakdown.song = 1;
      }
      if (artistKnew) {
        points += 1;
        pointsBreakdown.artist = 1;
      }
      if (albumKnew && card.album) {
        points += 1;
        pointsBreakdown.album = 1;
      }

      // Apply difficulty multiplier
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

      // Update user's total ranking for this deck
      const existingRanking = await prisma.ranking.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
            deckId: card.deckId
          }
        }
      });

      if (existingRanking) {
        await prisma.ranking.update({
          where: { id: existingRanking.id },
          data: {
            pointsTotal: {
              increment: points
            },
            lastPlayedAt: new Date()
          }
        });
      } else {
        await prisma.ranking.create({
          data: {
            userId: parseInt(userId),
            deckId: card.deckId,
            pointsTotal: points,
            gamesPlayed: 0, // This is for individual cards, not games
            lastPlayedAt: new Date()
          }
        });
      }

      res.json({
        success: true,
        message: 'Puntuación calculada exitosamente',
        data: {
          card: {
            id: card.id.toString(),
            songName: card.songName,
            artist: card.artist.name,
            album: card.album?.title || null,
            difficulty: card.difficulty
          },
          scoring: {
            userKnew: {
              song: songKnew,
              artist: artistKnew,
              album: albumKnew
            },
            points: points,
            pointsBreakdown: pointsBreakdown,
            difficultyMultiplier: difficultyMultiplier,
            explanation: {
              song: songKnew ? `+1 punto por conocer la canción` : `0 puntos - no conocías la canción`,
              artist: artistKnew ? `+1 punto por conocer el artista` : `0 puntos - no conocías el artista`,
              album: card.album ? 
                (albumKnew ? `+1 punto por conocer el álbum` : `0 puntos - no conocías el álbum`) : 
                `Sin álbum disponible`,
              difficulty: points > 0 ? 
                `+${pointsBreakdown.difficultyBonus} puntos de bonus por dificultad ${card.difficulty}` :
                `Sin bonus - no obtuviste puntos base`
            }
          },
          deck: {
            id: card.deck.id.toString(),
            title: card.deck.title
          }
        }
      });
    } catch (error) {
      console.error('Error calculando puntuación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = GameController;