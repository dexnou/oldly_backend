const prisma = require('../utils/database');

class RankingController {
  // GET /api/rankings
  static async getRankings(req, res) {
    try {
      const { deckId, limit = 100, offset = 0 } = req.query;

      let rankings;
      
      if (deckId) {
        // Rankings for specific deck
        rankings = await prisma.ranking.findMany({
          where: { deckId: BigInt(deckId) },
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                avatarUrl: true
              }
            },
            deck: {
              select: {
                id: true,
                title: true,
                theme: true
              }
            }
          },
          orderBy: [
            { pointsTotal: 'desc' },
            { lastPlayedAt: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        });
      } else {
        // Global rankings (aggregated across all decks)
        const globalRankings = await prisma.$queryRaw`
          SELECT 
            u.id,
            u.firstname,
            u.lastname,
            u.avatar_url,
            SUM(r.points_total) as total_points,
            SUM(r.games_played) as total_games,
            MAX(r.last_played_at) as last_played_at,
            COUNT(DISTINCT r.deck_id) as decks_played
          FROM rankings r
          JOIN users u ON u.id = r.user_id
          WHERE u.is_active = true
          GROUP BY u.id, u.firstname, u.lastname, u.avatar_url
          ORDER BY total_points DESC, last_played_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `;

        rankings = globalRankings.map((ranking, index) => ({
          rank: parseInt(offset) + index + 1,
          user: {
            id: ranking.id.toString(),
            firstname: ranking.firstname,
            lastname: ranking.lastname,
            avatarUrl: ranking.avatar_url
          },
          pointsTotal: Number(ranking.total_points),
          gamesPlayed: Number(ranking.total_games),
          lastPlayedAt: ranking.last_played_at,
          decksPlayed: Number(ranking.decks_played)
        }));
      }

      if (deckId && rankings.length > 0) {
        // Format deck-specific rankings
        const formattedRankings = rankings.map((ranking, index) => ({
          rank: parseInt(offset) + index + 1,
          user: {
            ...ranking.user,
            id: ranking.user.id.toString()
          },
          pointsTotal: ranking.pointsTotal,
          gamesPlayed: ranking.gamesPlayed,
          level: ranking.level,
          lastPlayedAt: ranking.lastPlayedAt,
          deck: {
            ...ranking.deck,
            id: ranking.deck.id.toString()
          }
        }));

        res.json({
          success: true,
          data: {
            rankings: formattedRankings,
            deckId,
            pagination: {
              limit: parseInt(limit),
              offset: parseInt(offset)
            }
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            rankings,
            type: 'global',
            pagination: {
              limit: parseInt(limit),
              offset: parseInt(offset)
            }
          }
        });
      }
    } catch (error) {
      console.error('Error obteniendo rankings:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/rankings/user/:userId (bonus endpoint)
  static async getUserRankings(req, res) {
    try {
      const { userId } = req.params;
      const authenticatedUserId = req.user?.id;

      // Users can only see their own rankings unless admin
      if (authenticatedUserId && BigInt(userId) !== BigInt(authenticatedUserId)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver estos rankings'
        });
      }

      const userRankings = await prisma.ranking.findMany({
        where: { userId: BigInt(userId) },
        include: {
          deck: {
            select: {
              id: true,
              title: true,
              theme: true,
              coverImage: true
            }
          }
        },
        orderBy: { pointsTotal: 'desc' }
      });

      // Get user's global rank
      const globalRankQuery = await prisma.$queryRaw`
        SELECT 
          user_rank.rank_position
        FROM (
          SELECT 
            u.id,
            SUM(r.points_total) as total_points,
            ROW_NUMBER() OVER (ORDER BY SUM(r.points_total) DESC, MAX(r.last_played_at) DESC) as rank_position
          FROM rankings r
          JOIN users u ON u.id = r.user_id
          WHERE u.is_active = true
          GROUP BY u.id
        ) user_rank
        WHERE user_rank.id = ${BigInt(userId)}
      `;

      const globalRank = globalRankQuery.length > 0 ? Number(globalRankQuery[0].rank_position) : null;

      const formattedRankings = userRankings.map(ranking => ({
        id: ranking.id.toString(),
        pointsTotal: ranking.pointsTotal,
        gamesPlayed: ranking.gamesPlayed,
        level: ranking.level,
        lastPlayedAt: ranking.lastPlayedAt,
        deck: {
          ...ranking.deck,
          id: ranking.deck.id.toString()
        }
      }));

      const totalPoints = userRankings.reduce((sum, ranking) => sum + ranking.pointsTotal, 0);
      const totalGames = userRankings.reduce((sum, ranking) => sum + ranking.gamesPlayed, 0);

      res.json({
        success: true,
        data: {
          rankings: formattedRankings,
          summary: {
            totalPoints,
            totalGames,
            decksPlayed: userRankings.length,
            globalRank
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo rankings del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /api/rankings/deck/:deckId/top (bonus endpoint for top players in a deck)
  static async getDeckTopPlayers(req, res) {
    try {
      const { deckId } = req.params;
      const { limit = 10 } = req.query;

      const topPlayers = await prisma.ranking.findMany({
        where: { deckId: BigInt(deckId) },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              avatarUrl: true
            }
          }
        },
        orderBy: [
          { pointsTotal: 'desc' },
          { lastPlayedAt: 'desc' }
        ],
        take: parseInt(limit)
      });

      const deck = await prisma.deck.findUnique({
        where: { id: BigInt(deckId) },
        select: {
          id: true,
          title: true,
          theme: true
        }
      });

      if (!deck) {
        return res.status(404).json({
          success: false,
          message: 'Mazo no encontrado'
        });
      }

      const formattedTopPlayers = topPlayers.map((player, index) => ({
        rank: index + 1,
        user: {
          ...player.user,
          id: player.user.id.toString()
        },
        pointsTotal: player.pointsTotal,
        gamesPlayed: player.gamesPlayed,
        level: player.level,
        lastPlayedAt: player.lastPlayedAt
      }));

      res.json({
        success: true,
        data: {
          deck: {
            ...deck,
            id: deck.id.toString()
          },
          topPlayers: formattedTopPlayers
        }
      });
    } catch (error) {
      console.error('Error obteniendo top players:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = RankingController;