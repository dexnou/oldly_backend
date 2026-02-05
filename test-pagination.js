const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPagination() {
    try {
        console.log('🔍 Testing pagination...');

        // Create query to mimic controller logic
        const limit = 5;
        const page = 2;
        const skip = (page - 1) * limit;

        console.log(`Getting page ${page} with limit ${limit}...`);

        const [totalCards, cards] = await Promise.all([
            prisma.card.count(),
            prisma.card.findMany({
                skip: skip,
                take: limit,
                select: { id: true, songName: true }, // Select minimal fields
                orderBy: { createdAt: 'desc' }
            })
        ]);

        console.log(`✅ Total Cards: ${totalCards}`);
        console.log(`✅ Cards on page ${page}: ${cards.length}`);

        if (cards.length > 0) {
            console.log('--- Page Data ---');
            cards.forEach(c => console.log(`${c.id}: ${c.songName}`));
        }

        const totalPages = Math.ceil(totalCards / limit);
        console.log(`✅ Total Pages (calculated): ${totalPages}`);

    } catch (error) {
        console.error('❌ Error testing pagination:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPagination();
