import { PrismaClient, RiskDifficulty, StationType } from '@prisma/client';

const prisma = new PrismaClient();

const STATION_TIME_LIMIT_SECONDS = 60;

type QuestionSeed = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
};

type CategorySeed = {
  name: string;
  easy: QuestionSeed[];
  medium: QuestionSeed[];
  hard: QuestionSeed[];
};

const categories: CategorySeed[] = [
  {
    name: 'Geografia',
    easy: [
      { question: 'Jaka jest stolica Polski?', answers: ['Warszawa', 'Kraków', 'Wrocław', 'Gdańsk'], correctAnswerIndex: 0 },
      { question: 'Jaki jest największy ocean na Ziemi?', answers: ['Ocean Spokojny', 'Ocean Atlantycki', 'Ocean Indyjski', 'Ocean Arktyczny'], correctAnswerIndex: 0 },
      { question: 'Na którym kontynencie leży Egipt?', answers: ['Afryka', 'Azja', 'Europa', 'Ameryka Południowa'], correctAnswerIndex: 0 },
      { question: 'Jaka jest najwyższa góra świata?', answers: ['Mount Everest', 'K2', 'Kilimandżaro', 'Mont Blanc'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Francji?', answers: ['Paryż', 'Lyon', 'Marsylia', 'Nicea'], correctAnswerIndex: 0 },
      { question: 'Która rzeka jest najdłuższa na świecie?', answers: ['Nil', 'Amazonka', 'Jangcy', 'Missisipi'], correctAnswerIndex: 0 },
      { question: 'Jaki kraj ma kształt buta?', answers: ['Włochy', 'Hiszpania', 'Grecja', 'Portugalia'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Wielkiej Brytanii?', answers: ['Londyn', 'Manchester', 'Liverpool', 'Edynburg'], correctAnswerIndex: 0 },
      { question: 'Który kraj jest największy pod względem powierzchni?', answers: ['Rosja', 'Kanada', 'Chiny', 'USA'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Niemiec?', answers: ['Berlin', 'Monachium', 'Hamburg', 'Kolonia'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Jaka jest najdłuższa rzeka w Polsce?', answers: ['Wisła', 'Odra', 'Warta', 'Bug'], correctAnswerIndex: 0 },
      { question: 'Który z poniższych krajów NIE graniczy z Polską?', answers: ['Węgry', 'Niemcy', 'Czechy', 'Litwa'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Australii?', answers: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], correctAnswerIndex: 0 },
      { question: 'Które morze oblewa Włochy, Grecję i Hiszpanię?', answers: ['Morze Śródziemne', 'Morze Bałtyckie', 'Morze Północne', 'Morze Czarne'], correctAnswerIndex: 0 },
      { question: 'Jaki jest najmniejszy kraj świata pod względem powierzchni?', answers: ['Watykan', 'Monako', 'San Marino', 'Liechtenstein'], correctAnswerIndex: 0 },
      { question: 'Która pustynia jest największą pustynią gorącą na świecie?', answers: ['Sahara', 'Gobi', 'Kalahari', 'Pustynia Arabska'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Kanady?', answers: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'], correctAnswerIndex: 0 },
      { question: 'Które państwo leży zarówno w Europie, jak i w Azji?', answers: ['Turcja', 'Grecja', 'Bułgaria', 'Rumunia'], correctAnswerIndex: 0 },
      { question: 'Jakie jest najgłębsze jezioro świata?', answers: ['Bajkał', 'Jezioro Tanganika', 'Jezioro Górne', 'Morze Kaspijskie'], correctAnswerIndex: 0 },
      { question: 'Jaka jest najwyższa góra Polski?', answers: ['Rysy', 'Śnieżka', 'Babia Góra', 'Giewont'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Jaka jest stolica Kazachstanu?', answers: ['Astana', 'Ałmaty', 'Taszkent', 'Biszkek'], correctAnswerIndex: 0 },
      { question: 'Która cieśnina oddziela Europę od Afryki?', answers: ['Cieśnina Gibraltarska', 'Cieśnina Bosfor', 'Cieśnina Dover', 'Cieśnina Ormuz'], correctAnswerIndex: 0 },
      { question: 'Który kraj ma najwięcej stref czasowych (licząc terytoria zamorskie)?', answers: ['Francja', 'Rosja', 'USA', 'Chiny'], correctAnswerIndex: 0 },
      { question: 'Jaka jest najniżej położona lądowa powierzchnia na Ziemi?', answers: ['Morze Martwe', 'Dolina Śmierci', 'Depresja Kattara', 'Jezioro Eyre'], correctAnswerIndex: 0 },
      { question: 'Które miasto leży jednocześnie na dwóch kontynentach?', answers: ['Stambuł', 'Kair', 'Moskwa', 'Ateny'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Mongolii?', answers: ['Ułan Bator', 'Ałmaty', 'Taszkent', 'Duszanbe'], correctAnswerIndex: 0 },
      { question: 'Który kraj afrykański nigdy nie był kolonią europejską?', answers: ['Etiopia', 'Kenia', 'Nigeria', 'Angola'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najdłuższy lądowy łańcuch górski na świecie?', answers: ['Andy', 'Himalaje', 'Kordyliery', 'Ural'], correctAnswerIndex: 0 },
      { question: 'Która rzeka przepływa przez najwięcej krajów na świecie?', answers: ['Dunaj', 'Nil', 'Amazonka', 'Ren'], correctAnswerIndex: 0 },
      { question: 'Jaka jest stolica Sri Lanki?', answers: ['Sri Jayawardenapura Kotte', 'Kolombo', 'Kandy', 'Galle'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Sport',
    easy: [
      { question: 'Ilu zawodników jednej drużyny piłkarskiej znajduje się na boisku?', answers: ['11', '10', '9', '12'], correctAnswerIndex: 0 },
      { question: 'W jakim kraju odbyły się Igrzyska Olimpijskie w 2016 roku?', answers: ['Brazylia', 'Chiny', 'Wielka Brytania', 'Japonia'], correctAnswerIndex: 0 },
      { question: 'Jaka dyscyplina sportu wykorzystuje rakietę i lotkę?', answers: ['Badminton', 'Tenis', 'Squash', 'Ping-pong'], correctAnswerIndex: 0 },
      { question: 'Ile punktów jest wartych trafienie za linią trzech punktów w koszykówce?', answers: ['3', '2', '1', '4'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się prestiżowy turniej tenisowy rozgrywany na trawie?', answers: ['Wimbledon', 'Roland Garros', 'US Open', 'Australian Open'], correctAnswerIndex: 0 },
      { question: 'Ilu zawodników gra w drużynie siatkówki na boisku?', answers: ['6', '5', '7', '4'], correctAnswerIndex: 0 },
      { question: 'Jaki kolor ma pas mistrzowski najwyższego stopnia w judo?', answers: ['Czarny', 'Biały', 'Czerwony', 'Niebieski'], correctAnswerIndex: 0 },
      { question: 'Co ile lat odbywają się Letnie Igrzyska Olimpijskie?', answers: ['4 lata', '2 lata', '3 lata', '5 lat'], correctAnswerIndex: 0 },
      { question: 'Która dyscyplina rozgrywana jest na lodowisku z kijem i krążkiem?', answers: ['Hokej na lodzie', 'Curling', 'Łyżwiarstwo', 'Bandy'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najważniejszy klubowy turniej piłkarski w Europie?', answers: ['Liga Mistrzów', 'Liga Europy', 'Puchar Świata', 'Mistrzostwa Europy'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Który kraj wygrał Mistrzostwa Świata w piłce nożnej w 2018 roku?', answers: ['Francja', 'Chorwacja', 'Niemcy', 'Brazylia'], correctAnswerIndex: 0 },
      { question: 'Ile setów trzeba wygrać, by wygrać mecz siatkówki (do pięciu setów)?', answers: ['3', '2', '4', '5'], correctAnswerIndex: 0 },
      { question: 'Jaka jest odległość maratonu?', answers: ['42,195 km', '40 km', '21 km', '50 km'], correctAnswerIndex: 0 },
      { question: 'W jakim sporcie zawodnicy walczą na planszy zwanej "tatami"?', answers: ['Judo', 'Szermierka', 'Boks', 'Zapasy'], correctAnswerIndex: 0 },
      { question: 'Ilu graczy liczy drużyna baseballowa na boisku?', answers: ['9', '10', '11', '8'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najbardziej prestiżowy wieloetapowy wyścig kolarski na świecie?', answers: ['Tour de France', "Giro d'Italia", 'Vuelta a España', 'Paryż-Roubaix'], correctAnswerIndex: 0 },
      { question: 'Ile rund liczy standardowa zawodowa walka bokserska mistrzowska?', answers: ['12', '10', '15', '8'], correctAnswerIndex: 0 },
      { question: 'Jaki kraj jest kolebką nowożytnych igrzysk olimpijskich?', answers: ['Grecja', 'Francja', 'Wielka Brytania', 'USA'], correctAnswerIndex: 0 },
      { question: 'Ile punktów zdobywa się za rzut wolny (osobisty) w koszykówce?', answers: ['1', '2', '3', '0'], correctAnswerIndex: 0 },
      { question: 'Ile lat mija między igrzyskami letnimi a kolejnymi igrzyskami zimowymi (aktualny cykl)?', answers: ['2 lata', '4 lata', '1 rok', '3 lata'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'W którym roku odbyły się pierwsze nowożytne Igrzyska Olimpijskie?', answers: ['1896', '1900', '1924', '1912'], correctAnswerIndex: 0 },
      { question: 'Który kraj był gospodarzem Mistrzostw Świata w piłce nożnej w 1990 roku?', answers: ['Włochy', 'Hiszpania', 'Meksyk', 'Francja'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi wysokość siatki w siatkówce mężczyzn (w przybliżeniu)?', answers: ['2,43 m', '2,24 m', '2,00 m', '2,50 m'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się ruch szachowy polegający na jednoczesnym przesunięciu króla i wieży?', answers: ['Roszada', 'Bicie w przelocie', 'Promocja', 'Szach-mat'], correctAnswerIndex: 0 },
      { question: 'Który kraj zdobył historycznie najwięcej razy Puchar Davisa w tenisie?', answers: ['USA', 'Australia', 'Francja', 'Wielka Brytania'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi standardowa waga kuli używanej przez mężczyzn w pchnięciu kulą?', answers: ['7,26 kg', '6 kg', '4 kg', '8 kg'], correctAnswerIndex: 0 },
      { question: 'W którym roku polska reprezentacja piłkarska po raz pierwszy zajęła trzecie miejsce na Mistrzostwach Świata?', answers: ['1974', '1978', '1986', '1990'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zawodnik curlingu, który jako ostatni rzuca kamienie i pełni funkcję kapitana?', answers: ['Skip', 'Lead', 'Second', 'Vice'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi dystans biegu przez płotki, w którym rywalizują mężczyźni na 110 m?', answers: ['110 m', '100 m', '200 m', '400 m'], correctAnswerIndex: 0 },
      { question: 'Kto jest uznawany za twórcę nowożytnego ruchu olimpijskiego?', answers: ['Pierre de Coubertin', 'Avery Brundage', 'Juan Antonio Samaranch', 'Demetrios Vikelas'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Nauka i technika',
    easy: [
      { question: 'Jaki gaz jest niezbędny człowiekowi do oddychania?', answers: ['Tlen', 'Azot', 'Dwutlenek węgla', 'Wodór'], correctAnswerIndex: 0 },
      { question: 'Kto sformułował teorię grawitacji po zaobserwowaniu spadającego jabłka?', answers: ['Izaak Newton', 'Albert Einstein', 'Galileusz', 'Kopernik'], correctAnswerIndex: 0 },
      { question: 'Ile planet znajduje się obecnie w Układzie Słonecznym?', answers: ['8', '9', '7', '10'], correctAnswerIndex: 0 },
      { question: 'Jaki jest symbol chemiczny wody?', answers: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswerIndex: 0 },
      { question: 'Komu powszechnie przypisuje się wynalezienie żarówki?', answers: ['Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'James Watt'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najbliższa nam gwiazda?', answers: ['Słońce', 'Proxima Centauri', 'Syriusz', 'Alfa Centauri'], correctAnswerIndex: 0 },
      { question: 'Ile kości ma w przybliżeniu dorosły człowiek?', answers: ['206', '150', '300', '250'], correctAnswerIndex: 0 },
      { question: 'Jaki jest symbol chemiczny złota?', answers: ['Au', 'Ag', 'Fe', 'Gd'], correctAnswerIndex: 0 },
      { question: 'Kto opracował teorię ewolucji drogą doboru naturalnego?', answers: ['Karol Darwin', 'Gregor Mendel', 'Louis Pasteur', 'Isaac Newton'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się urządzenie służące do powiększania małych obiektów?', answers: ['Mikroskop', 'Teleskop', 'Peryskop', 'Lornetka'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Ile wynosi w przybliżeniu prędkość światła w próżni?', answers: ['300 000 km/s', '150 000 km/s', '1 000 000 km/s', '30 000 km/s'], correctAnswerIndex: 0 },
      { question: 'Kto opracował układ okresowy pierwiastków?', answers: ['Dmitrij Mendelejew', 'Marie Curie', 'Antoine Lavoisier', 'Niels Bohr'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się proces, w którym rośliny przekształcają światło słoneczne w energię?', answers: ['Fotosynteza', 'Oddychanie komórkowe', 'Transpiracja', 'Fermentacja'], correctAnswerIndex: 0 },
      { question: 'Który pierwiastek ma liczbę atomową 1?', answers: ['Wodór', 'Hel', 'Lit', 'Tlen'], correctAnswerIndex: 0 },
      { question: 'Kto jako pierwszy opisał prawa ruchu planet wokół Słońca?', answers: ['Johannes Kepler', 'Mikołaj Kopernik', 'Galileusz', 'Tycho Brahe'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się podstawowa jednostka dziedziczności w organizmach żywych?', answers: ['Gen', 'Chromosom', 'Komórka', 'Białko'], correctAnswerIndex: 0 },
      { question: 'Jaki gaz stanowi największy procent objętości powietrza, którym oddychamy?', answers: ['Azot', 'Tlen', 'Dwutlenek węgla', 'Argon'], correctAnswerIndex: 0 },
      { question: 'Kto skonstruował pierwszy praktyczny silnik parowy wykorzystywany w przemyśle?', answers: ['James Watt', 'George Stephenson', 'Thomas Newcomen', 'Rudolf Diesel'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się teoria opisująca powstanie wszechświata z jednego punktu o ogromnej gęstości?', answers: ['Teoria Wielkiego Wybuchu', 'Teoria strun', 'Teoria względności', 'Teoria ewolucji'], correctAnswerIndex: 0 },
      { question: 'Ile chromosomów ma zdrowa ludzka komórka somatyczna (łącznie)?', answers: ['46', '44', '48', '23'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Kto sformułował ogólną teorię względności?', answers: ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Max Planck'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się cząstka elementarna nadająca masę innym cząstkom, odkryta w 2012 roku?', answers: ['Bozon Higgsa', 'Kwark', 'Neutrino', 'Foton'], correctAnswerIndex: 0 },
      { question: 'Kto jako pierwszy odkrył zjawisko promieniotwórczości?', answers: ['Henri Becquerel', 'Maria Skłodowska-Curie', 'Ernest Rutherford', 'Wilhelm Röntgen'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się jednostka natężenia prądu elektrycznego w układzie SI?', answers: ['Amper', 'Wolt', 'Om', 'Wat'], correctAnswerIndex: 0 },
      { question: 'Kto sformułował zasadę nieoznaczoności w mechanice kwantowej?', answers: ['Werner Heisenberg', 'Erwin Schrödinger', 'Niels Bohr', 'Max Planck'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się proces podziału jądra atomowego z uwolnieniem dużej ilości energii?', answers: ['Rozszczepienie jądra atomowego', 'Synteza jądrowa', 'Rozpad beta', 'Fuzja'], correctAnswerIndex: 0 },
      { question: 'Który naukowiec sformułował trzy prawa dynamiki opisujące ruch ciał?', answers: ['Isaac Newton', 'Galileusz', 'Kepler', 'Archimedes'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się skala służąca do pomiaru magnitudy trzęsień ziemi?', answers: ['Skala Richtera', 'Skala Beauforta', 'Skala Celsjusza', 'Skala Mohsa'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi w przybliżeniu odległość Ziemi od Słońca (jednostka astronomiczna)?', answers: ['150 mln km', '50 mln km', '380 tys. km', '1 mld km'], correctAnswerIndex: 0 },
      { question: 'Kto opracował pierwszą skuteczną szczepionkę przeciwko wściekliźnie?', answers: ['Louis Pasteur', 'Edward Jenner', 'Robert Koch', 'Alexander Fleming'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Sztuka i kultura',
    easy: [
      { question: 'Kto namalował obraz "Mona Lisa"?', answers: ['Leonardo da Vinci', 'Michał Anioł', 'Rafael', 'Rembrandt'], correctAnswerIndex: 0 },
      { question: 'W jakim muzeum w Paryżu znajduje się "Mona Lisa"?', answers: ['Luwr', 'Wersal', 'Centrum Pompidou', 'Orsay'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Romeo i Julię"?', answers: ['William Shakespeare', 'Molier', 'Christopher Marlowe', 'Charles Dickens'], correctAnswerIndex: 0 },
      { question: 'Jaki instrument muzyczny ma 88 klawiszy?', answers: ['Fortepian', 'Skrzypce', 'Gitara', 'Flet'], correctAnswerIndex: 0 },
      { question: 'Kto namalował "Gwiaździstą noc"?', answers: ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się słynna wieża w Paryżu zbudowana w 1889 roku?', answers: ['Wieża Eiffla', 'Big Ben', 'Empire State Building', 'Tower Bridge'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował IX Symfonię z "Odą do radości"?', answers: ['Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Fryderyk Chopin'], correctAnswerIndex: 0 },
      { question: 'Jaki polski kompozytor jest autorem słynnych polonezów i mazurków?', answers: ['Fryderyk Chopin', 'Stanisław Moniuszko', 'Karol Szymanowski', 'Ignacy Paderewski'], correctAnswerIndex: 0 },
      { question: 'W jakim mieście znajduje się słynne Koloseum?', answers: ['Rzym', 'Ateny', 'Florencja', 'Wenecja'], correctAnswerIndex: 0 },
      { question: 'Kto namalował "Ostatnią Wieczerzę"?', answers: ['Leonardo da Vinci', 'Michał Anioł', 'Rafael', 'Caravaggio'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Kto jest autorem rzeźby "Dawid" znajdującej się we Florencji?', answers: ['Michał Anioł', 'Leonardo da Vinci', 'Donatello', 'Bernini'], correctAnswerIndex: 0 },
      { question: 'Który malarz jest współtwórcą kubizmu?', answers: ['Pablo Picasso', 'Henri Matisse', 'Salvador Dalí', 'Wassily Kandinsky'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Pana Tadeusza"?', answers: ['Adam Mickiewicz', 'Juliusz Słowacki', 'Cyprian Kamil Norwid', 'Henryk Sienkiewicz'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się styl architektoniczny ze strzelistymi wieżami i witrażami, popularny w średniowieczu?', answers: ['Gotyk', 'Romanizm', 'Barok', 'Renesans'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował operę "Straszny dwór"?', answers: ['Stanisław Moniuszko', 'Fryderyk Chopin', 'Karol Szymanowski', 'Krzysztof Penderecki'], correctAnswerIndex: 0 },
      { question: 'Który reżyser nakręcił film "Lista Schindlera"?', answers: ['Steven Spielberg', 'Martin Scorsese', 'Stanley Kubrick', 'Francis Ford Coppola'], correctAnswerIndex: 0 },
      { question: 'Kto namalował "Krzyk"?', answers: ['Edvard Munch', 'Vincent van Gogh', 'Gustav Klimt', 'Egon Schiele'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się nurt sztuki oparty na obrazach ze snów i podświadomości, reprezentowany przez Salvadora Dalí?', answers: ['Surrealizm', 'Impresjonizm', 'Ekspresjonizm', 'Kubizm'], correctAnswerIndex: 0 },
      { question: 'Który polski reżyser otrzymał Oscara za całokształt twórczości?', answers: ['Andrzej Wajda', 'Roman Polański', 'Krzysztof Kieślowski', 'Agnieszka Holland'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem powieści "Zbrodnia i kara"?', answers: ['Fiodor Dostojewski', 'Lew Tołstoj', 'Anton Czechow', 'Nikołaj Gogol'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Kto zaprojektował kopułę katedry Santa Maria del Fiore we Florencji?', answers: ['Filippo Brunelleschi', 'Michał Anioł', 'Bramante', 'Leon Battista Alberti'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował balet "Święto wiosny", który wywołał skandal na premierze w 1913 roku?', answers: ['Igor Strawiński', 'Siergiej Prokofiew', 'Piotr Czajkowski', 'Claude Debussy'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się ruch artystyczny zapoczątkowany przez obraz Claude\'a Moneta "Impresja, wschód słońca"?', answers: ['Impresjonizm', 'Ekspresjonizm', 'Postimpresjonizm', 'Fowizm'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem cyklu obrazów "Nenufary"?', answers: ['Claude Monet', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Paul Cézanne'], correctAnswerIndex: 0 },
      { question: 'Który polski pisarz otrzymał Nagrodę Nobla w dziedzinie literatury w 1980 roku?', answers: ['Czesław Miłosz', 'Wisława Szymborska', 'Henryk Sienkiewicz', 'Władysław Reymont'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się technika malarska polegająca na nakładaniu drobnych, czystych plam koloru?', answers: ['Pointylizm', 'Impresjonizm', 'Fowizm', 'Kubizm'], correctAnswerIndex: 0 },
      { question: 'Kto wyrzeźbił "Pietę" znajdującą się w Bazylice św. Piotra w Watykanie?', answers: ['Michał Anioł', 'Bernini', 'Donatello', 'Canova'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował operę "Czarodziejski flet"?', answers: ['Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Joseph Haydn', 'Christoph Willibald Gluck'], correctAnswerIndex: 0 },
      { question: 'Jak nazywał się ruch artystyczny przełomu XIX i XX wieku, znany w Polsce jako "secesja"?', answers: ['Art Nouveau', 'Bauhaus', 'Art Deco', 'Modernizm'], correctAnswerIndex: 0 },
      { question: 'Kto napisał libretto do opery Mozarta "Wesele Figara"?', answers: ['Lorenzo Da Ponte', 'Emanuel Schikaneder', 'Pietro Metastasio', 'Carlo Goldoni'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Film i muzyka',
    easy: [
      { question: 'Kto reżyserował trylogię "Władca Pierścieni"?', answers: ['Peter Jackson', 'Steven Spielberg', 'James Cameron', 'George Lucas'], correctAnswerIndex: 0 },
      { question: 'Jaki zespół nagrał piosenkę "Bohemian Rhapsody"?', answers: ['Queen', 'The Beatles', 'Pink Floyd', 'Led Zeppelin'], correctAnswerIndex: 0 },
      { question: 'Kto zagrał główną rolę męską w filmie "Titanic"?', answers: ['Leonardo DiCaprio', 'Brad Pitt', 'Tom Cruise', 'Matt Damon'], correctAnswerIndex: 0 },
      { question: 'Kto jest znany jako "Król Popu"?', answers: ['Michael Jackson', 'Elvis Presley', 'Prince', 'Freddie Mercury'], correctAnswerIndex: 0 },
      { question: 'Który film animowany opowiada o lwiątku Simbie?', answers: ['Król Lew', 'Madagaskar', 'Zwierzogród', 'Shrek'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował muzykę do "Gwiezdnych wojen"?', answers: ['John Williams', 'Hans Zimmer', 'Danny Elfman', 'John Barry'], correctAnswerIndex: 0 },
      { question: 'Która piosenkarka nazywana jest "Królową popu"?', answers: ['Madonna', 'Beyoncé', 'Whitney Houston', 'Cher'], correctAnswerIndex: 0 },
      { question: 'Który film zdobył Oscara dla najlepszego filmu na gali w 2020 roku?', answers: ['Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'], correctAnswerIndex: 0 },
      { question: 'Kto gra Jacka Sparrowa w serii "Piraci z Karaibów"?', answers: ['Johnny Depp', 'Orlando Bloom', 'Geoffrey Rush', 'Javier Bardem'], correctAnswerIndex: 0 },
      { question: 'Który zespół nagrał album "Abbey Road"?', answers: ['The Beatles', 'The Rolling Stones', 'Queen', 'Pink Floyd'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Kto wyreżyserował film "Pulp Fiction"?', answers: ['Quentin Tarantino', 'Martin Scorsese', 'David Fincher', 'Christopher Nolan'], correctAnswerIndex: 0 },
      { question: 'Który kompozytor napisał muzykę do filmu "Incepcja"?', answers: ['Hans Zimmer', 'John Williams', 'Alexandre Desplat', 'Thomas Newman'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem musicalu "Upiór w operze"?', answers: ['Andrew Lloyd Webber', 'Stephen Sondheim', 'Elton John', 'Tim Rice'], correctAnswerIndex: 0 },
      { question: 'Który polski reżyser nakręcił trylogię "Trzy kolory"?', answers: ['Krzysztof Kieślowski', 'Andrzej Wajda', 'Roman Polański', 'Agnieszka Holland'], correctAnswerIndex: 0 },
      { question: 'Jaki gatunek muzyczny narodził się w Nowym Orleanie na początku XX wieku?', answers: ['Jazz', 'Blues', 'Rock and roll', 'Country'], correctAnswerIndex: 0 },
      { question: 'Kto zagrał Jokera w filmie "Joker" z 2019 roku?', answers: ['Joaquin Phoenix', 'Heath Ledger', 'Jack Nicholson', 'Jared Leto'], correctAnswerIndex: 0 },
      { question: 'Który zespół nagrał album koncepcyjny "The Dark Side of the Moon"?', answers: ['Pink Floyd', 'Led Zeppelin', 'The Who', 'Genesis'], correctAnswerIndex: 0 },
      { question: 'Kto wyreżyserował film "Matrix"?', answers: ['Siostry Wachowski', 'James Cameron', 'Ridley Scott', 'Christopher Nolan'], correctAnswerIndex: 0 },
      { question: 'Kto śpiewa "My Heart Will Go On" z filmu "Titanic"?', answers: ['Celine Dion', 'Whitney Houston', 'Mariah Carey', 'Shania Twain'], correctAnswerIndex: 0 },
      { question: 'Kto zagrał Tony\'ego Starka/Iron Mana w filmach Marvela?', answers: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Kto skomponował ścieżkę dźwiękową do "Ojca chrzestnego"?', answers: ['Nino Rota', 'Ennio Morricone', 'John Williams', 'Jerry Goldsmith'], correctAnswerIndex: 0 },
      { question: 'Który animowany film jako pierwszy otrzymał nominację do Oscara dla najlepszego filmu?', answers: ['Piękna i Bestia', 'Toy Story', 'Shrek', 'Up'], correctAnswerIndex: 0 },
      { question: 'Kto wyreżyserował "Obywatela Kane\'a"?', answers: ['Orson Welles', 'Alfred Hitchcock', 'John Ford', 'Billy Wilder'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował operę "Halka", pierwszą polską operę narodową?', answers: ['Stanisław Moniuszko', 'Karol Kurpiński', 'Karol Szymanowski', 'Ignacy Jan Paderewski'], correctAnswerIndex: 0 },
      { question: 'Kto zagrał główną rolę w filmie "Nietykalni" z 2011 roku (postać Philippe\'a)?', answers: ['François Cluzet', 'Omar Sy', 'Jean Reno', 'Gérard Depardieu'], correctAnswerIndex: 0 },
      { question: 'Który reżyser jest twórcą "Trylogii kolorów" oraz "Dekalogu"?', answers: ['Krzysztof Kieślowski', 'Andrzej Wajda', 'Agnieszka Holland', 'Jerzy Kawalerowicz'], correctAnswerIndex: 0 },
      { question: 'Jaki gatunek muzyczny wywodzi się z Jamajki i kojarzony jest z Bobem Marleyem?', answers: ['Reggae', 'Ska', 'Calypso', 'Salsa'], correctAnswerIndex: 0 },
      { question: 'Kto skomponował operę "Tristan i Izolda"?', answers: ['Richard Wagner', 'Giuseppe Verdi', 'Giacomo Puccini', 'Johannes Brahms'], correctAnswerIndex: 0 },
      { question: 'Który film zdobył pierwszego w historii Oscara dla najlepszego filmu w 1929 roku?', answers: ['Skrzydła (Wings)', 'Metropolis', 'Nietoperz', 'Broadway Melody'], correctAnswerIndex: 0 },
      { question: 'Kto jest reżyserem filmu "2001: Odyseja kosmiczna"?', answers: ['Stanley Kubrick', 'Steven Spielberg', 'Ridley Scott', 'George Lucas'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Przyroda i zwierzęta',
    easy: [
      { question: 'Które zwierzę jest największym ssakiem na Ziemi?', answers: ['Płetwal błękitny', 'Słoń afrykański', 'Żyrafa', 'Nosorożec'], correctAnswerIndex: 0 },
      { question: 'Ile nóg ma pająk?', answers: ['8', '6', '10', '4'], correctAnswerIndex: 0 },
      { question: 'Jakie zwierzę jest symbolem Polski na godle?', answers: ['Orzeł', 'Żubr', 'Niedźwiedź', 'Sokół'], correctAnswerIndex: 0 },
      { question: 'Który ptak nie potrafi latać, ale świetnie pływa i żyje na Antarktydzie?', answers: ['Pingwin', 'Struś', 'Kiwi', 'Kazuar'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę zmienia kolor skóry, by się kamuflować?', answers: ['Kameleon', 'Jaszczurka', 'Gekon', 'Salamandra'], correctAnswerIndex: 0 },
      { question: 'Ile serc ma ośmiornica?', answers: ['3', '1', '2', '4'], correctAnswerIndex: 0 },
      { question: 'Który ssak jest największym drapieżnikiem lądowym?', answers: ['Niedźwiedź polarny', 'Lew', 'Tygrys', 'Wilk'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się proces przemiany gąsienicy w motyla?', answers: ['Metamorfoza', 'Fotosynteza', 'Mitoza', 'Linienie'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę jest najszybszym lądowym zwierzęciem na świecie?', answers: ['Gepard', 'Lew', 'Antylopa', 'Koń'], correctAnswerIndex: 0 },
      { question: 'Jaki ssak jest jedynym ssakiem zdolnym do aktywnego lotu?', answers: ['Nietoperz', 'Wiewiórka lotna', 'Lemur', 'Ptak'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Ile lat może żyć w przybliżeniu żółw słoniowy?', answers: ['Ponad 100 lat', '30 lat', '50 lat', '200 lat'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę ma najdłuższy okres ciąży spośród ssaków lądowych?', answers: ['Słoń', 'Żyrafa', 'Wieloryb', 'Nosorożec'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko, w którym niektóre zwierzęta zapadają w sen zimowy?', answers: ['Hibernacja', 'Estywacja', 'Migracja', 'Linienie'], correctAnswerIndex: 0 },
      { question: 'Który gad jest największym żyjącym obecnie gadem na świecie?', answers: ['Krokodyl różańcowy', 'Waran z Komodo', 'Anakonda', 'Aligator'], correctAnswerIndex: 0 },
      { question: 'Który ptak jest największym latającym ptakiem świata pod względem rozpiętości skrzydeł?', answers: ['Albatros wędrowny', 'Kondor andyjski', 'Orzeł przedni', 'Pelikan'], correctAnswerIndex: 0 },
      { question: 'Ile komór ma serce ssaków?', answers: ['4', '3', '2', '1'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę morskie jest największym zwierzęciem, jakie kiedykolwiek żyło na Ziemi?', answers: ['Płetwal błękitny', 'Kaszalot', 'Rekin wielorybi', 'Orka'], correctAnswerIndex: 0 },
      { question: 'Jaki gatunek pszczoły jest głównie hodowany dla produkcji miodu w Europie?', answers: ['Pszczoła miodna', 'Trzmiel', 'Osa', 'Szerszeń'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę workowate naturalnie występuje w obu Amerykach, poza Australią i Nową Gwineą?', answers: ['Oposum', 'Kangur', 'Koala', 'Wombat'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko masowej wędrówki zwierząt związanej ze zmianą pór roku?', answers: ['Migracja', 'Hibernacja', 'Estywacja', 'Dyspersja'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Jak nazywa się jedyny jadowity ssak Australii, składający jaja?', answers: ['Dziobak', 'Kolczatka', 'Diabeł tasmański', 'Wombat'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę ma najdłuższy okres ciąży spośród wszystkich zwierząt lądowych na świecie?', answers: ['Słoń afrykański', 'Żyrafa', 'Wieloryb grenlandzki', 'Nosorożec biały'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko, w którym niektóre gatunki ryb zmieniają płeć w ciągu życia?', answers: ['Hermafrodytyzm sekwencyjny', 'Partenogeneza', 'Metamorfoza', 'Diapauza'], correctAnswerIndex: 0 },
      { question: 'Który gatunek uznawany jest za najbardziej toksycznego węża na świecie?', answers: ['Tajpan pustynny', 'Kobra królewska', 'Grzechotnik', 'Mamba czarna'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko emitowania światła przez organizmy żywe, np. głębinowe ryby?', answers: ['Bioluminescencja', 'Fluorescencja', 'Fosforescencja', 'Chemiluminescencja'], correctAnswerIndex: 0 },
      { question: 'Które zwierzę ma największy mózg spośród wszystkich zwierząt w wartościach bezwzględnych?', answers: ['Kaszalot', 'Słoń afrykański', 'Płetwal błękitny', 'Człowiek'], correctAnswerIndex: 0 },
      { question: 'Który gatunek papugi słynie z niezwykłej zdolności naśladowania mowy ludzkiej?', answers: ['Papuga szara (żako)', 'Kruk', 'Kanarek', 'Kos'], correctAnswerIndex: 0 },
      { question: 'Który ssak odbywa najdłuższą wędrówkę migracyjną spośród zwierząt lądowych?', answers: ['Karibu (renifer)', 'Słoń', 'Antylopa gnu', 'Zebra'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko, w którym samce niektórych gatunków (np. modliszki) bywają zjadane przez samice po kopulacji?', answers: ['Kanibalizm seksualny', 'Poligamia', 'Partenogeneza', 'Diapauza'], correctAnswerIndex: 0 },
      { question: 'Który drapieżnik (poza człowiekiem) regularnie poluje na dorosłe słonie?', answers: ['Lew', 'Tygrys', 'Krokodyl', 'Hiena'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Literatura',
    easy: [
      { question: 'Kto napisał serię o Harrym Potterze?', answers: ['J.K. Rowling', 'Roald Dahl', 'C.S. Lewis', 'J.R.R. Tolkien'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem "Pana Tadeusza"?', answers: ['Adam Mickiewicz', 'Juliusz Słowacki', 'Henryk Sienkiewicz', 'Bolesław Prus'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Władcę Pierścieni"?', answers: ['J.R.R. Tolkien', 'J.K. Rowling', 'George R.R. Martin', 'C.S. Lewis'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Krzyżaków"?', answers: ['Henryk Sienkiewicz', 'Bolesław Prus', 'Eliza Orzeszkowa', 'Stefan Żeromski'], correctAnswerIndex: 0 },
      { question: 'Który polski pisarz otrzymał Nagrodę Nobla za powieść "Quo Vadis"?', answers: ['Henryk Sienkiewicz', 'Władysław Reymont', 'Czesław Miłosz', 'Wisława Szymborska'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Romea i Julię"?', answers: ['William Shakespeare', 'Molier', 'Charles Dickens', 'Oscar Wilde'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem zbioru baśni "Kopciuszek" i "Czerwony Kapturek"?', answers: ['Bracia Grimm', 'Hans Christian Andersen', 'Charles Perrault', 'Ezop'], correctAnswerIndex: 0 },
      { question: 'Kto napisał komedię "Zemsta"?', answers: ['Aleksander Fredro', 'Adam Mickiewicz', 'Juliusz Słowacki', 'Stanisław Wyspiański'], correctAnswerIndex: 0 },
      { question: 'Który pisarz stworzył postać Sherlocka Holmesa?', answers: ['Arthur Conan Doyle', 'Agatha Christie', 'Edgar Allan Poe', 'Charles Dickens'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Małego Księcia"?', answers: ['Antoine de Saint-Exupéry', 'Jules Verne', 'Victor Hugo', 'Albert Camus'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Kto napisał "Lalkę"?', answers: ['Bolesław Prus', 'Henryk Sienkiewicz', 'Eliza Orzeszkowa', 'Stefan Żeromski'], correctAnswerIndex: 0 },
      { question: 'Który pisarz jest autorem "Zbrodni i kary"?', answers: ['Fiodor Dostojewski', 'Lew Tołstoj', 'Anton Czechow', 'Iwan Turgieniew'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Wojnę i pokój"?', answers: ['Lew Tołstoj', 'Fiodor Dostojewski', 'Anton Czechow', 'Nikołaj Gogol'], correctAnswerIndex: 0 },
      { question: 'Który polski poeta zapoczątkował polski romantyzm tomem "Ballady i romanse"?', answers: ['Adam Mickiewicz', 'Juliusz Słowacki', 'Zygmunt Krasiński', 'Cyprian Kamil Norwid'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem powieści "1984"?', answers: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'H.G. Wells'], correctAnswerIndex: 0 },
      { question: 'Który pisarz stworzył serię o Wiedźminie Geralcie z Rivii?', answers: ['Andrzej Sapkowski', 'Jacek Dukaj', 'Stanisław Lem', 'Rafał Kosik'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Chłopów", za co otrzymał literacką Nagrodę Nobla?', answers: ['Władysław Reymont', 'Henryk Sienkiewicz', 'Stefan Żeromski', 'Bolesław Prus'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Dumę i uprzedzenie"?', answers: ['Jane Austen', 'Charlotte Brontë', 'Virginia Woolf', 'Emily Brontë'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Proces" i "Zamek"?', answers: ['Franz Kafka', 'Thomas Mann', 'Hermann Hesse', 'Stefan Zweig'], correctAnswerIndex: 0 },
      { question: 'Który polski pisarz science fiction napisał "Solaris"?', answers: ['Stanisław Lem', 'Andrzej Sapkowski', 'Janusz Zajdel', 'Jacek Dukaj'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Kto napisał epicki poemat "Boska Komedia"?', answers: ['Dante Alighieri', 'Francesco Petrarca', 'Giovanni Boccaccio', 'Torquato Tasso'], correctAnswerIndex: 0 },
      { question: 'Kto jest autorem "Ulissesa", jednego z najważniejszych dzieł modernizmu?', answers: ['James Joyce', 'Virginia Woolf', 'Samuel Beckett', 'William Faulkner'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Sto lat samotności"?', answers: ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Jorge Luis Borges', 'Pablo Neruda'], correctAnswerIndex: 0 },
      { question: 'Który rosyjski pisarz jest autorem "Mistrza i Małgorzaty"?', answers: ['Michaił Bułhakow', 'Borys Pasternak', 'Aleksandr Sołżenicyn', 'Maksym Gorki'], correctAnswerIndex: 0 },
      { question: 'Kto napisał "Ferdydurke"?', answers: ['Witold Gombrowicz', 'Bruno Schulz', 'Stanisław Ignacy Witkiewicz', 'Jarosław Iwaszkiewicz'], correctAnswerIndex: 0 },
      { question: 'Który starożytny grecki poeta jest autorem "Iliady" i "Odysei"?', answers: ['Homer', 'Hezjod', 'Sofokles', 'Eurypides'], correctAnswerIndex: 0 },
      { question: 'Który angielski dramaturg jest autorem "Hamleta" i "Makbeta"?', answers: ['William Shakespeare', 'Christopher Marlowe', 'Ben Jonson', 'John Webster'], correctAnswerIndex: 0 },
      { question: 'Który francuski pisarz jest autorem "Nędzników"?', answers: ['Victor Hugo', 'Émile Zola', 'Gustave Flaubert', 'Honoré de Balzac'], correctAnswerIndex: 0 },
      { question: 'Który amerykański pisarz jest autorem "Wielkiego Gatsby\'ego"?', answers: ['F. Scott Fitzgerald', 'Ernest Hemingway', 'John Steinbeck', 'William Faulkner'], correctAnswerIndex: 0 },
      { question: 'Który portugalski pisarz, laureat Nobla, napisał "Miasto ślepców"?', answers: ['José Saramago', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Pablo Neruda'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Wiedza o Polsce',
    easy: [
      { question: 'Jaka jest stolica Polski?', answers: ['Warszawa', 'Kraków', 'Łódź', 'Poznań'], correctAnswerIndex: 0 },
      { question: 'Jaka rzeka przepływa przez Warszawę?', answers: ['Wisła', 'Odra', 'Warta', 'Bug'], correctAnswerIndex: 0 },
      { question: 'Ile województw ma Polska?', answers: ['16', '14', '18', '12'], correctAnswerIndex: 0 },
      { question: 'Jakie są barwy flagi Polski?', answers: ['Biało-czerwone', 'Biało-niebieskie', 'Czerwono-czarne', 'Biało-zielone'], correctAnswerIndex: 0 },
      { question: 'Jakie miasto nazywane jest "polskim Manchesterem" ze względu na przemysł włókienniczy?', answers: ['Łódź', 'Poznań', 'Wrocław', 'Bydgoszcz'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najwyższy szczyt Polski?', answers: ['Rysy', 'Śnieżka', 'Babia Góra', 'Kasprowy Wierch'], correctAnswerIndex: 0 },
      { question: 'W którym mieście znajduje się Wawel?', answers: ['Kraków', 'Warszawa', 'Gdańsk', 'Wrocław'], correctAnswerIndex: 0 },
      { question: 'Jaka waluta obowiązuje w Polsce?', answers: ['Złoty', 'Euro', 'Korona', 'Frank'], correctAnswerIndex: 0 },
      { question: 'Które miasto jest największym portem morskim Polski?', answers: ['Gdańsk', 'Szczecin', 'Gdynia', 'Kołobrzeg'], correctAnswerIndex: 0 },
      { question: 'Kto jest jednym z głównych świętych patronów Polski?', answers: ['Święty Wojciech', 'Święty Jerzy', 'Święty Marcin', 'Święty Mikołaj'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'W którym roku Polska odzyskała niepodległość po 123 latach zaborów?', answers: ['1918', '1920', '1914', '1945'], correctAnswerIndex: 0 },
      { question: 'Kto był pierwszym prezydentem Polski wybranym w wyborach powszechnych?', answers: ['Lech Wałęsa', 'Wojciech Jaruzelski', 'Aleksander Kwaśniewski', 'Lech Kaczyński'], correctAnswerIndex: 0 },
      { question: 'Który polski papież pełnił posługę od 1978 do 2005 roku?', answers: ['Jan Paweł II', 'Benedykt XVI', 'Paweł VI', 'Jan XXIII'], correctAnswerIndex: 0 },
      { question: 'Które miasto było stolicą Polski przed przeniesieniem stolicy do Warszawy?', answers: ['Kraków', 'Gniezno', 'Poznań', 'Wrocław'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najdłuższa rzeka Polski?', answers: ['Wisła', 'Odra', 'Warta', 'Noteć'], correctAnswerIndex: 0 },
      { question: 'W którym roku Polska wstąpiła do NATO?', answers: ['1999', '1997', '2004', '1991'], correctAnswerIndex: 0 },
      { question: 'W jakim mieście ma siedzibę Trybunał Konstytucyjny?', answers: ['Warszawa', 'Kraków', 'Poznań', 'Wrocław'], correctAnswerIndex: 0 },
      { question: 'Kto napisał słowa polskiego hymnu narodowego "Mazurek Dąbrowskiego"?', answers: ['Józef Wybicki', 'Adam Mickiewicz', 'Ignacy Krasicki', 'Stanisław Staszic'], correctAnswerIndex: 0 },
      { question: 'Które pasmo górskie jest najwyższym w Polsce?', answers: ['Tatry', 'Karkonosze', 'Bieszczady', 'Beskidy'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się słynny plac w Krakowie z Sukiennicami pośrodku?', answers: ['Rynek Główny', 'Plac Zamkowy', 'Rynek Starego Miasta', 'Plac Wolności'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'W którym roku uchwalono Konstytucję 3 maja?', answers: ['1791', '1795', '1772', '1815'], correctAnswerIndex: 0 },
      { question: 'Kto był ostatnim koronowanym królem Polski?', answers: ['Stanisław August Poniatowski', 'Jan III Sobieski', 'August III Sas', 'Stanisław Leszczyński'], correctAnswerIndex: 0 },
      { question: 'W którym roku miał miejsce chrzest Polski (chrzest Mieszka I)?', answers: ['966', '1000', '1025', '988'], correctAnswerIndex: 0 },
      { question: 'Jak nazywała się dynastia panująca w Polsce przed Jagiellonami?', answers: ['Piastowie', 'Wazowie', 'Andegaweni', 'Habsburgowie'], correctAnswerIndex: 0 },
      { question: 'Który polski król zawarł unię lubelską z Litwą w 1569 roku?', answers: ['Zygmunt II August', 'Zygmunt I Stary', 'Stefan Batory', 'Henryk Walezy'], correctAnswerIndex: 0 },
      { question: 'Który polski uczony sformułował teorię heliocentryczną?', answers: ['Mikołaj Kopernik', 'Jan Heweliusz', 'Witelo', 'Marian Smoluchowski'], correctAnswerIndex: 0 },
      { question: 'W którym roku miała miejsce bitwa warszawska, znana jako "Cud nad Wisłą"?', answers: ['1920', '1918', '1919', '1921'], correctAnswerIndex: 0 },
      { question: 'Jak nazywał się pierwszy historyczny władca Polski, uznawany za twórcę państwa polskiego?', answers: ['Mieszko I', 'Bolesław Chrobry', 'Kazimierz Wielki', 'Bolesław Krzywousty'], correctAnswerIndex: 0 },
      { question: 'Który polski uczony i noblistka odkryła pierwiastki polon i rad?', answers: ['Maria Skłodowska-Curie', 'Kazimierz Funk', 'Rudolf Weigl', 'Ignacy Łukasiewicz'], correctAnswerIndex: 0 },
      { question: 'W którym roku podpisano traktat ryski kończący wojnę polsko-bolszewicką?', answers: ['1921', '1920', '1922', '1919'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Kuchnia i kulinaria',
    easy: [
      { question: 'Jakie tradycyjne polskie danie to nadziewane ciasto gotowane w wodzie?', answers: ['Pierogi', 'Naleśniki', 'Kopytka', 'Knedle'], correctAnswerIndex: 0 },
      { question: 'Z jakiego kraju pochodzi pizza?', answers: ['Włochy', 'Francja', 'Hiszpania', 'Grecja'], correctAnswerIndex: 0 },
      { question: 'Jaki podstawowy składnik jest potrzebny do zrobienia chleba?', answers: ['Mąka', 'Cukier', 'Ryż', 'Mleko'], correctAnswerIndex: 0 },
      { question: 'Z jakiego kraju pochodzi sushi?', answers: ['Japonia', 'Chiny', 'Korea', 'Tajlandia'], correctAnswerIndex: 0 },
      { question: 'Jaki napój powstaje z mielonych i palonych ziaren kawowca?', answers: ['Kawa', 'Herbata', 'Kakao', 'Cykoria'], correctAnswerIndex: 0 },
      { question: 'Jakie warzywo jest głównym składnikiem tradycyjnego polskiego bigosu (oprócz mięsa)?', answers: ['Kapusta kiszona', 'Ziemniaki', 'Marchew', 'Pomidory'], correctAnswerIndex: 0 },
      { question: 'Z czego robi się ser żółty?', answers: ['Mleko', 'Soja', 'Ryż', 'Owies'], correctAnswerIndex: 0 },
      { question: 'Jaki owoc jest głównym składnikiem tradycyjnej szarlotki?', answers: ['Jabłka', 'Gruszki', 'Śliwki', 'Wiśnie'], correctAnswerIndex: 0 },
      { question: 'Jakie danie kuchni włoskiej to długi, cienki makaron podawany z sosem?', answers: ['Spaghetti', 'Risotto', 'Lasagne', 'Gnocchi'], correctAnswerIndex: 0 },
      { question: 'Który napój gazowany wynaleziono w USA w XIX wieku i jest dziś jednym z najpopularniejszych na świecie?', answers: ['Coca-Cola', 'Sprite', 'Fanta', 'Pepsi'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Z jakiego kraju pochodzi tradycyjna potrawa "paella"?', answers: ['Hiszpania', 'Włochy', 'Portugalia', 'Francja'], correctAnswerIndex: 0 },
      { question: 'Jaki składnik nadaje curry charakterystyczny żółty kolor?', answers: ['Kurkuma', 'Papryka', 'Szafran', 'Imbir'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się francuska zupa cebulowa zapiekana z serem?', answers: ['Zupa cebulowa (soupe à l\'oignon)', 'Bouillabaisse', 'Ratatouille', 'Consommé'], correctAnswerIndex: 0 },
      { question: 'Z jakiego regionu pochodzi tradycyjny hummus?', answers: ['Bliski Wschód', 'Włochy', 'Grecja', 'Turcja'], correctAnswerIndex: 0 },
      { question: 'Jaki ser tradycyjnie używany jest do włoskiej pizzy Margherita?', answers: ['Mozzarella', 'Parmezan', 'Gorgonzola', 'Ricotta'], correctAnswerIndex: 0 },
      { question: 'Jakie danie kuchni japońskiej to ryż z rybą, uformowane w kęsy?', answers: ['Sushi', 'Sashimi', 'Tempura', 'Ramen'], correctAnswerIndex: 0 },
      { question: 'Z jakiego zboża tradycyjnie produkuje się piwo?', answers: ['Jęczmień', 'Pszenica', 'Owies', 'Żyto'], correctAnswerIndex: 0 },
      { question: 'Jaki składnik nadaje potrawom kuchni węgierskiej, np. gulaszowi, czerwony kolor?', answers: ['Papryka słodka', 'Chili', 'Pomidor', 'Burak'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się tradycyjna grecka sałatka z fetą, oliwkami i pomidorami?', answers: ['Sałatka grecka', 'Tabbouleh', 'Caprese', 'Coleslaw'], correctAnswerIndex: 0 },
      { question: 'Z jakiego kraju pochodzi tradycyjne danie "gulasz" (gulyás)?', answers: ['Węgry', 'Austria', 'Czechy', 'Rumunia'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Jak nazywa się francuska technika gotowania potraw w niskiej temperaturze w szczelnie zamkniętej próżniowej torbie?', answers: ['Sous-vide', 'Confit', 'Braising', 'Poaching'], correctAnswerIndex: 0 },
      { question: 'Który grzyb uznawany jest za jeden z najdroższych składników kulinarnych, pozyskiwany głównie we Włoszech i Francji?', answers: ['Trufla', 'Borowik', 'Kurka', 'Shiitake'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się japońska ceremonialna sztuka parzenia i podawania herbaty?', answers: ['Chanoyu', 'Ikebana', 'Origami', 'Bonsai'], correctAnswerIndex: 0 },
      { question: 'Który francuski sos, jeden z pięciu "sosów matek", robi się na bazie roztopionego masła i żółtek?', answers: ['Sos holenderski', 'Sos beszamelowy', 'Sos velouté', 'Sos espagnole'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się proces peklowania i wędzenia mięsa charakterystyczny dla kuchni żydowskiej, dający początek pastrami?', answers: ['Peklowanie i wędzenie', 'Fermentacja', 'Konfitowanie', 'Kiszenie'], correctAnswerIndex: 0 },
      { question: 'Jaki składnik jest bazą tradycyjnego japońskiego bulionu dashi?', answers: ['Wodorosty kombu i płatki bonito', 'Kurczak', 'Wołowina', 'Grzyby shiitake'], correctAnswerIndex: 0 },
      { question: 'Który kraj jest ojczyzną tradycyjnego napoju "sake"?', answers: ['Japonia', 'Chiny', 'Korea Południowa', 'Wietnam'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się naturalna kultura drożdży i bakterii używana do wypieku pieczywa na zakwasie?', answers: ['Zakwas', 'Drożdżenie', 'Zaczyn drożdżowy', 'Autoliza'], correctAnswerIndex: 0 },
      { question: 'Z jakiego regionu Francji pochodzi tradycyjny ser pleśniowy Roquefort?', answers: ['Roquefort-sur-Soulzon', 'Normandia', 'Prowansja', 'Alzacja'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się tradycyjna hiszpańska metoda serwowania małych porcji różnych dań jako przystawek?', answers: ['Tapas', 'Mezze', 'Antipasti', 'Zakuski'], correctAnswerIndex: 0 },
    ],
  },
  {
    name: 'Ciekawostki ze świata',
    easy: [
      { question: 'Ile kontynentów jest na Ziemi?', answers: ['7', '6', '5', '8'], correctAnswerIndex: 0 },
      { question: 'Jaki jest najmniejszy kraj świata pod względem powierzchni?', answers: ['Watykan', 'Monako', 'San Marino', 'Malta'], correctAnswerIndex: 0 },
      { question: 'Jaki język ma najwięcej native speakerów na świecie?', answers: ['Chiński (mandaryński)', 'Angielski', 'Hiszpański', 'Hindi'], correctAnswerIndex: 0 },
      { question: 'Ile dni ma rok przestępny?', answers: ['366', '365', '364', '367'], correctAnswerIndex: 0 },
      { question: 'Jaki jest obecnie najludniejszy kraj świata?', answers: ['Indie', 'Chiny', 'USA', 'Indonezja'], correctAnswerIndex: 0 },
      { question: 'Ile ścian ma sześcian?', answers: ['6', '8', '4', '12'], correctAnswerIndex: 0 },
      { question: 'Jaka waluta jest najczęściej używana w handlu międzynarodowym?', answers: ['Dolar amerykański', 'Euro', 'Jen', 'Funt'], correctAnswerIndex: 0 },
      { question: 'Jaki jest symbol chemiczny sodu?', answers: ['Na', 'So', 'S', 'N'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi liczba Pi w zaokrągleniu do dwóch miejsc po przecinku?', answers: ['3,14', '3,41', '3,12', '3,16'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najdłuższy mur zbudowany przez człowieka?', answers: ['Wielki Mur Chiński', 'Mur Hadriana', 'Mur Berliński', 'Mur Trzech Granic'], correctAnswerIndex: 0 },
    ],
    medium: [
      { question: 'Ile wynosi w przybliżeniu liczba państw członkowskich ONZ?', answers: ['193', '180', '200', '150'], correctAnswerIndex: 0 },
      { question: 'Który język jest oficjalny w największej liczbie krajów świata?', answers: ['Angielski', 'Francuski', 'Hiszpański', 'Arabski'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi standardowa liczba klatek na sekundę w klasycznym filmie kinowym?', answers: ['24', '30', '25', '60'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najstarsza nieprzerwanie działająca uczelnia wyższa na świecie?', answers: ['Uniwersytet Boloński', 'Uniwersytet Oksfordzki', 'Uniwersytet Karola w Pradze', 'Uniwersytet Paryski'], correctAnswerIndex: 0 },
      { question: 'Ile wynosi temperatura wrzenia wody na poziomie morza?', answers: ['100°C', '90°C', '110°C', '120°C'], correctAnswerIndex: 0 },
      { question: 'Który kraj jest największym producentem kawy na świecie?', answers: ['Brazylia', 'Kolumbia', 'Wietnam', 'Etiopia'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najdłuższa linia kolejowa na świecie, łącząca Moskwę z Władywostokiem?', answers: ['Kolej transsyberyjska', 'Orient Express', 'Kolej Transkontynentalna', 'Kolej Hedżaska'], correctAnswerIndex: 0 },
      { question: 'Ile liter ma podstawowy alfabet łaciński używany np. w języku angielskim?', answers: ['26', '24', '28', '30'], correctAnswerIndex: 0 },
      { question: 'Który kraj jako pierwszy na świecie przyznał kobietom prawa wyborcze?', answers: ['Nowa Zelandia', 'Finlandia', 'USA', 'Wielka Brytania'], correctAnswerIndex: 0 },
      { question: 'Jaki system pisma ma na świecie najwięcej użytkowników?', answers: ['Alfabet łaciński', 'Cyrylica', 'Pismo chińskie', 'Alfabet arabski'], correctAnswerIndex: 0 },
    ],
    hard: [
      { question: 'Ile wynosi obecna liczba państw członkowskich ONZ?', answers: ['193', '195', '196', '197'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko, gdy w rejonach polarnych dzień lub noc trwa nieprzerwanie ponad 24 godziny?', answers: ['Dzień/noc polarna', 'Zorza polarna', 'Przesilenie', 'Równonoc'], correctAnswerIndex: 0 },
      { question: 'Który kraj ma najwięcej stref czasowych, licząc terytoria zamorskie?', answers: ['Francja', 'Rosja', 'USA', 'Wielka Brytania'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najstarszy nieprzerwanie działający parlament na świecie, funkcjonujący od X wieku w Islandii?', answers: ['Althing', 'Witenagemot', 'Sejm', 'Kortezy'], correctAnswerIndex: 0 },
      { question: 'Który kraj jako pierwszy wprowadził nowoczesną walutę dziesiętną (w 1704 roku)?', answers: ['Rosja', 'Francja', 'USA', 'Wielka Brytania'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się zjawisko optyczne powodujące widoczność kolorowych łuków na niebie po deszczu?', answers: ['Tęcza', 'Halo', 'Zorza', 'Fatamorgana'], correctAnswerIndex: 0 },
      { question: 'Który kraj ma najdłuższą linię brzegową na świecie?', answers: ['Kanada', 'Rosja', 'Indonezja', 'Norwegia'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się największa na świecie biblioteka pod względem liczby zgromadzonych pozycji?', answers: ['Biblioteka Kongresu USA', 'Biblioteka Brytyjska', 'Biblioteka Aleksandryjska', 'Biblioteka Watykańska'], correctAnswerIndex: 0 },
      { question: 'Który kraj jako jedyny na świecie ma oficjalną flagę o kształcie innym niż prostokąt?', answers: ['Nepal', 'Szwajcaria', 'Watykan', 'Bhutan'], correctAnswerIndex: 0 },
      { question: 'Jak nazywa się najgłębszy znany punkt oceanów na Ziemi, położony na Pacyfiku?', answers: ['Rów Mariański (Głębia Challengera)', 'Rów Portoryko', 'Rów Japoński', 'Rów Kermadec'], correctAnswerIndex: 0 },
    ],
  },
];

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

const questionsByDifficultyKey = (category: CategorySeed): Record<RiskDifficulty, QuestionSeed[]> => ({
  [RiskDifficulty.EASY]: category.easy,
  [RiskDifficulty.MEDIUM]: category.medium,
  [RiskDifficulty.HARD]: category.hard,
});

async function main() {
  let totalCreatedStations = 0;

  for (const categorySeed of categories) {
    const category = await prisma.riskCategory.upsert({
      where: { name: categorySeed.name },
      update: {},
      create: { name: categorySeed.name },
    });

    console.log(`Kategoria "${category.name}" (${category.id}) gotowa.`);

    const questionsByDifficulty = questionsByDifficultyKey(categorySeed);

    for (const difficulty of [RiskDifficulty.EASY, RiskDifficulty.MEDIUM, RiskDifficulty.HARD]) {
      const existingCount = await prisma.riskPoolStation.count({
        where: { categoryId: category.id, difficulty },
      });

      if (existingCount >= 10) {
        console.log(
          `  Pula "${labelByDifficulty[difficulty]}" ma już ${existingCount} zadań — pomijam dodawanie.`,
        );
        continue;
      }

      for (const [index, quiz] of questionsByDifficulty[difficulty].entries()) {
        const station = await prisma.station.create({
          data: {
            name: `${categorySeed.name} (${labelByDifficulty[difficulty]}) #${index + 1}`,
            type: StationType.QUIZ,
            description: `Pytanie quizowe z kategorii ${categorySeed.name} — poziom: ${labelByDifficulty[difficulty]}.`,
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

        totalCreatedStations += 1;
      }

      console.log(
        `  Dodano ${questionsByDifficulty[difficulty].length} zadań do puli "${labelByDifficulty[difficulty]}".`,
      );
    }
  }

  console.log(`Gotowe: utworzono ${totalCreatedStations} stanowisk w ${categories.length} kategoriach.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
