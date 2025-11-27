const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Función para generar token QR único
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
    // 🧹 1. LIMPIEZA (Para empezar de cero con los datos BIEN cargados)
    console.log('🧹 Cleaning up old data...');
    await prisma.gameParticipantRound.deleteMany({});
    await prisma.gameParticipant.deleteMany({});
    await prisma.gameRound.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.ranking.deleteMany({});
    await prisma.userDeck.deleteMany({});
    await prisma.card.deleteMany({});
    await prisma.album.deleteMany({}); // Borramos álbumes para limpiar los "Los 80's" genéricos
    await prisma.deck.deleteMany({});
    console.log('✨ Database cleaned.');

    // 👤 2. Admin User
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

    // 📦 3. Decks
    console.log('📦 Creating decks...');
    
    const deck80s = await prisma.deck.create({
      data: {
        title: 'Oldy Funs 80s',
        description: 'Los mejores hits de los años 80 que marcaron una época en Argentina.',
        theme: '80s',
        buyLink: 'https://oldly.com/buy/80s-deck',
        coverImage: 'https://oldly.com/images/80s-deck-cover.jpg',
        // Labels personalizados para este mazo
        labelSong: "Canción",
        labelArtist: "Artista",
        labelAlbum: "Álbum Original", 
        active: true
      }
    });

    const deckMovies = await prisma.deck.create({
      data: {
        title: 'Oldy Fans Fun Movies',
        description: 'Bandas sonoras icónicas del cine.',
        theme: 'movies',
        buyLink: 'https://oldly.com/buy/movies-deck',
        coverImage: 'https://oldly.com/images/movies-deck-cover.jpg',
        // Labels personalizados para cine
        labelSong: "Tema Musical",
        labelArtist: "Compositor/Artista",
        labelAlbum: "Película",
        active: true
      }
    });

    console.log(`✅ Decks created.`);

    // 🎵 4. DATOS REALES DE LAS CANCIONES Y ÁLBUMES
    const songsData = [
      { 
        artist: 'Soda Stereo', 
        song: 'De música ligera', 
        album: 'Canción Animal', 
        year: 1990, 
        genre: 'Rock Pop', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Charly García', 
        song: 'Demoliendo hoteles', 
        album: 'Piano Bar', 
        year: 1984, 
        genre: 'Rock Urbano', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Los Abuelos de la Nada', 
        song: 'Mil horas', 
        album: 'Vasos y besos', 
        year: 1983, 
        genre: 'Pop Rock', 
        difficulty: 'easy' 
      },
      { 
        artist: 'Fito Páez', 
        song: 'Alarma entre los ángeles', 
        album: 'Giros', 
        year: 1985, 
        genre: 'Pop Rock', 
        difficulty: 'hard' 
      },
      { 
        artist: 'Sumo', 
        song: 'Divididos por la felicidad', 
        album: 'Divididos por la felicidad', 
        year: 1985, 
        genre: 'Rock Alternativo', 
        difficulty: 'hard' 
      },
      { 
        artist: 'Patricio Rey y sus Redonditos de Ricota', 
        song: 'Ji ji ji', 
        album: 'Oktubre', 
        year: 1986, 
        genre: 'Rock Nacional', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Enanitos Verdes', 
        song: 'La muralla verde', 
        album: 'Contrarreloj', 
        year: 1986, 
        genre: 'Pop Rock', 
        difficulty: 'easy' 
      },
      { 
        artist: 'Charly García', 
        song: 'Fanky', 
        album: 'Cómo conseguir chicas', 
        year: 1989, 
        genre: 'Funk Rock', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Soda Stereo', 
        song: 'Persiana americana', 
        album: 'Signos', 
        year: 1986, 
        genre: 'Rock Pop', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Virus', 
        song: 'Una luna de miel en la mano', 
        album: 'Locura', 
        year: 1985, 
        genre: 'Pop Electrónico', 
        difficulty: 'medium' 
      },
      { 
        artist: 'Los Abuelos de la Nada', 
        song: 'Costumbres argentinas', 
        album: 'Los Abuelos en el Ópera', 
        year: 1985, 
        genre: 'Rock Ligero', 
        difficulty: 'easy' 
      },
      { 
        artist: 'Fito Páez', 
        song: 'Mariposa Tecknicolor', 
        album: 'Circo Beat', 
        year: 1994, 
        genre: 'Pop Rock', 
        difficulty: 'easy' 
      }
    ];

    // 🔄 5. Procesar y crear
    console.log('🎵 Adding songs with correct albums...');

    for (const data of songsData) {
      // a) Artista
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

      // b) Álbum (CORRECTO)
      const album = await prisma.album.upsert({
        where: {
          artistId_title_releaseYear: {
            artistId: artist.id,
            title: data.album,
            releaseYear: data.year
          }
        },
        update: {},
        create: {
          artistId: artist.id,
          title: data.album,
          releaseYear: data.year,
          coverUrl: `https://oldly.com/images/albums/${data.album.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`
        }
      });

      // c) Carta
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
          // URL de Spotify simulada pero con estructura correcta
          spotifyUrl: `https://open.spotify.com/{encodeURIComponent(data.artist + ' ' + data.song)}`
        }
      });

      console.log(`✨ Created: ${data.song} - Album: ${data.album}`);
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