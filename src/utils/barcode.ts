/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simple, reliable Code 128 Type B Barcode generator for clean SVG rendering
// Code 128 patterns for ASCII 32 to 126
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

const START_B = 104;
const STOP = 106;

export function encodeCode128B(text: string): string {
  const clean = text.replace(/[^\x20-\x7E]/g, '');
  if (!clean) return '111111';

  let checksum = START_B;
  const patternIndices: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    patternIndices.push(code);
    checksum += code * (i + 1);
  }

  const checkDigit = checksum % 103;
  patternIndices.push(checkDigit);
  patternIndices.push(STOP);

  return patternIndices.map((idx) => CODE128_PATTERNS[idx] || '212222').join('');
}

/**
 * Returns an array of bar widths [width, isBlack]
 */
export function generateBarcodeBars(text: string): { width: number; isBlack: boolean }[] {
  const pattern = encodeCode128B(text);
  const bars: { width: number; isBlack: boolean }[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10);
    const isBlack = i % 2 === 0;
    bars.push({ width, isBlack });
  }

  return bars;
}
