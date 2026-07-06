/**
 * Normalizes a phone number based on the selected country code.
 * Strips whitespace, spaces, hyphens, brackets, dots, and duplicate country codes.
 *
 * @param {string} rawInput - The raw input entered by the user
 * @param {string} countryCode - The selected country code (e.g. "+91")
 * @returns {string} The cleaned national phone number
 */
export const normalizePhoneNumber = (rawInput, countryCode) => {
  if (!rawInput) return '';
  
  // 1. Trim whitespace
  let cleaned = rawInput.trim();
  
  // 2. Remove common formatting characters
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
  
  // 3. Keep leading '+' if present (for checking later) but strip other non-digits
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.replace(/\D/g, '');
  } else {
    cleaned = cleaned.replace(/\D/g, '');
  }

  const codeDigits = countryCode.replace('+', ''); // e.g. "91"
  
  // Define expected national length per country code
  let expectedLength = 10;
  if (countryCode === '+61' || countryCode === '+971') {
    expectedLength = 9;
  }

  // 4. Iteratively remove duplicate country code prefix (e.g., if user pastes +91+91xxxxxxxxxx)
  let previousCleaned = '';
  while (cleaned !== previousCleaned) {
    previousCleaned = cleaned;
    
    if (cleaned.startsWith(countryCode)) {
      cleaned = cleaned.slice(countryCode.length);
    } else if (cleaned.startsWith('+' + codeDigits)) {
      cleaned = cleaned.slice(('+' + codeDigits).length);
    } else if (cleaned.startsWith(codeDigits) && codeDigits !== '') {
      // Avoid stripping valid leading digits if they match the country code but the length isn't extra
      if (cleaned.length > expectedLength) {
        cleaned = cleaned.slice(codeDigits.length);
      }
    }
  }

  // 5. Final check to remove any stray '+' characters
  cleaned = cleaned.replace(/\+/g, '');

  return cleaned;
};

/**
 * Normalizes an Indian national mobile number (e.g., for emergency/guardian contacts).
 * Strips leading country code "91" or prefix "0" if they are present.
 *
 * @param {string} raw - The raw input
 * @returns {string} Standardized 10-digit national number
 */
export const normalizeIndianNationalNumber = (raw) => {
  if (!raw) return '';
  
  let cleaned = raw.replace(/\D/g, ''); // Numeric digits only
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  
  return cleaned;
};

/**
 * Validates a normalized national phone number based on the country code.
 *
 * @param {string} nationalNumber - Normalized national number
 * @param {string} countryCode - Selected country code
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validatePhoneNumber = (nationalNumber, countryCode) => {
  if (!nationalNumber) {
    return { isValid: false, error: 'Please enter your mobile number.' };
  }
  
  if (!/^\d+$/.test(nationalNumber)) {
    return { isValid: false, error: 'Please enter a valid mobile number. Only digits are allowed.' };
  }

  if (countryCode === '+91') {
    if (nationalNumber.length !== 10) {
      return { isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    // Indian mobile numbers must start with 6, 7, 8, or 9
    if (!/^[6-9]/.test(nationalNumber)) {
      return { isValid: false, error: 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.' };
    }
  } else if (countryCode === '+1') {
    if (nationalNumber.length !== 10) {
      return { isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
  } else if (countryCode === '+44') {
    if (nationalNumber.length !== 10) {
      return { isValid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
  } else if (countryCode === '+61') {
    if (nationalNumber.length !== 9) {
      return { isValid: false, error: 'Please enter a valid 9-digit mobile number.' };
    }
  } else if (countryCode === '+971') {
    if (nationalNumber.length !== 9) {
      return { isValid: false, error: 'Please enter a valid 9-digit mobile number.' };
    }
  } else {
    if (nationalNumber.length < 8 || nationalNumber.length > 15) {
      return { isValid: false, error: 'Please enter a valid mobile number.' };
    }
  }

  return { isValid: true, error: null };
};
