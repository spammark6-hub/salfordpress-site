function setCurrentYear() {
  const yearNodes = document.querySelectorAll("[data-year]");
  const year = String(new Date().getFullYear());
  for (const node of yearNodes) node.textContent = year;
}

function setActiveNavLink() {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const candidates = document.querySelectorAll('a.nav-link[href$=".html"]');
  for (const link of candidates) {
    const href = (link.getAttribute("href") || "").toLowerCase();
    if (href === path) link.setAttribute("aria-current", "page");
  }
}

function setupMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobileNav");
  if (!toggle || !mobileNav) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    mobileNav.hidden = !open;
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  mobileNav.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function setupEmailDraftForm() {
  const form = document.getElementById("emailDraftForm");
  if (!(form instanceof HTMLFormElement)) return;

  const statusNode = form.querySelector("[data-form-status]");

  function setStatus(message) {
    if (statusNode) statusNode.textContent = message;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const org = String(formData.get("org") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const subject = "Partnership inquiry — Salford Press";
    const bodyLines = [
      "Hello Salford Press,",
      "",
      "My name:",
      name || "(your name)",
      "",
      "Organization:",
      org || "(optional)",
      "",
      "My email:",
      email || "(your email)",
      "",
      "Proposal overview:",
      message || "(brief overview + relevant links/samples)",
      "",
      "Best regards,",
      name || "",
    ];

    const mailto = `mailto:partnerships@salfordpress.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      bodyLines.join("\n"),
    )}`;

    setStatus("Opening your email client…");
    window.location.href = mailto;

    window.setTimeout(() => {
      setStatus("If nothing opened, email partnerships@salfordpress.com directly.");
    }, 1200);
  });
}

function setupHero3D() {
  const canvas = document.getElementById("hero3d");
  if (!(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let rafId = 0;
  let running = !reduceMotion;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rotateY([x, y, z], a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x * c + z * s, y, -x * s + z * c];
  }

  function rotateX([x, y, z], a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x, y * c - z * s, y * s + z * c];
  }

  function rotateZ([x, y, z], a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [x * c - y * s, x * s + y * c, z];
  }

  function project([x, y, z], width, height) {
    const cameraZ = 6.2;
    const fov = 520;
    const dz = z + cameraZ;
    const scale = fov / (fov + dz * 160);
    return [width / 2 + x * 160 * scale, height / 2 + y * 160 * scale, scale];
  }

  function drawFrame(timeMs) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 2 || h <= 2) return;

    const t = timeMs / 1000;
    ctx.clearRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, Math.max(w, h) * 0.65);
    vignette.addColorStop(0, "rgba(163, 18, 26, 0.08)");
    vignette.addColorStop(1, "rgba(163, 18, 26, 0)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    const pageW = 1.55;
    const pageH = 2.0;
    const pageD = 0.08;

    const open = 0.7 + 0.18 * Math.sin(t * 0.9);
    const spinY = t * 0.45;
    const spinX = 0.22 + Math.sin(t * 0.6) * 0.05;
    const spinZ = Math.sin(t * 0.4) * 0.04;

    function pageVertices(side) {
      const dir = side === "left" ? -1 : 1;
      const x0 = 0;
      const x1 = dir * pageW;
      const y0 = -pageH / 2;
      const y1 = pageH / 2;
      const z0 = -pageD / 2;
      const z1 = pageD / 2;
      const verts = [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y1, z0],
        [x0, y1, z0],
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ];

      const hingeAngle = dir === 1 ? -open : open;
      return verts.map((p) => rotateY(p, hingeAngle));
    }

    const left = pageVertices("left");
    const right = pageVertices("right");

    const all = left.concat(right).map((p) => rotateZ(rotateX(rotateY(p, spinY), spinX), spinZ));

    const projected = all.map((p) => project(p, w, h));

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 8],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 12],
      [8, 12],
      [9, 13],
      [10, 14],
      [11, 15],
    ];

    function strokeEdges(color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (const [a, b] of edges) {
        const [x1, y1] = projected[a];
        const [x2, y2] = projected[b];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    strokeEdges("rgba(163, 18, 26, 0.25)", 3);
    strokeEdges("rgba(255, 255, 255, 0.9)", 1.2);

    ctx.fillStyle = "rgba(163, 18, 26, 0.35)";
    for (const [x, y, s] of projected) {
      const r = Math.max(1.2, 2.2 * s);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(timeMs) {
    if (!running) return;
    drawFrame(timeMs);
    rafId = window.requestAnimationFrame(loop);
  }

  resize();

  if (reduceMotion) {
    drawFrame(0);
    return;
  }

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting) {
            if (!running) {
              running = true;
              rafId = window.requestAnimationFrame(loop);
            }
          } else {
            running = false;
            if (rafId) window.cancelAnimationFrame(rafId);
          }
        },
        { root: null, threshold: 0.12 },
      )
    : null;

  observer?.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });
  rafId = window.requestAnimationFrame(loop);
}

setCurrentYear();
setActiveNavLink();
setupMobileNav();
setupEmailDraftForm();
setupHero3D();
