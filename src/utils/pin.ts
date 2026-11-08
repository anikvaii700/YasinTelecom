/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MAX_PIN_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in ms

export interface PinValidationResult {
  isValid: boolean;
  errorKey?: 'pinLengthError' | 'pinWeakError';
  isWeak?: boolean;
}

/**
 * Validates whether the PIN meets the 6-digit numeric requirement and checks for weak patterns
 */
export function validateShopPin(pin: string): PinValidationResult {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return {
      isValid: false,
      errorKey: 'pinLengthError',
    };
  }

  // Check for all identical digits (e.g. 000000, 111111)
  if (/^(\d)\1{5}$/.test(pin)) {
    return {
      isValid: false,
      errorKey: 'pinWeakError',
      isWeak: true,
    };
  }

  // Check for common sequential patterns
  const sequentialPatterns = [
    '012345',
    '123456',
    '234567',
    '345678',
    '456789',
    '987654',
    '876543',
    '765432',
    '654321',
    '543210',
  ];

  if (sequentialPatterns.includes(pin)) {
    return {
      isValid: false,
      errorKey: 'pinWeakError',
      isWeak: true,
    };
  }

  return { isValid: true };
}

/**
 * Generates an official, human-readable unique Shop ID e.g. MSF-7281-01
 */
export function generateShopCode(existingCount = 0): string {
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const sequence = String(existingCount + 1).padStart(2, '0');
  return `MSF-${random4}-${sequence}`;
}

/**
 * Slugifies shop name for friendly URL / identification
 */
export function slugifyShopName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0980-\u09FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
