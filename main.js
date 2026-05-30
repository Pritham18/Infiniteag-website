/* ═══════════════════════════════════════════════════════════
   INFINITEAG — JAVASCRIPT
   Interactions: nav, scroll animations, form handling, year
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Utility: throttle ── */
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  /* ── Footer Year ── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ══════════════════════════════════════════
     STICKY HEADER — shadow on scroll
  ══════════════════════════════════════════ */
  const header = document.getElementById('site-header');

  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', throttle(updateHeader, 50), { passive: true });
  updateHeader();


  /* ══════════════════════════════════════════
     MOBILE NAV TOGGLE
  ══════════════════════════════════════════ */
  const navToggle  = document.querySelector('.nav-toggle');
  const mobileNav  = document.getElementById('mobile-nav');

  function openNav() {
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    mobileNav.classList.add('open');
    mobileNav.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      const isOpen = mobileNav.classList.contains('open');
      isOpen ? closeNav() : openNav();
    });

    // Close when a nav link is clicked
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    // Close on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeNav();
        navToggle.focus();
      }
    });
  }


  /* ══════════════════════════════════════════
     SMOOTH SCROLL for anchor links
  ══════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();

      const headerOffset = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '72',
        10
      );
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ══════════════════════════════════════════
     INTERSECTION OBSERVER — Reveal animations
  ══════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    revealEls.forEach(function (el) {
      el.classList.add('revealed');
    });
  }


  /* ══════════════════════════════════════════
     HERO FORM
  ══════════════════════════════════════════ */
  const heroForm = document.getElementById('hero-quote-form');

  if (heroForm) {
    heroForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const addressInput = this.querySelector('input[name="address"]');
      const val = addressInput ? addressInput.value.trim() : '';

      if (!val) {
        addressInput.focus();
        shakeElement(addressInput.closest('.form-row') || addressInput);
        return;
      }

      // Scroll to and pre-fill the main form
      const mainAddressField = document.getElementById('q-address');
      if (mainAddressField) {
        mainAddressField.value = val;
      }

      const quoteSection = document.getElementById('quote-form');
      if (quoteSection) {
        const headerOffset = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '72',
          10
        );
        const top = quoteSection.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
        window.scrollTo({ top, behavior: 'smooth' });

        // Focus first empty required field in quote form
        setTimeout(function () {
          const firstField = document.getElementById('q-name');
          if (firstField) firstField.focus();
        }, 600);
      }
    });
  }


  /* ══════════════════════════════════════════
     MAIN QUOTE FORM
  ══════════════════════════════════════════ */
  const mainForm = document.getElementById('main-quote-form');

  if (mainForm) {
    mainForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validateQuoteForm(this)) return;

      const submitBtn = this.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      var formPayload = {
        name:    (document.getElementById('q-name')    || {}).value || '',
        email:   (document.getElementById('q-email')   || {}).value || '',
        address: (document.getElementById('q-address') || {}).value || '',
        service: (document.getElementById('q-service') || {}).value || '',
        message: (document.getElementById('q-message') || {}).value || '',
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPayload),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            showFormSuccess(mainForm);
          } else {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Get Free Quote';
            showFieldError(submitBtn.closest('form') || submitBtn, data.error || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get Free Quote';
          showFieldError(submitBtn.closest('form') || submitBtn, 'Network error. Please check your connection and try again.');
        });
    });

    // Inline validation on blur
    mainForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (field) {
      field.addEventListener('blur', function () {
        validateField(this);
      });
      field.addEventListener('input', function () {
        clearFieldError(this);
      });
    });
  }

  function validateQuoteForm(form) {
    let valid = true;

    form.querySelectorAll('[required]').forEach(function (field) {
      if (!validateField(field)) valid = false;
    });

    // Basic email format check
    const emailField = form.querySelector('#q-email');
    if (emailField && emailField.value.trim()) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(emailField.value.trim())) {
        showFieldError(emailField, 'Please enter a valid email address.');
        valid = false;
      }
    }

    // Basic phone format check
    const phoneField = form.querySelector('#q-phone');
    if (phoneField && phoneField.value.trim()) {
      const digitsOnly = phoneField.value.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        showFieldError(phoneField, 'Please enter a valid phone number.');
        valid = false;
      }
    }

    return valid;
  }

  function validateField(field) {
    if (!field.value.trim()) {
      showFieldError(field, 'This field is required.');
      return false;
    }
    clearFieldError(field);
    return true;
  }

  function showFieldError(field, message) {
    clearFieldError(field);
    field.setAttribute('aria-invalid', 'true');
    field.style.borderColor = '#C0392B';

    const errId = field.id + '-error';
    const errEl = document.createElement('span');
    errEl.id = errId;
    errEl.className = 'field-error';
    errEl.setAttribute('role', 'alert');
    errEl.textContent = message;
    errEl.style.cssText = 'display:block;font-size:0.75rem;color:#C0392B;margin-top:4px;';
    field.setAttribute('aria-describedby', errId);

    const parent = field.closest('.form-group');
    if (parent) parent.appendChild(errEl);
  }

  function clearFieldError(field) {
    field.removeAttribute('aria-invalid');
    field.style.borderColor = '';

    const errId = field.id + '-error';
    const existing = document.getElementById(errId);
    if (existing) existing.remove();
  }

  function showFormSuccess(form) {
    const wrap = form.closest('.quote-form-wrap') || form;
    const success = document.createElement('div');
    success.setAttribute('role', 'status');
    success.style.cssText = `
      text-align: center;
      padding: 2.5rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    `;
    success.innerHTML = `
      <div style="width:64px;height:64px;background:#DDE8D6;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#174A2A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h3 style="font-family:'Playfair Display',serif;color:#174A2A;font-size:1.25rem;margin:0;">Quote Request Sent</h3>
      <p style="color:#68766C;font-size:0.9rem;max-width:40ch;margin:0;">
        Request received. InfiniteAg will review your details and follow up soon.
      </p>
    `;
    form.replaceWith(success);
  }

  function shakeElement(el) {
    el.style.animation = 'none';
    el.style.transition = 'transform 0.4s';
    el.style.transform = 'translateX(-6px)';
    setTimeout(() => { el.style.transform = 'translateX(6px)'; }, 80);
    setTimeout(() => { el.style.transform = 'translateX(-4px)'; }, 160);
    setTimeout(() => { el.style.transform = 'translateX(4px)'; }, 240);
    setTimeout(() => { el.style.transform = 'translateX(0)'; }, 320);
  }


  /* ══════════════════════════════════════════
     FAQ — keyboard accessibility
  ══════════════════════════════════════════ */
  document.querySelectorAll('.faq-item summary').forEach(function (summary) {
    summary.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });

})();
