/* ═══════════════════════════════════════════════════════════
   INFINITEAG — script.js
   Mobile nav · Scroll reveal · FAQ keyboard · Form validation
   ─────────────────────────────────────────────────────────── */

'use strict';

/* ── Auto-update copyright year ──────────────────────────── */
document.querySelectorAll('[data-year]').forEach(el => {
  el.textContent = new Date().getFullYear();
});

/* ── Sticky header shadow ─────────────────────────────────── */
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Mobile nav toggle ───────────────────────────────────── */
const navToggle  = document.querySelector('.nav-toggle');
const mobileNav  = document.querySelector('.mobile-nav');

if (navToggle && mobileNav) {
  const openNav = () => {
    navToggle.classList.add('open');
    mobileNav.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeNav = () => {
    navToggle.classList.remove('open');
    mobileNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.classList.contains('open');
    isOpen ? closeNav() : openNav();
  });

  /* Close when a nav link is clicked */
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  /* Close on Escape */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navToggle.classList.contains('open')) closeNav();
  });
}

/* ── Smooth-scroll for anchor links ─────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY
              - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72);
    window.scrollTo({ top, behavior: 'smooth' });
    /* Move focus to target for accessibility */
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

/* ── Scroll reveal (IntersectionObserver) ───────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
} else {
  /* Immediately show all reveal elements when motion is reduced */
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
}

/* ── FAQ keyboard support (<details> elements) ──────────── */
document.querySelectorAll('.faq-item summary').forEach(summary => {
  summary.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      summary.click();
    }
  });
});

/* ── Quote / contact form validation ────────────────────── */
const quoteSection = document.querySelector('#quote-form');

if (quoteSection) {
  /* Show inline error */
  const showError = (field, msg) => {
    clearError(field);
    field.setAttribute('aria-invalid', 'true');
    const err = document.createElement('span');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    err.textContent = msg;
    err.style.cssText = 'display:block;color:#c0392b;font-size:.8rem;margin-top:.25rem;font-weight:600';
    field.parentNode.appendChild(err);
  };

  const clearError = field => {
    field.setAttribute('aria-invalid', 'false');
    const existing = field.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
  };

  /* Live-clear errors on input (hoisted via mainForm below) */

  const validators = {
    name:  v => v.trim().length >= 2 ? null : 'Please enter your name.',
    phone: v => {
      const d = v.replace(/\D/g, '');
      return d.length >= 10 ? null : 'Please enter a valid phone number (10 digits).';
    },
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Please enter a valid email address.',
  };

  const mainForm = document.querySelector('#main-quote-form');
  if (mainForm) {
    mainForm.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => clearError(field));
      field.addEventListener('change', () => clearError(field));
    });

    mainForm.addEventListener('submit', e => {
      e.preventDefault();
      let firstError = null;

      Object.entries(validators).forEach(([fieldName, validate]) => {
        const field = mainForm.querySelector(`[name="${fieldName}"]`);
        if (!field) return;
        const msg = validate(field.value);
        if (msg) {
          showError(field, msg);
          if (!firstError) firstError = field;
        } else {
          clearError(field);
        }
      });

      if (firstError) {
        firstError.focus();
        return;
      }

      /* Sending state */
      const submitBtn = mainForm.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      const formData = {
        name:    mainForm.querySelector('[name="name"]')?.value.trim() || '',
        phone:   mainForm.querySelector('[name="phone"]')?.value.trim() || '',
        email:   mainForm.querySelector('[name="email"]')?.value.trim() || '',
        city:    mainForm.querySelector('[name="city"]')?.value.trim() || '',
        service: mainForm.querySelector('[name="service"]')?.value || '',
        message: mainForm.querySelector('[name="message"]')?.value.trim() || '',
      };

      const showMsg = (text, isError) => {
        const existing = mainForm.querySelector('.form-success-msg');
        if (existing) existing.remove();
        const msg = document.createElement('p');
        msg.className = 'form-success-msg';
        msg.setAttribute('role', 'status');
        msg.textContent = text;
        msg.style.cssText = `font-weight:600;margin-top:1rem;font-size:.95rem;text-align:center;color:${isError ? '#c0392b' : 'var(--color-secondary)'}`;
        mainForm.appendChild(msg);
      };

      fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (ok && data.success) {
            showMsg('Request received. InfiniteAg will review your details and follow up soon.', false);
            mainForm.reset();
          } else {
            showMsg(data.error || 'Something went wrong. Please call us at (803) 903-7059 or try again.', true);
          }
        })
        .catch(() => {
          showMsg('Something went wrong. Please call us at (803) 903-7059 or try again.', true);
        })
        .finally(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Request a Quote';
          }
        });
    });
  }
}

/* ── Hero zip / address quick-quote form ────────────────── */
const heroForm = document.querySelector('.hero-form');

if (heroForm) {
  heroForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = heroForm.querySelector('input[type="text"]');
    const val = input ? input.value.trim() : '';
    if (!val) {
      input && input.focus();
      return;
    }
    /* Scroll to quote section */
    const quoteSection = document.querySelector('#quote-form');
    if (quoteSection) {
      const top = quoteSection.getBoundingClientRect().top + window.scrollY
                - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72);
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
}

/* ── Cinematic hero: mouse parallax + entrance ───────────── */
(function () {
  'use strict';

  const hero  = document.querySelector('.lc-hero');
  const scene = document.querySelector('.lc-hero-scene-img');
  if (!hero || !scene) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  let rafId = null;
  let tx = 0, ty = 0;       /* target */
  let cx = 0, cy = 0;       /* current (lerped) */

  function tick () {
    rafId = null;
    cx += (tx - cx) * 0.075;
    cy += (ty - cy) * 0.075;
    scene.style.transform = `translate(${cx}px,${cy}px)`;

    if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
      rafId = requestAnimationFrame(tick);
    }
  }

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  - 0.5) * -14;
    ty = ((e.clientY - r.top)  / r.height - 0.5) * -8;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }, { passive: true });

  hero.addEventListener('mouseleave', () => {
    tx = 0; ty = 0;
    if (!rafId) rafId = requestAnimationFrame(tick);
  });
})();

/* ── Mobile sticky CTA bar visibility ───────────────────── */
const mobileCTABar = document.querySelector('.mobile-cta-bar');

if (mobileCTABar) {
  const heroSection = document.querySelector('.lc-hero') || document.querySelector('.main-hero') || document.querySelector('.hero');

  if (heroSection) {
    const cbaObserver = new IntersectionObserver(
      ([entry]) => {
        mobileCTABar.style.transform = entry.isIntersecting ? 'translateY(100%)' : 'translateY(0)';
        mobileCTABar.style.transition = 'transform 280ms cubic-bezier(0.16,1,0.3,1)';
      },
      { threshold: 0.1 }
    );
    cbaObserver.observe(heroSection);
  }
}

/* ── Active nav link highlight on scroll ─────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.main-nav a[href^="#"]');

if (sections.length && navLinks.length) {
  const navObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      });
    },
    { rootMargin: '-40% 0px -55% 0px' }
  );
  sections.forEach(s => navObserver.observe(s));
}
