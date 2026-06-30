// domRenderer.js
// Handles DOM animation transitions and row removal effects

/**
 * Triggers a layout reflow on a given element.
 * Reading offsetHeight forces the browser to flush pending style changes,
 * enabling CSS transition animations to fire correctly after class toggles.
 * @param {HTMLElement} el - Target element to reflow
 */
function triggerReflow(el) {
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight; // Force layout reflow
}

/**
 * Animates the removal of a transaction row from the table.
 * Toggles a collapse CSS class on the row and listens for the
 * transition end event before physically removing the element.
 * @param {HTMLElement} rowEl - The table row element to animate out
 * @param {Function} [onComplete] - Optional callback after removal finishes
 */
function animateRemove(rowEl, onComplete) {
  if (!rowEl) return;

  // Set initial height explicitly so CSS transition has a start value
  rowEl.style.height = rowEl.offsetHeight + "px";
  rowEl.style.overflow = "hidden";

  // Force reflow so the browser registers the starting height
  triggerReflow(rowEl);

  // Apply collapse class to trigger CSS transition
  rowEl.classList.add("row--collapsing");

  // Listen for the transition to complete, then remove from DOM
  rowEl.addEventListener(
    "transitionend",
    function handleTransitionEnd(event) {
      // Only act on height transition (ignore opacity, etc.)
      if (event.propertyName === "height") {
        rowEl.removeEventListener("transitionend", handleTransitionEnd);
        rowEl.remove();

        if (typeof onComplete === "function") {
          onComplete();
        }
      }
    }
  );
}

// ─── Transaction Storage Schema ────────────────────────────────────────────

/**
 * Transaction store configuration object.
 * Defines the schema model and maintains the in-memory list of transactions.
 */
const TransactionStore = {
  /** @type {Array<{id: number, name: string, amount: number, type: string, date: string}>} */
  records: [],

  /** Auto-incrementing ID counter for new transactions */
  _nextId: 1,

  /**
   * Schema definition for a single transaction record.
   * Serves as the canonical structure for all transaction objects.
   */
  schema: {
    id: "number",       // Unique auto-generated identifier
    name: "string",     // Transaction label / description
    amount: "number",   // Absolute numeric value
    type: "string",     // 'income' | 'expense'
    date: "string",     // ISO 8601 date string
  },

  /**
   * Initialises the store with an optional array of pre-existing records.
   * Validates each entry against the schema before pushing to the store.
   * @param {Array} initialData - Optional seed data array
   */
  init(initialData = []) {
    this.records = [];
    this._nextId = 1;

    initialData.forEach((entry) => {
      if (this._isValidSchema(entry)) {
        this.records.push({ ...entry, id: this._nextId++ });
      }
    });
  },

  /**
   * Checks whether a given object matches the required schema fields.
   * @param {Object} obj - Object to validate
   * @returns {boolean} True if all schema fields are present
   */
  _isValidSchema(obj) {
    return Object.keys(this.schema).every(
      (key) => key === "id" || key in obj
    );
  },
};
