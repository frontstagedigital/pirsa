function sideNavAccordionMobile(windowmobile) {
    if (windowmobile.matches) { 
        let sideNav = document.getElementById('js-nsw-side-nav--accordion-mobile');
        if(sideNav) {
            let sideNavHeader = sideNav.querySelector('.nsw-side-nav__header');
            if(typeof sideNavHeader !== 'undefined') {
                sideNavHeader.addEventListener('click', function(e) {
                    e.preventDefault();
                    this.classList.toggle('active');
                    if(this.classList.contains('active')) {
                        sideNav.classList.add('nsw-side-nav--accordion-mobile-open');
                    } else {
                        sideNav.classList.remove('nsw-side-nav--accordion-mobile-open');
                    }
                });     
            } 
        } 
    } 
}
const windowmobile = window.matchMedia("(max-width: 991px)")
sideNavAccordionMobile(windowmobile);
windowmobile.addEventListener('change', function() {
    sideNavAccordionMobile(windowmobile);
});