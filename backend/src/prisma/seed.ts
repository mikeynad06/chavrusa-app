import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Clear from bottom up to avoid foreign key relation errors
  await prisma.match.deleteMany();
  await prisma.request.deleteMany();
  await prisma.userTopic.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt); // Same password for everyone

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@test.com',
      name: 'Sarah',
      password: hashedPassword,
      location: 'JERUSALEM',
      timezone: 'ISRAEL',
    },
  });

  const david = await prisma.user.create({
    data: {
      email: 'david@test.com',
      name: 'David',
      password: hashedPassword,
      location: 'TEANECK',
      timezone: 'EST',
    },
  });

  const eli = await prisma.user.create({
    data: {
      email: 'eli@test.com',
      name: 'Eli',
      password: hashedPassword,
      location: 'TEL_AVIV',
      timezone: 'ISRAEL',
    },
  });

  console.log('Seeding requests...');
  const request1 = await prisma.request.create({
    data: {
      requesterId: sarah.id,
      topic: 'GEMARA',
      seferOrTopic: 'Makkot',
      style: 'IYUN',
      level: 'ADVANCED',
      modality: 'ONLINE',
      language: 'ENGLISH',
      description: 'Looking for a chavrusa to learn Makkot deeply on weeknights.',
      timeSlot: 'NIGHT',
      timezone: 'ISRAEL',
      status: 'OPEN',
    },
  });

  const request2 = await prisma.request.create({
    data: {
      requesterId: sarah.id,
      topic: 'HALACHA',
      seferOrTopic: 'Hilchot Shabbat',
      style: 'BEKIYUT',
      level: 'INTERMEDIATE',
      modality: 'EITHER',
      language: 'ENGLISH',
      description: 'Reviewing Hilchot Shabbat in the mornings.',
      timeSlot: 'MORNING',
      timezone: 'ISRAEL',
      status: 'MATCHED', // This is MATCHED because David claims it below
    },
  });

  console.log('Seeding match...');
  await prisma.match.create({
    data: {
      requestId: request2.id,
      matchedUserId: david.id, // David steps up and claims Sarah's request
    },
  });

  console.log('\n✅ Database seeded successfully! 🌱');
  console.log('====================================================');
  console.log('Test Accounts (Password for all: password123)');
  console.log(`- Sarah (Requester): sarah@test.com | ID: ${sarah.id}`);
  console.log(`- David (Claimer):   david@test.com | ID: ${david.id}`);
  console.log(`- Eli (Extra User):  eli@test.com   | ID: ${eli.id}`);
  console.log('----------------------------------------------------');
  console.log(`OPEN Request ID (Ready to claim): ${request1.id}`);
  console.log(`MATCHED Request ID (Already claimed): ${request2.id}`);
  console.log('====================================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });