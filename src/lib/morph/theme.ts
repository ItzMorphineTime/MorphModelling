// Morph Brand System V2.1 colours for code that cannot read CSS tokens (three.js,
// canvas and SVG drawing). Keep in sync with the tokens in src/styles/globals.css.

export const brand = {
  black: "#0a0a0a", // Morph Black
  signalRed: "#c51622", // Signal Red: motion and change
  studioWhite: "#ffffff", // Studio White
  pivotGold: "#f2b705", // Pivot Gold: the decisive point
  muted: "#6c6c6c", // Muted
  border: "#d4d4d4", // Border
} as const;

export const viewportTheme = {
  background: "#202020", // --ui-viewport
  gridCenter: "#4a4a4a",
  grid: "#303030",
  solidShading: "#a2a2a2",
  // Pivot Gold marks what the user has selected, the scene's decisive point.
  selection: brand.pivotGold,
  wire: brand.muted,
  vertex: "#9d9d9d",
  checkerDark: "#363636",
  checkerLight: brand.border,
} as const;

export const uvTheme = {
  tile: "#1b1b1b",
  tileAlternate: "#202020",
  tileBorder: brand.muted,
  grid: "#363636",
  edge: "#919191",
  selection: brand.pivotGold,
  selectionFill: brand.pivotGold + "30",
  label: "#a9a9a9",
} as const;
