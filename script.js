// Header background on scroll
const header = document.getElementById('siteHeader');
function onScrollHeader(){
  if (window.scrollY > 40) header.classList.add('is-scrolled');
  else header.classList.remove('is-scrolled');
}
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

// Mobile menu
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.35 });
revealEls.forEach(el => revealObserver.observe(el));

// Sticky object story: swap visible frame based on active step
const storySteps = document.querySelectorAll('.story-step');
const visualFrames = document.querySelectorAll('.visual-frame');
if (storySteps.length && visualFrames.length) {
  const storyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const key = entry.target.getAttribute('data-visual');
        storySteps.forEach(s => s.classList.toggle('is-active', s === entry.target));
        visualFrames.forEach(f => f.classList.toggle('is-visible', f.classList.contains('visual-frame--' + key)));
      }
    });
  }, { threshold: 0.6 });
  storySteps.forEach(step => storyObserver.observe(step));
}

// Waitlist form: envía a Netlify Forms (respaldo nativo) y en paralelo
// a Google Sheets vía Apps Script, para que ambos queden con el registro.
const waitlistForm = document.getElementById('waitlistForm');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhz74l9n1PCKNku_VWTPmDdMZbLjQUOPZoNnzFfbPkk7B27O4swPro7n8cPujAFI2J/exec';

if (waitlistForm) {
  waitlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(waitlistForm);

    // 1) Netlify Forms (respaldo nativo, se ve en el panel de Forms)
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    }).catch(() => {});

    // 2) Google Sheets, vía Apps Script (no-cors: solo enviamos, no leemos respuesta)
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    }).catch(() => {});

    waitlistForm.innerHTML = '<p style="font-size:14px;line-height:1.8;color:var(--cream)">Gracias — quedaste en la lista de acceso prioritario de FLOAT. Te avisamos apenas haya novedades.</p>';
  });
}
