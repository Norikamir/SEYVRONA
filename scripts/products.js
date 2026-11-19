const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   1. HERO TITLE — word-by-word blur reveal (same pattern as technology.js)
============================================================ */

if (!prefersReducedMotion) {
  gsap.set(".products-hero h1 .word", {
    opacity: 0,
    y: 25,
    filter: "blur(12px)"
  });

  gsap.to(".products-hero h1 .word", {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 1,
    ease: "power3.out",
    stagger: 0.06,
    delay: 0.3
  });
}


/* ============================================================
   2. SCROLL REVEAL — IntersectionObserver + GSAP
   (no ScrollTrigger plugin needed, fires once per element)
============================================================ */

const revealTargets = document.querySelectorAll(
  ".product-hero-card, .category-tag, .offer-card"
);

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  gsap.set(revealTargets, { opacity: 0, y: 50 });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        gsap.to(entry.target, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out"
        });
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach((el) => revealObserver.observe(el));
}


/* ============================================================
   3. PRICE COUNTER — animates $0 -> target price once visible
   The real price is written in the HTML (search engines, no-JS);
   the count-up from $0 is only an enhancement.
============================================================ */

function animatePrice(el, target, duration = 1400) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = "$" + Math.floor(eased * target).toLocaleString("en-US");

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = "$" + target.toLocaleString("en-US");
    }
  }

  requestAnimationFrame(step);
}

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const priceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        animatePrice(el, target);
        priceObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll(".product-price").forEach((el) => {
    if (isNaN(parseInt(el.dataset.target, 10))) return;
    el.textContent = "$0";
    priceObserver.observe(el);
  });
}


/* ============================================================
   4. TILT EFFECT — cards rotate slightly toward the cursor
   (desktop only — pointer:fine avoids weird behavior on touch)
   One quickTo per axis per hover instead of a new tween per mousemove.
============================================================ */

if (window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {

  document.querySelectorAll(".offer-card").forEach((card) => {
    let rotY = null;
    let rotX = null;

    card.addEventListener("mouseenter", () => {
      gsap.set(card, { transformPerspective: 800 });
      rotY = gsap.quickTo(card, "rotateY", { duration: 0.4, ease: "power2.out", overwrite: "auto" });
      rotX = gsap.quickTo(card, "rotateX", { duration: 0.4, ease: "power2.out", overwrite: "auto" });
    });

    card.addEventListener("mousemove", (e) => {
      if (!rotY) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      rotY(x * 8);
      rotX(-y * 8);
    });

    card.addEventListener("mouseleave", () => {
      rotY = rotX = null;
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: "power3.out",
        overwrite: "auto"
      });
    });

  });

}


// -----changing----cards-sections----

/* ============================================================
   5. HOVER IMAGE SWAP — offer-card -> hero image + glow
   Only the most recent request is applied, so a slow image can no
   longer replace the photo after the cursor has moved on.
============================================================ */

function setupImageSwap(section) {
  const heroImg = section.querySelector(".product-hero-card img");
  if (!heroImg) return;

  const defaultSrc = heroImg.getAttribute("src");
  const isTouch = !window.matchMedia("(pointer: fine)").matches;
  const preloaded = new Map();
  let wanted = defaultSrc;
  let fade = null;

  function preload(src) {
    if (!preloaded.has(src)) {
      preloaded.set(src, new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
      }));
    }
    return preloaded.get(src);
  }

  function swapTo(src, onShown) {
    if (!src) return;
    wanted = src;
    preload(src).then(() => {
      if (wanted !== src) return; // a newer hover/tap won
      if (fade) fade.kill();
      if (heroImg.getAttribute("src") === src) {
        fade = gsap.to(heroImg, { opacity: 1, duration: 0.35 });
        return;
      }
      fade = gsap.to(heroImg, {
        opacity: 0,
        duration: prefersReducedMotion ? 0 : 0.25,
        onComplete: () => {
          if (wanted !== src) return;
          heroImg.src = src;
          fade = gsap.to(heroImg, { opacity: 1, duration: prefersReducedMotion ? 0 : 0.35 });
          if (onShown) onShown();
        }
      });
    });
  }

  section.querySelectorAll(".offer-card[data-image]").forEach((card) => {

    card.addEventListener("mouseenter", () => {
      if (isTouch) return;
      swapTo(card.dataset.image);
    });

    card.addEventListener("mouseleave", () => {
      if (isTouch) return;
      swapTo(defaultSrc);
    });

    card.addEventListener("click", (e) => {
      if (!isTouch) return;
      if (e.target.closest(".offer-cta")) return; // "Choose" opens the form, no image jump
      const newSrc = card.dataset.image;
      if (!newSrc || newSrc === heroImg.getAttribute("src")) return;
      swapTo(newSrc, () => {
        heroImg.closest(".product-hero-card").scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center"
        });
      });
    });

  });
}

document.querySelectorAll(".product-category").forEach(setupImageSwap);
