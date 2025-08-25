document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // handle multiple carousels on a page
    document.querySelectorAll('.js-carousel').forEach((carousel) => {
      const nav = carousel.querySelector('.js-carousel__navigation');
      if (!nav) return;

      // sync aria-current on nav buttons to --selected class
      const sync = () => {
        nav.querySelectorAll('.js-carousel__nav-item').forEach((li) => {
          const btn = li.querySelector('button');
          if (!btn) return;
          if (li.classList.contains('nsw-carousel__nav-item--selected')) {
            btn.setAttribute('aria-current', 'true');
          } else {
            btn.removeAttribute('aria-current');
          }
        });
      };

      // initial pass for this carousel
      sync();

      // resync on nav or control click
      nav.addEventListener('click', () => setTimeout(sync, 0));
      carousel.querySelectorAll('.js-carousel__control').forEach((ctrl) => {
        ctrl.addEventListener('click', () => setTimeout(sync, 0));
      });
    });
  }, 200); // delay to allow DS to inject dots
});