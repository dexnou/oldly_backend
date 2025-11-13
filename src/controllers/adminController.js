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
      
      console.log('🔍 DEBUG - exportUsers called with query:', req.query);
      console.log('🔍 DEBUG - format parameter:', format);
      console.log('🔍 DEBUG - typeof format:', typeof format);

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
        console.log('🔍 DEBUG - Generating CSV format');
        // Use semicolon as separator for compatibility with Excel in many locales
        const sep = ';'
        // Optional Excel-friendly hint line (some locales honor this) - commented out by default
        // const excelSepLine = `sep=${sep}\r\n`;
        const csvHeader = ['ID','Nombre','Apellido','Email','WhatsApp','Fecha Registro','Último Login','Activo','Google Auth','Puntos Totales','Juegos Totales','Mazos','Juegos Iniciados'].join(sep) + '\r\n';

        const escapeCSVField = (field) => {
          if (field === null || field === undefined) return '';
          const str = String(field);
          // If field contains separator, newline or quote, wrap in quotes and escape internal quotes
          if (str.includes(sep) || /[\n\r"]/g.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const csvRows = usersWithStats.map(user => {
          return [
            escapeCSVField(user.id),
            escapeCSVField(user.firstname || ''),
            escapeCSVField(user.lastname || ''),
            escapeCSVField(user.email || ''),
            escapeCSVField(user.whatsapp || ''),
            escapeCSVField(user.createdAt ? user.createdAt.toISOString().split('T')[0] : ''),
            escapeCSVField(user.lastLoginAt ? user.lastLoginAt.toISOString().split('T')[0] : ''),
            escapeCSVField(user.isActive ? 'Sí' : 'No'),
            escapeCSVField(user.hasGoogleAuth ? 'Sí' : 'No'),
            escapeCSVField(user.stats.totalPoints),
            escapeCSVField(user.stats.totalGames),
            escapeCSVField(user.stats.decksOwned),
            escapeCSVField(user.stats.gamesStarted)
          ].join(sep);
        });

        const csvContent = csvHeader + csvRows.join('\r\n');

        console.log('🔍 DEBUG - CSV content length:', csvContent.length);
        console.log('🔍 DEBUG - CSV content preview:', csvContent.substring(0, 300));
        console.log('🔍 DEBUG - Setting CSV headers...');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="usuarios_export.csv"');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Send CSV with BOM for proper Excel encoding
        res.send('\uFEFF' + csvContent);
        console.log('🔍 DEBUG - CSV response sent');
      } else {
        console.log('🔍 DEBUG - Generating JSON format');
        // Return JSON formatted
        const jsonData = {
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
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=usuarios_export.json');
        res.send(JSON.stringify(jsonData, null, 2)); // Pretty-printed JSON
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

  // DELETE /api/admin/decks/:id
  static async deleteDeck(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      // Verificar que el deck existe
      const deck = await prisma.deck.findUnique({
        where: { id: parseInt(id) },
        include: {
          _count: {
            select: {
              cards: true,
              userDecks: true,
              games: true
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

      // Si no es eliminación forzada, verificar dependencias
      if (!force) {
        if (deck._count.cards > 0) {
          return res.status(400).json({
            success: false,
            message: 'No se puede eliminar el mazo porque tiene cartas asociadas',
            data: {
              cardCount: deck._count.cards,
              userCount: deck._count.userDecks,
              gameCount: deck._count.games,
              suggestion: 'Usa el parámetro ?force=true para eliminar forzadamente'
            }
          });
        }

        if (deck._count.userDecks > 0) {
          return res.status(400).json({
            success: false,
            message: 'No se puede eliminar el mazo porque hay usuarios que lo tienen activado',
            data: {
              cardCount: deck._count.cards,
              userCount: deck._count.userDecks,
              gameCount: deck._count.games,
              suggestion: 'Usa el parámetro ?force=true para eliminar forzadamente'
            }
          });
        }
      }

      // Eliminación en cascada usando transacción
      await prisma.$transaction(async (tx) => {
        // 1. Eliminar rondas de juego de participantes
        await tx.gameParticipantRound.deleteMany({
          where: {
            card: {
              deckId: parseInt(id)
            }
          }
        });

        // 2. Eliminar participantes de juegos del deck
        await tx.gameParticipant.deleteMany({
          where: {
            game: {
              deckId: parseInt(id)
            }
          }
        });

        // 3. Eliminar rondas de juego del deck
        await tx.gameRound.deleteMany({
          where: {
            game: {
              deckId: parseInt(id)
            }
          }
        });

        // 4. Eliminar juegos del deck
        await tx.game.deleteMany({
          where: { deckId: parseInt(id) }
        });

        // 5. Eliminar rankings del deck
        await tx.ranking.deleteMany({
          where: { deckId: parseInt(id) }
        });

        // 6. Eliminar relaciones usuario-deck
        await tx.userDeck.deleteMany({
          where: { deckId: parseInt(id) }
        });

        // 7. Eliminar cartas del deck (esto eliminará albums y artists huérfanos automáticamente)
        await tx.card.deleteMany({
          where: { deckId: parseInt(id) }
        });

        // 8. Finalmente eliminar el deck
        await tx.deck.delete({
          where: { id: parseInt(id) }
        });
      });

      res.json({
        success: true,
        message: `Mazo "${deck.title}" eliminado exitosamente`,
        data: {
          deletedDeck: {
            id: deck.id.toString(),
            title: deck.title,
            cardsDeleted: deck._count.cards,
            usersAffected: deck._count.userDecks,
            gamesDeleted: deck._count.games
          }
        }
      });
    } catch (error) {
      console.error('Error eliminando deck:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // DELETE /api/admin/cards/:id
  static async deleteCard(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      // Verificar que la carta existe
      const card = await prisma.card.findUnique({
        where: { id: parseInt(id) },
        include: {
          artist: {
            select: {
              id: true,
              name: true
            }
          },
          album: {
            select: {
              id: true,
              title: true
            }
          },
          deck: {
            select: {
              id: true,
              title: true
            }
          },
          _count: {
            select: {
              gameRounds: true,
              gameParticipantRounds: true
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

      // Verificar si la carta ha sido jugada
      const totalRounds = card._count.gameRounds + card._count.gameParticipantRounds;
      
      if (!force && totalRounds > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar la carta porque ha sido jugada en partidas',
          data: {
            card: {
              id: card.id.toString(),
              songName: card.songName,
              artist: card.artist.name,
              deck: card.deck.title
            },
            timesPlayed: totalRounds,
            suggestion: 'Usa el parámetro ?force=true para eliminar forzadamente'
          }
        });
      }

      // Eliminación en cascada usando transacción
      await prisma.$transaction(async (tx) => {
        // 1. Eliminar rondas de participantes donde se jugó esta carta
        await tx.gameParticipantRound.deleteMany({
          where: { cardId: parseInt(id) }
        });

        // 2. Eliminar rondas de juego donde se jugó esta carta
        await tx.gameRound.deleteMany({
          where: { cardId: parseInt(id) }
        });

        // 3. Eliminar la carta
        await tx.card.delete({
          where: { id: parseInt(id) }
        });

        // 4. Verificar si el artist o album quedaron huérfanos y eliminarlos
        if (card.artist) {
          const remainingCards = await tx.card.count({
            where: { artistId: card.artist.id }
          });
          
          if (remainingCards === 0) {
            await tx.artist.delete({
              where: { id: card.artist.id }
            });
          }
        }

        if (card.album) {
          const remainingCards = await tx.card.count({
            where: { albumId: card.album.id }
          });
          
          if (remainingCards === 0) {
            await tx.album.delete({
              where: { id: card.album.id }
            });
          }
        }
      });

      res.json({
        success: true,
        message: `Carta "${card.songName}" eliminada exitosamente`,
        data: {
          deletedCard: {
            id: card.id.toString(),
            songName: card.songName,
            artist: card.artist.name,
            album: card.album?.title || null,
            deck: card.deck.title,
            roundsDeleted: totalRounds
          }
        }
      });
    } catch (error) {
      console.error('Error eliminando carta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AdminController;