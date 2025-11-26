const prisma = require('../utils/database');
const AuthService = require('../services/authService');

class AdminController {
// POST /api/admin/decks (Create or Update Deck)
  static async createOrUpdateDeck(req, res) {
    try {
      // CORRECCIÓN: Buscar el ID en el body O en los parámetros de la URL
      const id = req.body.id || req.params.id;

      const { 
        title, 
        description, 
        theme, 
        buyLink, 
        coverImage, 
        active = true,
        labelSong,
        labelArtist,
        labelAlbum
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
            active,
            // Actualizar labels si se envían, sino mantener default o anterior
            labelSong: labelSong || "Canción",
            labelArtist: labelArtist || "Artista",
            labelAlbum: labelAlbum || "Álbum"
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
            active,
            // Guardar labels por defecto si no se envían
            labelSong: labelSong || "Canción",
            labelArtist: labelArtist || "Artista",
            labelAlbum: labelAlbum || "Álbum"
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
  // GET /api/admin/decks
  static async getDecks(req, res) {
    try {
      const decks = await prisma.deck.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { cards: true } }
        }
      });
      
      res.json({ success: true, data: { decks } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Error al obtener mazos' });
    }
  }

// POST /api/admin/cards - Crear carta
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

      // 1. Buscar o crear artista
      // Usamos upsert para garantizar consistencia si hay concurrencia
      let artist = await prisma.artist.findFirst({
        where: {
          name: artistName,
          country: artistCountry || null // Manejar undefined como null
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
      } else if (artistGenre && artist.genre !== artistGenre) {
        // Opcional: Actualizar género si viene uno nuevo
        await prisma.artist.update({
          where: { id: artist.id },
          data: { genre: artistGenre }
        });
      }

      // 2. Buscar o crear álbum (si se provee título)
      let album = null;
      if (albumTitle) {
        // IMPORTANTE: Asegurar que el año sea un entero o null
        const releaseYearInt = albumReleaseYear ? parseInt(albumReleaseYear) : null;

        album = await prisma.album.findFirst({
          where: {
            artistId: artist.id,
            title: albumTitle,
            releaseYear: releaseYearInt
          }
        });

        if (!album) {
          album = await prisma.album.create({
            data: {
              artistId: artist.id,
              title: albumTitle,
              releaseYear: releaseYearInt,
              coverUrl: albumCoverUrl
            }
          });
        } else if (albumCoverUrl && album.coverUrl !== albumCoverUrl) {
          // Actualizar portada si es diferente
          album = await prisma.album.update({
            where: { id: album.id },
            data: { coverUrl: albumCoverUrl }
          });
        }
      }

      // 3. Generar token QR único
      let qrToken;
      let tokenExists = true;
      
      while (tokenExists) {
        qrToken = AuthService.generateQrToken();
        const existingCard = await prisma.card.findUnique({
          where: { qrToken }
        });
        tokenExists = !!existingCard;
      }

      // 4. Crear data QR
      const qrRedirectUrl = `${process.env.FRONTEND_URL}/qr/${qrToken}`;
      const qrCode = JSON.stringify({
        token: qrToken,
        redirectUrl: qrRedirectUrl,
        cardId: null, 
        gameUrl: null 
      });

      // 5. Crear la carta
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
          artist: true,
          album: true,
          deck: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Carta creada exitosamente',
        data: {
          card: {
            ...card,
            id: card.id.toString(),
            artist: { ...card.artist, id: card.artist.id.toString() },
            album: card.album ? { ...card.album, id: card.album.id.toString() } : null,
            deck: { ...card.deck, id: card.deck.id.toString() }
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
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

// PUT /api/admin/cards/:id - Actualizar carta (CORREGIDO)
  static async updateCard(req, res) {
    try {
      const { id } = req.params;
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
        difficulty 
      } = req.body;

      // 1. Actualizar o crear artista
      // Usamos upsert buscando por nombre y país (o solo nombre si país es null)
      // Nota: Prisma requiere un índice único en [name, country] para esto, que ya tienes en el schema.
      const artist = await prisma.artist.upsert({
        where: { 
          name_country: { 
            name: artistName, 
            country: artistCountry || null // Asegura que undefined sea null para coincidir con la DB
          } 
        },
        update: { genre: artistGenre },
        create: { 
          name: artistName, 
          country: artistCountry, 
          genre: artistGenre 
        }
      });

      // 2. Actualizar o crear álbum
      let album = null;
      if (albumTitle) {
        // [CORRECCIÓN CRÍTICA]: Parsear el año a Int o null. Prisma fallaba aquí si era string.
        const releaseYearInt = albumReleaseYear ? parseInt(albumReleaseYear) : null;

        // Intentamos buscar primero para evitar error de Unique Constraint si el upsert falla por IDs distintos
        album = await prisma.album.findFirst({
            where: {
                artistId: artist.id,
                title: albumTitle,
                releaseYear: releaseYearInt
            }
        });

        if (album) {
            // Si existe, actualizamos URL
            album = await prisma.album.update({
                where: { id: album.id },
                data: { coverUrl: albumCoverUrl }
            });
        } else {
            // Si no, creamos
            album = await prisma.album.create({
                data: {
                    artistId: artist.id,
                    title: albumTitle,
                    releaseYear: releaseYearInt,
                    coverUrl: albumCoverUrl
                }
            });
        }
      }

      // 3. Actualizar la carta
      const card = await prisma.card.update({
        where: { id: parseInt(id) },
        data: {
          deckId: parseInt(deckId),
          artistId: artist.id,
          albumId: album?.id, // Puede ser null si se borró el álbum
          songName,
          spotifyUrl,
          previewUrl,
          difficulty
        },
        include: {
          artist: true,
          album: true,
          deck: true
        }
      });

      res.json({ 
        success: true, 
        message: 'Carta actualizada exitosamente', 
        data: { 
            card: {
                ...card,
                id: card.id.toString(), // Convertir BigInts a string
                artist: { ...card.artist, id: card.artist.id.toString() },
                album: card.album ? { ...card.album, id: card.album.id.toString() } : null,
                deck: { ...card.deck, id: card.deck.id.toString() }
            }
        } 
      });
    } catch (error) {
      console.error('Error actualizando carta:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar carta' });
    }
  }

// DELETE /api/admin/cards/:id - Eliminar carta
  static async deleteCard(req, res) {
    try {
      const { id } = req.params;
      const { force } = req.query;

      const cardId = parseInt(id);

      // Si NO se fuerza la eliminación, verificamos si ya se jugó
      if (force !== 'true') {
        const playedCount = await prisma.gameRound.count({ where: { cardId } });
        const participantPlayedCount = await prisma.gameParticipantRound.count({ where: { cardId } });
        
        if (playedCount > 0 || participantPlayedCount > 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Esta carta ya ha sido jugada y no se puede eliminar directamente por seguridad.',
            data: { 
                suggestion: 'Usa la opción de forzar eliminación si estás seguro.', 
                timesPlayed: playedCount + participantPlayedCount 
            }
          });
        }
      }

      // Si force es 'true' o no se ha jugado, procedemos
      // Primero limpiamos las referencias en tablas de juego (CASCADE manual si es necesario)
      if (force === 'true') {
        await prisma.gameParticipantRound.deleteMany({ where: { cardId } });
        await prisma.gameRound.deleteMany({ where: { cardId } });
      }

      await prisma.card.delete({ where: { id: cardId } });
      
      res.json({ success: true, message: 'Carta eliminada exitosamente' });
    } catch (error) {
      console.error('Error eliminando carta:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar carta' });
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

        // 7. Eliminar cartas del deck
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
}

module.exports = AdminController;