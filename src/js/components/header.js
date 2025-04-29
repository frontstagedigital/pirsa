
$(document).ready(function () {

  const translateButton = $("button[aria-controls='translateMenu0']");
  const translateMenu = $("#translateMenu0");

  // header language menu dropdown toggle
  translateButton.click(function () {
    toggleMenu(this, translateMenu);
  });

  // event listener to close the dropdown when clicking outside of it
  $('html').click(function (event) {
    if ($(event.target).closest(translateButton, translateMenu).length === 0) {
      closeMenu(translateButton, translateMenu);
    }
  });
  initTranslateMobile();

});

function initTranslateMobile() {
  // Toggle mobile translate dropdown
  $('.translate-mobile .nsw-form__select').on('mousedown', function (event) {
    event.preventDefault();
    $('.translate-mobile').toggleClass('active');
  });
  
  // Toggle mobile translate dropdown with spacebar
  $(".translate-mobile .nsw-form__select").on("keydown", function (e) {
    if (e.keyCode == 32) {
      e.preventDefault();
      $(".translate-mobile").toggleClass("active");
    }
  });
  
  // Close mobile translate dropdown when clicking outside
  $('html').on('click', function (event) {
    // if NOT mobile menu && is active then close
    if (!$(event.target).closest('.translate-mobile').length && $('.translate-mobile').hasClass('active')) {
      $('.translate-mobile').removeClass('active');
    }
  });
}


function toggleMenu(button, menu) {
  // Toggle dropdown menu visibility
  menu.toggle();

  // Toggle the aria-expanded attribute on the button
  let isExpanded = $(button).attr("aria-expanded") === "true";
  $(button).attr("aria-expanded", !isExpanded);

  // Toggle the aria-hidden attribute on the <ul>
  menu.attr("aria-hidden", isExpanded);
}


function closeMenu(button, menu) {
  menu.hide();
  button.attr("aria-expanded", false);
  menu.attr("aria-hidden", true);
}