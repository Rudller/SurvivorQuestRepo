import { PrismaClient } from '@prisma/client';
import { generateRandomCode } from '../src/shared/lib/random-code';
import { isUniqueConstraintError } from '../src/shared/lib/prisma-errors';

const prisma = new PrismaClient();

const QR_ENTRY_CODE_LENGTH = 8;
const MAX_ATTEMPTS_PER_STATION = 5;

async function main() {
  const stations = await prisma.station.findMany({
    where: { qrEntryCode: null },
    select: { id: true },
  });

  console.log(`Found ${stations.length} station(s) without a qrEntryCode.`);

  let updated = 0;

  for (const station of stations) {
    let assigned = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_STATION; attempt += 1) {
      const qrEntryCode = generateRandomCode(QR_ENTRY_CODE_LENGTH);

      try {
        await prisma.station.update({
          where: { id: station.id },
          data: { qrEntryCode },
        });
        assigned = true;
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    if (!assigned) {
      throw new Error(
        `Failed to assign a unique qrEntryCode to station ${station.id} after ${MAX_ATTEMPTS_PER_STATION} attempts.`,
      );
    }

    updated += 1;
  }

  console.log(`Assigned qrEntryCode to ${updated} station(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
