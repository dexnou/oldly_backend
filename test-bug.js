// Test rápido para reproducir el bug del mazo
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMazoBug() {
  try {
    console.log('🔍 Testing mazo bug...');
    
    // Buscar una carta cualquiera
    const card = await prisma.card.findFirst({
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
    
    if (card) {
      console.log('📋 Carta encontrada:');
      console.log('- ID:', card.id);
      console.log('- Canción:', card.songName);
      console.log('- Deck ID:', card.deckId);
      console.log('- Deck Title:', card.deck?.title);
      console.log('- Artista:', card.artist?.name);
    } else {
      console.log('❌ No se encontraron cartas');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMazoBug();