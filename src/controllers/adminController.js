const prisma = require('../utils/database');
const AuthService = require('../services/authService');

class AdminController {
  // POST /api/admin/decks
  static async createOrUpdateDeck(req, res) {
    try {
      const { 
        id, 
        title, 
        description, 
        theme, 
        buyLink, 
        coverImage, 
        active = true 
      } = req.body;

      let deck;

      if (id) {
        // Update existing deck
        deck = await prisma.deck.update({
          where: { id: parseInt(id) },
          data: {
            title,
            description,
            theme,
            buyLink,
            coverImage,
            active
          }
        });
      } else {
        // Create new deck
        deck = await prisma.deck.create({
          data: {
            title,
            description,
            theme,
            buyLink,
            coverImage,
            active
          }
        });
      }

      res.status(id ? 200 : 201).json({
        success: true,
        message: id ? 'Mazo actualizado exitosamente' : 'Mazo creado exitosamente',
        data: {
          deck: {
            ...deck,
            id: deck.id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Error creando/actualizando mazo:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un mazo con ese título'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/admin/cards
  static async createCard(req, res) {
    try {
      const {
        deckId,
        artistName,
        artistCountry,
        artistGenre,
        albumTitle,
        albumReleaseYear,
        albumCoverUrl,
        songName,
        spotifyUrl,
        previewUrl,
        difficulty = 'medium'
      } = req.body;

      // Find or create artist
      let artist = await prisma.artist.findFirst({
        where: {
          name: artistName,
          country: artistCountry
        }
      });

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name: artistName,
            country: artistCountry,
            genre: artistGenre
          }
        });
      }

      // Find or create album if provided
      let album = null;
      if (albumTitle) {
        album = await prisma.album.findFirst({
          where: {
            artistId: artist.id,
            title: albumTitle,
            releaseYear: albumReleaseYear ? parseInt(albumReleaseYear) : null
          }
        });

        if (!album) {
          album = await prisma.album.create({
            data: {
              artistId: artist.id,
              title: albumTitle,
              releaseYear: albumReleaseYear ? parseInt(albumReleaseYear) : null,
              coverUrl: albumCoverUrl
            }
          });
        }
      }

      // Generate unique QR token
      let qrToken;
      let tokenExists = true;
      
      while (tokenExists) {
        qrToken = AuthService.generateQrToken();
        const existingCard = await prisma.card.findUnique({
          where: { qrToken }
        });
        tokenExists = !!existingCard;
      }

      // Create QR code data with redirect URL
      const qrRedirectUrl = `${process.env.FRONTEND_URL}/qr/${qrToken}`;
      const qrCode = JSON.stringify({
        token: qrToken,
        redirectUrl: qrRedirectUrl,
        cardId: null, // Will be filled after creation
        gameUrl: null // Will be filled after creation
      });

      // Create card
      const card = await prisma.card.create({
        data: {
          deckId: parseInt(deckId),
          artistId: artist.id,
          albumId: album?.id,
          songName,
          qrCode,
          qrToken,
          spotifyUrl,
          previewUrl,
          difficulty
        },
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
              title: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Carta creada exitosamente',
        data: {
          card: {
            ...card,
            id: card.id.toString(),
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
      console.error('Error creando carta:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una carta con esa canción en este mazo'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/admin/users/export
  static async exportUsers(req, res) {
    try {
      const { format = 'json', startDate, endDate } = req.query;

      const whereCondition = {};
      
      if (startDate || endDate) {
        whereCondition.createdAt = {};
        if (startDate) {
          whereCondition.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          whereCondition.createdAt.lte = new Date(endDate);
        }
      }

      const users = await prisma.user.findMany({
        where: whereCondition,
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          whatsapp: true,
          createdAt: true,
          lastLoginAt: true,
          isActive: true,
          googleId: true,
          _count: {
            select: {
              games: true,
              userDecks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const rankings = await prisma.ranking.findMany({
            where: { userId: user.id },
            select: {
              pointsTotal: true,
              gamesPlayed: true
            }
          });

          const totalPoints = rankings.reduce((sum, r) => sum + r.pointsTotal, 0);
          const totalGames = rankings.reduce((sum, r) => sum + r.gamesPlayed, 0);

          return {
            id: user.id.toString(),
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            whatsapp: user.whatsapp,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            isActive: user.isActive,
            hasGoogleAuth: !!user.googleId,
            stats: {
              totalPoints,
              totalGames,
              decksOwned: user._count.userDecks,
              gamesStarted: user._count.games
            }
          };
        })
      );

      if (format === 'csv') {
        // Generate CSV
        const csvHeader = 'ID,Nombre,Apellido,Email,WhatsApp,Fecha Registro,Último Login,Activo,Google Auth,Puntos Totales,Juegos Totales,Mazos,Juegos Iniciados\n';
        const csvRows = usersWithStats.map(user => [
          user.id,
          user.firstname,
          user.lastname,
          user.email,
          user.whatsapp || '',
          user.createdAt.toISOString(),
          user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
          user.isActive ? 'Sí' : 'No',
          user.hasGoogleAuth ? 'Sí' : 'No',
          user.stats.totalPoints,
          user.stats.totalGames,
          user.stats.decksOwned,
          user.stats.gamesStarted
        ].join(',')).join('\n');

        const csvContent = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios_export.csv');
        res.send(csvContent);
      } else {
        // Return JSON
        res.json({
          success: true,
          data: {
            users: usersWithStats,
            metadata: {
              totalUsers: usersWithStats.length,
              exportDate: new Date(),
              filters: {
                startDate,
                endDate
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error exportando usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/admin/stats (bonus endpoint for dashboard)
  static async getStats(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalDecks,
        activeDecks,
        totalCards,
        totalGames,
        recentGames
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.deck.count(),
        prisma.deck.count({ where: { active: true } }),
        prisma.card.count(),
        prisma.game.count(),
        prisma.game.findMany({
          take: 5,
          orderBy: { startedAt: 'desc' },
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true
              }
            },
            deck: {
              select: {
                title: true
              }
            }
          }
        })
      ]);

      const recentGamesFormatted = recentGames.map(game => ({
        id: game.id.toString(),
        status: game.status,
        totalPoints: game.totalPoints,
        startedAt: game.startedAt,
        user: `${game.user.firstname} ${game.user.lastname}`,
        deck: game.deck.title
      }));

      res.json({
        success: true,
        data: {
          stats: {
            users: {
              total: totalUsers,
              active: activeUsers
            },
            decks: {
              total: totalDecks,
              active: activeDecks
            },
            cards: {
              total: totalCards
            },
            games: {
              total: totalGames
            }
          },
          recentGames: recentGamesFormatted
        }
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/admin/register (create new admin)
  static async registerAdmin(req, res) {
    try {
      const { name, email, password, role = 'editor' } = req.body;

      // Check if admin already exists
      const existingAdmin = await prisma.adminUser.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un administrador con este email'
        });
      }

      // Hash password
      const passwordHash = await AuthService.hashPassword(password);

      // Create admin
      const admin = await prisma.adminUser.create({
        data: {
          name,
          email,
          passwordHash,
          role
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Administrador creado exitosamente',
        data: {
          admin: {
            ...admin,
            id: admin.id.toString()
          }
        }
      });
    } catch (error) {
      console.error('Error creando admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /api/admin/login (admin authentication)
  static async adminLogin(req, res) {
    try {
      const { email, password } = req.body;

      const admin = await prisma.adminUser.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true
        }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const isValidPassword = await AuthService.comparePassword(password, admin.passwordHash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const token = AuthService.generateToken({
        id: admin.id.toString(),
        email: admin.email,
        role: admin.role,
        type: 'admin'
      });

      res.json({
        success: true,
        message: 'Login de administrador exitoso',
        data: {
          admin: {
            id: admin.id.toString(),
            name: admin.name,
            email: admin.email,
            role: admin.role
          },
          token
        }
      });
    } catch (error) {
      console.error('Error en login de admin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AdminController;