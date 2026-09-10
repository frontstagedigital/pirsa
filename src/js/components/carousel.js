document.addEventListener('DOMContentLoaded', () => {
  const carousels = Array.from(document.querySelectorAll('.js-carousel'));

  // Wait until dots exist, then initial sync
  carousels.forEach((carousel) => {
    const poll = setInterval(() => {
      const nav = carousel.querySelector('.js-carousel__navigation');
      if (!nav) return;
      clearInterval(poll);
      syncNav(nav);
    }, 100);
    setTimeout(() => clearInterval(poll), 5000); // safety cap

    // Re-sync after any click inside the carousel (dots or arrows)
    carousel.addEventListener('click', () => queueSync(carousel));
  });

  // Re-sync on resize (immediate + shortly after to catch rebuilds)
  let resizeTimer;
  window.addEventListener('resize', () => {
    carousels.forEach(queueSync);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => carousels.forEach(queueSync), 200);
  });

  function queueSync(carousel) {
    // next tick (after DS flips classes)...
    requestAnimationFrame(() => {
      const nav = carousel.querySelector('.js-carousel__navigation');
      if (nav) syncNav(nav);
    });
    // ...and again shortly after in case the DS rebuild is async
    setTimeout(() => {
      const nav = carousel.querySelector('.js-carousel__navigation');
      if (nav) syncNav(nav);
    }, 150);
  }

  function syncNav(nav) {
    const selected = nav.querySelector('.nsw-carousel__nav-item--selected');
    if (!selected) return; // don't clear aria until DS marks one selected

    nav.querySelectorAll('.js-carousel__nav-item').forEach((li) => {
      const btn = li.querySelector('button');
      if (!btn) return;
      const isSelected = li.classList.contains('nsw-carousel__nav-item--selected');
      if (isSelected) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  }
});