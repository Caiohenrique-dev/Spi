/* SPI Moda — página individual do produto. */
(() => {
  "use strict";

  if (window.__SPI_PRODUCT_STARTED__) return;
  window.__SPI_PRODUCT_STARTED__ = true;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const normalize = value =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const money = cents =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  let toastTimer;

  function toast(message) {
    clearTimeout(toastTimer);

    $("#pp-toast").textContent = message;
    $("#pp-toast").hidden = false;

    toastTimer = setTimeout(() => {
      $("#pp-toast").hidden = true;
    }, 3200);
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      toast("Não foi possível salvar sua seleção neste navegador.");
      return false;
    }
  }

  /* Cabeçalho */

  function closeMenu() {
    $("#pp-menu").hidden = true;
    $("#pp-menu-shade").hidden = true;

    $("#pp-menu-toggle").setAttribute("aria-expanded", "false");
    $("#pp-menu-toggle").setAttribute("aria-label", "Abrir menu");

    document.body.classList.remove("pp-menu-open");
  }

  function bindHeader() {
    $("#pp-menu-toggle").addEventListener("click", () => {
      if (!$("#pp-menu").hidden) return closeMenu();

      $("#pp-menu").hidden = false;
      $("#pp-menu-shade").hidden = false;

      $("#pp-menu-toggle").setAttribute("aria-expanded", "true");
      $("#pp-menu-toggle").setAttribute("aria-label", "Fechar menu");

      document.body.classList.add("pp-menu-open");
    });

    $("#pp-menu-shade").addEventListener("click", closeMenu);

    $("#pp-header-search").addEventListener("submit", event => {
      const input = $("#pp-search-input");

      input.value = input.value.trim();

      input.setCustomValidity(
        input.value ? "" : "Digite o produto que deseja buscar."
      );

      if (!input.reportValidity()) {
        event.preventDefault();
      }
    });

    $("#pp-search-input").addEventListener("input", event => {
      event.target.setCustomValidity("");
    });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      if (!$("#pp-menu").hidden) {
        closeMenu();
        $("#pp-menu-toggle").focus();
      }
    });

    window
      .matchMedia("(min-width: 1024px)")
      .addEventListener("change", event => {
        if (event.matches) closeMenu();
      });
  }

  function categoryOf(product) {
    const values = [
      normalize(product.category),
      normalize(product.type)
    ];

    if (
      values.some(value =>
        ["bolsa", "bolsas"].includes(value)
      )
    ) {
      return "Bolsas";
    }

    if (
      values.some(value =>
        ["copo", "copos", "copos termicos"].includes(value)
      )
    ) {
      return "Copos";
    }

    const shoes = [
      "sapato", "sapatos",
      "calcado", "calcados",
      "mocassim", "mocassins",
      "scarpin", "scarpins",
      "sandalia", "sandalias",
      "tenis",
      "bota", "botas",
      "sapatilha", "sapatilhas",
      "rasteira", "rasteiras"
    ];

    if (values.some(value => shoes.includes(value))) {
      return "Sapatos";
    }

    return product.category || "Todos";
  }

  function errorState(message) {
    $("#pp-loading").hidden = true;
    $("#pp-content").hidden = true;
    $("#pp-error").hidden = false;

    $("#pp-error-message").textContent = message;
    $("#pp-main").setAttribute("aria-busy", "false");

    document.title = "Produto não encontrado | SPI Moda";
  }

  async function start() {
    bindHeader();

    const year = $("#year") || $("#pp-year");

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    try {
      await window.SPI_CATALOG_READY;
    } catch {
      errorState(
        "Não foi possível carregar o catálogo. Atualize a página para tentar novamente."
      );

      return;
    }

    const store = window.SPI_STORE || {};

    const maxQty =
      Number.isSafeInteger(store.maxQuantityPerItem) &&
      store.maxQuantityPerItem > 0
        ? store.maxQuantityPerItem
        : 5;

    const products = (
      Array.isArray(store.products) ? store.products : []
    ).filter(product =>
      product &&
      product.id &&
      Number.isSafeInteger(product.price) &&
      product.price >= 0
    );

    const productMap = new Map(
      products.map(product => [String(product.id), product])
    );

    const id = new URLSearchParams(
      window.location.search
    ).get("id");

    const product = productMap.get(id);

    const recentKey = "spi-recently-viewed-v1";

    const phone = String(store.whatsapp || "").replace(/\D/g, "");
    const phoneReady = /^[1-9]\d{9,14}$/.test(phone);

    const instagram = /^https?:\/\//i.test(store.instagram || "")
      ? store.instagram
      : "https://www.instagram.com/spi.moda/";

    const savedFavorites = read("spi-favorites-v1", []);

    const favorites = new Set(
      (Array.isArray(savedFavorites) ? savedFavorites : [])
        .map(String)
        .filter(value => productMap.has(value))
    );

    /* Sacola compartilhada */

    function readCart() {
      const saved = read("spi-cart-v1", []);
      const merged = new Map();

      for (const item of Array.isArray(saved) ? saved : []) {
        const p = item && productMap.get(String(item.id));

        if (
          !p ||
          !Array.isArray(p.sizes) ||
          !p.sizes
            .map(value => String(value).trim())
            .includes(String(item.size)) ||
          !Number.isSafeInteger(item.qty) ||
          item.qty < 1
        ) {
          continue;
        }

        const key = String(item.id) + "::" + String(item.size);

        merged.set(key, {
          id: String(item.id),
          size: String(item.size),

          qty: Math.min(
            maxQty,
            item.qty + (merged.get(key)?.qty || 0)
          )
        });
      }

      return [...merged.values()];
    }

    function updateCounters() {
      const count = readCart().reduce(
        (sum, item) => sum + item.qty,
        0
      );

      $("#pp-cart-count").textContent = count;
      $("#pp-cart-count").hidden = count === 0;

      $("#pp-cart-link").setAttribute(
        "aria-label",
        "Abrir sacola com " +
        count +
        (count === 1 ? " item" : " itens")
      );

      $("#pp-favorites-count").textContent = favorites.size;
      $("#pp-favorites-count").hidden = favorites.size === 0;
    }

    updateCounters();

    if (!product) {
      errorState(
        "Este produto não está disponível no catálogo. Escolha outro produto na coleção."
      );

      return;
    }

    /* Dados do produto */

    const sizes = [
      ...new Set(
        (Array.isArray(product.sizes) ? product.sizes : [])
          .map(String)
          .map(size => size.trim())
          .filter(Boolean)
      )
    ];

    let selectedSize = sizes.length === 1 ? sizes[0] : "";
    let quantity = 1;

    const category = categoryOf(product);
    const code = String(product.sku || product.id);

    /* Histórico real deste navegador */

    function cleanHistory(values) {
      return [
        ...new Set(
          (Array.isArray(values) ? values : []).map(String)
        )
      ]
        .filter(value => productMap.has(value))
        .slice(0, 20);
    }

    let viewedIds = cleanHistory(read(recentKey, []));

    viewedIds = [
      id,
      ...viewedIds.filter(value => value !== id)
    ].slice(0, 20);

    try {
      localStorage.setItem(recentKey, JSON.stringify(viewedIds));
    } catch {
      // A página continua funcionando sem salvar o histórico.
    }

    document.title = product.name + " | SPI Moda";

    $("#pp-name").textContent = product.name;
    $("#pp-breadcrumb-name").textContent = product.name;

    $("#pp-category-link").textContent = category;

    const categoryURL =
      "index.html?categoria=" +
      encodeURIComponent(category) +
      "#colecao";

    $("#pp-category-link").href = categoryURL;
    $("#pp-related-all").href = categoryURL;

    $("#pp-related-all").textContent =
      "Ver " + category.toLowerCase();

    $("#pp-reference").textContent = "Referência: " + code;
    $("#pp-price").textContent = money(product.price);

    $("#pp-color").textContent = product.color
      ? "Cor: " + product.color
      : "";

    $("#pp-color").hidden = !product.color;

    $("#pp-size-label").textContent =
      ["Roupas", "Sapatos"].includes(category)
        ? "Tamanho"
        : "Opção";

    $("#pp-guide-open").hidden =
      !["Roupas", "Sapatos"].includes(category);

    $("#pp-panel-description").textContent =
      product.description ||
      "Fale com a SPI para conhecer os detalhes deste produto.";

    $("#pp-panel-composition").textContent =
      product.composition ||
      "Consulte a composição deste produto com a SPI.";

    $("#pp-panel-exchanges").textContent =
      store.exchangePolicy ||
      "Consulte a SPI sobre as condições de trocas e devoluções antes de concluir a compra.";

    $("#pp-instagram").href = instagram;
    $("#pp-contact-fallback").hidden = phoneReady;

    $("#pp-buy").setAttribute(
      "aria-disabled",
      String(!phoneReady)
    );

    /* Compra */

    function purchaseError(message) {
      $("#pp-purchase-error").textContent = message;
      $("#pp-purchase-error").hidden = !message;
    }

    function message(extra = "") {
      return [
        "Olá, " + (store.name || "SPI Moda") +
          "! Tenho interesse neste produto:",

        "",

        "Produto: " + product.name,
        "Referência: " + code,

        product.color ? "Cor: " + product.color : "",

        "Opção: " + (selectedSize || "a confirmar"),
        "Quantidade: " + quantity,
        "Valor unitário: " + money(product.price),
        "Subtotal: " + money(product.price * quantity),

        extra,
        "",

        "Poderia confirmar a disponibilidade e as formas de pagamento?"
      ]
        .filter(line => line !== null)
        .join("\n");
    }

    function whatsappURL(content) {
      return (
        "https://wa.me/" +
        phone +
        "?text=" +
        encodeURIComponent(content)
      );
    }

    function updateSelection() {
      $$("#pp-sizes button").forEach(button => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.size === selectedSize)
        );
      });

      $("#pp-quantity").textContent = quantity;
      $("#pp-minus").disabled = quantity <= 1;
      $("#pp-plus").disabled = quantity >= maxQty;

      $("#pp-buy").href = phoneReady
        ? whatsappURL(message())
        : "#";

      purchaseError("");
    }

    function validateSize() {
      if (sizes.length && !selectedSize) {
        purchaseError(
          "Selecione um tamanho ou uma opção para continuar."
        );

        $("#pp-sizes button")?.focus();

        return false;
      }

      return true;
    }

    if (!sizes.length) {
      const hint = document.createElement("p");

      hint.textContent =
        "Confirme as opções disponíveis com a loja.";

      $("#pp-sizes").append(hint);
    }

    for (const size of sizes) {
      const button = document.createElement("button");

      button.type = "button";
      button.dataset.size = size;
      button.textContent = size;

      button.addEventListener("click", () => {
        selectedSize = size;
        updateSelection();
      });

      $("#pp-sizes").append(button);
    }

    $("#pp-minus").addEventListener("click", () => {
      quantity = Math.max(1, quantity - 1);
      updateSelection();
    });

    $("#pp-plus").addEventListener("click", () => {
      quantity = Math.min(maxQty, quantity + 1);
      updateSelection();
    });

    $("#pp-buy").addEventListener("click", event => {
      if (!phoneReady) {
        event.preventDefault();

        purchaseError(
          "Fale com a SPI pelo Instagram para consultar este produto."
        );

        return;
      }

      if (!validateSize()) {
        event.preventDefault();
      }
    });

    $("#pp-add-cart").addEventListener("click", () => {
      if (!sizes.length) {
        purchaseError(
          "Confirme as opções disponíveis com a loja antes de adicionar à sacola."
        );

        return;
      }

      if (!validateSize()) return;

      const cart = readCart();

      const existing = cart.find(item =>
        item.id === id &&
        item.size === selectedSize
      );

      if ((existing?.qty || 0) + quantity > maxQty) {
        purchaseError(
          "O limite é de " + maxQty + " unidades por opção."
        );

        return;
      }

      if (existing) {
        existing.qty += quantity;
      } else {
        cart.push({
          id,
          size: selectedSize,
          qty: quantity
        });
      }

      if (save("spi-cart-v1", cart)) {
        updateCounters();
        toast("Produto adicionado à sacola.");
      }
    });

    /* Favoritos do produto e das recomendações */

    function updateFavorite() {
      const active = favorites.has(id);

      $("#pp-favorite").setAttribute(
        "aria-pressed",
        String(active)
      );

      $("#pp-favorite").setAttribute(
        "aria-label",
        active
          ? "Remover produto dos favoritos"
          : "Salvar produto nos favoritos"
      );

      $$("[data-pp-favorite]").forEach(button => {
        const value = button.dataset.ppFavorite;
        const saved = favorites.has(value);

        button.setAttribute("aria-pressed", String(saved));
        button.classList.toggle("is-favorite", saved);

        button.setAttribute(
          "aria-label",
          (
            saved
              ? "Remover dos favoritos: "
              : "Salvar nos favoritos: "
          ) +
          (productMap.get(value)?.name || "produto")
        );
      });

      updateCounters();
    }

    function toggleFavorite(value) {
      if (!productMap.has(value)) return;

      const active = favorites.has(value);

      if (active) {
        favorites.delete(value);
      } else {
        favorites.add(value);
      }

      if (!save("spi-favorites-v1", [...favorites])) {
        if (active) {
          favorites.add(value);
        } else {
          favorites.delete(value);
        }
      }

      updateFavorite();
    }

    $("#pp-favorite").addEventListener("click", () => {
      toggleFavorite(id);
    });

    /* Recomendações */

    function recommendationCard(item) {
      const href =
        "produto.html?id=" + encodeURIComponent(item.id);

      const active = favorites.has(String(item.id));

      const image =
        typeof item.image === "string" && item.image.trim()
          ? (
              '<img src="' + esc(item.image) + '" ' +
              'alt="' + esc(item.alt || item.name) + '" ' +
              'width="600" height="800" loading="lazy">'
            )
          : '<div class="pp-no-image">Foto indisponível</div>';

      return [
        '<article class="product-card">',

        '<div class="product-photo">',

        '<a class="product-image-button" href="' +
        esc(href) + '" aria-label="Ver detalhes de ' +
        esc(item.name) + '">' +
        image +
        "</a>",

        '<button type="button" class="favorite-button' +
        (active ? " is-favorite" : "") + '" ' +
        'data-pp-favorite="' + esc(item.id) + '" ' +
        'aria-pressed="' + active + '" ' +
        'aria-label="' +
        (
          active
            ? "Remover dos favoritos: "
            : "Salvar nos favoritos: "
        ) +
        esc(item.name) + '">',

        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"></path>' +
        "</svg>",

        "</button></div>",

        '<div class="product-meta">',

        '<a class="product-name" href="' + esc(href) + '">' +
        esc(item.name) +
        "</a>",

        '<p class="product-subtitle">' +
        esc(item.subtitle) +
        "</p>",

        '<p class="product-price">' +
        money(item.price) +
        "</p>",

        "</div></article>"
      ].join("");
    }

    function renderRecommendations() {
      const related = products.filter(item =>
        String(item.id) !== id &&
        normalize(categoryOf(item)) === normalize(category)
      );

      related.sort((a, b) => {
        const sameType =
          Number(normalize(b.type) === normalize(product.type)) -
          Number(normalize(a.type) === normalize(product.type));

        return (
          sameType ||
          Number(b.isFeatured === true || b.featured === true) -
          Number(a.isFeatured === true || a.featured === true)
        );
      });

      const suggestions = related.slice(0, 4);

      const recent = viewedIds
        .filter(value => value !== id)
        .map(value => productMap.get(value))
        .filter(Boolean)
        .slice(0, 4);

      $("#pp-related-grid").innerHTML =
        suggestions.map(recommendationCard).join("");

      $("#pp-related").hidden = suggestions.length === 0;

      $("#pp-recent-grid").innerHTML =
        recent.map(recommendationCard).join("");

      $("#pp-recent").hidden = recent.length === 0;

      updateFavorite();
    }

    $("#pp-clear-recent").addEventListener("click", () => {
      viewedIds = [];

      try {
        localStorage.setItem(recentKey, "[]");
      } catch {
        // Limpa a lista exibida nesta visita.
      }

      renderRecommendations();
      toast("Histórico de produtos limpo.");
    });

    document.addEventListener("click", event => {
      const favorite = event.target.closest?.(
        "[data-pp-favorite]"
      );

      if (favorite) {
        event.preventDefault();
        toggleFavorite(favorite.dataset.ppFavorite);
      }

      if (event.target.closest?.("#clear-local-data")) {
        favorites.clear();
        updateFavorite();

        toast("Sacola e favoritos apagados deste navegador.");
      }
    });

    /* Galeria */

    const configured = Array.isArray(product.images)
      ? product.images
      : Array.isArray(product.gallery)
        ? product.gallery
        : [];

    let photos = configured
      .map(photo =>
        typeof photo === "string"
          ? { src: photo, alt: product.name }
          : photo
      )
      .filter(photo =>
        photo &&
        typeof photo.src === "string" &&
        photo.src.trim()
      );

    if (!photos.length && product.image) {
      photos = [{
        src: product.image,
        alt: product.alt || product.name
      }];
    }

    photos = photos
      .filter((photo, index, list) =>
        list.findIndex(item => item.src === photo.src) === index
      )
      .slice(0, 10);

    const image = $("#pp-main-image");

    image.addEventListener("error", () => {
      image.hidden = true;
      $("#pp-photo-error").hidden = false;
    });

    image.addEventListener("load", () => {
      image.hidden = false;
      $("#pp-photo-error").hidden = true;
    });

    function showPhoto(index) {
      if (!photos[index]) return;

      image.hidden = false;
      $("#pp-photo-error").hidden = true;

      image.src = photos[index].src;
      image.alt = photos[index].alt || product.name;

      $$("#pp-thumbnails button").forEach((button, position) => {
        button.setAttribute(
          "aria-pressed",
          String(position === index)
        );
      });
    }

    $("#pp-thumbnails").hidden = photos.length < 2;

    $("#pp-gallery").classList.toggle(
      "has-thumbnails",
      photos.length > 1
    );

    photos.forEach((photo, index) => {
      const button = document.createElement("button");

      button.type = "button";

      button.setAttribute(
        "aria-label",
        "Ver foto " + (index + 1) + " de " + photos.length
      );

      const thumb = document.createElement("img");

      thumb.src = photo.src;
      thumb.alt = "";
      thumb.width = 90;
      thumb.height = 120;
      thumb.loading = "lazy";

      button.append(thumb);

      button.addEventListener("click", () => {
        showPhoto(index);
      });

      $("#pp-thumbnails").append(button);
    });

    if (photos.length) {
      showPhoto(0);
    } else {
      image.hidden = true;
      $("#pp-photo-error").hidden = false;
    }

    /* Abas */

    const tabs = $$('.pp-tabs [role="tab"]');

    function activateTab(index, focus = false) {
      tabs.forEach((tab, position) => {
        const active = index === position;

        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;

        document.getElementById(
          tab.getAttribute("aria-controls")
        ).hidden = !active;
      });

      if (focus) {
        tabs[index].focus();
      }
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        activateTab(index);
      });

      tab.addEventListener("keydown", event => {
        let next = index;

        if (event.key === "ArrowRight") {
          next = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          next = (index + tabs.length - 1) % tabs.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = tabs.length - 1;
        } else {
          return;
        }

        event.preventDefault();
        activateTab(next, true);
      });
    });

    /* Guia de tamanhos */

    const guide = $("#pp-guide");

    if (
      typeof product.sizeGuide === "string" &&
      product.sizeGuide.trim()
    ) {
      $("#pp-guide-image").src = product.sizeGuide;
      $("#pp-guide-image").hidden = false;
    }

    $("#pp-guide-contact").href = phoneReady
      ? whatsappURL(
          "Olá! Gostaria de confirmar as medidas de " +
          product.name +
          ". Referência: " +
          code +
          "."
        )
      : instagram;

    $("#pp-guide-open").addEventListener("click", () => {
      guide.showModal();
      document.body.classList.add("pp-modal-open");
    });

    $("#pp-guide-close").addEventListener("click", () => {
      guide.close();
    });

    guide.addEventListener("close", () => {
      document.body.classList.remove("pp-modal-open");
    });

    /* Sincroniza mudanças feitas em outras abas */

    window.addEventListener("storage", event => {
      if (event.key === "spi-favorites-v1") {
        const values = read("spi-favorites-v1", []);

        favorites.clear();

        for (const value of Array.isArray(values) ? values : []) {
          if (productMap.has(String(value))) {
            favorites.add(String(value));
          }
        }

        updateFavorite();
      }

      if (event.key === "spi-cart-v1") {
        updateCounters();
      }

      if (event.key === recentKey) {
        viewedIds = cleanHistory(read(recentKey, []));
        renderRecommendations();
      }
    });

    updateSelection();
    renderRecommendations();

    $("#pp-loading").hidden = true;
    $("#pp-content").hidden = false;
    $("#pp-main").setAttribute("aria-busy", "false");
  }

  const run = () => {
    start().catch(error => {
      console.error("Não foi possível abrir o produto:", error);

      errorState(
        "Não foi possível abrir este produto. Atualize a página ou volte à coleção."
      );
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, {
      once: true
    });
  } else {
    run();
  }
})();