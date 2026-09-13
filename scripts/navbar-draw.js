// ==========================================================
//        NAVBAR BORDER SYNC (svg draw-on outline)
// ==========================================================

function syncNavbarDraw(){
  const navbar = document.querySelector('.navbar');
  const draw = document.querySelector('.navbar-draw');
  const rect = draw?.querySelector('rect');
  if(!navbar || !draw || !rect) return;

  const w = navbar.offsetWidth;
  const h = navbar.offsetHeight;
  const rx = 24;

  draw.style.width = w + 'px';
  draw.style.height = h + 'px';
  draw.setAttribute('viewBox', `0 0 ${w} ${h}`);

  rect.setAttribute('x', 2);
  rect.setAttribute('y', 2);
  rect.setAttribute('width', w - 4);
  rect.setAttribute('height', h - 4);
  rect.setAttribute('rx', rx);

  const rw = w - 4, rh = h - 4;
  const perimeter = 2*(rw + rh) - 8*rx + 2*Math.PI*rx;

  rect.style.strokeDasharray = perimeter;
  rect.style.strokeDashoffset = perimeter;

  rect.style.animation = 'none';
  rect.offsetHeight; // форс reflow
  rect.style.animation = '';
}

document.addEventListener('DOMContentLoaded', syncNavbarDraw);
window.addEventListener('resize', syncNavbarDraw);