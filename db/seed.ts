import { prisma } from './prisma';
import sampleData from './sample-data';

async function main() {
  try {
    await prisma.product.deleteMany();
    await prisma.product.createMany({ data: sampleData.products });
    console.log('Database seeded successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main();
