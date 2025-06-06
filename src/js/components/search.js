document.addEventListener('DOMContentLoaded', function () {
const form = document.getElementById('js-results-bar-sort');

if (form instanceof HTMLFormElement) {
    const sortSelect = form.querySelector('select[name="sort"]');

    if (sortSelect instanceof HTMLSelectElement) {
    sortSelect.addEventListener('change', function () {
        form.submit();
    });
    }
}
});