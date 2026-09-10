document.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash;

  if (!hash) return;

  const targetId = hash.substring(1);
  const targetElement = document.getElementById(targetId);

  if (!targetElement) return;

  const accordionContent = targetElement.closest(".js-accordion .nsw-accordion__content");

  if (!accordionContent) return;

  const accordionId = accordionContent.id;

  const accordion = accordionContent.closest(".js-accordion");
  const accordionButton = accordion?.querySelector(
    `.nsw-accordion__button[aria-controls="${accordionId}"]`
  );

  if (!accordionButton) return;

  const isExpanded = accordionButton.getAttribute("aria-expanded") === "true";

  if (!isExpanded) {
    accordionButton.click();
  }

  // Always scroll, even if already expanded
  setTimeout(() => {
    targetElement.scrollIntoView({ behaviour: "smooth" });
  }, 200);
});
