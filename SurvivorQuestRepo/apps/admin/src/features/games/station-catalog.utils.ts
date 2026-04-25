import type { Station, StationType } from "./types/station";
import { stationTypeOptions } from "./types/station";
import { getStationTypeLabel } from "./station.utils";

type FilterStationsCatalogArgs = {
  stations: Station[];
  searchQuery: string;
  selectedTypes: StationType[];
};

export type StationCatalogItem = {
  name: string;
  description: string;
  type: StationType;
};

export type StationGroup = {
  type: StationType;
  label: string;
  stations: Station[];
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildStationSearchText(station: StationCatalogItem) {
  return normalizeSearchValue(
    [station.name, station.description, getStationTypeLabel(station.type)].join(" "),
  );
}

type FilterStationCatalogItemsArgs<T extends StationCatalogItem> = {
  items: T[];
  searchQuery: string;
  selectedTypes: StationType[];
};

export function filterStationCatalogItems<T extends StationCatalogItem>({
  items,
  searchQuery,
  selectedTypes,
}: FilterStationCatalogItemsArgs<T>) {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  const selectedTypeSet = selectedTypes.length > 0 ? new Set(selectedTypes) : null;

  return items.filter((item) => {
    if (selectedTypeSet && !selectedTypeSet.has(item.type)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return buildStationSearchText(item).includes(normalizedQuery);
  });
}

export function filterStationsCatalog({
  stations,
  searchQuery,
  selectedTypes,
}: FilterStationsCatalogArgs) {
  return filterStationCatalogItems({
    items: stations,
    searchQuery,
    selectedTypes,
  });
}

const stationTypeOrder = new Map(
  stationTypeOptions.map((option, index) => [option.value, index]),
);

export function groupStationsByType(stations: Station[]): StationGroup[] {
  const grouped = new Map<StationType, Station[]>();

  stations.forEach((station) => {
    const current = grouped.get(station.type);
    if (current) {
      current.push(station);
      return;
    }
    grouped.set(station.type, [station]);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => {
      const leftOrder = stationTypeOrder.get(left[0]) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = stationTypeOrder.get(right[0]) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    })
    .map(([type, groupStations]) => ({
      type,
      label: getStationTypeLabel(type),
      stations: groupStations,
    }));
}
