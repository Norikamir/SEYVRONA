/* ============================================================
   1. HERO TITLE — word-by-word blur reveal (same pattern as technology.js)
============================================================ */

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


/* ============================================================
   2. SCROLL REVEAL — IntersectionObserver + GSAP
   (no ScrollTrigger plugin needed, fires once per element)
============================================================ */

const revealTargets = document.querySelectorAll(
  ".product-hero-card, .category-tag, .offer-card"
);

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


/* ============================================================
   3. PRICE COUNTER — animates $0 -> target price once visible
   (same easing/logic pattern as counter.js, reused here)
============================================================ */

function animatePrice(el, target, duration = 1400) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = "$" + Math.floor(eased * target).toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = "$" + target.toLocaleString();
    }
  }

  requestAnimationFrame(step);
}

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

document.querySelectorAll(".product-price").forEach((el) => priceObserver.observe(el));


/* ============================================================
   4. TILT EFFECT — cards rotate slightly toward the cursor
   (desktop only — pointer:fine avoids weird behavior on touch)
============================================================ */

if (window.matchMedia("(pointer: fine)").matches) {

  document.querySelectorAll(".offer-card").forEach((card) => {

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(card, {
        rotateY: x * 8,
        rotateX: -y * 8,
        transformPerspective: 800,
        duration: 0.4,
        ease: "power2.out"
      });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.6,
        ease: "power3.out"
      });
    });

  });

}


// -----changing----cards-sections----

/* ============================================================
   5. HOVER IMAGE SWAP — offer-card -> hero image + glow
============================================================ */

function setupImageSwap(section) {
  const heroImg = section.querySelector(".product-hero-card img");
  if (!heroImg) return;

  const defaultSrc = heroImg.getAttribute("src");
  const isTouch = !window.matchMedia("(pointer: fine)").matches;

  section.querySelectorAll(".offer-card[data-image]").forEach((card) => {

    card.addEventListener("mouseenter", () => {
      if (isTouch) return;
      const newSrc = card.dataset.image;
      if (!newSrc || newSrc === heroImg.getAttribute("src")) return;

      const preload = new Image();
      preload.onload = () => {
        gsap.to(heroImg, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            heroImg.src = newSrc;
            gsap.to(heroImg, { opacity: 1, duration: 0.35 });
          }
        });
      };
      preload.src = newSrc;
    });

    card.addEventListener("mouseleave", () => {
      if (isTouch) return;
      if (heroImg.getAttribute("src") === defaultSrc) return;
      gsap.to(heroImg, {
        opacity: 0,
        duration: 0.25,
        onComplete: () => {
          heroImg.src = defaultSrc;
          gsap.to(heroImg, { opacity: 1, duration: 0.35 });
        }
      });
    });

    card.addEventListener("click", () => {
      if (!isTouch) return;
      const newSrc = card.dataset.image;
      if (!newSrc || newSrc === heroImg.getAttribute("src")) return;

      const preload = new Image();
      preload.onload = () => {
        gsap.to(heroImg, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            heroImg.src = newSrc;
            gsap.to(heroImg, { opacity: 1, duration: 0.35 });
            heroImg.closest(".product-hero-card").scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }
        });
      };
      preload.src = newSrc;
    });

  });
}

document.querySelectorAll(".product-category").forEach(setupImageSwap);
