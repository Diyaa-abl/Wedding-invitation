const data = window.WEDDING_INVITATION;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

document.body.classList.add("is-locked");

function applyPalette() {
  const root = document.documentElement;
  Object.entries(data.palette || {}).forEach(([key, value]) => {
    const cssName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--${cssName}`, value);
  });
}

function bindContent() {
  $$("[data-text]").forEach((node) => {
    node.textContent = data[node.dataset.text] || "";
  });

  $$("[data-bind-src]").forEach((node) => {
    node.src = data[node.dataset.bindSrc] || "";
  });

  $$("[data-gallery-index]").forEach((node) => {
    const item = data.gallery[Number(node.dataset.galleryIndex)];
    if (!item) return;
    node.src = item.src;
    node.alt = item.alt;
  });

  $("#music").src = data.music;
  $("#mapButton").href = data.locationUrl;

  const gallery = $("#gallery");
  gallery.innerHTML = data.gallery
    .map((item) => `<figure><img src="${item.src}" alt="${item.alt}" loading="lazy"></figure>`)
    .join("");
}

function openInvitation() {
  const cover = $("#cover");
  const music = $("#music");
  cover.classList.add("is-open");
  document.body.classList.remove("is-locked");
  $("#musicToggle").classList.add("is-visible");
  music.play().catch(() => {
    $("#musicToggle").classList.add("is-paused");
  });
  setTimeout(() => cover.remove(), 1250);
}

function setupMusicToggle() {
  const button = $("#musicToggle");
  const music = $("#music");
  button.addEventListener("click", () => {
    if (music.paused) {
      music.play();
      button.classList.remove("is-paused");
    } else {
      music.pause();
      button.classList.add("is-paused");
    }
  });
}

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    },
    { threshold: 0.18 }
  );
  $$(".reveal").forEach((node) => observer.observe(node));
}

function setupCountdown() {
  const target = new Date(data.dateISO).getTime();
  const nodes = {
    days: $('[data-time="days"]'),
    hours: $('[data-time="hours"]'),
    minutes: $('[data-time="minutes"]'),
    seconds: $('[data-time="seconds"]')
  };

  const tick = () => {
    const distance = Math.max(0, target - Date.now());
    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);
    nodes.days.textContent = days;
    nodes.hours.textContent = String(hours).padStart(2, "0");
    nodes.minutes.textContent = String(minutes).padStart(2, "0");
    nodes.seconds.textContent = String(seconds).padStart(2, "0");
  };

  tick();
  setInterval(tick, 1000);
}

function setupScratchCard() {
  const wrap = $("#scratchWrap");
  const canvas = $("#scratchCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let drawing = false;
  let revealed = false;
  let revealSweepStarted = false;

  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawCover(rect.width, rect.height);
  };

  const drawCover = (width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, data.palette.mistSage);
    gradient.addColorStop(0.52, data.palette.softStone);
    gradient.addColorStop(1, data.palette.deepSage);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 250, 240, 0.72)";
    ctx.font = "700 12px Arial";
    ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.fillText("A GOLDEN DATE AWAITS", width / 2, height / 2);
  };

  const pointFromEvent = (event) => {
    const touch = event.touches?.[0] || event;
    const rect = canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const scratch = (event) => {
    if (!drawing || revealed) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    drawScratch(point);
    startRevealSweep();
    checkReveal();
  };

  const drawScratch = (point) => {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 24, 0, Math.PI * 2);
    ctx.fill();
  };

  const checkReveal = () => {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let index = 3; index < pixels.length; index += 16) {
      if (pixels[index] < 40) transparent++;
    }
    if (transparent / (pixels.length / 16) > 0.42) revealDate();
  };

  const revealDate = () => {
    if (revealed) return;
    revealed = true;
    wrap.classList.add("is-revealed");
    canvas.style.transition = "opacity .55s ease";
    canvas.style.opacity = "0";
    burstPetals();
  };

  const startRevealSweep = () => {
    if (revealSweepStarted || revealed) return;
    revealSweepStarted = true;
    let frame = 0;
    const sweep = () => {
      if (revealed) return;
      const rect = canvas.getBoundingClientRect();
      for (let index = 0; index < 5; index++) {
        const progress = Math.min(1, (frame * 5 + index) / 58);
        const x = rect.width * progress;
        const y = rect.height * (0.24 + 0.52 * ((index + frame) % 5) / 4);
        drawScratch({ x, y });
      }
      frame++;
      if (frame > 18) {
        revealDate();
        return;
      }
      requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  };

  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    scratch(event);
  });
  canvas.addEventListener("pointermove", scratch);
  window.addEventListener("pointerup", () => {
    drawing = false;
  });
  canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    scratch(event);
  });
  canvas.addEventListener("mousemove", scratch);
  window.addEventListener("mouseup", () => {
    drawing = false;
  });
  canvas.addEventListener(
    "touchstart",
    (event) => {
      drawing = true;
      scratch(event);
    },
    { passive: false }
  );
  canvas.addEventListener("touchmove", scratch, { passive: false });
  window.addEventListener("touchend", () => {
    drawing = false;
  });
  window.addEventListener("resize", resize);
  resize();
}

function burstPetals() {
  for (let index = 0; index < 34; index++) {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.style.left = `${Math.random() * 100}vw`;
    petal.style.setProperty("--sway", `${Math.random() * 160 - 80}px`);
    petal.style.setProperty("--fall", `${2.6 + Math.random() * 2.8}s`);
    petal.style.animationDelay = `${Math.random() * 0.45}s`;
    document.body.appendChild(petal);
    setTimeout(() => petal.remove(), 6200);
  }
}

applyPalette();
bindContent();
setupMusicToggle();
setupRevealAnimations();
setupCountdown();
setupScratchCard();
$("#openInvite").addEventListener("click", openInvitation);
