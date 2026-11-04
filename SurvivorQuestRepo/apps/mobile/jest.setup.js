/* global jest */
// AsyncStorage nie ma modułu natywnego w Jest, a importują go już komponenty
// wspólne (np. skaner QR zapamiętuje wybraną kamerę). Bez tej atrapy padały
// całe zestawy testów, które tylko pośrednio ładują taki komponent. Testy z
// własnym jest.mock dla AsyncStorage nadal go nadpisują.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
