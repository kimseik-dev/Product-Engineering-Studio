import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: {
        not: null,
      },
    },
  });

  console.log(`Found ${tasks.length} tasks with assigneeId.`);

  for (const task of tasks) {
    if (task.assigneeId) {
      // Connect to the new assignees relation
      await prisma.task.update({
        where: { id: task.id },
        data: {
          assignees: {
            connect: { id: task.assigneeId },
          },
        },
      });
      console.log(`Migrated task ${task.id} (assigneeId: ${task.assigneeId})`);
    }
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
