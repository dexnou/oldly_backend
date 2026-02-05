const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestCards() {
    try {
        console.log('🔍 Checking latest 5 cards in the database...');
        console.log(`📡 Connecting to database (masked): ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

        const cards = await prisma.card.findMany({
            take: 5,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                artist: true,
                deck: true
            }
        });

        if (cards.length === 0) {
            console.log('⚠️ No cards found in the database.');
        } else {
            console.log(`✅ Found ${cards.length} cards. Here are the latest ones:`);
            cards.forEach(card => {
                console.log(`--------------------------------------------------`);
                console.log(`🆔 ID: ${card.id}`);
                console.log(`🎵 Song: ${card.songName}`);
                console.log(`👤 Artist: ${card.artist.name}`);
                console.log(`📦 Deck: ${card.deck.title}`);
                console.log(`📅 Created At: ${card.createdAt.toLocaleString()}`);
            });
            console.log(`--------------------------------------------------`);
        }

    } catch (error) {
        console.error('❌ Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestCards();
