// Division & plant scope for Shaw MFG.
//
// Division is a FILTER, not a permission boundary. Any persona can look at
// any division; picking one narrows the plant list beneath it (the same
// Region → Branch shape the IRIS portal uses in its TopBar). Nothing here
// gates a route — see src/types/persona.ts for that.

export type DivisionId = "residential" | "commercial" | "hardsurface";

/** Sentinel for the unfiltered view. Kept as a string so it can sit in the
 *  same Select as real division ids. */
export const ALL_DIVISIONS = "all" as const;
export type DivisionFilter = DivisionId | typeof ALL_DIVISIONS;

export interface Division {
  id: DivisionId;
  /** Full name for the Select and page headers. */
  name: string;
  /** Compact label for chips and dense table cells. */
  short: string;
  /** What this division actually makes — sets the vocabulary of a page
   *  (dye lots and creels for carpet, press lines for hard surface). */
  product: string;
}

export const DIVISIONS: Record<DivisionId, Division> = {
  residential: {
    id: "residential",
    name: "Residential Carpet",
    short: "Residential",
    product: "Tufted broadloom & carpet tile",
  },
  commercial: {
    id: "commercial",
    name: "Commercial · Contract",
    short: "Commercial",
    product: "Contract broadloom & modular tile",
  },
  hardsurface: {
    id: "hardsurface",
    name: "Hard Surface · LVT",
    short: "Hard Surface",
    product: "Resilient plank & laminate",
  },
};

export const DIVISION_ORDER: ReadonlyArray<DivisionId> = [
  "residential",
  "commercial",
  "hardsurface",
];

export type PlantId =
  | "p04"
  | "p07"
  | "p12"
  | "p15"
  | "p21"
  | "p33";

export interface Plant {
  id: PlantId;
  /** "Plant 12" — the number is how the floor refers to it. */
  code: string;
  /** "Aiken, SC" */
  location: string;
  division: DivisionId;
  /** The line that gates the whole plant. Every hour lost here is lost
   *  everywhere — it's what the engine ranks exceptions against. */
  constraintLine: string;
}

export const PLANTS: Record<PlantId, Plant> = {
  p04: { id: "p04", code: "Plant 04", location: "Dalton, GA", division: "residential", constraintLine: "Tufting 6" },
  p07: { id: "p07", code: "Plant 07", location: "Eton, GA", division: "residential", constraintLine: "Backing 1" },
  p12: { id: "p12", code: "Plant 12", location: "Aiken, SC", division: "commercial", constraintLine: "Backing 2" },
  p15: { id: "p15", code: "Plant 15", location: "Andalusia, AL", division: "commercial", constraintLine: "Finishing 2" },
  p21: { id: "p21", code: "Plant 21", location: "Cartersville, GA", division: "hardsurface", constraintLine: "Press 3" },
  p33: { id: "p33", code: "Plant 33", location: "Ringgold, GA", division: "hardsurface", constraintLine: "Coating 1" },
};

export const PLANT_ORDER: ReadonlyArray<PlantId> = ["p04", "p07", "p12", "p15", "p21", "p33"];

/** "Plant 12 · Aiken, SC" — the label used in the TopBar and page eyebrows. */
export function plantLabel(id: PlantId): string {
  const p = PLANTS[id];
  return `${p.code} · ${p.location}`;
}

/** Plants visible under the current division filter, in stable order. */
export function plantsInDivision(division: DivisionFilter): ReadonlyArray<Plant> {
  const ids =
    division === ALL_DIVISIONS
      ? PLANT_ORDER
      : PLANT_ORDER.filter((id) => PLANTS[id].division === division);
  return ids.map((id) => PLANTS[id]);
}

/** Select items for the division filter, "All divisions" first. */
export function divisionSelectItems(): { label: string; value: string }[] {
  return [
    { label: "All divisions", value: ALL_DIVISIONS },
    ...DIVISION_ORDER.map((id) => ({ label: DIVISIONS[id].name, value: id })),
  ];
}

/** Select items for the plant filter, scoped to the chosen division. */
export function plantSelectItems(division: DivisionFilter): { label: string; value: string }[] {
  return plantsInDivision(division).map((p) => ({
    label: plantLabel(p.id),
    value: p.id,
  }));
}

/** True when the plant still belongs to the chosen division — used to snap
 *  the plant selection back to a valid one after the division changes. */
export function plantMatchesDivision(plant: PlantId, division: DivisionFilter): boolean {
  return division === ALL_DIVISIONS || PLANTS[plant].division === division;
}

export function isDivisionFilter(value: string | undefined): value is DivisionFilter {
  return (
    value === ALL_DIVISIONS ||
    value === "residential" ||
    value === "commercial" ||
    value === "hardsurface"
  );
}

export function isPlantId(value: string | undefined): value is PlantId {
  return value !== undefined && value in PLANTS;
}
