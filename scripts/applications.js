if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

gsap.registerPlugin(ScrollTrigger);

/**
 * Scenario panels: shutter strips open on scroll, then content fades in.
 * A fixed 5-dot rail on the left tracks which panel is currently active.
 */
function initScenarioAnimations() {
  const panels = document.querySelectorAll(".scenario-panel");
  if (!panels.length) return;

  const triggers = [];
  const phoneWrap = document.querySelector(".scenario-phone-wrap");
  const stack = document.querySelector(".scenario-stack");
  const phoneFrame = document.querySelector(".scenario-phone-wrap .phone-frame");
  const phoneMock = document.querySelector(".scenario-phone-wrap .phone-mock");
  const phoneTime = document.getElementById("phone-time");
  const phoneRow1Title = document.getElementById("phone-row1-title");
  const phoneRow1Sub = document.getElementById("phone-row1-sub");
  const phoneRow2Title = document.getElementById("phone-row2-title");
  const phoneRow2Sub = document.getElementById("phone-row2-sub");

  let phoneSwapTl = null;

  

  function setPhoneContentInstant(panel) {
  const d = panel.dataset;
  if (!d.phoneTime || !phoneMock || !phoneFrame) return;
  phoneTime.textContent = d.phoneTime;
  phoneRow1Title.textContent = d.row1Title;
  phoneRow1Sub.textContent = d.row1Sub;
  phoneRow2Title.textContent = d.row2Title;
  phoneRow2Sub.textContent = d.row2Sub;
  gsap.set(phoneFrame, { opacity: 1, scale: 1, y: 0 });
}


  function updatePhoneContent(panel) {
    const d = panel.dataset;
    if (!d.phoneTime || !phoneMock || !phoneFrame) return;

    // Direction-aware: the phone exits and re-enters the same way the
    // panel itself does (top panels push it up and back down, bottom
    // panels push it down and back up), so it reads as part of the
    // same transition instead of an unrelated blink.
    const fromDir = panel.dataset.dir === "top" ? -22 : 22;

    if (phoneSwapTl) phoneSwapTl.kill();

    phoneSwapTl = gsap.timeline();

    // 1) Phone frame ducks out of view entirely — a real disappear,
    //    not just a content flicker — timed to roughly match the
    //    shutter opening on the incoming panel (~0.9s).
    phoneSwapTl.to(phoneFrame, {
      opacity: 0,
      scale: 0.92,
      y: fromDir,
      duration: 0.35,
      ease: "power2.in"
    });


    // 2) Swap the content while fully hidden, so the change itself
    //    is never visible mid-motion.
    phoneSwapTl.call(() => {
      phoneTime.textContent = d.phoneTime;
      phoneRow1Title.textContent = d.row1Title;
      phoneRow1Sub.textContent = d.row1Sub;
      phoneRow2Title.textContent = d.row2Title;
      phoneRow2Sub.textContent = d.row2Sub;
    });

    // 3) Reappear from the opposite side it left from, settling in
    //    with a touch of overshoot so it feels deliberate.
    phoneSwapTl.fromTo(
      phoneFrame,
      { y: -fromDir * 0.7 },
      { y: 0, duration: 0.55, ease: "back.out(1.4)" }
    );
    phoneSwapTl.to(
      phoneFrame,
      { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
      "<"
    );
  }

  panels.forEach((panel) => {
    const strips = panel.querySelectorAll(".panel-shutter .strip");
    const text = panel.querySelector(".panel-text");
    const scene = panel.querySelector(".scene");
    const index = panel.dataset.index;
    const dot = document.querySelector(`.scenario-dots .dot[data-dot="${index}"]`);

    if (!strips.length || !text) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        start: "top 75%",
        toggleActions: "play none none none",
        onEnter: () => {
          dot && dot.classList.add("is-active");
          updatePhoneContent(panel);
        },
        onEnterBack: () => {
          dot && dot.classList.add("is-active");
          updatePhoneContent(panel);
        },
        onLeave: () => dot && dot.classList.remove("is-active"),
        onLeaveBack: () => dot && dot.classList.remove("is-active"),

        onRefresh: (self) => {
  dot && dot.classList.toggle("is-active", self.isActive);
  if (self.isActive) setPhoneContentInstant(panel);
}
      },
      defaults: { ease: "power2.inOut" }
    });

    // Shutter open
    tl.to(strips, {
      scaleY: 0,
      duration: 0.6,
      stagger: 0.08
    });

    // Text fade up
    tl.fromTo(
      text,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: "power3.out" },
      "-=0.2"
    );

    // Scene icon fade/scale in
    if (scene) {
      tl.fromTo(
        scene,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" },
        "-=0.7"
      );
    }

    if (tl.scrollTrigger) {
      triggers.push(tl.scrollTrigger);
    }
  });

  if (phoneWrap && stack) {
    const visibilityTrigger = ScrollTrigger.create({
      trigger: stack,
      start: "top top",
      end: "bottom bottom",
      onEnter: () => phoneWrap.classList.add("is-visible"),
      onEnterBack: () => phoneWrap.classList.add("is-visible"),
      onLeave: () => phoneWrap.classList.remove("is-visible"),
      onLeaveBack: () => phoneWrap.classList.remove("is-visible"),
      onRefresh: (self) => phoneWrap.classList.toggle("is-visible", self.isActive)
    });
    triggers.push(visibilityTrigger);
  }

  window.addEventListener("beforeunload", () => {
    triggers.forEach((st) => st.kill());
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScenarioAnimations);
} else {
  initScenarioAnimations();
}

/**
 * Constellation scenes (panels 2-5): each ".scene-network" element
 * samples points along its own SVG path shape (data-network-shape)
 * plus scattered points filling its interior, and draws them on
 * canvas as small nodes connected by threads — short links between
 * near neighbours, plus a few long faint cross-threads per node for
 * that "web" look. Points drift gently on their own, and nodes near
 * the cursor get pushed aside with a bright link back to the
 * pointer, like the mesh is reacting to it. Every scene runs its
 * own independent animation loop, started/stopped as its panel
 * scrolls into and out of view.
 */
function setupNetworkScene(host) {
  const canvas = host.querySelector(".network-canvas");
  const ctx = canvas.getContext("2d");
  const pathData = host.dataset.networkShape;
  const viewBox = 24;
  const size = 260;
  const outlineCount = 70;
  const fillerCount = 45;
  const linkDistance = 34;
  const crossThreadsPerPoint = 2;
  const mouseRadius = 50;
  const mousePush = 20;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const svgNS = "http://www.w3.org/2000/svg";
  const tempSvg = document.createElementNS(svgNS, "svg");
  const tempPath = document.createElementNS(svgNS, "path");
  tempPath.setAttribute("d", pathData);
  tempSvg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
  tempSvg.appendChild(tempPath);
  document.body.appendChild(tempSvg);

  const totalLength = tempPath.getTotalLength();
  const scale = size / viewBox;
  const svgPoint = tempSvg.createSVGPoint();

  function isInsideShape(x, y) {
    svgPoint.x = x;
    svgPoint.y = y;
    try {
      return tempPath.isPointInFill(svgPoint);
    } catch (e) {
      return false;
    }
  }

  const points = [];

  for (let i = 0; i < outlineCount; i++) {
    const p = tempPath.getPointAtLength((i / outlineCount) * totalLength);
    points.push({
      baseX: p.x * scale,
      baseY: p.y * scale,
      x: p.x * scale,
      y: p.y * scale,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.4,
      amp: 2 + Math.random() * 3,
      pushX: 0,
      pushY: 0
    });
  }

  let attempts = 0;
  while (points.length < outlineCount + fillerCount && attempts < fillerCount * 30) {
    attempts++;
    const rx = Math.random() * viewBox;
    const ry = Math.random() * viewBox;
    if (isInsideShape(rx, ry)) {
      points.push({
        baseX: rx * scale,
        baseY: ry * scale,
        x: rx * scale,
        y: ry * scale,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        amp: 1.5 + Math.random() * 3,
        pushX: 0,
        pushY: 0
      });
    }
  }

  document.body.removeChild(tempSvg);

  points.forEach((pt) => {
    pt.partners = [];
    for (let k = 0; k < crossThreadsPerPoint; k++) {
      pt.partners.push(Math.floor(Math.random() * points.length));
    }
  });

  const mouse = { x: 0, y: 0, active: false };

  function updateMouseFromEvent(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouse.x = ((clientX - rect.left) / rect.width) * size;
    mouse.y = ((clientY - rect.top) / rect.height) * size;
    mouse.active = true;
  }

  const onMouseMove = (e) => updateMouseFromEvent(e.clientX, e.clientY);
  const onMouseLeave = () => { mouse.active = false; };
  const onTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      updateMouseFromEvent(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  host.addEventListener("mousemove", onMouseMove);
  host.addEventListener("mouseleave", onMouseLeave);
  host.addEventListener("touchmove", onTouchMove, { passive: true });
  host.addEventListener("touchend", onMouseLeave);

  let raf = null;
  let running = false;
  let t0 = null;

  function frame(ts) {
    if (!t0) t0 = ts;
    const elapsed = (ts - t0) / 1000;

    ctx.clearRect(0, 0, size, size);

    points.forEach((pt) => {
      const driftX = pt.baseX + Math.cos(elapsed * pt.speed + pt.phase) * pt.amp;
      const driftY = pt.baseY + Math.sin(elapsed * pt.speed + pt.phase) * pt.amp;

      let pushX = 0;
      let pushY = 0;
      if (mouse.active) {
        const dx = driftX - mouse.x;
        const dy = driftY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 0.001) {
          const force = (1 - dist / mouseRadius) * mousePush;
          pushX = (dx / dist) * force;
          pushY = (dy / dist) * force;
        }
      }
      pt.pushX += (pushX - pt.pushX) * 0.15;
      pt.pushY += (pushY - pt.pushY) * 0.15;
      pt.x = driftX + pt.pushX;
      pt.y = driftY + pt.pushY;
    });

    // Long faint cross-threads, fixed opacity regardless of distance
    ctx.lineWidth = 1;
    points.forEach((pt) => {
      pt.partners.forEach((idx) => {
        const partner = points[idx];
        if (!partner || partner === pt) return;
        ctx.strokeStyle = "rgba(44,229,255,.07)";
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(partner.x, partner.y);
        ctx.stroke();
      });
    });

    // Short neighbour links
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDistance) {
          ctx.strokeStyle = `rgba(44,229,255,${(1 - dist / linkDistance) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    // Bright links from the pointer to nearby nodes
    if (mouse.active) {
      points.forEach((pt) => {
        const dx = pt.x - mouse.x;
        const dy = pt.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius) {
          ctx.strokeStyle = `rgba(120,240,255,${(1 - dist / mouseRadius) * 0.8})`;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    ctx.fillStyle = "#c9f6ff";
    points.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    t0 = null;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  ScrollTrigger.create({
    trigger: host.closest(".scenario-panel"),
    start: "top 75%",
    end: "bottom top",
    onEnter: start,
    onEnterBack: start,
    onLeave: stop,
    onLeaveBack: stop,

    onRefresh: (self) => { self.isActive ? start() : stop(); }
  });

  window.addEventListener("beforeunload", () => {
    stop();
    host.removeEventListener("mousemove", onMouseMove);
    host.removeEventListener("mouseleave", onMouseLeave);
    host.removeEventListener("touchmove", onTouchMove);
    host.removeEventListener("touchend", onMouseLeave);
  });
}

function initNetworkScenes() {
  document.querySelectorAll(".scene-network").forEach(setupNetworkScene);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNetworkScenes);
} else {
  initNetworkScenes();
}

function syncPhoneLayout() {
  const header = document.querySelector("header");
  if (!header) return;
  document.documentElement.style.setProperty("--header-h", `${header.getBoundingClientRect().height}px`);
}

syncPhoneLayout();
window.addEventListener("resize", syncPhoneLayout);


window.addEventListener("load", () => {
  syncPhoneLayout();
  ScrollTrigger.refresh();
});