# Auto-przybliżenie mapy stanowiska + widok satelitarny

## Cel

W panelu admina, przy dodawaniu/edycji stanowisk realizacji, mapa wyboru lokalizacji GPS (`RealizationLocationPickerMap`) zawsze startuje wycentrowana na całej Polsce (zoom 6), więc admin za każdym razem musi ręcznie dojechać/przybliżyć się do właściwego miejsca. Dwie zmiany mają to przyspieszyć:

1. Mapa ma sama przybliżać się do przybliżonej lokalizacji na podstawie już wypełnionego pola "Lokalizacja realizacji".
2. Na mapie ma pojawić się przycisk przełączający widok na satelitarny.

## Zakres

- Dotyczy wyłącznie map w edytorze stanowisk realizacji (`RealizationStationsEditor` → `RealizationLocationPickerMap`), używanych zarówno przy tworzeniu nowej realizacji (`create-realization-form.tsx`), jak i edycji istniejącej (`edit-realization-panel.tsx`).
- Zero zmian w backendzie — geokodowanie idzie bezpośrednio z przeglądarki do darmowego API Nominatim (OpenStreetMap), tak jak kafelki map już dziś są ładowane bezpośrednio z OSM bez pośrednictwa backendu.
- Nie dotyczy pola `location` samej realizacji (tekstowego) — ono pozostaje zwykłym polem tekstowym, tylko dodatkowo wyzwala geokodowanie w tle.

## Auto-przybliżenie mapy

**Wyzwalacz:** `onBlur` pola "Lokalizacja realizacji" (w obu formularzach: tworzenia i edycji). Jeśli pole jest puste, nic się nie dzieje.

**Geokodowanie:** nowy plik `apps/admin/src/features/realizations/realization-geocoding.ts`:
```ts
export async function geocodeLocation(query: string): Promise<{ latitude: number; longitude: number } | null>
```
Wywołuje `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=<query>`, parsuje pierwszy wynik (`lat`/`lon` jako liczby). Zwraca `null` przy braku wyniku, błędzie sieci lub niepoprawnej odpowiedzi — błędy są połykane w tej funkcji (convenience feature, nie pole walidowane, nie ma banera błędu w UI).

**Przepływ danych:**
- `create-realization-form.tsx` i `edit-realization-panel.tsx` dostają nowy stan `locationSuggestedCenter: { latitude: number; longitude: number } | null`, ustawiany po udanym geokodowaniu w handlerze blura pola lokalizacji.
- `locationSuggestedCenter` schodzi w dół jako nowy prop `suggestedCenter` do `RealizationStationsEditor`, a stamtąd do każdej instancji `RealizationLocationPickerMap`.
- W `RealizationLocationPickerMap` nowy prop `suggestedCenter?: { latitude: number; longitude: number }`: używany jako początkowy `center`/`zoom` mapy (zoom 13, poziom miasta) **tylko gdy stanowisko nie ma jeszcze własnych współrzędnych** (`hasCoordinates === false`). Gdy stanowisko już ma pinezkę, `suggestedCenter` jest ignorowany — istniejąca pinezka i tak wygrywa (bez zmian względem obecnego zachowania).
- Zmiana `locationSuggestedCenter` nie przesuwa już otwartych/wyrenderowanych map z ustawioną pinezką — dotyczy tylko początkowego centrowania dla stanowisk bez współrzędnych, więc nie ma ryzyka nadpisania czyjegoś kliknięcia.

## Widok satelitarny

- Lokalny stan w `RealizationLocationPickerMap`: `tileMode: "street" | "satellite"` (domyślnie `"street"`), nieresetowany/niepamiętany między stanowiskami — to czysto wizualna pomoc na czas celowania w pinezkę.
- Nowy przycisk w rogu mapy (nad kafelkami, `position: absolute`, wewnątrz `div` z `position: relative` opakowującym `MapContainer`), etykieta przełącza się "Satelita" / "Mapa".
- Warstwa `TileLayer` przełącza `url`/`attribution` między obecnym OSM (`OSM_TILE_URL`/`OSM_TILE_ATTRIBUTION`) a Esri World Imagery: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, atrybucja `Tiles &copy; Esri`. Darmowe, bez klucza API — ten sam brak-kluczy-API co obecne OSM.

## Obsługa błędów

- Nieudane geokodowanie (literówka, brak wyniku, offline) → mapa zostaje przy dotychczasowym domyślnym widoku (cała Polska, zoom 6); brak komunikatu błędu.
- Nieudane ładowanie kafelków satelitarnych (np. limit Esri) → standardowe zachowanie Leaflet (puste/szare kafelki), bez dodatkowej obsługi.

## Testowanie

Brak testów jednostkowych w adminie (jak w poprzedniej funkcji eksportu/importu). Weryfikacja manualna przez dev server:
1. W formularzu nowej realizacji wpisać "Lokalizacja realizacji" (np. "Kraków, Rynek Główny"), kliknąć poza pole, dodać nowe stanowisko i sprawdzić, że jego mapa startuje przybliżona do Krakowa zamiast całej Polski.
2. Sprawdzić, że stanowisko z już ustawioną pinezką nie zmienia widoku po zmianie pola lokalizacji.
3. Kliknąć przycisk "Satelita" na mapie stanowiska i sprawdzić, że kafelki zmieniają się na widok satelitarny; kliknąć ponownie i sprawdzić powrót do widoku ulicznego.
