// Luhn algorithm for credit card validation
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '').split('').map(Number);
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Generate a valid credit card number from BIN
export function generateCardNumber(bin: string): string {
  // Replace 'x' with random digits
  let cardNumber = bin.replace(/x/gi, () => Math.floor(Math.random() * 10).toString());
  
  // If length is less than 16, pad with random digits
  while (cardNumber.length < 15) {
    cardNumber += Math.floor(Math.random() * 10);
  }

  // Calculate check digit using Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return cardNumber + checkDigit;
}

// Generate expiration date
export function generateExpirationDate(month?: string, year?: string): { month: string; year: string } {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let expMonth = month || String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  let expYear = year || String(currentYear + Math.floor(Math.random() * 5) + 1);

  // Ensure month is valid
  if (parseInt(expMonth) < 1 || parseInt(expMonth) > 12) {
    expMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  }

  // Ensure year is in the future
  if (parseInt(expYear) < currentYear || 
      (parseInt(expYear) === currentYear && parseInt(expMonth) < currentMonth)) {
    expYear = String(currentYear + Math.floor(Math.random() * 5) + 1);
  }

  return { month: expMonth.padStart(2, '0'), year: expYear };
}

// Generate CVV
export function generateCVV(customCVV?: string): string {
  if (customCVV && /^\d{3,4}$/.test(customCVV)) {
    return customCVV;
  }
  return String(Math.floor(Math.random() * 900) + 100);
}

// Format card for display
export function formatCard(cardNumber: string, month: string, year: string, cvv: string): string {
  return `${cardNumber}|${month}|${year}|${cvv}`;
}

// Validate BIN format
export function isValidBIN(bin: string): boolean {
  return /^[\dxX]{6,16}$/.test(bin);
}

// Extract similarity pattern from two cards
export function extractSimilarityPattern(card1: string, card2: string): string {
  const clean1 = card1.replace(/\D/g, '');
  const clean2 = card2.replace(/\D/g, '');
  
  if (clean1.length !== clean2.length) {
    return '';
  }

  let pattern = '';
  for (let i = 0; i < clean1.length; i++) {
    pattern += clean1[i] === clean2[i] ? clean1[i] : 'x';
  }

  return pattern;
}

// Generate possible extrapolations from a card
export function generateExtrapolations(card: string): string[] {
  const parts = card.split('|');
  if (parts.length < 1) return [];

  const cardNumber = parts[0].replace(/\D/g, '');
  const patterns: string[] = [];

  // Generate different patterns
  for (let i = 6; i <= 12; i++) {
    const known = cardNumber.substring(0, i);
    const unknown = 'x'.repeat(16 - i);
    patterns.push(known + unknown);
  }

  return patterns;
}

// Get card brand from BIN
export function getCardBrand(bin: string): string {
  const firstDigit = bin[0];
  const firstTwo = bin.substring(0, 2);
  const firstFour = bin.substring(0, 4);

  if (firstDigit === '4') return 'Visa';
  if (['51', '52', '53', '54', '55'].includes(firstTwo)) return 'Mastercard';
  if (firstTwo === '34' || firstTwo === '37') return 'American Express';
  if (firstTwo === '36' || firstTwo === '38' || firstFour === '3095') return 'Diners Club';
  if (firstFour === '6011' || firstTwo === '65') return 'Discover';
  if (firstFour === '3528' || firstFour === '3589') return 'JCB';

  return 'Unknown';
}
