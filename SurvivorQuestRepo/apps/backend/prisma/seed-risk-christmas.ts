import { PrismaClient, RiskDifficulty, StationType } from '@prisma/client';

// Kategoria Ryzykantów „Specjalne – Boże Narodzenie”: po 10 zadań na poziom,
// po polsku (bazowo) i po angielsku. Uruchomienie powtórne niczego nie dubluje —
// pula, która ma już zadania, jest pomijana.

const prisma = new PrismaClient();

const CATEGORY_NAME = 'Specjalne – Boże Narodzenie';
const CATEGORY_CODE_SLUG = 'specjalne-boze-narodzenie';
const STATION_COLOR = '#f59e0b';

type Lang = { name?: string; description: string; question: string; answers: string[]; acceptedAnswers?: string[] };

type TaskSeed =
  | { type: 'QUIZ'; pl: Lang; en: Lang } // answers[0] = poprawna, rotowana niżej
  | { type: 'HANGMAN' | 'WORDLE' | 'ANAGRAM'; pl: { secret: string; description: string }; en: { secret: string; description: string } }
  | { type: 'OPEN_QUIZ'; pl: Lang; en: Lang } // answers[0] = poprawna
  | { type: 'MATCHING'; pl: Lang; en: Lang }; // answers = "lewa -> prawa"

const quiz = (plQ: string, plA: string[], enQ: string, enA: string[]): TaskSeed => ({
  type: 'QUIZ',
  pl: { description: '', question: plQ, answers: plA },
  en: { description: '', question: enQ, answers: enA },
});
const word = (
  type: 'HANGMAN' | 'WORDLE' | 'ANAGRAM',
  plSecret: string,
  plHint: string,
  enSecret: string,
  enHint: string,
): TaskSeed => ({ type, pl: { secret: plSecret, description: plHint }, en: { secret: enSecret, description: enHint } });
const open = (plQ: string, plA: string, plAlt: string[], enQ: string, enA: string, enAlt: string[]): TaskSeed => ({
  type: 'OPEN_QUIZ',
  pl: { description: '', question: plQ, answers: [plA], acceptedAnswers: plAlt },
  en: { description: '', question: enQ, answers: [enA], acceptedAnswers: enAlt },
});
const matching = (plQ: string, plPairs: string[], enQ: string, enPairs: string[]): TaskSeed => ({
  type: 'MATCHING',
  pl: { description: '', question: plQ, answers: plPairs },
  en: { description: '', question: enQ, answers: enPairs },
});

const tasks: Record<RiskDifficulty, TaskSeed[]> = {
  EASY: [
    quiz('Jakiego koloru jest zwykle strój Świętego Mikołaja?', ['Czerwony', 'Zielony', 'Niebieski', 'Żółty'],
      "What colour is Santa Claus's suit usually?", ['Red', 'Green', 'Blue', 'Yellow']),
    quiz('Jakie zwierzęta ciągną sanie Świętego Mikołaja?', ['Renifery', 'Konie', 'Psy', 'Łosie'],
      "Which animals pull Santa's sleigh?", ['Reindeer', 'Horses', 'Dogs', 'Moose']),
    quiz('Którego grudnia przypada Wigilia?', ['24 grudnia', '25 grudnia', '6 grudnia', '31 grudnia'],
      'On which day of December is Christmas Eve?', ['24 December', '25 December', '6 December', '31 December']),
    quiz('Na co według polskiej tradycji czeka się, zanim zacznie się wieczerza wigilijna?',
      ['Pierwszą gwiazdkę na niebie', 'Wschód księżyca', 'Pierwszy śnieg', 'Bicie dzwonów o północy'],
      'In Polish tradition, what do people wait for before the Christmas Eve supper begins?',
      ['The first star in the sky', 'The moonrise', 'The first snow', 'Bells ringing at midnight']),
    word('HANGMAN', 'Choinka', 'Drzewko, które ubiera się w bombki i lampki.',
      'Christmas tree', 'A tree decorated with baubles and lights.'),
    word('HANGMAN', 'Bombka', 'Błyszcząca kula wieszana na choince.',
      'Bauble', 'A shiny ball hung on the Christmas tree.'),
    word('WORDLE', 'SANIE', 'Pojazd Świętego Mikołaja ciągnięty przez renifery.',
      'SLEIGH', "Santa's vehicle, pulled by reindeer."),
    word('ANAGRAM', 'PREZENT', 'To, co znajdziesz pod choinką.',
      'PRESENT', 'What you find under the Christmas tree.'),
    open('Ile potraw tradycyjnie powinno stanąć na polskim stole wigilijnym? Podaj liczbę.', '12', ['dwanaście', 'dwanascie'],
      'How many dishes should traditionally be served at a Polish Christmas Eve supper? Give the number.', '12', ['twelve']),
    matching('Dopasuj świąteczne rzeczy do tego, z czym się kojarzą.',
      ['Renifer -> Sanie', 'Choinka -> Bombki', 'Kolęda -> Śpiewanie', 'Skarpeta na kominku -> Prezenty'],
      'Match the Christmas things to what goes with them.',
      ['Reindeer -> Sleigh', 'Christmas tree -> Baubles', 'Carol -> Singing', 'Stocking by the fireplace -> Presents']),
  ],
  MEDIUM: [
    quiz('Jak ma na imię renifer z czerwonym, świecącym nosem?', ['Rudolf', 'Kometa', 'Błyskawica', 'Tancerz'],
      'What is the name of the reindeer with a shiny red nose?', ['Rudolph', 'Comet', 'Blitzen', 'Dancer']),
    quiz('W jakim mieście według Biblii urodził się Jezus?', ['Betlejem', 'Nazaret', 'Jerozolima', 'Jerycho'],
      'According to the Bible, in which town was Jesus born?', ['Bethlehem', 'Nazareth', 'Jerusalem', 'Jericho']),
    quiz('Jak nazywa się msza odprawiana o północy z 24 na 25 grudnia?', ['Pasterka', 'Roraty', 'Rezurekcja', 'Nieszpory'],
      'What is the Polish name of the Mass held at midnight on Christmas Eve?', ['Pasterka', 'Roraty', 'Rezurekcja', 'Nieszpory']),
    quiz('Jaką rybę tradycyjnie podaje się w Polsce na Wigilię?', ['Karpia', 'Łososia', 'Dorsza', 'Tuńczyka'],
      'Which fish is traditionally served on Christmas Eve in Poland?', ['Carp', 'Salmon', 'Cod', 'Tuna']),
    word('HANGMAN', 'Kolęda', 'Tradycyjna pieśń bożonarodzeniowa.',
      'Christmas carol', 'A traditional Christmas song.'),
    word('HANGMAN', 'Opłatek', 'Cienki wypiek, którym dzielimy się przy wigilijnym stole.',
      'Christmas wafer', 'A thin wafer that Poles share at the Christmas Eve table.'),
    word('WORDLE', 'SZOPKA', 'Makieta stajenki z Dzieciątkiem, Maryją i Józefem.',
      'NATIVITY', 'A scene of the stable with baby Jesus, Mary and Joseph.'),
    word('ANAGRAM', 'PIERNIK', 'Korzenne ciasto, z którego piecze się świąteczne ciasteczka i domki.',
      'GINGERBREAD', 'A spiced dough used for Christmas cookies and little houses.'),
    open('Ilu Mędrców (Trzech Króli) według tradycji odwiedziło Dzieciątko? Podaj liczbę.', '3', ['trzech', 'trzy'],
      'According to tradition, how many Wise Men visited baby Jesus? Give the number.', '3', ['three']),
    matching('Dopasuj kraj do postaci, która przynosi tam prezenty.',
      ['Włochy -> Befana', 'Rosja -> Dziadek Mróz', 'USA -> Santa Claus', 'Wielka Brytania -> Father Christmas'],
      'Match each country to the figure who brings presents there.',
      ['Italy -> Befana', 'Russia -> Grandfather Frost', 'USA -> Santa Claus', 'United Kingdom -> Father Christmas']),
  ],
  HARD: [
    quiz('Z którego kraju wywodzi się zwyczaj ubierania choinki?', ['Niemcy', 'Polska', 'Anglia', 'Szwecja'],
      'Which country does the custom of decorating a Christmas tree come from?', ['Germany', 'Poland', 'England', 'Sweden']),
    quiz('Kto napisał „Opowieść wigilijną”?', ['Charles Dickens', 'Hans Christian Andersen', 'Lewis Carroll', 'Mark Twain'],
      'Who wrote "A Christmas Carol"?', ['Charles Dickens', 'Hans Christian Andersen', 'Lewis Carroll', 'Mark Twain']),
    quiz('Jak nazywa się skąpy bohater „Opowieści wigilijnej”?', ['Ebenezer Scrooge', 'Bob Cratchit', 'Jacob Marley', 'Tiny Tim'],
      'What is the name of the miserly main character of "A Christmas Carol"?', ['Ebenezer Scrooge', 'Bob Cratchit', 'Jacob Marley', 'Tiny Tim']),
    quiz('W którym kraju powstała kolęda „Cicha noc”?', ['Austria', 'Niemcy', 'Polska', 'Włochy'],
      'In which country was the carol "Silent Night" written?', ['Austria', 'Germany', 'Poland', 'Italy']),
    word('HANGMAN', 'Gwiazda Betlejemska', 'Gwiazda, która prowadziła Mędrców do Dzieciątka — i czerwona roślina doniczkowa.',
      'Star of Bethlehem', 'The star that guided the Wise Men to baby Jesus.'),
    word('HANGMAN', 'Święty Szczepan', 'Patron drugiego dnia świąt, 26 grudnia.',
      'Boxing Day', 'The British name for 26 December.'),
    word('WORDLE', 'GWIAZDOR', 'Postać, która przynosi prezenty w Wielkopolsce i na Pomorzu.',
      'MISTLETOE', 'A plant under which people kiss at Christmas.'),
    word('ANAGRAM', 'MAKOWIEC', 'Świąteczne ciasto drożdżowe zawijane z masą makową.',
      'EGGNOG', 'A sweet, creamy Christmas drink made with eggs and milk.'),
    open('W którym roku po raz pierwszy zaśpiewano kolędę „Cicha noc”? Podaj rok.', '1818', [],
      'In which year was "Silent Night" sung for the first time? Give the year.', '1818', []),
    matching('Dopasuj świąteczny przysmak do kraju, z którego pochodzi.',
      ['Panettone -> Włochy', 'Stollen -> Niemcy', 'Christmas pudding -> Wielka Brytania', 'Barszcz z uszkami -> Polska'],
      'Match each Christmas treat to its country of origin.',
      ['Panettone -> Italy', 'Stollen -> Germany', 'Christmas pudding -> United Kingdom', 'Beetroot soup with dumplings -> Poland']),
  ],
};

const pointsByDifficulty: Record<RiskDifficulty, number> = { EASY: 50, MEDIUM: 100, HARD: 150 };
const plLabel: Record<RiskDifficulty, string> = { EASY: 'ŁATWE', MEDIUM: 'ŚREDNIE', HARD: 'TRUDNE' };
const enLabel: Record<RiskDifficulty, string> = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' };
const codeLabel: Record<RiskDifficulty, string> = { EASY: 'LATWE', MEDIUM: 'SREDNIE', HARD: 'TRUDNE' };

const timeLimit = (type: TaskSeed['type'], difficulty: RiskDifficulty) => {
  const base = { QUIZ: 30, OPEN_QUIZ: 45, ANAGRAM: 45, HANGMAN: 60, WORDLE: 60, MATCHING: 60 }[type];
  return difficulty === 'HARD' && type !== 'QUIZ' ? base + 15 : base;
};

// Poprawna odpowiedź quizu nie może zawsze stać na pierwszym miejscu.
function rotate(answers: string[], correctIndex: number) {
  const rest = answers.slice(1);
  const out = [...rest];
  out.splice(correctIndex, 0, answers[0]);
  return out;
}

function buildQuiz(task: TaskSeed, lang: 'pl' | 'en', index: number) {
  if (task.type === 'QUIZ') {
    const correct = index % 4;
    return { question: task[lang].question, answers: rotate(task[lang].answers, correct), correctAnswerIndex: correct };
  }
  if (task.type === 'HANGMAN' || task.type === 'WORDLE' || task.type === 'ANAGRAM') {
    const secret = task[lang].secret;
    return { question: secret, answers: [secret, 'A', 'B', 'C'], correctAnswerIndex: 0 };
  }
  if (task.type === 'OPEN_QUIZ') {
    const { question, answers, acceptedAnswers } = task[lang];
    return {
      question,
      answers: [answers[0], 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      ...(acceptedAnswers && acceptedAnswers.length > 0 ? { acceptedAnswers } : {}),
    };
  }
  const matchingTask = task as Extract<TaskSeed, { type: 'MATCHING' }>;
  return { question: matchingTask[lang].question, answers: matchingTask[lang].answers, correctAnswerIndex: 0 };
}

async function main() {
  const category =
    (await prisma.riskCategory.findFirst({ where: { name: CATEGORY_NAME, realizationId: null } })) ??
    (await prisma.riskCategory.create({ data: { name: CATEGORY_NAME, codeSlug: CATEGORY_CODE_SLUG } }));
  console.log(`Kategoria "${category.name}" (${category.id}), codeSlug ${category.codeSlug}.`);

  let created = 0;
  for (const difficulty of [RiskDifficulty.EASY, RiskDifficulty.MEDIUM, RiskDifficulty.HARD]) {
    const existing = await prisma.riskPoolStation.count({ where: { categoryId: category.id, difficulty } });
    if (existing > 0) {
      console.log(`  ${plLabel[difficulty]}: pula ma już ${existing} zadań — pomijam.`);
      continue;
    }

    for (const [index, task] of tasks[difficulty].entries()) {
      const number = String(index + 1).padStart(2, '0');
      const plName = `BOŻE NARODZENIE ${plLabel[difficulty]} ${number}`;
      const enName = `CHRISTMAS ${enLabel[difficulty]} ${number}`;
      const plQuiz = buildQuiz(task, 'pl', index);
      const enQuiz = buildQuiz(task, 'en', index);
      const plDescription = task.pl.description;
      const enDescription = task.en.description;

      const station = await prisma.station.create({
        data: {
          name: plName,
          type: StationType[task.type],
          categories: [`RYZYKANCI-${CATEGORY_CODE_SLUG.toUpperCase()}-${codeLabel[difficulty]}`],
          description: plDescription,
          imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(plName)}`,
          points: pointsByDifficulty[difficulty],
          timeLimitSeconds: timeLimit(task.type, difficulty),
          color: STATION_COLOR,
          quizData: plQuiz,
          translations: {
            polish: { name: plName, description: plDescription, quiz: plQuiz },
            english: { name: enName, description: enDescription, quiz: enQuiz },
          },
        },
      });
      await prisma.riskPoolStation.create({ data: { categoryId: category.id, difficulty, stationId: station.id } });
      created += 1;
    }
    console.log(`  ${plLabel[difficulty]}: dodano ${tasks[difficulty].length} zadań.`);
  }
  console.log(`Gotowe: utworzono ${created} stanowisk.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
