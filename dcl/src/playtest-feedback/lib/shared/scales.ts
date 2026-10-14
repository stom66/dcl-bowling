// One label per tile, 1 → 5, short to fit. The Question text carries the adjective ("How enjoyable…"),
// so unipolar scales drop it. Bipolar ones keep both ends and the designer's 'Ok' middle.

export type ScaleLabels = readonly [string, string, string, string, string]

const UNIPOLAR = ['Not at all', 'Slightly', 'Moderate', 'Very', 'Extremely'] as const

export const SCALES = {
  EASE: ['Very difficult', 'Difficult', 'Ok', 'Easy', 'Very easy'],
  CLEAR: UNIPOLAR,
  ENJOY: UNIPOLAR,
  INTEREST: UNIPOLAR,
  INTERESTING: UNIPOLAR,
  SATISFIED: ['Very dissatisfied', 'Dissatisfied', 'Ok', 'Satisfied', 'Very satisfied'],
  SATISFY: UNIPOLAR,
  FIT: ['Very poorly', 'Poorly', 'Ok', 'Well', 'Very well'],
  AMOUNT: ['Not at all', 'A little', 'Somewhat', 'A lot', 'A great deal'],
  WELCOME: UNIPOLAR,
  WORTH: UNIPOLAR,
  COMFORT: ['Very uncomfortable', 'Uncomfortable', 'Ok', 'Comfortable', 'Very comfortable'],
  FAIR: ['Very unfair', 'Unfair', 'Ok', 'Fair', 'Very fair'],
  CONFIDENT: UNIPOLAR
} satisfies Record<string, ScaleLabels>

export type ScaleId = keyof typeof SCALES

// a code from SCALES, or five labels of your own, 1 → 5
export type Scale = ScaleId | ScaleLabels

export function scaleLabels(scale: Scale): ScaleLabels {
  return typeof scale === 'string' ? SCALES[scale] : scale
}

// CSV value: the code, or the custom labels joined
export function scaleName(scale: Scale): string {
  return typeof scale === 'string' ? scale : scale.join(' | ')
}
