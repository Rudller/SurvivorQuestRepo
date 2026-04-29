import type { Station, StationType } from "./types/station";
import { getStationTypeLabel } from "./station.utils";

type FilterStationsCatalogArgs = {
  stations: Station[];
  searchQuery: string;
  selectedCategories?: string[];
  selectedTypes?: StationType[];
};

export type StationCatalogItem = {
  name: string;
  description: string;
  type: StationType;
  categories?: string[];
};

export type StationGroup = {
  category: string;
  label: string;
  stations: Station[];
};

export const uncategorizedStationGroupKey = "__uncategorized__";
const uncategorizedStationGroupLabel = "Bez kategorii";

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buildStationSearchText(station: StationCatalogItem) {
  return normalizeSearchValue(
    [station.name, station.description, getStationTypeLabel(station.type), ...(station.categories ?? [])].join(" "),
  );
}

type FilterStationCatalogItemsArgs<T extends StationCatalogItem> = {
  items: T[];
  searchQuery: string;
  selectedCategories?: string[];
  selectedTypes?: StationType[];
};

export function getStationGroupCategories(station: Pick<StationCatalogItem, "categories">) {
  const categories = station.categories?.map((category) => category.trim()).filter(Boolean) ?? [];
  return categories.length > 0 ? categories : [uncategorizedStationGroupKey];
}

export function filterStationCatalogItems<T extends StationCatalogItem>({
  items,
  searchQuery,
  selectedCategories,
  selectedTypes,
}: FilterStationCatalogItemsArgs<T>) {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  const selectedTypeSet = selectedTypes?.length ? new Set(selectedTypes) : null;
  const selectedCategorySet = selectedCategories?.length ? new Set(selectedCategories) : null;

  return items.filter((item) => {
    if (selectedTypeSet && !selectedTypeSet.has(item.type)) {
      return false;
    }

    if (selectedCategorySet && !getStationGroupCategories(item).some((category) => selectedCategorySet.has(category))) {
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
  selectedCategories,
  selectedTypes,
}: FilterStationsCatalogArgs) {
  return filterStationCatalogItems({
    items: stations,
    searchQuery,
    selectedCategories,
    selectedTypes,
  });
}

export function groupStationsByCategory(stations: Station[]): StationGroup[] {
  const grouped = new Map<string, Station[]>();

  stations.forEach((station) => {
    getStationGroupCategories(station).forEach((category) => {
      const current = grouped.get(category);
      if (current) {
        current.push(station);
        return;
      }
      grouped.set(category, [station]);
    });
  });

  return Array.from(grouped.entries())
    .sort((left, right) => {
      if (left[0] === uncategorizedStationGroupKey) {
        return 1;
      }
      if (right[0] === uncategorizedStationGroupKey) {
        return -1;
      }
      return left[0].localeCompare(right[0], "pl", { sensitivity: "base" });
    })
    .map(([category, groupStations]) => ({
      category,
      label: category === uncategorizedStationGroupKey ? uncategorizedStationGroupLabel : category,
      stations: groupStations,
    }));
}
