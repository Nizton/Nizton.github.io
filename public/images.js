for (const image of document.querySelectorAll("[data-preview] img")) {
  const showFallback = () => {
    image.hidden = true;
    image.nextElementSibling.hidden = false;
  };
  image.addEventListener("error", showFallback, { once: true });
  if (image.complete && !image.naturalWidth) showFallback();
}
