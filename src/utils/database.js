const { PrismaClient } = require('@prisma/client');

// Validate DATABASE_URL before creating Prisma client
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined!');
  console.error('Please set DATABASE_URL in your environment variables');
  throw new Error('DATABASE_URL environment variable is required');
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;