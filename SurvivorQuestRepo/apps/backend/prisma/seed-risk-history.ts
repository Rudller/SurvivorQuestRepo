import { PrismaClient, RiskDifficulty, StationType } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_NAME = 'Historia';
const STATION_TIME_LIMIT_SECONDS = 60;

type QuestionSeed = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
};

const easyQuestions: QuestionSeed[] = [
  {
    question: 'W którym roku wybuchła II wojna światowa?',
    answers: ['1939', '1914', '1945', '1918'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto odkrył Amerykę w 1492 roku?',
    answers: ['Krzysztof Kolumb', 'Vasco da Gama', 'Ferdynand Magellan', 'Marco Polo'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym wieku żył Juliusz Cezar?',
    answers: ['I wiek p.n.e.', 'V wiek n.e.', 'X wiek n.e.', 'III wiek p.n.e.'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywają się słynne starożytne budowle grobowe w Egipcie?',
    answers: ['Piramidy', 'Koloseum', 'Partenon', 'Wielki Mur'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Który kraj jako pierwszy wysłał człowieka w kosmos?',
    answers: ['ZSRR', 'USA', 'Chiny', 'Niemcy'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku zakończyła się II wojna światowa?',
    answers: ['1945', '1939', '1918', '1950'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywał się słynny statek, który zatonął w 1912 roku?',
    answers: ['Titanic', 'Lusitania', 'Bismarck', 'Queen Mary'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto był pierwszym koronowanym królem Polski?',
    answers: ['Bolesław Chrobry', 'Mieszko I', 'Kazimierz Wielki', 'Władysław Jagiełło'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku Polska wstąpiła do Unii Europejskiej?',
    answers: ['2004', '1999', '2009', '1995'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywa się wydarzenie z 1989 roku symbolizujące upadek żelaznej kurtyny w Europie?',
    answers: ['Upadek muru berlińskiego', 'Bitwa pod Grunwaldem', 'Kongres wiedeński', 'Rewolucja francuska'],
    correctAnswerIndex: 0,
  },
];

const mediumQuestions: QuestionSeed[] = [
  {
    question: 'W którym roku miała miejsce bitwa pod Grunwaldem?',
    answers: ['1410', '1385', '1444', '1466'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku uchwalono Konstytucję 3 maja?',
    answers: ['1791', '1795', '1772', '1815'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywał się traktat kończący I wojnę światową?',
    answers: ['Traktat wersalski', 'Traktat w Tordesillas', 'Kongres wiedeński', 'Traktat brzeski'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Który polski król zwyciężył w bitwie pod Wiedniem w 1683 roku?',
    answers: ['Jan III Sobieski', 'Stefan Batory', 'Zygmunt III Waza', 'Władysław IV'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku miał miejsce III (ostatni) rozbiór Polski?',
    answers: ['1795', '1772', '1793', '1807'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto dowodził aliancką inwazją na Normandię (D-Day) w 1944 roku?',
    answers: ['Dwight Eisenhower', 'Bernard Montgomery', 'George Patton', 'Winston Churchill'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywała się dynastia panująca w Polsce najdłużej?',
    answers: ['Piastowie', 'Jagiellonowie', 'Wazowie', 'Habsburgowie'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku wybuchło Powstanie Warszawskie?',
    answers: ['1944', '1943', '1945', '1939'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto napisał "Manifest komunistyczny"?',
    answers: ['Karol Marks i Fryderyk Engels', 'Włodzimierz Lenin', 'Józef Stalin', 'Lew Trocki'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywano okres w historii Polski między 1918 a 1939 rokiem?',
    answers: ['Dwudziestolecie międzywojenne', 'Złota wolność szlachecka', 'Odwilż', 'Potop szwedzki'],
    correctAnswerIndex: 0,
  },
];

const hardQuestions: QuestionSeed[] = [
  {
    question: 'W którym roku podpisano pokój westfalski kończący wojnę trzydziestoletnią?',
    answers: ['1648', '1618', '1658', '1700'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto był ostatnim carem Rosji?',
    answers: ['Mikołaj II', 'Aleksander III', 'Piotr Wielki', 'Mikołaj I'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywała się niemiecka operacja wojskowa - atak na ZSRR w 1941 roku?',
    answers: ['Operacja Barbarossa', 'Operacja Overlord', 'Operacja Market Garden', 'Operacja Husky'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku odbył się Kongres Wiedeński?',
    answers: ['1815', '1789', '1848', '1830'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku miała miejsce bitwa pod Waterloo?',
    answers: ['1815', '1812', '1805', '1821'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Jak nazywał się traktat pokojowy, na mocy którego formalnie potwierdzono niepodległość Polski w 1919 roku?',
    answers: ['Traktat wersalski', 'Traktat ryski', 'Traktat brzeski', 'Traktat w Tylży'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Który sobór ekumeniczny odbył się w latach 1962-1965?',
    answers: ['Sobór watykański II', 'Sobór trydencki', 'Sobór nicejski', 'Sobór watykański I'],
    correctAnswerIndex: 0,
  },
  {
    question: 'Kto był kanclerzem Niemiec, który zjednoczył kraj w 1871 roku?',
    answers: ['Otto von Bismarck', 'Wilhelm II', 'Adolf Hitler', 'Konrad Adenauer'],
    correctAnswerIndex: 0,
  },
  {
    question: 'W którym roku wybuchło powstanie styczniowe?',
    answers: ['1863', '1830', '1848', '1794'],
    correctAnswerIndex: 0,
  },
  {
    question:
      'Jak nazywała się francuska linia umocnień zbudowana przed II wojną światową, która okazała się nieskuteczna wobec niemieckiego ataku?',
    answers: ['Linia Maginota', 'Linia Zygfryda', 'Wał Atlantycki', 'Linia Curzona'],
    correctAnswerIndex: 0,
  },
];

const questionsByDifficulty: Record<RiskDifficulty, QuestionSeed[]> = {
  [RiskDifficulty.EASY]: easyQuestions,
  [RiskDifficulty.MEDIUM]: mediumQuestions,
  [RiskDifficulty.HARD]: hardQuestions,
};

const pointsByDifficulty: Record<RiskDifficulty, number> = {
  [RiskDifficulty.EASY]: 100,
  [RiskDifficulty.MEDIUM]: 150,
  [RiskDifficulty.HARD]: 200,
};

const labelByDifficulty: Record<RiskDifficulty, string> = {
  [RiskDifficulty.EASY]: 'Łatwe',
  [RiskDifficulty.MEDIUM]: 'Średnie',
  [RiskDifficulty.HARD]: 'Trudne',
};

async function main() {
  const category = await prisma.riskCategory.upsert({
    where: { name: CATEGORY_NAME },
    update: {},
    create: { name: CATEGORY_NAME },
  });

  console.log(`Kategoria "${category.name}" (${category.id}) gotowa.`);

  let createdStations = 0;
  let skippedStations = 0;

  for (const difficulty of [RiskDifficulty.EASY, RiskDifficulty.MEDIUM, RiskDifficulty.HARD]) {
    const existingCount = await prisma.riskPoolStation.count({
      where: { categoryId: category.id, difficulty },
    });

    if (existingCount >= 10) {
      console.log(
        `Pula "${labelByDifficulty[difficulty]}" ma już ${existingCount} zadań — pomijam dodawanie.`,
      );
      skippedStations += questionsByDifficulty[difficulty].length;
      continue;
    }

    for (const [index, quiz] of questionsByDifficulty[difficulty].entries()) {
      const station = await prisma.station.create({
        data: {
          name: `Historia (${labelByDifficulty[difficulty]}) #${index + 1}`,
          type: StationType.QUIZ,
          description: `Pytanie quizowe z historii — poziom: ${labelByDifficulty[difficulty]}.`,
          points: pointsByDifficulty[difficulty],
          timeLimitSeconds: STATION_TIME_LIMIT_SECONDS,
          quizData: quiz,
        },
      });

      await prisma.riskPoolStation.create({
        data: {
          categoryId: category.id,
          difficulty,
          stationId: station.id,
        },
      });

      createdStations += 1;
    }

    console.log(`Dodano ${questionsByDifficulty[difficulty].length} zadań do puli "${labelByDifficulty[difficulty]}".`);
  }

  console.log(`Gotowe: utworzono ${createdStations} stanowisk, pominięto ${skippedStations}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
