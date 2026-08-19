/**
 * Shaw's product book, as the supply-chain app names it.
 *
 * The same taxonomy on purpose: a person moving between the two apps is
 * looking at one company, and a category that is called "Broadloom carpet"
 * in one place and "Residential Carpet" in the other reads as two companies.
 *
 * Only broadloom is loaded here. This app schedules tufted broadloom —
 * tufting, then a beck or continuous range, then backing, then finishing,
 * measured in linear yards and cut into rolls. Carpet tile is modular goods
 * out of Cartersville and belongs to the commercial book, which is why the
 * plant model in this prototype is the three residential mills and nothing
 * else. The rest of the list is shown so the bar reads as Shaw's catalogue
 * rather than a one-item menu, and carries no plants.
 */
export const ALL_CATEGORIES = "all" as const;

export interface Category {
  id: string;
  /** Key into TopBar's glyph map — the data must not import components. */
  icon: string;
  label: string;
  /** Whether this prototype actually holds plants for it. */
  loaded?: boolean;
}

export const CATEGORIES: ReadonlyArray<Category> = [
  { id: ALL_CATEGORIES, icon: "SquaresFour", label: "All categories", loaded: true },
  { id: "broadloom", icon: "Scroll", label: "Broadloom carpet", loaded: true },
  { id: "carpet-tile", icon: "GridFour", label: "Carpet tile" },
  { id: "resilient", icon: "RowsPlusBottom", label: "Resilient" },
  { id: "hardwood", icon: "Tree", label: "Hardwood" },
  { id: "laminate", icon: "Stack", label: "Laminate" },
  { id: "tile-stone", icon: "Wall", label: "Tile & stone" },
  { id: "turf", icon: "Plant", label: "Synthetic turf" },
  { id: "yarn", icon: "Spiral", label: "Yarn" },
];

/** The one category this prototype schedules. */
export const DEFAULT_CATEGORY = "broadloom";

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
