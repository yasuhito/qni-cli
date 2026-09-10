/** Quantum-computing macros contributed to pi-formula by qni-cli. */
export const quantumMacros = {
  ket: ["\\left|#1\\right\\rangle", 1],
  bra: ["\\left\\langle#1\\right|", 1],
  braket: ["\\left\\langle#1\\right\\rangle", 1]
} as const;
