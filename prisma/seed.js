const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@oldly.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@oldly.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Oldly',
      role: 'ADMIN',
      isVerified: true
    }
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Create sample deck
  const sampleDeck = await prisma.deck.upsert({
    where: { name: 'Classic Rock Hits' },
    update: {},
    create: {
      name: 'Classic Rock Hits',
      description: 'Las mejores canciones del rock clásico',
      imageUrl: 'https://example.com/classic-rock.jpg',
      isActive: true,
      createdById: adminUser.id
    }
  });

  console.log(`✅ Sample deck created: ${sampleDeck.name}`);

  // Create sample cards
  const sampleCards = [
    {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      question: '¿Quién es el cantante de esta famosa canción?',
      correctAnswer: 'Freddie Mercury',
      audioUrl: 'https://example.com/bohemian-rhapsody.mp3',
      imageUrl: 'https://example.com/queen.jpg',
      deckId: sampleDeck.id
    },
    {
      title: 'Hotel California',
      artist: 'Eagles',
      question: '¿De qué banda es esta icónica canción?',
      correctAnswer: 'Eagles',
      audioUrl: 'https://example.com/hotel-california.mp3',
      imageUrl: 'https://example.com/eagles.jpg',
      deckId: sampleDeck.id
    },
    {
      title: 'Sweet Child O\' Mine',
      artist: 'Guns N\' Roses',
      question: '¿Cómo se llama esta canción de Guns N\' Roses?',
      correctAnswer: 'Sweet Child O\' Mine',
      audioUrl: 'https://example.com/sweet-child.mp3',
      imageUrl: 'https://example.com/gnr.jpg',
      deckId: sampleDeck.id
    }
  ];

  for (const cardData of sampleCards) {
    const card = await prisma.card.upsert({
      where: { 
        title_deckId: {
          title: cardData.title,
          deckId: cardData.deckId
        }
      },
      update: {},
      create: cardData
    });
    console.log(`✅ Card created: ${card.title} by ${card.artist}`);
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });