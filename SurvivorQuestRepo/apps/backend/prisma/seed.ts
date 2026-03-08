import {
  EventActorType,
  Prisma,
  PrismaClient,
  RealizationStatus,
  RealizationType,
  StationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { hashPassword } from '../src/shared/lib/password';

const prisma = new PrismaClient();

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const now = Date.now();
const isDryRun = process.env.SEED_DRY_RUN === '1';

const atOffset = (offsetMs: number) => new Date(now + offsetMs);

const users: Prisma.UserCreateManyInput[] = [
  {
    id: '1',
    displayName: 'Admin',
    email: 'admin@survivorquest.app',
    phone: '+48 500 600 700',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    photoUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Admin',
    lastLoginAt: atOffset(-2 * hourMs),
    createdAt: atOffset(-30 * dayMs),
    updatedAt: atOffset(-2 * hourMs),
  },
  {
    id: 'u-2',
    displayName: 'Koordynator',
    email: 'koordynator@survivorquest.app',
    role: UserRole.INSTRUCTOR,
    status: UserStatus.ACTIVE,
    photoUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Koordynator',
    createdAt: atOffset(-20 * dayMs),
    updatedAt: atOffset(-1 * dayMs),
  },
  {
    id: 'u-3',
    displayName: 'Instruktor testowy',
    email: 'test@mail.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    passwordHash: 'hasło123',
    photoUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=test@mail.com',
    createdAt: atOffset(-10 * dayMs),
    updatedAt: atOffset(-5 * dayMs),
  },
];

const chatMessages: Prisma.ChatMessageCreateManyInput[] = [
  {
    id: 'm-1',
    userName: 'Admin',
    content: 'Witajcie! Tu możecie zostawiać wiadomości dla zespołu.',
    createdAt: atOffset(-1 * hourMs),
  },
];

const stations: Prisma.StationCreateManyInput[] = [
  {
    id: 'g-1',
    name: 'Quiz: Podstawy survivalu',
    type: StationType.QUIZ,
    description:
      'Stanowisko quizowe z pytaniami o bezpieczeństwo i podstawy przetrwania.',
    imageUrl:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&q=80&auto=format&fit=crop',
    points: 100,
    timeLimitSeconds: 300,
    latitude: 52.2298,
    longitude: 21.0116,
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 'g-2',
    name: 'Na czas: Ewakuacja z lasu',
    type: StationType.TIME,
    description:
      'Stanowisko na czas z zadaniami zespołowymi wykonywanymi pod presją minut.',
    imageUrl:
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=640&q=80&auto=format&fit=crop',
    points: 180,
    timeLimitSeconds: 420,
    latitude: 52.2309,
    longitude: 21.0152,
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 'g-3',
    name: 'Na punkty: Mapa i kompas',
    type: StationType.POINTS,
    description:
      'Stanowisko punktowane za poprawne odnalezienie punktów kontrolnych i współpracę.',
    imageUrl:
      'https://images.unsplash.com/photo-1502920514313-52581002a659?w=640&q=80&auto=format&fit=crop',
    points: 220,
    timeLimitSeconds: 0,
    latitude: 52.2281,
    longitude: 21.0189,
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 'g-4',
    name: 'Quiz: Alarm nocny',
    type: StationType.QUIZ,
    description:
      'Szybki quiz decyzyjny z reakcjami kryzysowymi i priorytetyzacją działań.',
    imageUrl:
      'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=640&q=80&auto=format&fit=crop',
    points: 130,
    timeLimitSeconds: 240,
    latitude: 52.2268,
    longitude: 21.0131,
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 'g-5',
    name: 'Na punkty: Strefa taktyczna',
    type: StationType.POINTS,
    description:
      'Stanowisko punktowane za mini-zadania logiczne i poprawne decyzje zespołowe.',
    imageUrl:
      'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=640&q=80&auto=format&fit=crop',
    points: 160,
    timeLimitSeconds: 0,
    latitude: 52.2314,
    longitude: 21.0094,
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
];

const scenarios: Prisma.ScenarioCreateManyInput[] = [
  {
    id: 's-1',
    name: 'Scenariusz integracyjny',
    description:
      'Wariant bazowy z trzema stanowiskami terenowymi i jednym quizem końcowym.',
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 's-2',
    name: 'Scenariusz nocny',
    description:
      'Krótki scenariusz dla mniejszej grupy, nacisk na reakcję kryzysową.',
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
  {
    id: 's-3',
    name: 'Scenariusz terenowy',
    description:
      'Dłuższy wariant terenowy z orientacją i zadaniami współpracy.',
    createdAt: atOffset(-14 * dayMs),
    updatedAt: atOffset(-14 * dayMs),
  },
];

const scenarioStations: Prisma.ScenarioStationCreateManyInput[] = [
  { scenarioId: 's-1', stationId: 'g-1', order: 1 },
  { scenarioId: 's-1', stationId: 'g-2', order: 2 },
  { scenarioId: 's-1', stationId: 'g-4', order: 3 },
  { scenarioId: 's-2', stationId: 'g-4', order: 1 },
  { scenarioId: 's-2', stationId: 'g-5', order: 2 },
  { scenarioId: 's-3', stationId: 'g-2', order: 1 },
  { scenarioId: 's-3', stationId: 'g-3', order: 2 },
];

const realizations: Prisma.RealizationCreateManyInput[] = [
  {
    id: 'r-1',
    companyName: 'Northwind Sp. z o.o.',
    contactPerson: 'Anna Kowalczyk',
    contactPhone: '+48 501 200 300',
    contactEmail: 'anna.kowalczyk@northwind.pl',
    instructors: ['Michał Krawiec', 'Patryk Lis'] as Prisma.InputJsonArray,
    type: RealizationType.OUTDOOR_GAMES,
    logoUrl: 'https://placehold.co/160x160/18181b/f4f4f5?text=NW',
    offerPdfUrl: 'https://example.com/mock-offers/northwind-offer.pdf',
    offerPdfName: 'Northwind - oferta.pdf',
    scenarioId: 's-1',
    teamCount: 4,
    requiredDevicesCount: 6,
    peopleCount: 18,
    positionsCount: 4,
    status: RealizationStatus.DONE,
    scheduledAt: atOffset(-3 * dayMs),
    joinCode: 'NORTHWIND',
    locationRequired: true,
    createdAt: atOffset(-6 * dayMs),
    updatedAt: atOffset(-2 * dayMs),
  },
  {
    id: 'r-2',
    companyName: 'Baltic Logistics',
    contactPerson: 'Łukasz Duda',
    contactPhone: '+48 512 111 222',
    contactEmail: 'lukasz.duda@balticlogistics.pl',
    instructors: ['Kamil Brzeziński', 'Paweł Bąk'] as Prisma.InputJsonArray,
    type: RealizationType.HOTEL_GAMES,
    scenarioId: 's-3',
    teamCount: 6,
    requiredDevicesCount: 8,
    peopleCount: 24,
    positionsCount: 6,
    status: RealizationStatus.IN_PROGRESS,
    scheduledAt: atOffset(-2 * hourMs),
    joinCode: 'BALTIC24',
    locationRequired: true,
    createdAt: atOffset(-2 * dayMs),
    updatedAt: atOffset(-5 * hourMs),
  },
  {
    id: 'r-3',
    companyName: 'Horizon Tech',
    contactPerson: 'Karolina Nowak',
    contactPhone: '+48 698 555 440',
    contactEmail: 'karolina.nowak@horizontech.pl',
    instructors: ['Mateusz Sikora'] as Prisma.InputJsonArray,
    type: RealizationType.WORKSHOPS,
    scenarioId: 's-1',
    teamCount: 3,
    requiredDevicesCount: 5,
    peopleCount: 14,
    positionsCount: 3,
    status: RealizationStatus.PLANNED,
    scheduledAt: atOffset(1 * dayMs),
    joinCode: 'HORIZON3',
    locationRequired: true,
    createdAt: atOffset(-1 * dayMs),
    updatedAt: atOffset(-1 * dayMs),
  },
];

const eventLogs: Prisma.EventLogCreateManyInput[] = [
  {
    realizationId: 'r-1',
    actorType: EventActorType.ADMIN,
    actorId: 'admin@survivorquest.app',
    eventType: 'realization.created',
    payload: {
      action: 'created',
      changedBy: 'admin@survivorquest.app',
      description: 'Utworzono realizację.',
    } as Prisma.InputJsonObject,
    createdAt: atOffset(-6 * dayMs),
  },
  {
    realizationId: 'r-1',
    actorType: EventActorType.ADMIN,
    actorId: 'koordynator@survivorquest.app',
    eventType: 'realization.updated',
    payload: {
      action: 'updated',
      changedBy: 'koordynator@survivorquest.app',
      description: 'Zmieniono status realizacji na zrealizowana.',
    } as Prisma.InputJsonObject,
    createdAt: atOffset(-2 * dayMs),
  },
  {
    realizationId: 'r-2',
    actorType: EventActorType.ADMIN,
    actorId: 'admin@survivorquest.app',
    eventType: 'realization.created',
    payload: {
      action: 'created',
      changedBy: 'admin@survivorquest.app',
      description: 'Utworzono realizację.',
    } as Prisma.InputJsonObject,
    createdAt: atOffset(-2 * dayMs),
  },
  {
    realizationId: 'r-3',
    actorType: EventActorType.ADMIN,
    actorId: 'admin@survivorquest.app',
    eventType: 'realization.created',
    payload: {
      action: 'created',
      changedBy: 'admin@survivorquest.app',
      description: 'Utworzono realizację.',
    } as Prisma.InputJsonObject,
    createdAt: atOffset(-1 * dayMs),
  },
];

async function main() {
  if (isDryRun) {
    console.log(
      `Seed dry run: ${users.length} users, ${stations.length} stations, ${scenarios.length} scenarios, ${realizations.length} realizations.`,
    );
    return;
  }

  await prisma.teamTaskProgress.deleteMany();
  await prisma.teamAssignment.deleteMany();
  await prisma.eventLog.deleteMany();
  await prisma.team.deleteMany();
  await prisma.realization.deleteMany();
  await prisma.scenarioStation.deleteMany();
  await prisma.station.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.user.deleteMany();

  const seededUsers = await Promise.all(
    users.map(async (user) => ({
      ...user,
      passwordHash: user.passwordHash
        ? await hashPassword(user.passwordHash)
        : user.passwordHash,
    })),
  );

  await prisma.user.createMany({ data: seededUsers });
  await prisma.station.createMany({ data: stations });
  await prisma.scenario.createMany({ data: scenarios });
  await prisma.scenarioStation.createMany({ data: scenarioStations });
  await prisma.realization.createMany({ data: realizations });
  await prisma.eventLog.createMany({ data: eventLogs });
  await prisma.chatMessage.createMany({ data: chatMessages });

  console.log(
    `Seed completed: ${seededUsers.length} users, ${stations.length} stations, ${scenarios.length} scenarios, ${realizations.length} realizations.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
