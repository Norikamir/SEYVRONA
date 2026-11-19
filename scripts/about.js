// ==========================================================
//                     GSAP ANIMATIONS
// ==========================================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// With reduced motion the content is simply shown in its final state.
if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  // ----------------------------------------------------------
  // Split a heading into per-word <span> so each word can fly in.
  // Child elements (e.g. the gradient "Cleaner") are kept intact and
  // animate as one word, so their styling is not lost.
  // ----------------------------------------------------------
  function splitWords(el) {
    const parts = [];
    [...el.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((chunk) => {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)) {
            parts.push(document.createTextNode(chunk));
          } else {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = chunk;
            parts.push(span);
          }
        });
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        const span = document.createElement('span');
        span.className = 'word';
        span.appendChild(node.cloneNode(true));
        parts.push(span);
      } else {
        parts.push(node.cloneNode(true));
      }
    });
    el.replaceChildren(...parts);
    return el.querySelectorAll(':scope > .word');
  }

  // ----------------------------------------------------------
  //                Section titles
  // ----------------------------------------------------------
  document.querySelectorAll('.about-hero-title, .section-title').forEach((block) => {
    const eyebrow = block.querySelector('.eyebrow');
    const heading = block.querySelector('h1, h2');
    const paragraph = block.querySelector('p');
    const words = heading ? splitWords(heading) : [];

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: block,
        start: 'top 82%',
        toggleActions: 'play none none reverse'
      }
    });

    if (eyebrow) {
      tl.from(eyebrow, { opacity: 0, y: 20, duration: 0.5, ease: 'power3.out' });
    }
    if (words.length) {
      tl.from(words, {
        opacity: 0,
        y: 60,
        rotateX: -40,
        stagger: 0.045,
        duration: 0.8,
        ease: 'back.out(1.7)'
      }, eyebrow ? '-=0.2' : 0);
    }
    if (paragraph) {
      tl.from(paragraph, { opacity: 0, y: 25, duration: 0.6, ease: 'power2.out' }, '-=0.35');
    }
  });

  // ----------------------------------------------------------
  // OUR WORK — full-bleed panels: images fly in small & blurred,
  // then rocket up to full size; marquee ticker fades in; text
  // flies in word-by-word with a blur + rotation "wow" reveal.
  // ----------------------------------------------------------
  document.querySelectorAll('.work-panel').forEach((panel, i) => {

    const image = panel.querySelector('.work-panel-image');
    const marquee = panel.querySelector('.work-marquee');
    const heading = panel.querySelector('.work-panel-content h3');
    const paragraph = panel.querySelector('.work-panel-content p');
    const words = heading ? splitWords(heading) : [];
    const fromLeft = i % 2 === 0;

    // Starting state: tiny, off to one side, blurred, invisible
    
    gsap.set(image, {
      opacity: 0,
      scale: 0.28,
      x: fromLeft ? -220 : 220,
      y: 160,
      filter: 'blur(18px)',
      transformOrigin: fromLeft ? '20% 80%' : '80% 80%'
    });
    gsap.set(marquee, { opacity: 0, y: 50, scale: 1.15 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });

    tl.to(image, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.5,
      ease: 'expo.out'
    })
      .to(marquee, {
        opacity: 1,
        y: 0,
        scale: 1.08,
        duration: 1,
        ease: 'power3.out'
      }, '-=1.05')
      .from(words, {
        opacity: 0,
        y: 70,
        rotateX: -70,
        filter: 'blur(10px)',
        stagger: 0.06,
        duration: 1,
        ease: 'back.out(1.9)'
      }, '-=0.7')
      .from(paragraph, {
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power2.out'
      }, '-=0.55');
  });

  // ----------------------------------------------------------
  // Impact stat numbers count up when scrolled into view
  // ----------------------------------------------------------
  // Only the leading text node is animated: the <span class="unit">
  // (kWh, t) stays in place with its own styling.
  document.querySelectorAll('.impact .stat h2').forEach((statEl) => {
    const textNode = [...statEl.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!textNode) return;
    const raw = textNode.textContent.trim();
    const match = raw.match(/^([\d.,]+)(.*)$/);
    if (!match) return;
    const numberPart = match[1];
    const suffix = match[2];
    const target = parseFloat(numberPart.replace(/,/g, ''));
    if (isNaN(target) || prefersReducedMotion) return;

    const hasDecimal = numberPart.includes('.');
    const counter = { val: 0 };
    textNode.textContent = '0' + suffix;

    ScrollTrigger.create({
      trigger: statEl,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            const display = hasDecimal ? counter.val.toFixed(1) : Math.round(counter.val).toLocaleString('en-US');
            textNode.textContent = display + suffix;
          }
        });
      }
    });
  });
}


// Re-measure triggers after a rotation / width change. ScrollTrigger can skip a
// second resize event on phones, which leaves trigger positions from the old layout.
if (window.ScrollTrigger) {
  let lastWidth = window.innerWidth;
  let resizeTimer;
  const remeasure = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        ScrollTrigger.refresh();
      }
    }, 300);
  };
  window.addEventListener("resize", remeasure);
  window.addEventListener("orientationchange", remeasure);
}
