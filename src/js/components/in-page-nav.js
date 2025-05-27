document.addEventListener('DOMContentLoaded', function () {
    const content = document.getElementById('content');
    const tocNav = document.getElementById('js-nsw-in-page-nav');

    if (!content || !tocNav) return;

    const headings = content.querySelectorAll('h2');

    if (headings.length === 0) {
        tocNav.innerHTML = '';
        return; // no headings
    }

    const title = document.createElement('div');
    title.id = 'in-page-nav';
    title.className = 'nsw-in-page-nav__title';
    title.textContent = 'On this page';

    const tocList = document.createElement('ul');

    headings.forEach((heading, index) => {
        if (!heading.id) {
            heading.id = 'section-' + (index + 1);
        }

        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;

        const listItem = document.createElement('li');
        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    // Populate nav and set ARIA
    tocNav.innerHTML = '';
    tocNav.setAttribute('aria-labelledby', 'in-page-nav');
    tocNav.appendChild(title);
    tocNav.appendChild(tocList);

    // Smooth scroll
    tocList.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});