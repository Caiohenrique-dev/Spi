/* Título da página de categoria. */
(() => {
  "use strict";

  if (!document.body.classList.contains("category-page")) {
    return;
  }

  const heading = document.getElementById("catalog-title");

  if (!heading) {
    return;
  }

  function updateTitle() {
    const name = heading.textContent.trim();

    const title = name === "Todos"
      ? "Todos os produtos"
      : name || "Categorias";

    document.title = title + " | SPI Moda";
  }

  new MutationObserver(updateTitle).observe(heading, {
    childList: true,
    characterData: true,
    subtree: true
  });

  updateTitle();
})();