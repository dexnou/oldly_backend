// Verificar las cartas del deck de los 80s
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCards() {
  try {
    console.log('🔍 Verificando cartas del deck de los 80s...');
    
    // Buscar el deck de los 80s
    const deck80s = await prisma.deck.findUnique({
      where: { title: 'Oldly Fun 80s' },
      include: {
        cards: {
          include: {
            artist: true,
            album: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });
    
    if (deck80s) {
      console.log(`📦 Deck encontrado: ${deck80s.title}`);
      console.log(`🎵 Cantidad de cartas: ${deck80s.cards.length}`);
      console.log('');
      
      deck80s.cards.forEach((card, index) => {
        console.log(`${index + 1}. "${card.songName}" - ${card.artist.name}`);
        console.log(`   Álbum: ${card.album?.title || 'Sin álbum'} (${card.album?.releaseYear || 'N/A'})`);
        console.log(`   Dificultad: ${card.difficulty}`);
        console.log(`   QR Token: ${card.qrToken}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontró el deck de los 80s');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCards();