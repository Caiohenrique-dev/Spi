/* SPI Moda — categorias, subcategorias e navegação compartilhada. */
(() => {
  "use strict";

  if (window.__SPI_NAV_STARTED__) return;
  window.__SPI_NAV_STARTED__ = true;

  const normalize = value =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const escape = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const names = [
    "Todos",
    "Roupas",
    "Calçados",
    "Bolsas",
    "Acessórios",
    "Copos"
  ];

  const groups = {
    Roupas: {
      Vestidos: ["vestido"],
      Blusas: ["blusa", "camisa", "camisas", "camiseta", "camisetas"],
      Calças: ["calca", "jeans", "calcas jeans"],
      Shorts: ["short", "bermuda", "bermudas", "shorts e bermudas"],
      Saias: ["saia"],
      Conjuntos: ["conjunto"],
      Casacos: ["casaco", "jaqueta", "jaquetas", "blazer", "blazers"]
    },

    Sapatos: {
      Mocassins: ["mocassim"],
      Sandálias: ["sandalia"],
      Tênis: ["tenis"],
      Botas: ["bota"],
      Sapatilhas: ["sapatilha"],
      Scarpins: ["scarpin"],
      Rasteiras: ["rasteira"]
    },

    Bolsas: {
      Tiracolo: ["bolsa tiracolo", "bolsas tiracolo"],
      "Bolsas de mão": ["bolsa de mao"],
      Clutches: ["clutch"],
      Mochilas: ["mochila"],
      Carteiras: ["carteira"],
      Pochetes: ["pochete"]
    },

    Acessórios: {
      Óculos: ["oculos de sol", "oculos"],
      Bolsas: ["bolsa"],
      Cintos: ["cinto"],
      Brincos: ["brinco"],
      Colares: ["colar"],
      Pulseiras: ["pulseira"],
      Anéis: ["anel"]
    },

    Copos: {
      "Copos térmicos": ["copo termico", "copo", "copos"]
    }
  };

  function aliases(category, label) {
    return [
      label,
      ...(groups[category]?.[label] || [])
    ].map(normalize);
  }

  function categoryOf(product) {
    const values = [
      product.category,
      product.type,
      product.subcategory
    ].map(normalize);

    if (
      values.some(value =>
        ["bolsa", "bolsas"].includes(value)
      )
    ) {
      return "Bolsas";
    }

    if (
      values.some(value =>
        [
          "copo",
          "copos",
          "copo termico",
          "copos termicos"
        ].includes(value)
      )
    ) {
      return "Copos";
    }

    const shoes = [
      "sapato",
      "sapatos",
      "calcado",
      "calcados",

      ...Object.entries(groups.Sapatos)
        .flatMap(([label, values]) => [label, ...values])
        .map(normalize)
    ];

    if (values.some(value => shoes.includes(value))) {
      return "Sapatos";
    }

    return (
      names.find(name =>
        normalize(name) === normalize(product.category)
      ) ||
      String(product.category || "")
    );
  }

  function matchesCategory(product, category) {
    if (category === "Todos") {
      return true;
    }

    if (category === "Novidades") {
      return Boolean(product.isNew);
    }

    const value = categoryOf(product);

    return (
      value === category ||
      (category === "Acessórios" && value === "Bolsas")
    );
  }

  function list(category, products = []) {
    const labels = Object.keys(groups[category] || {});

    for (const product of products) {
      if (!matchesCategory(product, category)) {
        continue;
      }

      const value = String(
        product.subcategory || product.type || ""
      ).trim();

      if (
        !value ||
        names.some(name =>
          normalize(name) === normalize(value)
        )
      ) {
        continue;
      }

      if (
        labels.some(label =>
          aliases(category, label).includes(normalize(value))
        )
      ) {
        continue;
      }

      if (
        value.length <= 60 &&
        !labels.some(label =>
          normalize(label) === normalize(value)
        )
      ) {
        labels.push(value);
      }
    }

    return labels;
  }

  function matches(product, category, subcategory = "") {
    if (!matchesCategory(product, category)) {
      return false;
    }

    if (!subcategory) {
      return true;
    }

    if (
      category === "Acessórios" &&
      subcategory === "Bolsas"
    ) {
      return categoryOf(product) === "Bolsas";
    }

    const values = [
      product.subcategory,
      product.type,

      ...(
        Array.isArray(product.subcategories)
          ? product.subcategories
          : []
      )
    ].map(normalize);

    return aliases(category, subcategory)
      .some(value => values.includes(value));
  }

  function resolve(category, value, products = []) {
    return (
      list(category, products).find(label =>
        normalize(label) === normalize(value)
      ) || ""
    );
  }

  function href(category, subcategory = "") {
    const params = new URLSearchParams();

    if (category !== "Todos") {
      params.set("categoria", category);
    }

    if (subcategory) {
      params.set("subcategoria", subcategory);
    }

    return (
      "categoria.html" +
      (params.size ? "?" + params.toString() : "") +
      "#colecao"
    );
  }

  window.SPI_CATEGORIES = {
    names,
    list,
    matches,
    matchesCategory,
    categoryOf,
    resolve,
    href
  };

  function start() {
    const $ = selector =>
      document.querySelector(selector);

    const button =
      $("#menu-toggle") ||
      $("#pp-menu-toggle");

    const previous =
      $("#mobile-menu") ||
      $("#pp-menu");

    const inCatalog =
      document.body.classList.contains("category-page");

    const products = () =>
      (
        Array.isArray(window.SPI_STORE?.products)
          ? window.SPI_STORE.products
          : []
      ).filter(product =>
        product && typeof product === "object"
      );

    const arrow = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 5 7 7-7 7"/>
      </svg>
    `;

    const closeIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M6 18 18 6"/>
      </svg>
    `;

    const searchIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5"/>
        <path d="m16 16 4.5 4.5"/>
      </svg>
    `;

    function attrs(category, subcategory = "") {
      if (!inCatalog) return "";

      return (
        ' data-nav-filter="' + escape(category) + '"' +
        (
          subcategory
            ? ' data-nav-subcategory="' +
              escape(subcategory) + '"'
            : ""
        )
      );
    }

    function link(
      category,
      subcategory,
      label,
      className = ""
    ) {
      return (
        '<a class="' + className +
        '" href="' + escape(href(category, subcategory)) +
        '"' + attrs(category, subcategory) + ">" +
        escape(label) +
        "</a>"
      );
    }

    function imageFor(category) {
      const configured =
        window.SPI_MENU_IMAGES?.[category] ||
        window.SPI_STORE?.menuImages?.[category];

      const product = products().find(product =>
        matchesCategory(product, category) &&
        product.image
      );

      const source =
        configured ||
        product?.image ||
        "assets/images/logo-spi.png";

      try {
        const url = new URL(source, window.location.href);

        if (["http:", "https:"].includes(url.protocol)) {
          return url.href;
        }
      } catch {}

      return "assets/images/logo-spi.png";
    }

    function bindImages(root) {
      root.querySelectorAll("img").forEach(image => {
        image.addEventListener("error", () => {
          if (image.dataset.fallback) {
            image.style.visibility = "hidden";
            return;
          }

          image.dataset.fallback = "true";
          image.src = "assets/images/logo-spi.png";
          image.classList.add("spi-dept-fallback");
        });
      });
    }

    /* Direciona os links existentes para categoria.html. */

    document.querySelectorAll(
      "a[href], form[action]"
    ).forEach(node => {
      const attribute = node.tagName === "FORM"
        ? "action"
        : "href";

      const value = node.getAttribute(attribute);

      if (!value) return;

      if (!inCatalog && node.dataset.navFilter) {
        node.setAttribute(
          "href",
          href(
            node.dataset.navFilter,
            node.dataset.navSubcategory || ""
          )
        );

        node.removeAttribute("data-nav-filter");
        node.removeAttribute("data-nav-subcategory");
        return;
      }

      try {
        const url = new URL(value, window.location.href);
        const here = new URL(window.location.href);

        if (
          url.origin !== here.origin ||
          !url.pathname.endsWith("/index.html")
        ) {
          return;
        }

        if (
          !url.searchParams.has("categoria") &&
          !url.searchParams.has("busca") &&
          url.hash !== "#colecao"
        ) {
          return;
        }

        url.pathname = url.pathname.replace(
          /index\.html$/,
          "categoria.html"
        );

        node.setAttribute(attribute, url.href);
      } catch {}
    });

    /* Menu do computador */

    let openedDesktop = null;

    function closeDesktop(focus = false) {
      if (!openedDesktop) return;

      const active = openedDesktop;

      active.querySelector(
        ".spi-nav-dropdown"
      ).hidden = true;

      active.querySelector("button").setAttribute(
        "aria-expanded",
        "false"
      );

      openedDesktop = null;

      if (focus) {
        active.querySelector("button").focus();
      }
    }

    function buildDesktop() {
      document.querySelectorAll(
        ".desktop-nav, .pp-desktop-nav"
      ).forEach(nav => {
        if (nav.dataset.spiEnhanced) return;
        nav.dataset.spiEnhanced = "true";

        const entries = [...nav.querySelectorAll("a")]
          .map(anchor => ({
            category: names.find(name =>
              normalize(name) ===
              normalize(anchor.textContent)
            ),
            anchor
          }))
          .filter(entry => entry.category);

        for (const { category, anchor } of entries) {
          const children = list(category, products());

          if (!children.length) continue;

          const group = document.createElement("div");
          group.className = "spi-nav-group";

          const id =
            "spi-nav-" +
            normalize(category).replace(/\s+/g, "-");

          group.innerHTML = `
            <button
              type="button"
              class="spi-nav-toggle"
              aria-expanded="false"
              aria-controls="${id}"
            >
              ${escape(category)}

              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m7 10 5 5 5-5"/>
              </svg>
            </button>

            <div
              id="${id}"
              class="spi-nav-dropdown"
              hidden
            >
              ${link(
                category,
                "",
                "Ver tudo em " + category.toLowerCase(),
                "spi-nav-all"
              )}

              ${children.map(child =>
                link(category, child, child)
              ).join("")}
            </div>
          `;

          anchor.replaceWith(group);

          const toggle = group.querySelector("button");

          toggle.addEventListener("click", () => {
            const wasOpen = openedDesktop === group;

            closeDesktop();

            if (wasOpen) return;

            group.querySelector(
              ".spi-nav-dropdown"
            ).hidden = false;

            toggle.setAttribute(
              "aria-expanded",
              "true"
            );

            openedDesktop = group;
          });

          toggle.addEventListener("keydown", event => {
            if (event.key !== "ArrowDown") return;

            event.preventDefault();

            if (openedDesktop !== group) {
              toggle.click();
            }

            group.querySelector("a")?.focus();
          });

          group.addEventListener("focusout", event => {
            if (!group.contains(event.relatedTarget)) {
              closeDesktop();
            }
          });

          group.addEventListener("click", event => {
            if (event.target.closest("a")) {
              closeDesktop();
            }
          });
        }
      });
    }

    buildDesktop();

    document.addEventListener("pointerdown", event => {
      if (!event.target.closest?.(".spi-nav-group")) {
        closeDesktop();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeDesktop(true);
      }
    });

    /* Menu do celular */

    if (!button || !previous) return;

    const dialog = document.createElement("dialog");

    dialog.id = previous.id;
    dialog.className = "spi-departments";
    dialog.hidden = true;

    dialog.setAttribute(
      "aria-labelledby",
      "spi-dept-title"
    );

    dialog.innerHTML = `
      <div class="spi-dept-heading">
        <button
          type="button"
          class="spi-dept-back"
          aria-label="Voltar às categorias"
          hidden
        >
          ${arrow}
        </button>

        <h2 id="spi-dept-title">
          Explore a SPI
        </h2>

        <button
          type="button"
          class="spi-dept-close"
          aria-label="Fechar menu"
        >
          ${closeIcon}
        </button>
      </div>

      <div class="spi-dept-search">
        ${searchIcon}

        <input
          type="search"
          id="spi-dept-search"
          aria-label="Buscar categorias"
          placeholder="Buscar categorias"
          autocomplete="off"
        >
      </div>

      <div class="spi-dept-content"></div>
    `;

    previous.replaceWith(dialog);

    button.setAttribute(
      "aria-haspopup",
      "dialog"
    );

    const content = dialog.querySelector(
      ".spi-dept-content"
    );

    const search = dialog.querySelector("input");
    const back = dialog.querySelector(".spi-dept-back");
    const title = dialog.querySelector("h2");

    let current = "";

    function render() {
      const term = normalize(search.value);

      if (!current) {
        const categories = names.filter(name =>
          name !== "Todos" &&
          normalize(name).includes(term)
        );

        content.innerHTML = `
          <div class="spi-dept-grid">
            ${categories.map(category => {
              const image = `
                <img
                  src="${escape(imageFor(category))}"
                  alt=""
                  width="420"
                  height="280"
                  decoding="async"
                >

                <span>${escape(category)}</span>
              `;

              if (list(category, products()).length) {
                return `
                  <button
                    type="button"
                    class="spi-dept-card"
                    data-dept-category="${escape(category)}"
                  >
                    ${image}
                  </button>
                `;
              }

              return `
                <a
                  class="spi-dept-card"
                  href="${escape(href(category))}"
                  ${attrs(category)}
                >
                  ${image}
                </a>
              `;
            }).join("")}
          </div>

          ${
            !categories.length
              ? `
                <p class="spi-dept-empty">
                  Nenhuma categoria encontrada.
                </p>
              `
              : ""
          }

          ${link(
            "Todos",
            "",
            "Ver toda a coleção",
            "spi-dept-all"
          )}
        `;
      } else {
        const children = list(
          current,
          products()
        ).filter(label =>
          normalize(label).includes(term)
        );

        content.innerHTML = `
          <a
            class="spi-dept-banner"
            href="${escape(href(current))}"
            ${attrs(current)}
          >
            <img
              src="${escape(imageFor(current))}"
              alt=""
              width="720"
              height="360"
            >

            <span>
              <strong>${escape(current)}</strong>
              <span>Ver tudo</span>
            </span>
          </a>

          <div class="spi-dept-list">
            ${children.map(child => `
              <a
                href="${escape(href(current, child))}"
                ${attrs(current, child)}
              >
                <span>${escape(child)}</span>
                ${arrow}
              </a>
            `).join("")}
          </div>

          ${
            !children.length
              ? `
                <p class="spi-dept-empty">
                  Nenhuma subcategoria encontrada.
                </p>
              `
              : ""
          }
        `;
      }

      bindImages(content);
    }

   function choose(category) {
  current = category;
  search.value = '';
  back.hidden = !current;

  title.textContent = current || '';

  if (!current) {
    const logo = document.createElement('img');

    logo.src = 'assets/images/logo-spi.png';
    logo.alt = 'SPI Moda';
    logo.className = 'spi-menu-logo';
    logo.width = 70;
    logo.height = 56;

    const frase = document.createElement('span');

    frase.className = 'spi-menu-frase';
    frase.textContent = 'Seu estilo começa aqui.';

    title.append(logo, frase);
  }

  search.placeholder = current
    ? 'Buscar em ' + current.toLowerCase()
    : 'Buscar categorias';

  search.setAttribute('aria-label', search.placeholder);

  render();
  content.scrollTop = 0;

  if (current) {
    back.focus();
  }
}

    function finishClose(focus = false) {
      dialog.hidden = true;

      document.body.classList.remove(
        "spi-menu-open"
      );

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.setAttribute(
        "aria-label",
        "Abrir menu"
      );

      if (focus) {
        button.focus({ preventScroll: true });
      }
    }

    function close(focus = false) {
      if (!dialog.open) return;

      dialog.close();
      finishClose(focus);
    }

    function open() {
      if (dialog.open) return;

      closeDesktop();

      const searchPanel = $("#search-panel");

      if (searchPanel) {
        searchPanel.hidden = true;
      }

      $("#search-toggle")?.setAttribute(
        "aria-expanded",
        "false"
      );

      choose("");

      dialog.hidden = false;
      dialog.showModal();

      document.body.classList.add(
        "spi-menu-open"
      );

      button.setAttribute(
        "aria-expanded",
        "true"
      );

      button.setAttribute(
        "aria-label",
        "Fechar menu"
      );

      dialog.querySelector(
        ".spi-dept-close"
      ).focus();
    }

    window.SPI_MENU = {
      open,
      close,

      toggle: () => dialog.open
        ? close(true)
        : open()
    };

    search.addEventListener("input", render);

    back.addEventListener("click", () => {
      choose("");
      content.querySelector("button, a")?.focus();
    });

    dialog.querySelector(
      ".spi-dept-close"
    ).addEventListener(
      "click",
      () => close(true)
    );

    dialog.addEventListener("click", event => {
      const card = event.target.closest(
        "[data-dept-category]"
      );

      if (card) {
        return choose(card.dataset.deptCategory);
      }

      if (event.target.closest("a")) {
        return close();
      }

      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        close(true);
      }
    });

    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      close(true);
    });

    dialog.addEventListener(
      "close",
      () => finishClose()
    );

    window.matchMedia(
      "(min-width: 1024px)"
    ).addEventListener("change", event => {
      if (event.matches) {
        close();
      }

      closeDesktop();
    });

    window.addEventListener("pageshow", event => {
      if (event.persisted) {
        close();
        closeDesktop();
      }
    });

    render();

    Promise.resolve(window.SPI_CATALOG_READY)
      .then(() => {
        if (dialog.open) {
          render();
        }
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();