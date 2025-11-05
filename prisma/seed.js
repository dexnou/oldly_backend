const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Función para generar token QR único de 16 caracteres
function generateQRToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Crear usuario administrador Noah
    console.log('👤 Creating admin user Noah...');
    const hashedPassword = await bcrypt.hash('noah123admin', 12);
    
    const adminUser = await prisma.adminUser.upsert({
      where: { email: 'noah@oldly.com' },
      update: {},
      create: {
        name: 'Noah',
        email: 'noah@oldly.com',
        passwordHash: hashedPassword,
        role: 'super'
      }
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);

    // 2. Crear los 2 mazos principales
    console.log('📦 Creating decks...');
    
    const deck80s = await prisma.deck.upsert({
      where: { title: 'Oldly Fun 80s' },
      update: {},
      create: {
        title: 'Oldly Fun 80s',
        description: 'Los mejores hits de los años 80 que marcaron una época. Un viaje nostálgico a través de la música más icónica de la década.',
        theme: '80s',
        buyLink: 'https://oldly.com/buy/80s-deck',
        coverImage: 'https://oldly.com/images/80s-deck-cover.jpg',
        active: true
      }
    });

    const deckMovies = await prisma.deck.upsert({
      where: { title: 'Oldly Fun Movies' },
      update: {},
      create: {
        title: 'Oldly Fun Movies',
        description: 'Bandas sonoras icónicas del cine que todos recordamos. Las canciones que hicieron historia en la gran pantalla.',
        theme: 'movies',
        buyLink: 'https://oldly.com/buy/movies-deck',
        coverImage: 'https://oldly.com/images/movies-deck-cover.jpg',
        active: true
      }
    });

    console.log(`✅ Deck created: ${deck80s.title}`);
    console.log(`✅ Deck created: ${deckMovies.title}`);

    // 3. Agregar canciones de ejemplo
    console.log('🎵 Adding sample songs...');

    // Canción para el deck de 80s: Soda Stereo
    const artistSoda = await prisma.artist.upsert({
      where: { 
        name_country: {
          name: 'Soda Stereo',
          country: 'Argentina'
        }
      },
      update: {},
      create: {
        name: 'Soda Stereo',
        country: 'Argentina',
        genre: 'Rock Pop'
      }
    });

    const albumSoda = await prisma.album.upsert({
      where: {
        artistId_title_releaseYear: {
          artistId: artistSoda.id,
          title: 'Nada Personal',
          releaseYear: 1985
        }
      },
      update: {},
      create: {
        artistId: artistSoda.id,
        title: 'Nada Personal',
        releaseYear: 1985,
        coverUrl: 'https://oldly.com/images/albums/nada-personal.jpg'
      }
    });

    const qrTokenSoda = generateQRToken();
    const cardSoda = await prisma.card.upsert({
      where: {
        deckId_songName: {
          deckId: deck80s.id,
          songName: 'De música ligera'
        }
      },
      update: {},
      create: {
        deckId: deck80s.id,
        artistId: artistSoda.id,
        albumId: albumSoda.id,
        songName: 'De música ligera',
        qrCode: `https://oldly.com/play/${qrTokenSoda}`,
        qrToken: qrTokenSoda,
        previewUrl: null,
        difficulty: 'medium'
      }
    });

    console.log(`✅ 80s song added: ${cardSoda.songName} by ${artistSoda.name}`);

    // Canción para el deck de Movies: Charly García
    const artistCharly = await prisma.artist.upsert({
      where: { 
        name_country: {
          name: 'Charly García',
          country: 'Argentina'
        }
      },
      update: {},
      create: {
        name: 'Charly García',
        country: 'Argentina',
        genre: 'Rock'
      }
    });

    const albumCharly = await prisma.album.upsert({
      where: {
        artistId_title_releaseYear: {
          artistId: artistCharly.id,
          title: 'Clics Modernos',
          releaseYear: 1983
        }
      },
      update: {},
      create: {
        artistId: artistCharly.id,
        title: 'Clics Modernos',
        releaseYear: 1983,
        coverUrl: 'https://oldly.com/images/albums/clics-modernos.jpg'
      }
    });

    const qrTokenCharly = generateQRToken();
    const cardCharly = await prisma.card.upsert({
      where: {
        deckId_songName: {
          deckId: deckMovies.id,
          songName: 'Demoliendo hoteles'
        }
      },
      update: {},
      create: {
        deckId: deckMovies.id,
        artistId: artistCharly.id,
        albumId: albumCharly.id,
        songName: 'Demoliendo hoteles',
        qrCode: `https://oldly.com/play/${qrTokenCharly}`,
        qrToken: qrTokenCharly,
        previewUrl: null,
        difficulty: 'medium'
      }
    });

    console.log(`✅ Movie song added: ${cardCharly.songName} by ${artistCharly.name}`);

    console.log('🎵 Ready to add more songs! Please provide the data in the following format:');
    console.log('');
    console.log('For 80s deck:');
    console.log('- Artist Name');
    console.log('- Album Name (optional)');
    console.log('- Song Name');
    console.log('- Release Year');
    console.log('');
    console.log('For Movies deck:');
    console.log('- Movie Title');
    console.log('- Artist Name');
    console.log('- Song Name');
    console.log('- Release Year');
    console.log('');
    
    console.log('🎉 Basic seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`- Created admin user: noah@oldly.com (password: noah123admin)`);
    console.log(`- Created deck: ${deck80s.title} (ID: ${deck80s.id})`);
    console.log(`- Created deck: ${deckMovies.title} (ID: ${deckMovies.id})`);
    console.log(`- Added sample songs:`);
    console.log(`  • Soda Stereo - "De música ligera" (80s deck)`);
    console.log(`  • Charly García - "Demoliendo hoteles" (Movies deck)`);
    console.log('');
    console.log('🔐 Admin login credentials:');
    console.log('Email: noah@oldly.com');
    console.log('Password: noah123admin');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Add more artist/song data using the helper functions');
    console.log('2. Test the QR code flow with the generated cards');
    console.log('3. Test the game mechanics (simple vs score mode)');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Función helper para agregar canciones después
async function addSongs80s(songsData) {
  const deck80s = await prisma.deck.findUnique({
    where: { title: 'Oldly Fun 80s' }
  });

  if (!deck80s) {
    throw new Error('80s deck not found');
  }

  console.log('🎵 Adding 80s songs...');

  for (const songData of songsData) {
    // Crear o encontrar artista
    const artist = await prisma.artist.upsert({
      where: { 
        name_country: {
          name: songData.artistName,
          country: songData.country || 'USA'
        }
      },
      update: {},
      create: {
        name: songData.artistName,
        country: songData.country || 'USA',
        genre: songData.genre || '80s'
      }
    });

    // Crear álbum si se proporciona
    let album = null;
    if (songData.albumName) {
      album = await prisma.album.upsert({
        where: {
          artistId_title_releaseYear: {
            artistId: artist.id,
            title: songData.albumName,
            releaseYear: songData.releaseYear
          }
        },
        update: {},
        create: {
          artistId: artist.id,
          title: songData.albumName,
          releaseYear: songData.releaseYear,
          coverUrl: `https://oldly.com/images/albums/${songData.albumName.toLowerCase().replace(/\s+/g, '-')}.jpg`
        }
      });
    }

    // Crear carta con QR único
    const qrToken = generateQRToken();
    const card = await prisma.card.upsert({
      where: {
        deckId_songName: {
          deckId: deck80s.id,
          songName: songData.songName
        }
      },
      update: {},
      create: {
        deckId: deck80s.id,
        artistId: artist.id,
        albumId: album?.id || null,
        songName: songData.songName,
        qrCode: `https://oldly.com/play/${qrToken}`,
        qrToken: qrToken,
        previewUrl: null,  // Usaremos embed
        difficulty: 'medium' // Default por ahora
      }
    });

    console.log(`✅ 80s song added: ${card.songName} by ${artist.name}`);
  }
}

async function addSongsMovies(songsData) {
  const deckMovies = await prisma.deck.findUnique({
    where: { title: 'Oldly Fun Movies' }
  });

  if (!deckMovies) {
    throw new Error('Movies deck not found');
  }

  console.log('🎬 Adding movie songs...');

  for (const songData of songsData) {
    // Crear o encontrar artista
    const artist = await prisma.artist.upsert({
      where: { 
        name_country: {
          name: songData.artistName,
          country: songData.country || 'USA'
        }
      },
      update: {},
      create: {
        name: songData.artistName,
        country: songData.country || 'USA',
        genre: songData.genre || 'Soundtrack'
      }
    });

    // Crear álbum del soundtrack
    const album = await prisma.album.upsert({
      where: {
        artistId_title_releaseYear: {
          artistId: artist.id,
          title: `${songData.movieTitle} (Original Soundtrack)`,
          releaseYear: songData.releaseYear
        }
      },
      update: {},
      create: {
        artistId: artist.id,
        title: `${songData.movieTitle} (Original Soundtrack)`,
        releaseYear: songData.releaseYear,
        coverUrl: `https://oldly.com/images/movies/${songData.movieTitle.toLowerCase().replace(/\s+/g, '-')}-soundtrack.jpg`
      }
    });

    // Crear carta con QR único
    const qrToken = generateQRToken();
    const card = await prisma.card.upsert({
      where: {
        deckId_songName: {
          deckId: deckMovies.id,
          songName: songData.songName
        }
      },
      update: {},
      create: {
        deckId: deckMovies.id,
        artistId: artist.id,
        albumId: album.id,
        songName: songData.songName,
        qrCode: `https://oldly.com/play/${qrToken}`,
        qrToken: qrToken,
        previewUrl: null,  // Usaremos embed
        difficulty: 'medium' // Default por ahora
      }
    });

    console.log(`✅ Movie song added: ${card.songName} by ${artist.name} (${songData.movieTitle})`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { addSongs80s, addSongsMovies, generateQRToken };