/* =====================================================
   CONFIGURAÇÃO DAS FOTOS

   Primeira foto:
   desktop = imagem horizontal para computador.
   mobile  = imagem vertical para celular.

   Para usar a mesma imagem nos dois formatos, utilize src.

   Máximo: 10 fotos.
   ===================================================== */

window.SPI_SLIDES = {
  intervalMs: 5000,
  autoplay: true,

  images: [
    {
      desktop: "assets/images/foto1-desktop.png",
      mobile: "assets/images/foto1.png",
      alt: "Coleção SPI. Conheça nossos vestidos."
    },
    {
      desktop: "assets/images/foto2-desktop.png",
      mobile: "assets/images/foto2.png",
      alt: "Mocassins SPI. O conforto que acompanha seu estilo."
    },
{
  desktop: "assets/images/foto3-desktop.png",
  mobile: "assets/images/foto3.png",
  alt: "Copos SPI. Mais cor para os seus momentos."
},

{
  desktop: "assets/images/foto4-desktop.png",
  mobile: "assets/images/foto4.png",
  alt: "Elegância SPI. Presença em cada detalhe."
}
  ]
};

/* =====================================================
   CARROSSEL RESPONSIVO
   ===================================================== */

(() => {
  "use strict";

  const region = document.getElementById("inicio");
  const track = document.getElementById("carousel-slides");

  if (!region || !track) return;

  const controls = document.getElementById("carousel-controls");
  const previous = document.getElementById("carousel-prev");
  const next = document.getElementById("carousel-next");
  const pause = document.getElementById("carousel-pause");
  const count = document.getElementById("carousel-count");

  const config = window.SPI_SLIDES || {};

  const configured = Array.isArray(config.images)
    ? config.images
    : [];

  const photos = configured
    .filter(photo => {
      if (!photo) return false;

      const path = photo.desktop || photo.src || photo.mobile;

      return typeof path === "string" && path.trim();
    })
    .slice(0, 10)
    .map(photo => ({
      desktop: photo.desktop || photo.src || photo.mobile,
      mobile: photo.mobile || photo.src || photo.desktop,
      alt: photo.alt || "Coleção SPI Moda."
    }));

  if (!photos.length) {
    photos.push({
      desktop: "assets/images/foto1-desktop.png",
      mobile: "assets/images/foto1.png",
      alt: "Coleção SPI Moda."
    });
  }

  const mobileQuery = "(max-width: 767px)";

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const delay = Math.min(
    15000,
    Math.max(3000, Number(config.intervalMs) || 5000)
  );

  let current = 0;
  let timer = null;
  let requestVersion = 0;

  let userPaused = (
    config.autoplay === false ||
    reducedMotion.matches
  );

  const slides = photos.map((photo, index) => {
    const slide = document.createElement("div");

    slide.className = "carousel-slide";

    if (index === 0) {
      slide.classList.add("is-active");
    }

    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");

    slide.setAttribute(
      "aria-label",
      `Foto ${index + 1} de ${photos.length}`
    );

    slide.setAttribute(
      "aria-hidden",
      String(index !== 0)
    );

    const picture = document.createElement("picture");

    const source = document.createElement("source");

    source.media = mobileQuery;
    source.srcset = photo.mobile;

    const image = document.createElement("img");

    image.src = photo.desktop;
    image.alt = photo.alt;
    image.width = 1920;
    image.height = 800;
    image.loading = "eager";
    image.decoding = "async";

    if (index === 0) {
      image.fetchPriority = "high";
    }

    /*
      Se uma versão não estiver disponível,
      tenta carregar a outra versão uma vez.
    */
    image.addEventListener("error", () => {
      const isMobile = window.matchMedia(mobileQuery).matches;

      const fallback = isMobile
        ? photo.desktop
        : photo.mobile;

      source.remove();

      const fallbackURL = new URL(
        fallback,
        document.baseURI
      ).href;

      if (image.src !== fallbackURL) {
        image.src = fallback;
      }
    }, { once: true });

    picture.append(source, image);
    slide.append(picture);

    return slide;
  });

  track.replaceChildren(...slides);

  if (controls) {
    controls.hidden = slides.length < 2;
  }

  function syncControls() {
    if (count) {
      count.textContent = `${current + 1} de ${slides.length}`;
    }

    if (pause) {
      pause.textContent = userPaused
        ? "Reproduzir"
        : "Pausar";

      pause.setAttribute(
        "aria-pressed",
        String(userPaused)
      );

      pause.setAttribute(
        "aria-label",
        userPaused
          ? "Reproduzir troca automática de fotos"
          : "Pausar troca automática de fotos"
      );
    }
  }

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
    }

    timer = null;
  }

  function startTimer() {
    stopTimer();

    if (
      slides.length < 2 ||
      userPaused ||
      document.hidden
    ) {
      return;
    }

    timer = setInterval(() => {
      if (!document.body.classList.contains("modal-open")) {
        show(current + 1);
      }
    }, delay);
  }

  async function show(index, manual = false) {
    if (slides.length < 2) return;

    const version = ++requestVersion;

    const direction = index < current ? -1 : 1;

    /*
      Procura a próxima imagem disponível.
      Arquivos inexistentes não interrompem o carrossel.
    */
    for (let attempt = 0; attempt < slides.length; attempt++) {
      const target = (
        (
          index + attempt * direction
        ) % slides.length + slides.length
      ) % slides.length;

      if (target === current) break;

      const image = slides[target].querySelector("img");

      try {
        await image.decode();
      } catch {
        if (version !== requestVersion) return;
        continue;
      }

      if (version !== requestVersion) return;

      slides[current].classList.remove("is-active");
      slides[current].setAttribute("aria-hidden", "true");

      current = target;

      slides[current].classList.add("is-active");
      slides[current].setAttribute("aria-hidden", "false");

      syncControls();

      break;
    }

    if (manual) {
      startTimer();
    }
  }

  function togglePlayback() {
    userPaused = !userPaused;

    syncControls();
    startTimer();
  }

  previous?.addEventListener("click", () => {
    show(current - 1, true);
  });

  next?.addEventListener("click", () => {
    show(current + 1, true);
  });

  pause?.addEventListener("click", togglePlayback);

  region.addEventListener("keydown", event => {
    if (event.target.closest("button, a, input, select, textarea")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(current - 1, true);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(current + 1, true);
    }

    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    }
  });

  let touch = null;

  region.addEventListener("touchstart", event => {
    if (event.target.closest("button, a")) return;

    const point = event.touches[0];

    touch = {
      x: point.clientX,
      y: point.clientY
    };
  }, { passive: true });

  region.addEventListener("touchend", event => {
    if (!touch) return;

    const point = event.changedTouches[0];

    const dx = point.clientX - touch.x;
    const dy = point.clientY - touch.y;

    touch = null;

    if (
      Math.abs(dx) > 50 &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      show(
        current + (dx < 0 ? 1 : -1),
        true
      );
    }
  }, { passive: true });

  region.addEventListener("touchcancel", () => {
    touch = null;
  }, { passive: true });

  document.addEventListener(
    "visibilitychange",
    startTimer
  );

  reducedMotion.addEventListener("change", event => {
    if (event.matches) {
      userPaused = true;
      syncControls();
      startTimer();
    }
  });

  syncControls();
  startTimer();
})();


/* =====================================================
   LIMPEZA DOS ELEMENTOS DO APP EXISTENTE

   Remove setas e pontos decorativos.
   Preserva os pontos finais.
   Não altera campos digitados pela cliente.
   ===================================================== */

(() => {
  "use strict";

  const selector = [
    '[data-icon="arrow"]',
    '[data-icon="download"]',
    '[data-icon="sparkle"]',
    ".tiny-dot",
    ".color-dot",
    ".line",
    ".editorial-doodle",
    "[data-tryon-open]",
    "[data-tryon-product]"
  ].join(", ");

  const arrowPaths = [
    "M4 12h16m-6-6 6 6-6 6",
    "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"
  ];

  function clean(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;

      if (
        !parent ||
        parent.closest("script, style, textarea, input, pre, code")
      ) {
        return;
      }

      const cleaned = root.nodeValue
        .replace(/[↗→←↑↓➜➝✳]/g, "")
        .replace(/[•·∙⋅]/g, " ");

      if (cleaned !== root.nodeValue) {
        root.nodeValue = cleaned;
      }

      return;
    }

    if (
      root.nodeType !== Node.ELEMENT_NODE &&
      root.nodeType !== Node.DOCUMENT_NODE
    ) {
      return;
    }

    if (root.matches?.(selector)) {
      root.remove();
      return;
    }

    root.querySelectorAll(selector).forEach(element => {
      element.remove();
    });

    const svgElements = [
      ...(root.matches?.("svg") ? [root] : []),
      ...root.querySelectorAll("svg")
    ];

    svgElements.forEach(svg => {
      const hasArrow = [...svg.querySelectorAll("path")]
        .some(path => (
          arrowPaths.includes(path.getAttribute("d"))
        ));

      if (hasArrow) {
        svg.remove();
      }
    });

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(clean);
  }

  clean(document.body);

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(clean);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();