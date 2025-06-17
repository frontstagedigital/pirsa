document.addEventListener('DOMContentLoaded', function () {
  const resultsBarSortform = document.getElementById('js-results-bar-sort');

  if (resultsBarSortform instanceof HTMLFormElement) {
    const sortSelect = resultsBarSortform.querySelector('select[name="sort"]');

    if (sortSelect instanceof HTMLSelectElement) {
      sortSelect.addEventListener('change', function () { 
        // Disable the select element
        //sortSelect.disabled = true; 
        // Create and insert the loader
        const loader = document.createElement('div');
        loader.className = 'nsw-loader nsw-m-left-xs';
        loader.innerHTML = '<span aria-hidden="true" class="nsw-loader__circle nsw-loader__circle--sm"></span>';
        sortSelect.parentNode.insertBefore(loader, sortSelect.nextSibling);
        // Submit the form
        resultsBarSortform.submit();      
      });
    }
  }

  document.querySelectorAll(".js-filters-item").forEach(function (filterItem) {
    const filterItemCheckedBox = filterItem.querySelector(".js-filters-item-checkbox:checked");
    if (filterItemCheckedBox) {
      const filterItemButton = filterItem.querySelector(".js-filters-item-button");
      if (filterItemButton && filterItemButton.getAttribute("aria-expanded") === "false") {
        filterItemButton.click();
      }
    }
  });


});
