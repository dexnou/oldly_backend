const prisma = require('./src/utils/database');

async function clearStuckGames() {
  try {
    console.log('🔍 Buscando juegos activos...');
    
    // Find all active games
    const activeGames = await prisma.game.findMany({
      where: {
        status: 'started'
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            email: true
          }
        },
        deck: {
          select: {
            id: true,
            title: true
          }
        },
        participants: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (activeGames.length === 0) {
      console.log('✅ No hay juegos activos atascados');
      return;
    }

    console.log(`⚠️ Encontrados ${activeGames.length} juego(s) activo(s):`);
    
    activeGames.forEach((game, index) => {
      console.log(`\n${index + 1}. Game ID: ${game.id}`);
      console.log(`   Usuario: ${game.user.firstname} (${game.user.email})`);
      console.log(`   Mazo: ${game.deck.title}`);
      console.log(`   Modo: ${game.mode}`);
      console.log(`   Iniciado: ${game.startedAt}`);
      if (game.participants.length > 0) {
        console.log(`   Participantes: ${game.participants.map(p => p.name).join(', ')}`);
      }
    });

    console.log('\n🤖 Marcando todos los juegos activos como finalizados...');

    // Mark all active games as finished
    const result = await prisma.game.updateMany({
      where: {
        status: 'started'
      },
      data: {
        status: 'finished',
        endedAt: new Date()
      }
    });

    console.log(`✅ ${result.count} juego(s) marcado(s) como finalizado(s)`);
    console.log('🎉 Ahora puedes empezar nuevos juegos sin problemas');

  } catch (error) {
    console.error('❌ Error al limpiar juegos atascados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearStuckGames();