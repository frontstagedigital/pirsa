// Handles the landing pages background styling
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("landing") && !document.body.classList.contains("landing--no-bg")) {
  const sections = document.querySelectorAll("body.landing main#content .nsw-section");

  // First pass: check for content and apply 'no-padding' to empty wrapper sections
  sections.forEach(section => {
    section.classList.remove("no-padding");

    const container = section.querySelector(":scope > .nsw-container");

    // checks for html elements or text content in the container
    if (container) {
      const hasContent = Array.from(container.childNodes).some(node =>
        node.nodeType === Node.ELEMENT_NODE ||
        (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "")
      );

      if (!hasContent) {
        section.classList.add("no-padding");
      } else {
        lastNonEmptySection = section; // Track the last section with actual content
      }
    }
  });

  // Second pass: apply alternating backgrounds only to non-empty sections
  let visibleIndex = 0;
  sections.forEach(section => {
    if (!section.classList.contains("no-padding")) {
      if (visibleIndex % 2 === 0) {
        section.classList.add("pirsa-section");
      } else {
        section.classList.add("bg-white");
      }
      visibleIndex++;
    }
  });

  if (lastNonEmptySection) {
    lastNonEmptySection.classList.add("last-section");
  }
  }
});
