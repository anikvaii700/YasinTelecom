/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OperatorInfo {
  name: string;
  nameBn: string;
  code: string;
  color: string;
  bgLight: string;
}

const OPERATORS: Record<string, OperatorInfo> = {
  gp: {
    name: 'Grameenphone',
    nameBn: 'গ্রামীণফোন',
    code: 'GP',
    color: '#0070BA',
    bgLight: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  bl: {
    name: 'Banglalink',
    nameBn: 'বাংলালিংক',
    code: 'BL',
    color: '#FF6600',
    bgLight: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
  },
  robi: {
    name: 'Robi',
    nameBn: 'রবি',
    code: 'ROBI',
    color: '#ED1C24',
    bgLight: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  airtel: {
    name: 'Airtel',
    nameBn: 'এয়ারটেল',
    code: 'AIRTEL',
    color: '#E40000',
    bgLight: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  },
  tt: {
    name: 'Teletalk',
    nameBn: 'টেলিটক',
    code: 'TT',
    color: '#009944',
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
};

/**
 * Normalizes any Bangladesh phone input into canonical international format: +8801XXXXXXXXX
 */
export function normalizeBDMobile(raw: string): string {
  if (!raw) return '';
  // Strip whitespace, hyphens, dots, parentheses
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle leading 00880
  if (cleaned.startsWith('00880')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle 880 without plus
  if (cleaned.startsWith('8801') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // Handle local 01XXXXXXXXX
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '+88' + cleaned;
  }

  return cleaned;
}

/**
 * Formats a normalized or local phone into standard display format: 01XXX-XXXXXX
 */
export function formatBDPhoneDisplay(phone: string): string {
  const norm = normalizeBDMobile(phone);
  if (norm.startsWith('+8801') && norm.length === 14) {
    const local = norm.slice(3); // 01XXXXXXXXX
    return `${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return phone;
}

/**
 * Validates whether string is a genuine Bangladesh mobile number
 */
export function isValidBDMobile(raw: string): boolean {
  const normalized = normalizeBDMobile(raw);
  // Canonical form: +8801[3-9]\d{8}
  const regex = /^\+8801[3-9]\d{8}$/;
  return regex.test(normalized);
}

/**
 * Detects the operator from number prefix
 */
export function getBDOperator(raw: string): OperatorInfo | null {
  const normalized = normalizeBDMobile(raw);
  if (!normalized.startsWith('+8801') || normalized.length < 7) {
    return null;
  }

  const prefix = normalized.slice(5, 7); // Digits after +8801
  // Full prefix: 01 + prefix
  const fullPrefix = '01' + prefix;

  if (fullPrefix === '017' || fullPrefix === '013') {
    return OPERATORS.gp;
  }
  if (fullPrefix === '018') {
    return OPERATORS.robi;
  }
  if (fullPrefix === '019' || fullPrefix === '014') {
    return OPERATORS.bl;
  }
  if (fullPrefix === '016') {
    return OPERATORS.airtel;
  }
  if (fullPrefix === '015') {
    return OPERATORS.tt;
  }

  return null;
}
