document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('js-results-bar-sort');

  if (form instanceof HTMLFormElement) {
    const sortSelect = form.querySelector('select[name="sort"]');

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
        form.submit();
        
        
      });
    }
  }
});
