export default {
  schema: './src/prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
};