const prisma = require('../utils/database');

class DeckController {
  // GET /api/decks
  static async getDecks(req, res) {
    try {
      const { theme, active = 'true' } = req.query;
      const userId = req.user?.id;

      // Debug logs
      console.log('🔍 DEBUG - getDecks called');
      console.log('🔍 DEBUG - userId:', userId, 'type:', typeof userId);
      console.log('🔍 DEBUG - req.user:', req.user);

      const whereCondition = {
        active: active === 'true'
      };

      if (theme) {
        whereCondition.theme = theme;
      }

      const deckQuery = prisma.deck.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          description: true,
          theme: true,
          buyLink: true,
          coverImage: true,
          createdAt: true,
          _count: {
            select: {
              cards: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const userDeckQuery = userId ? prisma.userDeck.findMany({
        where: { userId: parseInt(userId) },
        select: { deckId: true }
      }) : Promise.resolve([]);

      const [decks, userDecks] = await Promise.all([deckQuery, userDeckQuery]);

      const userDeckIds = userDecks.map(ud => ud.deckId);
      console.log('🔍 DEBUG - userDeckIds:', userDeckIds);

      const decksWithAccess = decks.map(deck => {
        const hasAccess = userId ? userDeckIds.includes(deck.id) : false;
        console.log(`🔍 DEBUG - Deck ${deck.id} (${deck.title}): hasAccess = ${hasAccess}, userDeckIds:`, userDeckIds, 'deck.id type:', typeof deck.id);

        return {
          ...deck,
          id: deck.id.toString(),
          cardCount: deck._count.cards,
          hasAccess
        };
      });

      res.json({
        success: true,
        data: {
          decks: decksWithAccess
        }
      });
    } catch (error) {
      console.error('Error obteniendo mazos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/decks/:id
  static async getDeckById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      console.log('🔍 DEBUG - getDeckById called for deckId:', id, 'userId:', userId);

      const deck = await prisma.deck.findUnique({
        where: {
          id: parseInt(id),
          active: true
        },
        select: {
          id: true,
          title: true,
          description: true,
          theme: true,
          buyLink: true,
          coverImage: true,
          createdAt: true,
          _count: {
            select: {
              cards: true
            }
          }
        }
      });

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Mazo no encontrado'
        });
      }

      // Check if user has access to this deck
      let hasAccess = false;
      if (userId) {
        const userDeck = await prisma.userDeck.findUnique({
          where: {
            userId_deckId: {
              userId: parseInt(userId),
              deckId: parseInt(id)
            }
          }
        });
        hasAccess = !!userDeck;
        console.log('🔍 DEBUG - hasAccess for deck:', hasAccess, 'userDeck:', userDeck);
      }

      res.json({
        success: true,
        data: {
          deck: {
            ...deck,
            id: deck.id.toString(),
            cardCount: deck._count.cards,
            hasAccess
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo mazo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/decks/:id/cards
  static async getDeckCards(req, res) {
    try {
      const { id } = req.params;
      const { difficulty, limit, offset } = req.query;
      const userId = req.user.id;

      // Check if user has access to this deck
      const userDeck = await prisma.userDeck.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
            deckId: parseInt(id)
          }
        }
      });

      if (!userDeck) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a este mazo'
        });
      }

      const whereCondition = {
        deckId: parseInt(id)
      };

      if (difficulty) {
        whereCondition.difficulty = difficulty;
      }

      const queryOptions = {
        where: whereCondition,
        select: {
          id: true,
          songName: true,
          qrToken: true,
          difficulty: true,
          previewUrl: true,
          spotifyUrl: true,
          createdAt: true,
          artist: {
            select: {
              id: true,
              name: true,
              country: true,
              genre: true
            }
          },
          album: {
            select: {
              id: true,
              title: true,
              releaseYear: true,
              coverUrl: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      };

      // Add pagination if provided
      if (limit) {
        queryOptions.take = parseInt(limit);
      }
      if (offset) {
        queryOptions.skip = parseInt(offset);
      }

      const cards = await prisma.card.findMany(queryOptions);

      // Get total count for pagination
      const totalCards = await prisma.card.count({
        where: whereCondition
      });

      const cardsWithStringIds = cards.map(card => ({
        ...card,
        id: card.id.toString(),
        artist: {
          ...card.artist,
          id: card.artist.id.toString()
        },
        album: card.album ? {
          ...card.album,
          id: card.album.id.toString()
        } : null
      }));

      res.json({
        success: true,
        data: {
          cards: cardsWithStringIds,
          pagination: {
            total: totalCards,
            limit: limit ? parseInt(limit) : totalCards,
            offset: offset ? parseInt(offset) : 0
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo cartas del mazo:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/decks/:id/activate (bonus endpoint to activate deck access)
  static async activateDeck(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { source = 'purchase' } = req.body;

      console.log('🚀 DEBUG - activateDeck called');
      console.log('🚀 DEBUG - deckId:', id, 'type:', typeof id);
      console.log('🚀 DEBUG - userId:', userId, 'type:', typeof userId);
      console.log('🚀 DEBUG - req.user:', req.user);
      console.log('🚀 DEBUG - source:', source);

      // Check if deck exists and is active
      const deck = await prisma.deck.findUnique({
        where: {
          id: parseInt(id),
          active: true
        }
      });

      console.log('🚀 DEBUG - deck found:', deck);

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Mazo no encontrado'
        });
      }

      // Check if user already has access
      const existingAccess = await prisma.userDeck.findUnique({
        where: {
          userId_deckId: {
            userId: parseInt(userId),
            deckId: parseInt(id)
          }
        }
      });

      console.log('🚀 DEBUG - existingAccess:', existingAccess);

      if (existingAccess) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes acceso a este mazo'
        });
      }

      // Grant access
      console.log('🚀 DEBUG - Creating userDeck with userId:', parseInt(userId), 'deckId:', parseInt(id), 'source:', source);

      const newUserDeck = await prisma.userDeck.create({
        data: {
          userId: parseInt(userId),
          deckId: parseInt(id),
          source
        }
      });

      console.log('🚀 DEBUG - userDeck created successfully:', newUserDeck);

      res.json({
        success: true,
        message: 'Acceso al mazo activado exitosamente'
      });
    } catch (error) {
      console.error('🚨 ERROR activando mazo:', error);
      console.error('🚨 ERROR stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = DeckController;