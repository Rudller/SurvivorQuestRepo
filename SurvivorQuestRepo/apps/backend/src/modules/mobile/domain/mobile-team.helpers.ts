import { BadRequestException } from '@nestjs/common';

export type TeamColor =
  | 'red'
  | 'rose'
  | 'pink'
  | 'magenta'
  | 'violet'
  | 'purple'
  | 'indigo'
  | 'navy'
  | 'blue'
  | 'sky'
  | 'cyan'
  | 'turquoise'
  | 'teal'
  | 'mint'
  | 'aquamarine'
  | 'emerald'
  | 'green'
  | 'lime'
  | 'orange'
  | 'amber'
  | 'gold'
  | 'yellow'
  | 'brown'
  | 'gray'
  | 'slate'
  | 'black'
  | 'white';

export const TEAM_COLORS: TeamColor[] = [
  'red',
  'rose',
  'pink',
  'magenta',
  'violet',
  'purple',
  'indigo',
  'navy',
  'blue',
  'sky',
  'cyan',
  'turquoise',
  'teal',
  'mint',
  'aquamarine',
  'emerald',
  'green',
  'lime',
  'orange',
  'amber',
  'gold',
  'yellow',
  'brown',
  'gray',
  'slate',
  'black',
  'white',
];

export const BADGE_KEYS = [
  'beaver-01',
  'fox-01',
  'owl-01',
  'wolf-01',
  'otter-01',
  'capybara-02',
  'falcon-01',
  'lynx-01',
];

export const FUNNY_TEAM_NAMES = [
  'Turbo Bobry',
  'Galaktyczne Kapibary',
  'Leśne Ninja',
  'Błyskawiczne Borsuki',
  'Szturmowe Wiewióry',
  'Kompasowe Czosnki',
  'Dzikie Lampiony',
  'Sokole Klapki',
  'Niewyspani Tropiciele',
  'Biegnące Jeże',
  'Oddział Chrupka',
  'Ekipa Bez GPS',
];

const LEGACY_BADGE_KEY_TO_ICON: Record<string, string> = {
  'beaver-01': '🦫',
  'fox-01': '🦊',
  'owl-01': '🦉',
  'wolf-01': '🐺',
  'otter-01': '🦦',
  'capybara-02': '🦬',
  'falcon-01': '🦅',
  'lynx-01': '🐯',
};

export function parseTeamColor(color: string): TeamColor {
  if (!TEAM_COLORS.includes(color as TeamColor)) {
    throw new BadRequestException('Invalid team color');
  }

  return color as TeamColor;
}

export function normalizeTeamColor(color?: string | null): TeamColor | null {
  if (!color) {
    return null;
  }

  return TEAM_COLORS.includes(color as TeamColor) ? (color as TeamColor) : null;
}

export function normalizeTeamBadgeKey(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return LEGACY_BADGE_KEY_TO_ICON[trimmed] || trimmed;
}

export function toLowerSafe(value: string | null | undefined) {
  return (value || '').trim().toLowerCase();
}
