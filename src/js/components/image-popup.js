document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.querySelector(".js-image-popup-gallery");
  const popup = document.querySelector(".js-image-popup");

  if (!gallery || !popup) return;

  const popupContainer = popup.querySelector(".image-popup-container");
  if (!popupContainer) return;

  // Create loader element once and reuse it
  const loader = document.createElement("div");
  loader.className = "nsw-loader";
  loader.innerHTML = `
    <span aria-hidden="true" class="nsw-loader__circle"></span>
    <span role="status" class="nsw-loader__label">Loading</span>
  `;

  // Click on gallery item
  gallery.addEventListener("click", function (e) {
    const link = e.target.closest(".js-image-popup-gallery-item-link");
    if (!link) return;

    e.preventDefault();

    const imageUrl = link.getAttribute("data-url");
    const imageTitle = link.getAttribute("data-title");

    if (!imageUrl) return;

    // Clear any existing image or loader
    popupContainer.querySelectorAll("img, .nsw-loader").forEach(el => el.remove());

    // Add loader
    popupContainer.appendChild(loader.cloneNode(true));

    // Show popup
    popup.style.display = "flex";

    // Preload image
    const img = new Image();
    img.src = imageUrl;
    img.alt = imageTitle || "";
    img.title = imageTitle || "";

    img.onload = function () {
      popupContainer.querySelector(".nsw-loader")?.remove();
      popupContainer.appendChild(img);
    };

    img.onerror = function () {
      popupContainer.querySelector(".nsw-loader")?.remove();
      console.error("Image failed to load:", imageUrl);
    };
  });

  // Close on background click or close button
  popup.addEventListener("click", function (e) {
    const isCloseButton = e.target.closest(".image-popup-close-button");
    const isOutsideImage = !e.target.closest("img");

    if (isCloseButton || isOutsideImage) {
      popupContainer.querySelectorAll("img, .nsw-loader").forEach(el => el.remove());
      popup.style.display = "none";
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && getComputedStyle(popup).display === "flex") {
      popupContainer.querySelectorAll("img, .nsw-loader").forEach(el => el.remove());
      popup.style.display = "none";
    }
  });
});
