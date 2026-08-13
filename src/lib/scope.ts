// Division + plant filter cookies. Unlike the persona cookie these are never
// read by the proxy — division is a filter, not a route guard — but they're
// stored the same way so a reload or a persona switch keeps the scope you
// were looking at.

import {
  ALL_DIVISIONS,
  isDivisionFilter,
  isPlantId,
  type DivisionFilter,
  type PlantId,
} from "@/types/division";

export const DIVISION_COOKIE = "shaw_division";
export const PLANT_COOKIE = "shaw_plant";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export const SCOPE_CHANGE_EVENT = "shaw:scope-change";

/** Default landing scope — Plant 12 Aiken is the plant the demo narrative
 *  runs on (Backing 2, dye lot DL-4471). */
export const DEFAULT_DIVISION: DivisionFilter = ALL_DIVISIONS;
export const DEFAULT_PLANT: PlantId = "p12";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${ONE_WEEK_SECONDS};samesite=lax`;
}

export function clientReadDivision(): DivisionFilter | null {
  const value = readCookie(DIVISION_COOKIE);
  return isDivisionFilter(value ?? undefined) ? (value as DivisionFilter) : null;
}

export function clientSetDivision(division: DivisionFilter) {
  writeCookie(DIVISION_COOKIE, division);
}

export function clientReadPlant(): PlantId | null {
  const value = readCookie(PLANT_COOKIE);
  return isPlantId(value ?? undefined) ? (value as PlantId) : null;
}

export function clientSetPlant(plant: PlantId) {
  writeCookie(PLANT_COOKIE, plant);
}
