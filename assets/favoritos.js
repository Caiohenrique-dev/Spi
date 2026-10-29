/* SPI Moda — favoritos salvos neste navegador. */

(() => {
  "use strict";

  if (window.__SPI_FAVORITES_STARTED__) return;
  window.__SPI_FAVORITES_STARTED__ = true;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const key = "spi-favorites-v1";
  const products = new Map();

  const normalize = value => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const esc = value => String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );

  const money = value => (value / 100).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

  let query = "";
  let ready = false;
  let failed = false;
  let maxQty = 5;
  let toastTimer;

  const icons = {
    search:
      '<circle cx="10.5" cy="10.5" r="6.5"/>' +
      '<path d="m16 16 4.5 4.5"/>',

    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',

    bag:
      '<path d="M5 7h14l1 14H4L5 7Z"/>' +
      '<path d="M8 8V6a4 4 0 0 1 8 0v2"/>',

    menu:
      '<path d="M4 7h16M4 12h16M4 17h16"/>',

    close:
      '<path d="m6 6 12 12M6 18 18 6"/>'
  };

  function icon(name) {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (icons[name] || "") +
      "</svg>"
    );
  }

  function readArray(name) {
    try {
      const value = JSON.parse(localStorage.getItem(name));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function savedProducts() {
    return [...new Set(readArray(key).map(String))]
      .map(id => products.get(id))
      .filter(Boolean);
  }

  function cartCount() {
    const merged = new Map();

    for (const item of readArray("spi-cart-v1")) {
      const product = item && products.get(String(item.id));

      const sizes = Array.isArray(product?.sizes)
        ? product.sizes.map(size => String(size).trim())
        : [];

      if (
        !product ||
        !sizes.includes(String(item.size)) ||
        !Number.isSafeInteger(item.qty) ||
        item.qty < 1
      ) {
        continue;
      }

      const itemKey = String(item.id) + "::" + String(item.size);

      merged.set(
        itemKey,
        Math.min(maxQty, (merged.get(itemKey) || 0) + item.qty)
      );
    }

    return [...merged.values()].reduce(
      (sum, quantity) => sum + quantity,
      0
    );
  }

  function toast(message) {
    clearTimeout(toastTimer);

    $("#toast").textContent = message;
    $("#toast").hidden = false;

    toastTimer = setTimeout(() => {
      $("#toast").hidden = true;
    }, 3200);
  }

  function card(product) {
    const href = "produto.html?id=" + encodeURIComponent(product.id);
    const name = product.name || "Produto SPI";

    const image = (
      typeof product.image === "string" &&
      product.image.trim()
    )
      ? (
        '<img src="' + esc(product.image) + '"' +
        ' alt="' + esc(product.alt || name) + '"' +
        ' width="600" height="800" loading="lazy">'
      )
      : (
        '<div class="favorites-image-placeholder">' +
        "Imagem indisponível" +
        "</div>"
      );

    return (
      '<article class="product-card">' +
        '<div class="product-photo">' +
          '<a href="' + esc(href) + '"' +
            ' class="product-image-button"' +
            ' aria-label="Ver detalhes de ' + esc(name) + '">' +
            image +
          "</a>" +

          '<button type="button"' +
            ' class="favorite-button is-favorite"' +
            ' data-favorite-remove="' + esc(product.id) + '"' +
            ' aria-label="Remover dos favoritos: ' + esc(name) + '">' +
            icon("heart") +
          "</button>" +
        "</div>" +

        '<div class="product-meta">' +
          "<div>" +
            '<a class="product-name" href="' + esc(href) + '">' +
              esc(name) +
            "</a>" +

            '<p class="product-subtitle">' +
              esc(product.subtitle || "") +
            "</p>" +

            '<p class="product-price">' +
              money(product.price) +
            "</p>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function render() {
    if (!ready) return;

    const saved = savedProducts();
    const term = normalize(query);

    const visible = saved
      .slice()
      .reverse()
      .filter(product => normalize([
        product.name,
        product.subtitle,
        product.category,
        product.type,
        product.color
      ].join(" ")).includes(term));

    const count = cartCount();

    $("#favorites-count").textContent = saved.length;
    $("#favorites-count").hidden = saved.length === 0;

    $("#cart-count").textContent = count;

    $("#cart-link").setAttribute(
      "aria-label",
      "Abrir sacola com " + count + (count === 1 ? " item" : " itens")
    );

    $("#result-count").textContent =
      visible.length.toLocaleString("pt-BR") +
      (visible.length === 1 ? " produto" : " produtos");

    $("#favorites-grid").innerHTML = failed
      ? ""
      : visible.map(card).join("");

    $("#favorites-grid").hidden = failed || visible.length === 0;
    $("#empty-state").hidden = !failed && visible.length > 0;

    $("#favorites-empty-title").textContent = failed
      ? "Não foi possível carregar os favoritos."
      : saved.length === 0
        ? "Seus favoritos começam aqui."
        : "Nenhum favorito encontrado.";

    $("#favorites-empty-text").textContent = failed
      ? "Atualize a página para tentar novamente."
      : saved.length === 0
        ? "Toque no coração dos produtos que você mais gostou."
        : "Experimente outro nome ou limpe a pesquisa.";
  }

  function removeFavorite(id) {
    if (!products.has(id)) return;

    const before = $$("[data-favorite-remove]");

    const index = before.findIndex(
      button => button.dataset.favoriteRemove === id
    );

    const next = readArray(key)
      .map(String)
      .filter(value => value !== id);

    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      toast("Não foi possível remover o produto neste navegador.");
      return;
    }

    render();

    const buttons = $$("[data-favorite-remove]");

    const nextFocus =
      buttons[Math.min(Math.max(index, 0), buttons.length - 1)] ||
      $("#empty-state a");

    nextFocus?.focus({ preventScroll: true });

    toast("Produto removido dos favoritos.");
  }

  function closeSearch(focus = false) {
    $("#search-panel").hidden = true;
    $("#search-toggle").setAttribute("aria-expanded", "false");

    if (focus) {
      $("#search-toggle").focus({ preventScroll: true });
    }
  }

  function closeMenu(focus = false) {
    $("#mobile-menu").hidden = true;
    $("#menu-toggle").setAttribute("aria-expanded", "false");
    $("#menu-toggle").setAttribute("aria-label", "Abrir menu");

    if (focus) {
      $("#menu-toggle").focus({ preventScroll: true });
    }
  }

  function closeInfo() {
    if ($("#info-dialog").open) {
      $("#info-dialog").close();
    }

    document.body.classList.remove("modal-open");
  }

  function openInfo(type) {
    const info = {
      comprar: [
        "Como comprar",
        "Abra um produto para ver os detalhes, escolha as opções disponíveis e converse com a SPI pelo WhatsApp para confirmar o seu pedido."
      ],

      tamanhos: [
        "Guia de tamanhos",
        "As medidas variam conforme a peça, a modelagem e o tecido. Fale com a SPI para confirmar as medidas do produto antes de escolher seu tamanho."
      ],

      trocas: [
        "Entregas e trocas",
        "Consulte o atendimento da SPI para confirmar as opções de entrega, retirada e as condições de trocas e devoluções da sua compra."
      ],

      privacidade: [
        "Privacidade",
        "Os favoritos e a sacola ficam salvos neste navegador. Os produtos vistos recentemente também podem ser guardados para facilitar sua próxima visita. Esses dados não são sincronizados entre dispositivos."
      ]
    }[type];

    if (!info) return;

    closeSearch();
    closeMenu();

    $("#info-title").textContent = info[0];

    $("#info-content").innerHTML =
      "<p>" + esc(info[1]) + "</p>" +
      '<p><a href="https://wa.me/5524992185519"' +
      ' target="_blank" rel="noopener noreferrer">' +
      "Falar com a SPI pelo WhatsApp" +
      "</a></p>";

    $("#info-dialog").showModal();
    document.body.classList.add("modal-open");
  }

  function bind() {
    $("#search-toggle").addEventListener("click", () => {
      if (!$("#search-panel").hidden) {
        return closeSearch(true);
      }

      closeMenu();

      $("#search-panel").hidden = false;
      $("#search-toggle").setAttribute("aria-expanded", "true");
      $("#search-input").focus();
    });

    $("#search-close").addEventListener("click", () => {
      closeSearch(true);
    });

    $("#menu-toggle").addEventListener("click", () => {
      if (!$("#mobile-menu").hidden) {
        return closeMenu(true);
      }

      closeSearch();

      $("#mobile-menu").hidden = false;
      $("#menu-toggle").setAttribute("aria-expanded", "true");
      $("#menu-toggle").setAttribute("aria-label", "Fechar menu");
    });

    $("#search-input").addEventListener("input", event => {
      query = event.target.value.trim();
      $("#search-clear").hidden = event.target.value.length === 0;
      render();
    });

    $("#search-input").addEventListener("keydown", event => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      closeSearch(true);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      $("#favoritos").scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    });

    $("#search-clear").addEventListener("click", () => {
      query = "";
      $("#search-input").value = "";
      $("#search-clear").hidden = true;

      render();
      $("#search-input").focus();
    });

    document.addEventListener("click", event => {
      const remove = event.target.closest?.("[data-favorite-remove]");

      if (remove) {
        return removeFavorite(remove.dataset.favoriteRemove);
      }

      if (event.target.closest?.("[data-close]")) {
        return closeInfo();
      }

      const info = event.target.closest?.("[data-info]");

      if (info) {
        openInfo(info.dataset.info);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      if ($("#info-dialog").open) {
        closeInfo();
      } else if (!$("#search-panel").hidden) {
        closeSearch(true);
      } else if (!$("#mobile-menu").hidden) {
        closeMenu(true);
      }
    });

    document.addEventListener("pointerdown", event => {
      if (!event.target.closest?.("#search-panel, #search-toggle")) {
        closeSearch();
      }

      if (!event.target.closest?.("#mobile-menu, #menu-toggle")) {
        closeMenu();
      }
    });

    $("#info-dialog").addEventListener("close", () => {
      document.body.classList.remove("modal-open");
    });

    $("#info-dialog").addEventListener("click", event => {
      if (event.target !== event.currentTarget) return;

      const box = event.currentTarget.getBoundingClientRect();

      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      ) {
        closeInfo();
      }
    });

    window.matchMedia("(min-width: 1024px)")
      .addEventListener("change", event => {
        if (event.matches) closeMenu();
      });

    window.addEventListener("storage", event => {
      if (
        event.key === null ||
        [key, "spi-cart-v1"].includes(event.key)
      ) {
        render();
      }
    });

    window.addEventListener("pageshow", event => {
      if (event.persisted) {
        closeMenu();
        closeSearch();
        render();
      }
    });
  }

  async function start() {
    $$("[data-icon]").forEach(node => {
      node.innerHTML = icon(node.dataset.icon);
    });

    $("#year").textContent = new Date().getFullYear();

    bind();

    try {
      await window.SPI_CATALOG_READY;

      const store = window.SPI_STORE;

      if (!store || !Array.isArray(store.products)) {
        throw new Error("Catálogo indisponível.");
      }

      if (
        Number.isSafeInteger(store.maxQuantityPerItem) &&
        store.maxQuantityPerItem > 0
      ) {
        maxQty = store.maxQuantityPerItem;
      }

      for (const product of store.products) {
        if (
          !product ||
          !product.id ||
          !Number.isSafeInteger(product.price) ||
          product.price < 0
        ) {
          continue;
        }

        const id = String(product.id);

        if (!products.has(id)) {
          products.set(id, { ...product, id });
        }
      }
    } catch {
      failed = true;
    }

    ready = true;

    $("#favorites-loading").hidden = true;

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();