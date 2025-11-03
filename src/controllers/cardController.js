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
          where: { id: BigInt(id) },
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

      // Return card metadata and preview without revealing answers
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
            // Don't include song name, artist, or album in play mode
            // These should be guessed by the player
            metadata: {
              hasAlbum: !!card.album,
              releaseDecade: card.album?.releaseYear ? Math.floor(card.album.releaseYear / 10) * 10 : null
            }
          }
        }
      });
    } catch (error) {
      console.error('Error reproduciendo carta:', error);
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
          where: { id: BigInt(id) },
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

      // Return full card information
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
      console.error('Error revelando carta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = CardController;