// formHandler.js
// Handles transaction form input validation and data processing

/**
 * Validates a transaction entry before processing.
 * Disallows empty names, checks value ranges, and runs number conversions.
 * @param {string} name - Transaction description name
 * @param {string|number} amount - Transaction amount input
 * @returns {{ valid: boolean, errors: string[] }} Validation result object
 */
function validateTransaction(name, amount) {
  const errors = [];

  // Block empty name fields
  if (!name || name.trim().length === 0) {
    errors.push("Transaction name cannot be empty.");
  }

  // Block names that are only whitespace
  if (name && name.trim().length > 0 && name.trim().length < 2) {
    errors.push("Transaction name must be at least 2 characters.");
  }

  // Parse and validate amount
  const parsedAmount = parseAmount(amount);
  if (isNaN(parsedAmount)) {
    errors.push("Amount must be a valid number.");
  }

  // Disallow zero and negative values
  if (!isNaN(parsedAmount) && parsedAmount === 0) {
    errors.push("Amount cannot be zero.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Converts a raw input string to a numeric amount value.
 * Strips currency symbols and whitespace before conversion.
 * @param {string|number} raw - Raw input value from form field
 * @returns {number} Parsed float value or NaN on failure
 */
function parseAmount(raw) {
  if (typeof raw === "number") return raw;

  // Strip currency symbols, commas, and surrounding whitespace
  const cleaned = String(raw)
    .replace(/[₹$€£,]/g, "")
    .trim();

  return parseFloat(cleaned);
}
