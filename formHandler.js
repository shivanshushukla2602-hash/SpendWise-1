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

/**
 * Generates a table row element for a transaction log entry.
 * Appends detail tags, index properties, and formatted currency strings.
 * @param {Object} transaction - Transaction data object
 * @param {number} transaction.id - Unique transaction index
 * @param {string} transaction.name - Transaction description
 * @param {number} transaction.amount - Transaction amount value
 * @param {string} transaction.type - Transaction type: 'income' or 'expense'
 * @param {string} transaction.date - ISO date string of transaction
 * @param {number} index - Row index in the current list
 * @returns {HTMLTableRowElement} Constructed table row element
 */
function renderTransactionRow(transaction, index) {
  const { id, name, amount, type, date } = transaction;

  const row = document.createElement("tr");
  row.setAttribute("data-id", id);
  row.setAttribute("data-index", index);
  row.classList.add("transaction-row", `transaction-row--${type}`);

  // Format currency string with sign indicator
  const sign = type === "income" ? "+" : "-";
  const formattedAmount = `${sign}₹${Math.abs(amount).toFixed(2)}`;

  // Format date to readable locale string
  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  row.innerHTML = `
    <td class="tx-index">${index + 1}</td>
    <td class="tx-name">
      <span class="tx-label">${name}</span>
      <span class="tx-date">${formattedDate}</span>
    </td>
    <td class="tx-amount ${type === "income" ? "amount--positive" : "amount--negative"}">
      ${formattedAmount}
    </td>
    <td class="tx-actions">
      <button class="btn-delete" data-id="${id}" aria-label="Delete transaction ${name}">
        &times;
      </button>
    </td>
  `;

  return row;
}
