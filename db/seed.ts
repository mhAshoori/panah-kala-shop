import { prisma } from './prisma';
import sampleData from './sample-data';

async function main() {
  try {
    // Delete in FK-safe order
    await prisma.verificationToken.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();

    await prisma.product.createMany({ data: sampleData.products });
    await prisma.user.createMany({ data: sampleData.users });

    console.log('Database seeded successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main();
