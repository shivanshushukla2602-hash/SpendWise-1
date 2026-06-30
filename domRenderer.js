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
