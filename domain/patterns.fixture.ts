// The glider as the evolution tests spell it, and as patterns/glider.cells draws it. Both read this,
// so a change to either side fails a test.
export const GLIDER = [
  [1, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [2, 2],
] as const;
