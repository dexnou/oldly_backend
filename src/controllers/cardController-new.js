const prisma = require('../utils/database');

class CardController {
  // GET /api/cards/:id/play
  static async playCard(req, res) {
    try {
      const { id } = req.params;

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
      const token = req.header('Authorization')?.replace('Bearer ', '');

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

      // Si viene de un QR (token de 16 caracteres), verificar autenticación
      if (id.length === 16) {
        // Check if user is authenticated
        if (!token) {
          // Redirect to login with card info
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

        // Verify token and get user
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check if user has access to this deck
          const userDeck = await prisma.userDeck.findUnique({
            where: {
              userId_deckId: {
                userId: decoded.id,
                deckId: card.deckId
              }
            }
          });

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
        } catch (jwtError) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido, debes autenticarte nuevamente',
            redirectTo: 'login',
            data: {
              cardId: card.id.toString(),
              qrToken: card.qrToken
            }
          });
        }
      }

      // Generate QR URL for frontend
      const qrUrl = `${process.env.FRONTEND_URL}/qr/${card.qrToken}`;
      
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
}

module.exports = CardController;