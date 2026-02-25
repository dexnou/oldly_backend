const prisma = require('./src/utils/database');

async function getCardTokens() {
  try {
    console.log('🃏 Obteniendo tokens de cartas disponibles...\n');

    const cards = await prisma.card.findMany({
      select: {
        id: true,
        songName: true,
        qrToken: true,
        difficulty: true,
        artist: {
          select: {
            name: true
          }
        },
        deck: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      },
      take: 10 // Primeras 10 cartas
    });

    if (cards.length === 0) {
      console.log('❌ No se encontraron cartas en la base de datos');
      return;
    }

    console.log(`📋 Encontradas ${cards.length} cartas:\n`);

    cards.forEach((card, index) => {
      console.log(`${index + 1}. 🎵 ${card.songName} - ${card.artist.name}`);
      console.log(`   📦 Mazo: ${card.deck.title}`);
      console.log(`   🎯 Dificultad: ${card.difficulty}`);
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 'PORT_NOT_SET'}`;
      console.log(`   🔗 URL: ${baseUrl}/play/${card.qrToken}`);
      console.log(`   🆔 ID: ${card.id} | Token: ${card.qrToken}\n`);
    });

    console.log('🎮 Copia cualquiera de los URLs de arriba para probar!');

  } catch (error) {
    console.error('❌ Error obteniendo cartas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCardTokens();