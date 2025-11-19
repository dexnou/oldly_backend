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
    // 🧹 1. LIMPIEZA PREVIA
    console.log('🧹 Cleaning up old data...');
    await prisma.gameParticipantRound.deleteMany({});
    await prisma.gameParticipant.deleteMany({});
    await prisma.gameRound.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.ranking.deleteMany({});
    await prisma.userDeck.deleteMany({});
    await prisma.card.deleteMany({});
    await prisma.deck.deleteMany({});
    console.log('✨ Database cleaned.');

    // 👤 2. Crear usuario administrador
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

    // 📦 3. Crear los mazos (AHORA SIN ERROR DE QR)
    console.log('📦 Creating decks...');
    
    const deck80s = await prisma.deck.create({
      data: {
        title: 'Oldly Fun 80s',
        description: 'Los mejores hits de los años 80 que marcaron una época en Argentina.',
        theme: '80s',
        buyLink: 'https://oldly.com/buy/80s-deck',
        coverImage: 'https://oldly.com/images/80s-deck-cover.jpg',
        // Eliminamos qrToken y qrCode aquí porque el modelo Deck ya no los tiene
        active: true
      }
    });

    const deckMovies = await prisma.deck.create({
      data: {
        title: 'Oldly Fun Movies',
        description: 'Bandas sonoras icónicas del cine.',
        theme: 'movies',
        buyLink: 'https://oldly.com/buy/movies-deck',
        coverImage: 'https://oldly.com/images/movies-deck-cover.jpg',
        // Eliminamos qrToken y qrCode aquí también
        active: true
      }
    });

    console.log(`✅ Decks created: ${deck80s.title}, ${deckMovies.title}`);

    // 🎵 4. LISTA DE CANCIONES
    const songsData = [
      { artist: 'Soda Stereo', song: 'De música ligera', year: 1990, genre: 'Rock Pop', difficulty: 'medium' },
      { artist: 'Charly García', song: 'Demoliendo hoteles', year: 1984, genre: 'Rock Urbano', difficulty: 'medium' },
      { artist: 'Los Abuelos de la Nada', song: 'Mil horas', year: 1983, genre: 'Pop Rock', difficulty: 'easy' },
      { artist: 'Fito Páez', song: 'Alarma entre los ángeles', year: 1985, genre: 'Pop Rock', difficulty: 'hard' },
      { artist: 'Sumo', song: 'Divididos por la felicidad', year: 1985, genre: 'Rock Alternativo', difficulty: 'hard' },
      { artist: 'Patricio Rey y sus Redonditos de Ricota', song: 'Ji ji ji', year: 1986, genre: 'Rock Nacional', difficulty: 'medium' },
      { artist: 'Enanitos Verdes', song: 'La muralla verde', year: 1986, genre: 'Pop Rock', difficulty: 'easy' },
      { artist: 'Charly García', song: 'Fanky', year: 1989, genre: 'Funk Rock', difficulty: 'medium' },
      { artist: 'Soda Stereo', song: 'Persiana americana', year: 1986, genre: 'Rock Pop', difficulty: 'medium' },
      { artist: 'Virus', song: 'Una luna de miel en la mano', year: 1985, genre: 'Pop Electrónico', difficulty: 'medium' },
      { artist: 'Los Abuelos de la Nada', song: 'Costumbres argentinas', year: 1985, genre: 'Rock Ligero', difficulty: 'easy' },
      { artist: 'Fito Páez', song: 'Mariposa Tecknicolor', year: 1994, genre: 'Pop Rock', difficulty: 'easy' }
    ];

    // 🔄 5. Procesar y crear cartas
    console.log('🎵 Adding songs to database...');

    for (const data of songsData) {
      // a) Crear/Encontrar Artista
      const artist = await prisma.artist.upsert({
        where: { 
          name_country: {
            name: data.artist,
            country: 'Argentina'
          }
        },
        update: {},
        create: {
          name: data.artist,
          country: 'Argentina',
          genre: data.genre
        }
      });

      // b) Crear/Encontrar Álbum "Los 80's"
      const album = await prisma.album.upsert({
        where: {
          artistId_title_releaseYear: {
            artistId: artist.id,
            title: "Los 80's",
            releaseYear: data.year
          }
        },
        update: {},
        create: {
          artistId: artist.id,
          title: "Los 80's",
          releaseYear: data.year,
          coverUrl: 'https://oldly.com/images/albums/generic-80s.jpg'
        }
      });

      // c) Crear Carta (ESTA SÍ LLEVA QR)
      const qrToken = generateQRToken();
      await prisma.card.create({
        data: {
          deckId: deck80s.id,
          artistId: artist.id,
          albumId: album.id,
          songName: data.song,
          qrCode: `https://oldly.com/play/${qrToken}`,
          qrToken: qrToken,
          previewUrl: null,
          difficulty: data.difficulty,
          spotifyUrl: `http://googleusercontent.com/spotify.com/7{encodeURIComponent(data.artist + ' ' + data.song)}`
        }
      });

      console.log(`✨ Created: ${data.song} - ${data.artist}`);
    }

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Total songs processed: ${songsData.length}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });