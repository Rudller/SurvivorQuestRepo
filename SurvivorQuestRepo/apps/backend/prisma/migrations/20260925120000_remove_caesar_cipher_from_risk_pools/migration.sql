-- Szyfr Cezara wypada z Ryzykantów (RISK_EXCLUDED_STATION_TYPES). Już
-- przypisane stacje znikają z pul, a razem z nimi otwarte i czekające
-- losowania, które by je wciąż podały. Historia podejść (RiskAttempt)
-- zostaje — wskazuje stację, nie wiersz puli.
DELETE FROM "RiskOpenDraw"
WHERE "stationId" IN (SELECT "id" FROM "Station" WHERE "type" = 'CAESAR_CIPHER');

DELETE FROM "RiskPendingDraw"
WHERE "stationId" IN (SELECT "id" FROM "Station" WHERE "type" = 'CAESAR_CIPHER');

DELETE FROM "RiskPoolStation"
WHERE "stationId" IN (SELECT "id" FROM "Station" WHERE "type" = 'CAESAR_CIPHER');
