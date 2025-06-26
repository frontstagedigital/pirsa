// handles single accordion marigns

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('section.accordion-single').forEach((section) => {
    // Get previous and next siblings
    const prev = section.previousElementSibling;
    const next = section.nextElementSibling;

    // ---- TOP MARGIN LOGIC ----
    if (
      prev?.matches('section.nsw-section.no-padding') &&
      prev.querySelector('.nsw-container')?.innerHTML.trim() === ''
    ) {
      const prevPrev = prev.previousElementSibling;
      if (prevPrev?.classList.contains('accordion-single')) {
        section.style.marginTop = '0.5rem';
      }
    }

    // ---- BOTTOM MARGIN LOGIC ----
    if (
      next?.matches('section.nsw-section.no-padding') &&
      next.querySelector('.nsw-container')?.innerHTML.trim() === ''
    ) {
      const nextNext = next.nextElementSibling;
      if (nextNext?.classList.contains('accordion-single')) {
        section.style.marginBottom = '0.5rem';
      }
    }
  });
});