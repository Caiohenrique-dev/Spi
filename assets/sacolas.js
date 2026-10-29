/* SPI Moda — sacola com envio direto pelo WhatsApp. */

(() => {
  "use strict";

  if (window.__SPI_BAG_STARTED__) return;
  window.__SPI_BAG_STARTED__ = true;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const cartKey = "spi-cart-v1";
  const catalog = new Map();

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

  const money = cents => (cents / 100).toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" }
  );

  const itemKey = item => encodeURIComponent(
    JSON.stringify([item.id, item.size])
  );

  let maxQty = 5;
  let phone = "5524992185519";
  let ready = false;
  let failed = false;
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

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readCart() {
    const merged = new Map();

    for (const value of readArray(cartKey)) {
      const product = value && catalog.get(String(value.id));

      const sizes = Array.isArray(product?.sizes)
        ? product.sizes.map(size => String(size).trim()).filter(Boolean)
        : [];

      const size = String(value?.size ?? "").trim();

      if (
        !product ||
        !sizes.includes(size) ||
        !Number.isSafeInteger(value.qty) ||
        value.qty < 1
      ) {
        continue;
      }

      const item = {
        id: String(value.id),
        size,
        qty: Math.min(maxQty, value.qty)
      };

      const key = itemKey(item);

      item.qty = Math.min(
        maxQty,
        item.qty + (merged.get(key)?.qty || 0)
      );

      merged.set(key, item);
    }

    return [...merged.values()];
  }

  function toast(message) {
    clearTimeout(toastTimer);

    $("#toast").textContent = message;
    $("#toast").hidden = false;

    toastTimer = setTimeout(() => {
      $("#toast").hidden = true;
    }, 3200);
  }

  function createMessage(cart) {
    const lines = [
      "Olá! Gostaria de comprar estes produtos da SPI Moda:",
      ""
    ];

    let total = 0;

    cart.forEach((item, index) => {
      const product = catalog.get(item.id);
      const subtotal = product.price * item.qty;

      total += subtotal;

      lines.push((index + 1) + ". " + product.name);
      lines.push("Referência: " + (product.code || item.id));

      if (product.color) {
        lines.push("Cor: " + product.color);
      }

      lines.push(
        "Opção: " + item.size,
        "Quantidade: " + item.qty,
        "Valor unitário: " + money(product.price),
        "Subtotal: " + money(subtotal),
        ""
      );
    });

    lines.push("Subtotal dos produtos: " + money(total));

    return lines.join("\n");
  }

  function itemHTML(item) {
    const product = catalog.get(item.id);
    const name = product.name || "Produto SPI";
    const href = "produto.html?id=" + encodeURIComponent(item.id);
    const key = esc(itemKey(item));
    const label = esc(name + ", opção " + item.size);

    const image = (
      typeof product.image === "string" &&
      product.image.trim()
    )
      ? (
        '<img src="' + esc(product.image) + '"' +
        ' alt="' + esc(product.alt || name) + '"' +
        ' width="240" height="320" loading="lazy">'
      )
      : "<span>Imagem indisponível</span>";

    return (
      '<article class="bag-item">' +

        '<a class="bag-item-image"' +
          ' href="' + esc(href) + '"' +
          ' aria-label="Ver detalhes de ' + esc(name) + '">' +
          image +
        "</a>" +

        '<div class="bag-item-info">' +
          '<div class="bag-item-heading">' +

            '<a class="bag-item-name" href="' + esc(href) + '">' +
              esc(name) +
            "</a>" +

            '<button type="button"' +
              ' class="bag-item-remove"' +
              ' data-cart-action="remove"' +
              ' data-cart-key="' + key + '"' +
              ' aria-label="Remover ' + label + '">' +
              icon("close") +
            "</button>" +

          "</div>" +

          '<p class="bag-item-option">' +
            (product.color ? "Cor: " + esc(product.color) + "<br>" : "") +
            "Opção: " + esc(item.size) +
          "</p>" +

          '<p class="bag-item-unit">' +
            money(product.price) + " cada" +
          "</p>" +

          '<div class="bag-item-bottom">' +
            '<div class="bag-quantity"' +
              ' role="group" aria-label="Quantidade de ' + label + '">' +

              '<button type="button"' +
                ' data-cart-action="minus"' +
                ' data-cart-key="' + key + '"' +
                ' aria-label="Diminuir quantidade de ' + label + '"' +
                (item.qty <= 1 ? " disabled" : "") + ">−</button>" +

              '<output aria-label="Quantidade de ' + label + '">' +
                item.qty +
              "</output>" +

              '<button type="button"' +
                ' data-cart-action="plus"' +
                ' data-cart-key="' + key + '"' +
                ' aria-label="Aumentar quantidade de ' + label + '"' +
                (item.qty >= maxQty ? " disabled" : "") + ">+</button>" +

            "</div>" +

            '<p class="bag-line-total">' +
              money(product.price * item.qty) +
            "</p>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function render() {
    if (!ready) return [];

    const cart = readCart();

    const count = cart.reduce(
      (sum, item) => sum + item.qty,
      0
    );

    const total = cart.reduce(
      (sum, item) => sum + catalog.get(item.id).price * item.qty,
      0
    );

    const favorites = new Set(
      readArray("spi-favorites-v1")
        .map(String)
        .filter(id => catalog.has(id))
    );

    $("#cart-count").textContent = count;

    $("#cart-link").setAttribute(
      "aria-label",
      "Sua sacola com " + count + (count === 1 ? " item" : " itens")
    );

    $("#favorites-count").textContent = favorites.size;
    $("#favorites-count").hidden = favorites.size === 0;

    $("#bag-count").textContent =
      count + (count === 1 ? " item" : " itens");

    $("#bag-summary-count").textContent = count;
    $("#bag-subtotal").textContent = money(total);

    $("#bag-items").innerHTML = failed
      ? ""
      : cart.map(itemHTML).join("");

    $("#bag-content").hidden = failed || cart.length === 0;
    $("#bag-empty").hidden = !failed && cart.length > 0;

    $("#bag-empty-title").textContent = failed
      ? "Não foi possível carregar a sacola."
      : "Sua sacola está vazia.";

    $("#bag-empty-text").textContent = failed
      ? "Atualize a página para tentar novamente."
      : "Escolha os produtos que combinam com você.";

    const checkout = $("#bag-checkout");
    const enabled = !failed && cart.length > 0;

    checkout.setAttribute("aria-disabled", String(!enabled));
    checkout.setAttribute("tabindex", enabled ? "0" : "-1");

    checkout.setAttribute(
      "href",
      enabled
        ? "https://wa.me/" + phone +
          "?text=" + encodeURIComponent(createMessage(cart))
        : "#"
    );

    return cart;
  }

  function changeCart(action, key) {
    if (!ready || failed) return;

    const cart = readCart();
    const index = cart.findIndex(item => itemKey(item) === key);

    if (index < 0) return;

    if (action === "remove") {
      cart.splice(index, 1);
    } else if (action === "plus") {
      if (cart[index].qty >= maxQty) {
        return toast(
          "O limite é de " + maxQty + " unidades por opção."
        );
      }

      cart[index].qty += 1;
    } else if (action === "minus") {
      if (cart[index].qty <= 1) return;

      cart[index].qty -= 1;
    } else {
      return;
    }

    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      toast("Não foi possível atualizar sua sacola neste navegador.");
      return;
    }

    render();

    const buttons = $$("[data-cart-action]");

    const sameItem = buttons.filter(
      button => button.dataset.cartKey === key && !button.disabled
    );

    const removes = buttons.filter(
      button => button.dataset.cartAction === "remove"
    );

    const focus = action === "remove"
      ? removes[Math.min(index, removes.length - 1)]
      : sameItem.find(button => button.dataset.cartAction === action) ||
        sameItem[0];

    (focus || $("#bag-empty a"))?.focus({ preventScroll: true });

    if (action === "remove") {
      toast("Produto removido da sacola.");
    }
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
        "Abra um produto, escolha as opções e adicione à sacola. Revise as quantidades e toque em Enviar pelo WhatsApp para conversar com a SPI sobre a sua compra."
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
        "A sacola, os favoritos e os produtos vistos recentemente ficam salvos neste navegador. Ao abrir o WhatsApp, você pode revisar a mensagem antes de enviá-la para a loja."
      ]
    }[type];

    if (!info) return;

    closeSearch();
    closeMenu();

    $("#info-title").textContent = info[0];

    $("#info-content").innerHTML =
      "<p>" + esc(info[1]) + "</p>" +
      '<p><a href="https://wa.me/' + phone + '"' +
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
      event.target.setCustomValidity("");
      $("#search-clear").hidden = event.target.value.length === 0;
    });

    $("#search-clear").addEventListener("click", () => {
      $("#search-input").value = "";
      $("#search-input").setCustomValidity("");
      $("#search-clear").hidden = true;
      $("#search-input").focus();
    });

    $("#bag-search-form").addEventListener("submit", event => {
      const input = $("#search-input");

      input.value = input.value.trim();

      input.setCustomValidity(
        input.value ? "" : "Digite o produto que deseja buscar."
      );

      if (!input.reportValidity()) {
        event.preventDefault();
      }
    });

    $("#bag-checkout").addEventListener("click", event => {
      const cart = render();

      if (failed || !cart.length) {
        event.preventDefault();
      }
    });

    document.addEventListener("click", event => {
      const action = event.target.closest?.("[data-cart-action]");

      if (action) {
        return changeCart(
          action.dataset.cartAction,
          action.dataset.cartKey
        );
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
        [cartKey, "spi-favorites-v1"].includes(event.key)
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

      const configuredPhone = String(store.whatsapp || "")
        .replace(/\D/g, "");

      if (/^[1-9]\d{9,14}$/.test(configuredPhone)) {
        phone = configuredPhone;
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

        if (!catalog.has(id)) {
          catalog.set(id, { ...product, id });
        }
      }
    } catch {
      failed = true;
    }

    ready = true;

    $("#bag-loading").hidden = true;
    $("#sacola").setAttribute("aria-busy", "false");

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();