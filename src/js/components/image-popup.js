document.addEventListener("DOMContentLoaded", function () {
  const gallery = document.querySelector(".js-image-popup-gallery");
  const popup = document.querySelector(".js-image-popup");
  const popupContainer = popup.querySelector(".image-popup-container");

  if (!gallery || !popup || !popupContainer) return;

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

    // Add loader to popup container
    popupContainer.appendChild(loader.cloneNode(true));

    // Show popup
    popup.style.display = "flex";

    // Preload image
    const img = new Image();
    img.src = imageUrl;
    img.alt = imageTitle || "";
    img.title = imageTitle || "";

    img.onload = function () {
      // Remove loader and insert image
      const existingLoader = popupContainer.querySelector(".nsw-loader");
      if (existingLoader) existingLoader.remove();

      popupContainer.appendChild(img);
    };

    img.onerror = function () {
      const existingLoader = popupContainer.querySelector(".nsw-loader");
      if (existingLoader) existingLoader.remove();

      const errorMsg = document.createElement("div");
      errorMsg.textContent = "Failed to load image.";
      errorMsg.className = "nsw-text-danger"; // Optional styling class
      popupContainer.appendChild(errorMsg);
    };
  });

  // Click on background or close button to close
  popup.addEventListener("click", function (e) {
    const isCloseButton = e.target.closest(".image-popup-close-button");
    const isOutsideImage = !e.target.closest("img");

    if (isCloseButton || isOutsideImage) {
      popupContainer.querySelectorAll("img, .nsw-loader, .nsw-text-danger").forEach(el => el.remove());
      popup.style.display = "none";
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && getComputedStyle(popup).display === "flex") {
      popupContainer.querySelectorAll("img, .nsw-loader, .nsw-text-danger").forEach(el => el.remove());
      popup.style.display = "none";
    }
  });
});
