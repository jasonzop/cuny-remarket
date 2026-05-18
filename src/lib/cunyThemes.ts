export type CunyTheme = {
  name: string;
  slug: string;
  badge: string;
  short: string;
  primary: string;
  accent: string;
  bg: string;
  onAcc: string;
  textOnPrimary: string;
};

export const CUNY_THEMES: CunyTheme[] = [
  {
    name: "Hunter College",
    slug: "hunter",
    badge: "H",
    short: "Hunter",
    primary: "#5f2d90",
    accent: "#FFD200",
    bg: "#f8efde",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "Baruch College",
    slug: "baruch",
    badge: "B",
    short: "Baruch",
    primary: "#1d4f91",
    accent: "#8fd3ff",
    bg: "#e6effa",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "City College",
    slug: "city-college",
    badge: "CC",
    short: "CCNY",
    primary: "#512d6d",
    accent: "#c99700",
    bg: "#f0eaf3",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "Brooklyn College",
    slug: "brooklyn",
    badge: "B",
    short: "Brooklyn",
    primary: "#7a1731",
    accent: "#FFC72C",
    bg: "#fbf0d8",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "Queens College",
    slug: "queens",
    badge: "Q",
    short: "Queens",
    primary: "#004b8d",
    accent: "#c7d3df",
    bg: "#e8eef4",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "John Jay College",
    slug: "john-jay",
    badge: "JJ",
    short: "John Jay",
    primary: "#003a70",
    accent: "#f7c948",
    bg: "#ece8de",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "Lehman College",
    slug: "lehman",
    badge: "L",
    short: "Lehman",
    primary: "#4b2e83",
    accent: "#d6b85a",
    bg: "#eaf2eb",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "College of Staten Island",
    slug: "staten-island",
    badge: "CSI",
    short: "CSI",
    primary: "#005a9c",
    accent: "#f58220",
    bg: "#e6effa",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "NYC College of Technology",
    slug: "city-tech",
    badge: "CT",
    short: "City Tech",
    primary: "#003b71",
    accent: "#f6a800",
    bg: "#fff5cc",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
  {
    name: "Other CUNY Campus",
    slug: "other-cuny",
    badge: "C",
    short: "CUNY",
    primary: "#1f3d6d",
    accent: "#9fc5e8",
    bg: "#e8eef4",
    onAcc: "#1a1216",
    textOnPrimary: "#ffffff",
  },
];

export const DEFAULT_CUNY_THEME = CUNY_THEMES[0];

export function getCunyThemeByName(name?: string | null) {
  return (
    CUNY_THEMES.find((theme) => theme.name === name) ?? DEFAULT_CUNY_THEME
  );
}
