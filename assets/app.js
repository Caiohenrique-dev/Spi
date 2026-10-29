/* SPI Moda — catálogo, pesquisa, favoritos, filtros e sacola. */
(() => {
  "use strict";

  if (window.__SPI_APP_STARTED__) return;
  window.__SPI_APP_STARTED__ = true;

  async function start() {
    let catalogFailed = false;

    try {
      await window.SPI_CATALOG_READY;
    } catch {
      catalogFailed = true;
    }

    const store = window.SPI_STORE || {};

    /* Funções auxiliares */

    const $ = (selector, root = document) =>
      root?.querySelector(selector) || null;

    const $$ = (selector, root = document) =>
      [...(root?.querySelectorAll(selector) || [])];

    const on = (selector, event, callback) =>
      $(selector)?.addEventListener(event, callback);

    const text = (selector, value) => {
      const node = $(selector);
      if (node) node.textContent = value;
    };

    const hidden = (selector, value) => {
      const node = $(selector);
      if (node) node.hidden = value;
    };

    const esc = value =>
      String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char]));

    const normalized = value =>
      String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const money = cents =>
      (cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

    const maxQty =
      Number.isSafeInteger(store.maxQuantityPerItem) &&
      store.maxQuantityPerItem > 0
        ? store.maxQuantityPerItem
        : 5;

    const instagram = /^https?:\/\//i.test(store.instagram || "")
      ? store.instagram
      : "https://www.instagram.com/spi.moda/";

    const whatsapp = String(store.whatsapp || "")
      .replace(/\D/g, "");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    /* Catálogo */

    const productById = new Map();

    for (
      const item of Array.isArray(store.products)
        ? store.products
        : []
    ) {
      if (
        !item ||
        !item.id ||
        !Number.isSafeInteger(item.price) ||
        item.price < 0
      ) {
        continue;
      }

      const product = {
        ...item,
        id: String(item.id),

        sizes: [
          ...new Set(
            (Array.isArray(item.sizes) ? item.sizes : [])
              .map(String)
              .map(size => size.trim())
              .filter(Boolean)
          )
        ]
      };

      if (!productById.has(product.id)) {
        productById.set(product.id, product);
      }
    }

    const products = [...productById.values()];

    /* Estado inicial */

    const initialURL = new URL(window.location.href);

    const initialCategory =
      initialURL.searchParams.get("categoria") || "Todos";

    const categories = [
      "Todos",
      "Novidades",
      "Roupas",
      "Sapatos",
      "Bolsas",
      "Acessórios",
      "Copos"
    ];

    let category =
      categories.find(value =>
        normalized(value) === normalized(initialCategory)
      ) || "Todos";

    const taxonomy = window.SPI_CATEGORIES;

    let subcategory = taxonomy?.resolve(
      category,
      initialURL.searchParams.get("subcategoria") || "",
      products
    ) || "";

    let query =
      (initialURL.searchParams.get("busca") || "").trim();

    let favoritesOnly =
      initialURL.searchParams.get("favoritos") === "1";

    let sort = "featured";

    let refinements = {
      min: null,
      max: null,
      color: "",
      size: ""
    };

    let selectedProduct = null;
    let selectedSize = "";
    let selectedQuantity = 1;
    let orderSummary = "";

    let toastTimer;
    let copyTimer;
    let storageNoticeShown = false;

    /* Favoritos salvos */

    const savedFavorites = readLocal("spi-favorites-v1", []);

    const favorites = new Set(
      (Array.isArray(savedFavorites) ? savedFavorites : [])
        .map(String)
        .filter(id => productById.has(id))
    );

    /* Sacola salva */

    const savedCart = readLocal("spi-cart-v1", []);
    const restoredCart = new Map();

    for (const item of Array.isArray(savedCart) ? savedCart : []) {
      const product = item && productById.get(String(item.id));

      if (
        !product ||
        !product.sizes.includes(item.size) ||
        !Number.isSafeInteger(item.qty) ||
        item.qty < 1
      ) {
        continue;
      }

      const restored = {
        id: product.id,
        size: item.size,
        qty: item.qty
      };

      const previous = restoredCart.get(itemKey(restored));

      restored.qty = Math.min(
        maxQty,
        restored.qty + (previous?.qty || 0)
      );

      restoredCart.set(itemKey(restored), restored);
    }

    let cart = [...restoredCart.values()];

    /* Ícones */

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
        '<path d="m6 6 12 12M6 18 18 6"/>',

      plus:
        '<path d="M12 5v14M5 12h14"/>',

      chat:
        '<path d="M21 11.5a9 9 0 0 1-13.2 8L3 21l1.5-4.8A9 9 0 1 1 21 11.5Z"/>',

      instagram:
        '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="4"/>' +
        '<path d="M17.5 6.5h.01"/>',

      info:
        '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M12 11v6M12 7h.01"/>',

      check:
        '<path d="m5 12 4 4L19 6"/>',

      copy:
        '<rect x="8" y="8" width="12" height="13" rx="1"/>' +
        '<path d="M15 8V3H3v13h5"/>'
    };

    function icon(name) {
      if (!icons[name]) return "";

      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        icons[name] +
        "</svg>"
      );
    }

    function drawIcons() {
      $$("[data-icon]").forEach(node => {
        node.innerHTML = icon(node.dataset.icon);
      });
    }

    /* Armazenamento */

    function readLocal(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch {
        return fallback;
      }
    }

    function saveLocal(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        if (storageNoticeShown) return;

        storageNoticeShown = true;
        toast("Sua seleção ficará disponível apenas nesta visita.");
      }
    }

    function toast(message) {
      clearTimeout(toastTimer);

      text("#toast", message);
      hidden("#toast", false);

      toastTimer = setTimeout(() => {
        hidden("#toast", true);
      }, 3600);
    }

    /* Janelas */

    function syncModalState() {
      document.body.classList.toggle(
        "modal-open",
        $$("dialog[open]").some(dialog =>
          dialog.dataset.filterMode !== "desktop"
        )
      );

      updateFilterButton();
    }

    function updateFilterButton() {
      $("#catalog-filters-open")?.setAttribute(
        "aria-expanded",
        String(Boolean($("#catalog-filters-dialog")?.open))
      );
    }

    function openDialog(dialog) {
      if (!dialog) return;

      hideSearch();
      hideMenu();

      if (!dialog.open) {
        dialog.showModal();
      }

      syncModalState();
    }

    function closeDialog(dialog) {
      if (dialog?.open) {
        dialog.close();
      }

      syncModalState();
    }

    function scrollToCollection() {
      $("#colecao")?.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
      });
    }

    function syncCatalogURL() {
      if (!$("#colecao")) return;

      const url = new URL(window.location.href);

      [
        "categoria",
        "subcategoria",
        "busca",
        "favoritos"
      ].forEach(key => {
        url.searchParams.delete(key);
      });

      if (category !== "Todos") {
        url.searchParams.set("categoria", category);
      }

      if (subcategory) {
        url.searchParams.set("subcategoria", subcategory);
      }

      if (query) {
        url.searchParams.set("busca", query);
      }

      if (favoritesOnly) {
        url.searchParams.set("favoritos", "1");
      }

      try {
        window.history.replaceState(null, "", url.href);
      } catch {
        // Permite utilizar os arquivos localmente.
      }
    }

    /* Categorias e subcategorias */

    function productCategory(product) {
      const values = [
        normalized(product.category),
        normalized(product.type)
      ];

      if (
        values.some(value =>
          ["bolsa", "bolsas"].includes(value)
        )
      ) {
        return "bolsas";
      }

      if (
        values.some(value =>
          ["copo", "copos", "copos termicos"].includes(value)
        )
      ) {
        return "copos";
      }

      const shoes = [
        "sapato",
        "sapatos",
        "calcado",
        "calcados",
        "mocassim",
        "mocassins",
        "scarpin",
        "scarpins",
        "sandalia",
        "sandalias",
        "tenis",
        "bota",
        "botas",
        "sapatilha",
        "sapatilhas",
        "rasteira",
        "rasteiras"
      ];

      if (values.some(value => shoes.includes(value))) {
        return "sapatos";
      }

      return normalized(product.category);
    }

    function clearRefinements() {
      refinements = {
        min: null,
        max: null,
        color: "",
        size: ""
      };

      sort = "featured";

      $("#catalog-filters-form")?.reset();

      if ($("#sort-select")) {
        $("#sort-select").value = sort;
      }

      $("#catalog-price-max")?.setCustomValidity("");
      hidden("#catalog-price-error", true);
    }

    function resetFilters() {
      category = "Todos";
      subcategory = "";
      query = "";
      favoritesOnly = false;

      clearRefinements();

      if ($("#search-input")) {
        $("#search-input").value = "";
      }

      updateSearchClear();
      renderProducts();
    }

    function selectCategory(value, child = "") {
      category = categories.find(name =>
        normalized(name) === normalized(value)
      ) || "Todos";

      subcategory = taxonomy?.resolve(
        category,
        child,
        products
      ) || "";

      query = "";
      favoritesOnly = false;

      clearRefinements();

      if ($("#search-input")) {
        $("#search-input").value = "";
      }

      updateSearchClear();
      hideSearch();
      hideMenu();
      renderProducts();
    }

    /* Filtros */

    function readRefinements() {
      const cents = selector => {
        const input = $(selector);

        if (
          !input ||
          input.value === "" ||
          !Number.isFinite(input.valueAsNumber)
        ) {
          return null;
        }

        return Math.round(input.valueAsNumber * 100);
      };

      refinements = {
        min: cents("#catalog-price-min"),
        max: cents("#catalog-price-max"),
        color: $("#catalog-color")?.value || "",
        size: $("#catalog-size")?.value || ""
      };

      renderProducts();
    }

    function fillSelect(selector, values, label, current) {
      const select = $(selector);

      if (!select) return;

      const unique = [
        ...new Set(
          values
            .map(value => String(value ?? "").trim())
            .filter(Boolean)
        )
      ];

      if (current && !unique.includes(current)) {
        unique.push(current);
      }

      unique.sort((a, b) =>
        a.localeCompare(b, "pt-BR", { numeric: true })
      );

      select.replaceChildren(
        ...["", ...unique].map(value => {
          const option = document.createElement("option");

          option.value = value;
          option.textContent = value || label;

          return option;
        })
      );

      select.value = current;
    }

    function getVisibleProducts() {
      const chosen = normalized(category);
      const term = normalized(query);

      const base = products.filter(product => {
        const matchesCategory =
          chosen === "todos" ||
          (
            chosen === "novidades"
              ? Boolean(product.isNew)
              : productCategory(product) === chosen
          );

        const searchable = normalized([
          product.name,
          product.subtitle,
          product.category,
          product.type,
          product.subcategory,
          product.color
        ].join(" "));

        const matchesSelection = taxonomy
          ? taxonomy.matches(product, category, subcategory)
          : matchesCategory;

        return (
          matchesSelection &&
          searchable.includes(term) &&
          (!favoritesOnly || favorites.has(product.id))
        );
      });

      const visible = base.filter(product =>
        (
          refinements.min === null ||
          product.price >= refinements.min
        ) &&
        (
          refinements.max === null ||
          product.price <= refinements.max
        ) &&
        (
          !refinements.color ||
          normalized(product.color) === normalized(refinements.color)
        ) &&
        (
          !refinements.size ||
          product.sizes.some(size =>
            normalized(size) === normalized(refinements.size)
          )
        )
      );

      if (sort === "price-asc") {
        visible.sort((a, b) => a.price - b.price);
      } else if (sort === "price-desc") {
        visible.sort((a, b) => b.price - a.price);
      } else if (sort === "name") {
        visible.sort((a, b) =>
          String(a.name).localeCompare(String(b.name), "pt-BR")
        );
      } else {
        visible.sort((a, b) =>
          Number(b.isFeatured === true || b.featured === true) -
          Number(a.isFeatured === true || a.featured === true)
        );
      }

      return { base, visible };
    }

    /* Cards */

    function productCard(product) {
      const active = favorites.has(product.id);
      const href = "produto.html?id=" + encodeURIComponent(product.id);

      return [
        '<article class="product-card" data-product="' +
        esc(product.id) + '">',

        '<div class="product-photo">',

        '<a class="product-image-button" href="' +
        esc(href) + '" aria-label="Ver detalhes de ' +
        esc(product.name) + '">',

        '<img src="' + esc(product.image) + '" ' +
        'alt="' + esc(product.alt || product.name) + '" ' +
        'width="600" height="800" loading="lazy">',

        "</a>",

        '<button type="button" class="favorite-button' +
        (active ? " is-favorite" : "") + '" ' +
        'data-favorite="' + esc(product.id) + '" ' +
        'aria-label="' +
        (
          active
            ? "Remover dos favoritos: "
            : "Salvar nos favoritos: "
        ) +
        esc(product.name) + '" ' +
        'aria-pressed="' + active + '">' +
        icon("heart") +
        "</button>",

        "</div>",

        '<div class="product-meta"><div>',

        '<a class="product-name" href="' + esc(href) + '">' +
        esc(product.name) +
        "</a>",

        '<p class="product-subtitle">' +
        esc(product.subtitle) +
        "</p>",

        '<p class="product-price">' +
        money(product.price) +
        "</p>",

        "</div></div></article>"
      ].join("");
    }

    /* Atualização da vitrine */

    function renderProducts() {
      syncCatalogURL();

      const { base, visible } = getVisibleProducts();

      const title = favoritesOnly
        ? "Meus favoritos"
        : subcategory || category;

      const invalidRange =
        refinements.min !== null &&
        refinements.max !== null &&
        refinements.min > refinements.max;

      $("#catalog-price-max")?.setCustomValidity(
        invalidRange
          ? "O preço máximo deve ser maior ou igual ao mínimo."
          : ""
      );

      hidden("#catalog-price-error", !invalidRange);

      fillSelect(
        "#catalog-color",
        base.map(product => product.color),
        "Todas as cores",
        refinements.color
      );

      fillSelect(
        "#catalog-size",
        base.flatMap(product => product.sizes),
        "Todos os tamanhos",
        refinements.size
      );

      if ($("#product-grid")) {
        $("#product-grid").innerHTML =
          visible.map(productCard).join("");
      }

      text("#catalog-title", title);
      text("#catalog-breadcrumb-current", title);

      hidden("#catalog-breadcrumb-parent", !subcategory);
      hidden("#catalog-breadcrumb-parent-divider", !subcategory);

      const breadcrumbParent = $("#catalog-breadcrumb-parent");

      if (breadcrumbParent) {
        breadcrumbParent.textContent = category;
        breadcrumbParent.href = taxonomy?.href(category) || "#colecao";
        breadcrumbParent.dataset.navFilter = category;
      }

      const productCount =
        visible.length.toLocaleString("pt-BR") +
        (visible.length === 1 ? " produto" : " produtos");

      text("#result-count", productCount);
      text("#catalog-filters-submit", "Ver " + productCount);

      const activeCount =
        Number(refinements.min !== null || refinements.max !== null) +
        Number(Boolean(refinements.color)) +
        Number(Boolean(refinements.size)) +
        Number(sort !== "featured");

      text("#catalog-filters-count", activeCount);
      hidden("#catalog-filters-count", activeCount === 0);

      hidden(
        "#catalog-description",
        category !== "Todos" ||
        favoritesOnly ||
        Boolean(query) ||
        activeCount > 0
      );

      const summary = [];

      if (subcategory) {
        summary.push(category + ": " + subcategory);
      }

      if (query) {
        summary.push("Busca: " + query);
      }

      if (favoritesOnly) {
        summary.push("Seus favoritos");
      }

      if (refinements.color) {
        summary.push("Cor: " + refinements.color);
      }

      if (refinements.size) {
        summary.push("Tamanho: " + refinements.size);
      }

      if (refinements.min !== null) {
        summary.push("A partir de " + money(refinements.min));
      }

      if (refinements.max !== null) {
        summary.push("Até " + money(refinements.max));
      }

      if (sort !== "featured") {
        summary.push({
          "price-asc": "Menor preço",
          "price-desc": "Maior preço",
          name: "Nome: A–Z"
        }[sort]);
      }

      text("#catalog-applied-summary", summary.join(" / "));

      hidden("#catalog-active-filters", summary.length === 0);
      hidden("#reset-filters", summary.length === 0);
      hidden("#product-grid", visible.length === 0);
      hidden("#empty-state", visible.length > 0);

      text(
        "#empty-state h3",
        catalogFailed
          ? "Não foi possível carregar o catálogo."
          : favoritesOnly && favorites.size === 0
            ? "Seus favoritos começam aqui."
            : "Nenhum produto encontrado."
      );

      text(
        "#empty-state p",
        catalogFailed
          ? "Atualize a página para tentar novamente."
          : favoritesOnly && favorites.size === 0
            ? "Toque no coração dos produtos que você mais gostou."
            : "Experimente outros filtros ou veja todos os produtos."
      );

      $$(".filter-tab").forEach(button => {
        const active =
          button.dataset.filter === category &&
          !favoritesOnly;

        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      updateCounters();
    }

    /* Pesquisa */

    function updateSearchClear() {
      hidden(
        "#search-clear",
        !$("#search-input")?.value.trim()
      );
    }

    function hideSearch(restoreFocus = false) {
      hidden("#search-panel", true);

      $("#search-toggle")?.setAttribute(
        "aria-expanded",
        "false"
      );

      if (restoreFocus) {
        $("#search-toggle")?.focus({
          preventScroll: true
        });
      }
    }

    function toggleSearch() {
      const panel = $("#search-panel");

      if (!panel) return;

      if (!panel.hidden) {
        return hideSearch(true);
      }

      hideMenu();
      panel.hidden = false;

      $("#search-toggle")?.setAttribute(
        "aria-expanded",
        "true"
      );

      updateSearchClear();
      $("#search-input")?.focus();
    }

    /* Menu */

    function hideMenu(restoreFocus = false) {
      if ($("#mobile-menu") && window.SPI_MENU) {
        return window.SPI_MENU.close(restoreFocus);
      }

      hidden("#mobile-menu", true);

      $("#menu-toggle")?.setAttribute(
        "aria-expanded",
        "false"
      );

      $("#menu-toggle")?.setAttribute(
        "aria-label",
        "Abrir menu"
      );

      if (restoreFocus) {
        $("#menu-toggle")?.focus({
          preventScroll: true
        });
      }
    }

    function toggleMenu() {
      if (window.SPI_MENU) {
        return window.SPI_MENU.toggle();
      }

      const menu = $("#mobile-menu");

      if (!menu) return;

      if (!menu.hidden) {
        return hideMenu(true);
      }

      hideSearch();
      menu.hidden = false;

      $("#menu-toggle")?.setAttribute(
        "aria-expanded",
        "true"
      );

      $("#menu-toggle")?.setAttribute(
        "aria-label",
        "Fechar menu"
      );
    }

    /* Painel de filtros */

    function placeFilters() {
      const panel = $("#catalog-filters-dialog");
      const trigger = $("#catalog-filters-open");

      if (
        !panel?.open ||
        panel.dataset.filterMode !== "desktop" ||
        !trigger
      ) {
        return;
      }

      const anchor = trigger.getBoundingClientRect();
      const box = panel.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const width = box.width || 344;
      const height = Math.min(
        box.height || 520,
        viewportHeight - 32
      );

      panel.style.left = Math.max(
        16,
        Math.min(
          anchor.right - width,
          viewportWidth - width - 16
        )
      ) + "px";

      panel.style.top = Math.max(
        16,
        Math.min(
          anchor.bottom + 8,
          viewportHeight - height - 16
        )
      ) + "px";
    }

    function openFilters() {
      const panel = $("#catalog-filters-dialog");

      if (!panel) return;

      if (panel.open) {
        return closeDialog(panel);
      }

      hideSearch();
      hideMenu();

      const desktop = window.matchMedia(
        "(min-width: 1024px)"
      ).matches;

      panel.dataset.filterMode = desktop
        ? "desktop"
        : "mobile";

      panel.style.left = "";
      panel.style.top = "";

      if (desktop) {
        panel.show();
        placeFilters();
      } else {
        panel.showModal();
      }

      syncModalState();
    }

    document.addEventListener("pointerdown", event => {
      const panel = $("#catalog-filters-dialog");

      if (
        panel?.open &&
        panel.dataset.filterMode === "desktop" &&
        !event.target.closest?.(
          "#catalog-filters-dialog, #catalog-filters-open"
        )
      ) {
        closeDialog(panel);
      }
    });

    document.addEventListener("keydown", event => {
      const panel = $("#catalog-filters-dialog");

      if (event.key === "Escape" && panel?.open) {
        event.preventDefault();
        closeDialog(panel);
        $("#catalog-filters-open")?.focus();
      }
    });

    window.addEventListener("resize", placeFilters);

    window.addEventListener("scroll", placeFilters, {
      passive: true
    });

    window.matchMedia("(min-width: 1024px)")
      .addEventListener("change", () => {
        closeDialog($("#catalog-filters-dialog"));
      });

    /* Favoritos */

    function showFavorites() {
      category = "Todos";
      subcategory = "";
      query = "";
      favoritesOnly = true;

      clearRefinements();

      if ($("#search-input")) {
        $("#search-input").value = "";
      }

      updateSearchClear();
      hideSearch();
      hideMenu();
      renderProducts();
      scrollToCollection();
    }

    function toggleFavorite(id) {
      if (!productById.has(id)) return;

      const restoreFocus = $("#product-grid")?.contains(
        document.activeElement
      );

      const added = !favorites.has(id);

      if (added) {
        favorites.add(id);
      } else {
        favorites.delete(id);
      }

      saveLocal("spi-favorites-v1", [...favorites]);

      renderProducts();

      if (selectedProduct?.id === id) {
        updateDetailFavorite();
      }

      if (restoreFocus) {
        $$("[data-favorite]", $("#product-grid"))
          .find(button => button.dataset.favorite === id)
          ?.focus({ preventScroll: true });
      }

      toast(
        added
          ? "Produto salvo nos favoritos."
          : "Produto removido dos favoritos."
      );
    }

    function updateDetailFavorite() {
      const button = $("#detail-favorite");

      if (!button || !selectedProduct) return;

      const active = favorites.has(selectedProduct.id);

      button.classList.toggle("is-favorite", active);
      button.setAttribute("aria-pressed", String(active));

      button.innerHTML =
        icon("heart") +
        (
          active
            ? " Salvo nos favoritos"
            : " Salvar nos favoritos"
        );
    }

    /* Compatibilidade com detalhes em janela */

    function openProduct(id) {
      const p = productById.get(id);

      if (!p || !$("#product-detail")) return;

      selectedProduct = p;
      selectedSize = p.sizes.length === 1 ? p.sizes[0] : "";
      selectedQuantity = 1;

      $("#product-detail").innerHTML = [
        '<div class="product-detail-layout">',

        '<div class="detail-photo">' +
        '<img src="' + esc(p.image) + '" ' +
        'alt="' + esc(p.alt || p.name) + '" ' +
        'width="600" height="800">' +
        "</div>",

        '<div class="detail-copy">',

        '<p class="eyebrow">SPI Moda / ' +
        esc(p.type || p.category) +
        "</p>",

        '<h2 id="product-title">' +
        esc(p.name) +
        "</h2>",

        '<p class="detail-price">' +
        money(p.price) +
        "</p>",

        '<p class="detail-description">' +
        esc(p.description) +
        "</p>",

        '<p class="detail-label">Cor: ' +
        esc(p.color) +
        "</p>",

        '<div class="size-heading">' +
        "<span>Opção" +
        (p.sizes.length > 1 ? " / selecione" : "") +
        "</span>" +
        '<button type="button" class="text-button" ' +
        'data-info="tamanhos">Guia de tamanhos</button>' +
        "</div>",

        '<div class="size-options" role="group" ' +
        'aria-label="Escolha uma opção">' +

        p.sizes.map(size =>
          '<button type="button" class="size-option' +
          (selectedSize === size ? " selected" : "") + '" ' +
          'data-size="' + esc(size) + '" ' +
          'aria-pressed="' + (selectedSize === size) + '">' +
          esc(size) +
          "</button>"
        ).join("") +

        "</div>",

        '<p class="field-error" id="size-error" role="alert">' +
        (
          p.sizes.length
            ? ""
            : "Confirme as opções disponíveis com a loja."
        ) +
        "</p>",

        '<div class="detail-controls">' +
        '<div class="qty-control" aria-label="Quantidade">' +

        '<button type="button" id="detail-minus" ' +
        'aria-label="Diminuir quantidade" disabled>−</button>' +

        '<output id="detail-qty" aria-live="polite">1</output>' +

        '<button type="button" id="detail-plus" ' +
        'aria-label="Aumentar quantidade"' +
        (maxQty === 1 ? " disabled" : "") +
        ">+</button>" +

        "</div>",

        '<button type="button" class="button button-dark" ' +
        'id="add-to-cart">Adicionar à sacola ' +
        icon("bag") +
        "</button>" +

        "</div>",

        '<button type="button" class="detail-favorite" ' +
        'id="detail-favorite" ' +
        'data-favorite="' + esc(p.id) + '" ' +
        'aria-pressed="false"></button>',

        '<p class="detail-demo">' +
        (
          store.demo
            ? "Produto demonstrativo. Foto, preço e opções são ilustrativos. "
            : ""
        ) +
        "Confirme medidas e disponibilidade com a loja." +
        "</p>",

        "</div></div>"
      ].join("");

      updateDetailFavorite();
      openDialog($("#product-dialog"));
    }

    function changeDetailQuantity(delta) {
      if (!selectedProduct) return;

      selectedQuantity = Math.min(
        maxQty,
        Math.max(1, selectedQuantity + delta)
      );

      text("#detail-qty", selectedQuantity);

      if ($("#detail-minus")) {
        $("#detail-minus").disabled = selectedQuantity <= 1;
      }

      if ($("#detail-plus")) {
        $("#detail-plus").disabled = selectedQuantity >= maxQty;
      }
    }

    /* Sacola */

    function itemKey(item) {
      return item.id + "::" + item.size;
    }

    function cartCount() {
      return cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function cartTotal() {
      return cart.reduce(
        (sum, item) =>
          sum + productById.get(item.id).price * item.qty,
        0
      );
    }

    function updateCounters() {
      const count = cartCount();

      text("#cart-count", count);
      text("#drawer-count", count);
      text("#favorites-count", favorites.size);

      hidden("#favorites-count", favorites.size === 0);

      $("#cart-toggle")?.setAttribute(
        "aria-label",
        "Abrir sacola com " +
        count +
        (count === 1 ? " item" : " itens")
      );

      $("#favorites-toggle")?.setAttribute(
        "aria-pressed",
        String(favoritesOnly)
      );

      $("#favorites-toggle")?.setAttribute(
        "aria-label",
        favoritesOnly
          ? "Mostrar todos os produtos"
          : "Ver " + favorites.size + " favoritos"
      );
    }

    function persistCart() {
      saveLocal("spi-cart-v1", cart);
      renderCart();
      updateCounters();
    }

    function addToCart() {
      if (!selectedProduct) return;

      if (!selectedSize) {
        text(
          "#size-error",
          selectedProduct.sizes.length
            ? "Escolha uma opção para continuar."
            : "Confirme as opções disponíveis com a loja."
        );

        $(".size-option")?.focus();
        return;
      }

      const existing = cart.find(item =>
        item.id === selectedProduct.id &&
        item.size === selectedSize
      );

      if ((existing?.qty || 0) + selectedQuantity > maxQty) {
        text(
          "#size-error",
          "O limite é de " +
          maxQty +
          " unidades por opção. Você já tem " +
          (existing?.qty || 0) +
          " na sacola."
        );

        return;
      }

      if (existing) {
        existing.qty += selectedQuantity;
      } else {
        cart.push({
          id: selectedProduct.id,
          size: selectedSize,
          qty: selectedQuantity
        });
      }

      persistCart();

      closeDialog($("#product-dialog"));
      openDialog($("#cart-dialog"));

      toast("Produto adicionado à sacola.");
    }

    function renderCart() {
      const content = $("#cart-content");

      if (!content) return;

      if (!cart.length) {
        content.innerHTML =
          '<div class="cart-empty">' +
          "<span>" + icon("bag") + "</span>" +
          "<h3>Sua sacola está vazia.</h3>" +
          "<p>Encontre algo que combine com você.</p>" +
          '<button type="button" class="button button-dark" ' +
          "data-close>Explorar a coleção</button>" +
          "</div>";

        hidden("#cart-summary", true);
        return;
      }

      content.innerHTML = cart.map(item => {
        const p = productById.get(item.id);
        const key = esc(itemKey(item));

        return [
          '<article class="cart-item">',

          '<img src="' + esc(p.image) + '" ' +
          'alt="' + esc(p.alt || p.name) + '" ' +
          'width="85" height="115">',

          "<div>",

          '<div class="cart-item-title">' +
          "<strong>" + esc(p.name) + "</strong>",

          '<button type="button" class="cart-remove" ' +
          'data-cart-action="remove" data-key="' + key + '" ' +
          'aria-label="Remover ' + esc(p.name) +
          ", opção " + esc(item.size) + '">' +
          icon("close") +
          "</button></div>",

          "<p>" +
          esc(p.color) +
          " / Opção: " +
          esc(item.size) +
          "</p>",

          '<div class="cart-item-bottom">' +
          '<div class="qty-control">',

          '<button type="button" data-cart-action="minus" ' +
          'data-key="' + key + '" ' +
          'aria-label="Diminuir quantidade de ' + esc(p.name) + '"' +
          (item.qty <= 1 ? " disabled" : "") +
          ">−</button>",

          '<output aria-label="Quantidade de ' + esc(p.name) + '">' +
          item.qty +
          "</output>",

          '<button type="button" data-cart-action="plus" ' +
          'data-key="' + key + '" ' +
          'aria-label="Aumentar quantidade de ' + esc(p.name) + '"' +
          (item.qty >= maxQty ? " disabled" : "") +
          ">+</button>",

          "</div>",

          "<span>" +
          money(p.price * item.qty) +
          "</span>",

          "</div></div></article>"
        ].join("");
      }).join("");

      hidden("#cart-summary", false);
      text("#cart-total", money(cartTotal()));
    }

    function changeCart(action, key) {
      const index = cart.findIndex(
        item => itemKey(item) === key
      );

      if (index < 0) return;

      if (action === "remove") {
        cart.splice(index, 1);
      } else if (action === "plus") {
        cart[index].qty = Math.min(
          maxQty,
          cart[index].qty + 1
        );
      } else if (action === "minus") {
        cart[index].qty = Math.max(
          1,
          cart[index].qty - 1
        );
      } else {
        return;
      }

      persistCart();

      if (action !== "remove") {
        $$("[data-cart-action]", $("#cart-dialog"))
          .find(button =>
            button.dataset.key === key &&
            button.dataset.cartAction === action
          )
          ?.focus();
      }
    }

    /* Compatibilidade com o resumo de pedido */

    function openCheckout() {
      if (!cart.length) return;

      closeDialog($("#cart-dialog"));

      hidden("#checkout-form", false);
      hidden("#order-ready", true);

      text("#checkout-total", money(cartTotal()));

      text(
        "#checkout-note",
        whatsapp
          ? "Você poderá enviar o resumo pelo WhatsApp. Nenhuma cobrança é feita nesta página."
          : "Copie o resumo e envie pelo Instagram. Nenhuma cobrança é feita nesta página."
      );

      openDialog($("#checkout-dialog"));
    }

    function createSummary(data) {
      const lines = [
        "Olá, " +
        (store.name || "SPI Moda") +
        "! Gostaria de consultar estes produtos:",
        "",
        "Nome: " + String(data.customer || "").trim(),
        ""
      ];

      cart.forEach((item, index) => {
        const p = productById.get(item.id);

        lines.push(
          (index + 1) + ". " + p.name,

          "Cor: " + (p.color || "") +
          " | Opção: " + item.size +
          " | Quantidade: " + item.qty,

          "Valor da seleção: " + money(p.price * item.qty),

          ""
        );
      });

      lines.push(
        "Subtotal: " + money(cartTotal()),
        "Preferência: " + data.delivery
      );

      if (data.delivery === "Consultar entrega" && data.cep) {
        lines.push("CEP para consulta: " + data.cep);
      }

      if (String(data.notes || "").trim()) {
        lines.push("Observações: " + data.notes.trim());
      }

      lines.push(
        "",
        "Entrega e pagamento a combinar. Aguardo a confirmação de preços, medidas e disponibilidade."
      );

      if (store.demo) {
        lines.push(
          "Seleção feita em catálogo demonstrativo, com valores ilustrativos."
        );
      }

      return lines.join("\n");
    }

    function showOrderReady(event) {
      event.preventDefault();

      if (!cart.length) {
        closeDialog($("#checkout-dialog"));
        return toast("Sua sacola está vazia.");
      }

      const form = event.currentTarget;
      const customer = $('[name="customer"]', form);

      if (!customer?.value.trim()) {
        customer?.setCustomValidity("Digite seu nome.");
        customer?.reportValidity();
        return;
      }

      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form));

      orderSummary = createSummary(data);

      if ($("#order-text")) {
        $("#order-text").value = orderSummary;
      }

      hidden("#checkout-form", true);
      hidden("#order-ready", false);

      const channel = $("#order-channel");

      if (channel) {
        channel.href = whatsapp
          ? "https://wa.me/" +
            whatsapp +
            "?text=" +
            encodeURIComponent(orderSummary)
          : instagram;

        channel.textContent = whatsapp
          ? "Enviar pelo WhatsApp"
          : "Abrir Instagram da loja";
      }

      text(
        "#order-ready-text",
        whatsapp
          ? "Revise o resumo e envie pelo WhatsApp para confirmar os detalhes com a loja."
          : "Copie o resumo, abra o Instagram e envie na conversa com a SPI Moda."
      );

      if ($("#checkout-dialog")) {
        $("#checkout-dialog").scrollTop = 0;
      }

      $("#copy-order")?.focus();
    }

    async function copyOrder() {
      if (!orderSummary) return;

      let copied = false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(orderSummary);
          copied = true;
        }
      } catch {
        // Utiliza a cópia por seleção.
      }

      if (!copied) {
        const field = $("#order-text");

        field?.focus();
        field?.select();

        try {
          copied = Boolean(
            field &&
            document.execCommand("copy")
          );
        } catch {
          copied = false;
        }
      }

      toast(
        copied
          ? "Resumo copiado. Agora envie para a loja."
          : "Selecione o resumo e use Ctrl+C ou toque em Copiar."
      );

      if (copied) {
        clearTimeout(copyTimer);

        if ($("#copy-order")) {
          $("#copy-order").innerHTML =
            icon("check") + " Resumo copiado";
        }

        copyTimer = setTimeout(() => {
          if ($("#copy-order")) {
            $("#copy-order").innerHTML =
              icon("copy") + " Copiar resumo";
          }
        }, 2200);
      }
    }

    function downloadOrder() {
      if (!orderSummary) return;

      const url = URL.createObjectURL(
        new Blob([orderSummary], {
          type: "text/plain;charset=utf-8"
        })
      );

      const link = document.createElement("a");

      link.href = url;
      link.download = "minha-selecao-spi-moda.txt";

      document.body.append(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }

    /* Informações da loja */

    function openInfo(type) {
      const content = {
        comprar: `
          <p class="eyebrow">COMO FUNCIONA</p>
          <h2>Do seu jeito,<br>passo a passo.</h2>

          <ol>
            <li>
              Explore a coleção e abra uma peça para ver os detalhes.
            </li>
            <li>
              Selecione o tamanho, a quantidade e adicione à sacola.
            </li>
            <li>
              Revise a seleção e toque em “Continuar pedido”.
            </li>
            <li>
              Informe seu nome e a preferência de recebimento.
            </li>
            <li>
              Copie ou baixe o resumo e converse com a SPI pelo Instagram
              ${whatsapp ? " ou WhatsApp" : ""}.
            </li>
          </ol>

          <p>
            A loja confirma o catálogo, as medidas, os valores,
            a disponibilidade, a entrega e as formas de pagamento.
            Este site não processa pagamentos e preparar o resumo
            não envia um pedido automaticamente.
          </p>
        `,

        tamanhos: `
          <p class="eyebrow">ENCONTRE SEU CAIMENTO</p>
          <h2>Seu tamanho,<br>com mais cuidado.</h2>

          <p>
            O caimento muda conforme a peça, a modelagem e o tecido.
            Por isso, confirme as medidas de cada produto com a loja
            antes de escolher.
          </p>

          <table>
            <thead>
              <tr>
                <th>Medida</th>
                <th>Como medir</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Busto</td>
                <td>Ao redor da parte mais larga do tórax</td>
              </tr>
              <tr>
                <td>Cintura</td>
                <td>Ao redor da parte mais estreita do tronco</td>
              </tr>
              <tr>
                <td>Quadril</td>
                <td>Ao redor da parte mais larga do quadril</td>
              </tr>
            </tbody>
          </table>

          <p>
            Use uma fita métrica sem apertar.
            Os tamanhos exibidos no catálogo demonstrativo são
            ilustrativos; nenhuma equivalência de tamanho
            está sendo garantida.
          </p>

          <a
            class="button button-dark"
            href="${esc(instagram)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pedir medidas à loja
          </a>
        `,

        trocas: `
          <p class="eyebrow">CADA DETALHE IMPORTA</p>
          <h2>Entregas<br>e trocas.</h2>

          <p>
            Consulte com a SPI Moda as regiões atendidas,
            as opções de retirada, o custo do frete e o prazo
            de cada pedido antes de pagar.
          </p>

          <p>
            Este projeto ainda não possui uma política comercial
            fornecida pela loja. Para informações sobre trocas,
            devoluções e cancelamentos, fale com o atendimento
            e confirme as condições aplicáveis à sua compra.
          </p>

          <a
            class="button button-dark"
            href="${esc(instagram)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar a loja
          </a>
        `,

        privacidade: `
          <p class="eyebrow">SEUS DADOS</p>
          <h2>Privacidade<br>sem complicação.</h2>

          <p>
            Esta versão guarda a sacola e os favoritos
            no armazenamento local do seu navegador.
            Não usa analytics, cookies de publicidade
            ou cadastro de clientes.
          </p>

          <p>
            Nome, CEP e observações são utilizados apenas para
            montar o resumo nesta visita e não são gravados
            pelo site. O conteúdo só sai da página se você copiar,
            baixar ou escolher enviá-lo pelo canal de atendimento.
          </p>

          <p>
            Ao abrir Instagram ou WhatsApp, passam a valer
            as políticas dessas plataformas. O provedor de
            hospedagem também pode registrar informações técnicas
            de acesso conforme as próprias condições.
          </p>

          <button
            type="button"
            class="button button-outline"
            id="clear-local-data"
          >
            Apagar sacola e favoritos
          </button>
        `,

        contato: `
          <p class="eyebrow">VAMOS CONVERSAR</p>
          <h2>Olá, que bom<br>ter você aqui.</h2>

          <p>
            Quer saber mais sobre uma peça, conferir as medidas
            ou consultar a disponibilidade?
            Fale diretamente com a SPI Moda.
          </p>

          <a
            class="button button-dark"
            href="${esc(instagram)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram ${esc(store.instagramHandle || "@spi.moda")}
          </a>

          ${
            whatsapp
              ? `
                <p>
                  <a
                    class="underlined-link"
                    href="https://wa.me/${esc(whatsapp)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Conversar pelo WhatsApp
                  </a>
                </p>
              `
              : ""
          }

          <p>
            O horário de atendimento e os demais dados comerciais
            devem ser confirmados com a loja.
          </p>
        `
      };

      const body = content[type] || content.contato;
      const container = $("#info-content");

      if (!container) return;

      container.innerHTML = body.replace(
        "<h2>",
        '<h2 id="info-title">'
      );

      openDialog($("#info-dialog"));
    }

    /* Eventos dos botões */

    document.addEventListener("click", event => {
      const button = event.target.closest?.("button,a");

      if (!button) return;

      if (button.hasAttribute("data-close")) {
        return closeDialog(button.closest("dialog"));
      }

      if (button.id === "search-close") {
        return hideSearch(true);
      }

      if (button.dataset.openProduct) {
        return openProduct(button.dataset.openProduct);
      }

      if (button.dataset.favorite) {
        return toggleFavorite(button.dataset.favorite);
      }

      const chosen =
        button.dataset.navFilter ||
        button.dataset.filter;

      if (chosen) {
        event.preventDefault();

        selectCategory(
          chosen,
          button.dataset.navSubcategory || ""
        );

        scrollToCollection();
        return;
      }

      if (
        button.dataset.size &&
        selectedProduct?.sizes.includes(button.dataset.size)
      ) {
        selectedSize = button.dataset.size;

        $$(".size-option").forEach(option => {
          const active =
            option.dataset.size === selectedSize;

          option.classList.toggle("selected", active);

          option.setAttribute(
            "aria-pressed",
            String(active)
          );
        });

        text("#size-error", "");
      }

      if (button.dataset.info) {
        return openInfo(button.dataset.info);
      }

      if (button.dataset.cartAction) {
        return changeCart(
          button.dataset.cartAction,
          button.dataset.key
        );
      }

      if (button.id === "detail-minus") {
        changeDetailQuantity(-1);
      }

      if (button.id === "detail-plus") {
        changeDetailQuantity(1);
      }

      if (button.id === "add-to-cart") {
        addToCart();
      }

      if (button.id === "clear-local-data") {
        cart = [];
        favorites.clear();
        orderSummary = "";

        saveLocal("spi-cart-v1", []);
        saveLocal("spi-favorites-v1", []);

        if ($("#order-text")) {
          $("#order-text").value = "";
        }

        closeDialog($("#checkout-dialog"));

        renderCart();
        renderProducts();
        updateDetailFavorite();

        toast("Sacola e favoritos apagados deste navegador.");
      }
    });

    /* Pesquisa */

    on("#search-toggle", "click", toggleSearch);
    on("#menu-toggle", "click", toggleMenu);

    on("#search-input", "input", event => {
      query = event.target.value.trim();
      updateSearchClear();
      renderProducts();
    });

    on("#search-input", "keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        hideSearch(true);
        scrollToCollection();
      }
    });

    on("#search-clear", "click", () => {
      query = "";

      if ($("#search-input")) {
        $("#search-input").value = "";
      }

      updateSearchClear();
      renderProducts();
      $("#search-input")?.focus();
    });

    /* Favoritos e categorias */

    on("#favorites-toggle", "click", () => {
      if (favoritesOnly) {
        favoritesOnly = false;
        renderProducts();
      } else {
        showFavorites();
      }
    });

    on("#footer-favorites", "click", showFavorites);
    on("#catalog-home", "click", resetFilters);
    on("#reset-filters", "click", resetFilters);
    on("#empty-reset", "click", resetFilters);

    on("#hero-cta", "click", () => {
      resetFilters();
      hideSearch();
    });

    /* Ordenação e filtros */

    on("#sort-select", "change", event => {
      sort = [
        "featured",
        "price-asc",
        "price-desc",
        "name"
      ].includes(event.target.value)
        ? event.target.value
        : "featured";

      renderProducts();
    });

    on("#catalog-filters-open", "click", openFilters);

    on("#catalog-filters-clear", "click", () => {
      clearRefinements();
      renderProducts();
    });

    ["#catalog-color", "#catalog-size"].forEach(selector => {
      on(selector, "change", readRefinements);
    });

    ["#catalog-price-min", "#catalog-price-max"].forEach(selector => {
      on(selector, "input", readRefinements);
    });

    on("#catalog-filters-form", "submit", event => {
      event.preventDefault();
      readRefinements();

      if (event.currentTarget.reportValidity()) {
        closeDialog($("#catalog-filters-dialog"));
      }
    });

    /* Compatibilidade com sacola em janela */

    on("#cart-toggle", "click", () => {
      renderCart();
      openDialog($("#cart-dialog"));
    });

    on("#checkout-open", "click", openCheckout);
    on("#checkout-form", "submit", showOrderReady);

    on('[name="customer"]', "input", event => {
      event.target.setCustomValidity("");
    });

    on("#cep-input", "input", event => {
      const digits = event.target.value
        .replace(/\D/g, "")
        .slice(0, 8);

      event.target.value = digits.length > 5
        ? digits.slice(0, 5) + "-" + digits.slice(5)
        : digits;
    });

    on("#delivery-select", "change", event => {
      const pickup =
        event.target.value === "Consultar retirada";

      hidden("#cep-label", pickup);

      if ($("#cep-input")) {
        $("#cep-input").disabled = pickup;
      }
    });

    on("#copy-order", "click", copyOrder);
    on("#download-order", "click", downloadOrder);

    on("#edit-order", "click", () => {
      hidden("#order-ready", true);
      hidden("#checkout-form", false);
      $('[name="customer"]')?.focus();
    });

    on("#contact-float", "click", () => {
      openInfo("contato");
    });

    $$("#mobile-menu a").forEach(link => {
      link.addEventListener("click", () => hideMenu());
    });

    /* Teclado e clique fora */

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;

      if (
        $("#search-panel") &&
        !$("#search-panel").hidden
      ) {
        hideSearch(true);
      } else if (
        $("#mobile-menu") &&
        !$("#mobile-menu").hidden
      ) {
        hideMenu(true);
      }
    });

    document.addEventListener("pointerdown", event => {
      if (
        !event.target.closest?.(
          "#search-panel, #search-toggle"
        )
      ) {
        hideSearch();
      }

      if (
        !event.target.closest?.(
          "#mobile-menu, #menu-toggle"
        )
      ) {
        hideMenu();
      }
    });

    $$("dialog").forEach(dialog => {
      dialog.addEventListener("click", event => {
        if (event.target !== dialog) return;

        const box = dialog.getBoundingClientRect();

        const outside =
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom;

        if (outside) {
          closeDialog(dialog);
        }
      });

      dialog.addEventListener(
        "close",
        syncModalState
      );
    });

    window
      .matchMedia("(min-width: 1024px)")
      .addEventListener("change", event => {
        if (event.matches) {
          hideMenu();
        }
      });

    window.addEventListener("storage", event => {
      if (
        ["spi-cart-v1", "spi-favorites-v1"].includes(event.key)
      ) {
        toast(
          "Sua seleção mudou em outra aba. Atualize esta página."
        );
      }
    });

    /* Inicialização */

    text("#year", new Date().getFullYear());

    if ($("#search-input")) {
      $("#search-input").value = query;
    }

    drawIcons();
    updateSearchClear();
    renderProducts();
    renderCart();

    if (initialURL.searchParams.get("sacola") === "1") {
      openDialog($("#cart-dialog"));
      initialURL.searchParams.delete("sacola");

      try {
        window.history.replaceState(
          null,
          "",
          initialURL.href
        );
      } catch {
        // Permite utilizar os arquivos localmente.
      }
    }
  }

  const run = () => {
    start().catch(error => {
      console.error(
        "Não foi possível iniciar a SPI Moda:",
        error
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