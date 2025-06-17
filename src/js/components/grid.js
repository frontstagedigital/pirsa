document.addEventListener("DOMContentLoaded", function () {
  const gridSelector = '.js-nsw-grid-auto';
  const colSelector  = '.nsw-col';

  const grids = document.querySelectorAll(gridSelector);
  if (!grids.length) return;

  grids.forEach(grid => {
    // collect each .nsw-col’s element, breakpoint and its existing size class
    const cols = Array.from(grid.querySelectorAll(colSelector)).map(col => {
      const matches = Array.from(col.classList)
        .map(c => c.match(/^nsw-col-([a-z]+)-(\d+)$/))
        .filter(Boolean);
      if (!matches.length) return null;

      const [ , bp, size ] = matches.pop();
      return {
        el: col,
        bp,
        oldClass: `nsw-col-${bp}-${size}`
      };
    }).filter(Boolean);

    const count = cols.length;
    if (count <= 1) return;  // nothing to do if only one column

    // pick new size based on number of columns
    let newSize;
    if (count === 2)      newSize = 6;
    else if (count === 3) newSize = 4;
    else if (count === 4) newSize = 3;
    else if (count === 5) newSize = 4;
    else /* count >= 6 */ newSize = 3;

    // swap out each col’s old class for the new one
    cols.forEach(({ el, bp, oldClass }) => {
      el.classList.remove(oldClass);
      el.classList.add(`nsw-col-${bp}-${newSize}`);
    });
  });
});
