const prisma = require('../utils/database');

class CardController {
  // GET /api/cards - List all cards (test endpoint)
  static async getAllCards(req, res) {
    try {
      const { deckId, limit = 20 } = req.query;
      const userId = req.user?.id;

      const whereCondition = {};
      if (deckId) {
        whereCondition.deckId = parseInt(deckId);
      }

      const cards = await prisma.card.findMany({
        where: whereCondition,
        select: {
          id: true,
          songName: true,
          qrToken: true,
          difficulty: true,
          previewUrl: true,
          spotifyUrl: true,
          deck: {
            select: {
              id: true,
              title: true,
              theme: true
            }
          },
          artist: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit)
      });

      // Check user access for each card's deck
      const cardsWithAccess = await Promise.all(
        cards.map(async (card) => {
          let hasAccess = false;
          if (userId) {
            const userDeck = await prisma.userDeck.findUnique({
              where: {
                userId_deckId: {
                  userId: parseInt(userId),
                  deckId: card.deck.id
                }
              }
            });
            hasAccess = !!userDeck;
          }

          return {
            ...card,
            id: card.id.toString(),
            deck: {
              ...card.deck,
              id: card.deck.id.toString()
            },
            artist: {
              ...card.artist,
              id: card.artist.id.toString()
            },
            hasAccess,
            qrUrl: `${process.env.FRONTEND_URL}/qr/${card.qrToken}`
          };
        })
      );

      res.json({
        success: true,
        data: {
          cards: cardsWithAccess
        }
      });
    } catch (error) {
      console.error('Error obteniendo cartas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/cards/:id/play
  static async playCard(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Find card by ID or QR token
      let card;
      
      // Check if it's a QR token (16 characters) or card ID
      if (id.length === 16) {
        card = await prisma.card.findUnique({
          where: { qrToken: id },
          include: {
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
            },
            deck: {
              select: {
                id: true,
                title: true,
                theme: true
              }
            }
          }
        });
      } else {
        card = await prisma.card.findUnique({
          where: { id: parseInt(id) },
          include: {
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
            },
            deck: {
              select: {
                id: true,
                title: true,
                theme: true
              }
            }
          }
        });
      }

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada'
        });
      }

      // Verificar si el usuario tiene acceso al deck de esta carta
      if (userId) {
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
            message: 'No tienes acceso a este mazo. Escanea el código QR del mazo primero para activar tu acceso.',
            needsAccess: true,
            deck: {
              id: card.deck.id.toString(),
              title: card.deck.title,
              theme: card.deck.theme
            }
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Debes estar logueado para jugar esta carta'
        });
      }

      // Return card info for playing (without revealing correct answers initially)
      res.json({
        success: true,
        data: {
          card: {
            id: card.id.toString(),
            qrToken: card.qrToken,
            difficulty: card.difficulty,
            previewUrl: card.previewUrl,
            spotifyUrl: card.spotifyUrl,
            deck: {
              ...card.deck,
              id: card.deck.id.toString()
            },
            // Hint without revealing answers
            hint: `Canción de dificultad ${card.difficulty} del mazo "${card.deck.title}"`
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo carta para jugar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/cards/:id (get card details with QR redirect logic)
  static async getCardDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      console.log('🔍 DEBUG - getCardDetails called');
      console.log('🔍 DEBUG - id:', id, 'userId:', userId);
      console.log('🔍 DEBUG - req.user:', req.user);

      // Find card by ID or QR token
      let card;
      
      if (id.length === 16) {
        card = await prisma.card.findUnique({
          where: { qrToken: id },
          include: {
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
            },
            deck: {
              select: {
                id: true,
                title: true,
                theme: true
              }
            }
          }
        });
      } else {
        card = await prisma.card.findUnique({
          where: { id: parseInt(id) },
          include: {
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
            },
            deck: {
              select: {
                id: true,
                title: true,
                theme: true
              }
            }
          }
        });
      }

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada'
        });
      }

      console.log('🔍 DEBUG - card found:', card.id, card.songName);

      // Si viene de un QR (token de 16 caracteres), verificar autenticación
      if (id.length === 16) {
        // Check if user is authenticated
        if (!userId) {
          // Redirect to login with card info
          console.log('🔍 DEBUG - No user authenticated, redirecting to login');
          return res.status(401).json({
            success: false,
            message: 'Debes autenticarte para ver esta carta',
            redirectTo: 'login',
            data: {
              cardId: card.id.toString(),
              qrToken: card.qrToken,
              deck: {
                id: card.deck.id.toString(),
                title: card.deck.title
              }
            }
          });
        }

        // Check if user has access to this deck
        console.log('🔍 DEBUG - Checking access for userId:', userId, 'deckId:', card.deckId);
        const userDeck = await prisma.userDeck.findUnique({
          where: {
            userId_deckId: {
              userId: parseInt(userId),
              deckId: card.deckId
            }
          }
        });

        console.log('🔍 DEBUG - userDeck found:', userDeck);

        if (!userDeck) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a este mazo',
            redirectTo: 'activate-deck',
            data: {
              cardId: card.id.toString(),
              deck: {
                id: card.deck.id.toString(),
                title: card.deck.title
              }
            }
          });
        }
      }

      // Generate QR URL for frontend
      const qrUrl = `${process.env.FRONTEND_URL}/qr/${card.qrToken}`;
      
      console.log('🔍 DEBUG - Access granted, returning card details');
      
      res.json({
        success: true,
        data: {
          card: {
            id: card.id.toString(),
            songName: card.songName,
            qrToken: card.qrToken,
            qrUrl: qrUrl,
            difficulty: card.difficulty,
            previewUrl: card.previewUrl,
            spotifyUrl: card.spotifyUrl,
            artist: {
              ...card.artist,
              id: card.artist.id.toString()
            },
            album: card.album ? {
              ...card.album,
              id: card.album.id.toString()
            } : null,
            deck: {
              ...card.deck,
              id: card.deck.id.toString()
            }
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo carta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/cards/:id/reveal (bonus endpoint to get full card info)
  static async revealCard(req, res) {
    try {
      const { id } = req.params;

      // Find card by ID or QR token
      let card;
      
      if (id.length === 16) {
        card = await prisma.card.findUnique({
          where: { qrToken: id },
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
      } else {
        card = await prisma.card.findUnique({
          where: { id: parseInt(id) },
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
      }

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada'
        });
      }

      // Return full card details (all answers revealed)
      res.json({
        success: true,
        data: {
          card: {
            id: card.id.toString(),
            songName: card.songName,
            qrToken: card.qrToken,
            difficulty: card.difficulty,
            previewUrl: card.previewUrl,
            spotifyUrl: card.spotifyUrl,
            artist: {
              id: card.artist.id.toString(),
              name: card.artist.name,
              country: card.artist.country,
              genre: card.artist.genre
            },
            album: card.album ? {
              id: card.album.id.toString(),
              title: card.album.title,
              releaseYear: card.album.releaseYear,
              coverUrl: card.album.coverUrl
            } : null,
            deck: {
              ...card.deck,
              id: card.deck.id.toString()
            }
          }
        }
      });
    } catch (error) {
      console.error('Error revelando carta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/cards/:id/casual-play (modo casual - sin puntaje)
  static async casualPlay(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Find card by ID or QR token
      let card;
      
      if (id.length === 16) {
        card = await prisma.card.findUnique({
          where: { qrToken: id },
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
      } else {
        card = await prisma.card.findUnique({
          where: { id: parseInt(id) },
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
      }

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Carta no encontrada',
          errorCode: 'CARD_NOT_FOUND'
        });
      }

      // Verify user has access to this deck
      if (userId) {
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
            errorCode: 'DECK_ACCESS_DENIED',
            needsAccess: true,
            deck: {
              id: card.deck.id.toString(),
              title: card.deck.title,
              theme: card.deck.theme
            }
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Debes estar logueado para jugar esta carta',
          errorCode: 'AUTH_REQUIRED'
        });
      }

      // Return complete card info for casual mode (show answers immediately)
      res.json({
        success: true,
        message: 'Carta para modo casual obtenida exitosamente',
        data: {
          mode: 'casual',
          card: {
            id: card.id.toString(),
            songName: card.songName,
            qrToken: card.qrToken,
            difficulty: card.difficulty,
            previewUrl: card.previewUrl,
            spotifyUrl: card.spotifyUrl,
            artist: {
              id: card.artist.id.toString(),
              name: card.artist.name,
              country: card.artist.country,
              genre: card.artist.genre
            },
            album: card.album ? {
              id: card.album.id.toString(),
              title: card.album.title,
              releaseYear: card.album.releaseYear,
              coverUrl: card.album.coverUrl
            } : null,
            deck: {
              id: card.deck.id.toString(),
              title: card.deck.title,
              theme: card.deck.theme
            }
          }
        }
      });
    } catch (error) {
      console.error('Error en casual play:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = CardController;