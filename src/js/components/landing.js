// Handles the landing pages background styling

document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("body.landing main#content");
  if (!main) return; // not a landing page

  const sections = document.querySelectorAll("main .nsw-section");
  let visibleIndex = 0;

  sections.forEach(section => {
    // check height for visible content
    const height = section.getBoundingClientRect().height;
    console.log(`Section height: ${height}`);

    // Skip empty sections
    if (height > 0) {
      if (visibleIndex % 2 === 0) {
        section.classList.add("pirsa-section");
      } else {
        section.classList.add("bg-white");
      }
      visibleIndex++;
    }
  });
});