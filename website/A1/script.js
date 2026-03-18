/* ============================================================
   CryptArtist Studio - Website JavaScript
   Navigation, scroll animations, accordion, mobile menu
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Navbar scroll effect ---
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile menu toggle ---
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.textContent = isOpen ? '\u2715' : '\u2630';
    });

    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.textContent = '\u2630';
      });
    });
  }

  // --- Active nav link highlight ---
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // --- Scroll reveal animations ---
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // --- Accordion ---
  document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const isOpen = item.classList.contains('open');

      // Close all items in the same accordion
      const accordion = item.closest('.accordion');
      if (accordion) {
        accordion.querySelectorAll('.accordion-item').forEach(i => {
          i.classList.remove('open');
        });
      }

      // Toggle the clicked item
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      // Security: validate that targetId is a simple ID selector to prevent CSS selector injection
      if (!/^#[a-zA-Z0-9_-]+$/.test(targetId)) return;
      let target;
      try { target = document.querySelector(targetId); } catch (e) { return; }
      if (target) {
        e.preventDefault();
        const navHeight = nav ? nav.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // --- Counter animation for stats ---
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-count') || '0', 10);
          if (isNaN(target) || target < 0) return;
          const suffix = (el.getAttribute('data-suffix') || '').slice(0, 10);
          const prefix = (el.getAttribute('data-prefix') || '').slice(0, 10);
          const duration = 1500;
          const start = performance.now();

          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => counterObserver.observe(el));
  }

  // --- Typing effect for hero subtitle (index page only) ---
  const typingEl = document.querySelector('.typing-effect');
  if (typingEl) {
    const text = typingEl.getAttribute('data-text');
    if (text) {
      typingEl.textContent = '';
      let i = 0;
      const type = () => {
        if (i < text.length) {
          typingEl.textContent += text.charAt(i);
          i++;
          setTimeout(type, 25);
        }
      };
      // Start typing after a small delay
      setTimeout(type, 800);
    }
  }

  // --- Copy code block to clipboard ---
  document.querySelectorAll('.code-block-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.code-block');
      const code = block.querySelector('pre').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 2000);
      });
    });
  });

  // --- Parallax subtle effect on hero orbs ---
  const heroOrbs = document.querySelectorAll('.hero-orb');
  if (heroOrbs.length > 0) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      heroOrbs.forEach((orb, i) => {
        const factor = (i + 1) * 8;
        orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    }, { passive: true });
  }

  // --- Interactive program card glow effect ---
  document.querySelectorAll('.program-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
    });
  });

  // --- Stagger animation for reveal elements ---
  document.querySelectorAll('.reveal').forEach((el, index) => {
    const delay = index * 50;
    el.style.animationDelay = `${delay}ms`;
  });

  // --- GiveGigs control-plane status panel ---
  const controlPanel = document.getElementById('givegigs-control-plane');
  if (controlPanel) {
    const connectedEl = controlPanel.querySelector('[data-gg-connected]');
    const accessEl = controlPanel.querySelector('[data-gg-access]');
    const authorityEl = controlPanel.querySelector('[data-gg-authority]');
    const modeEl = controlPanel.querySelector('[data-gg-mode]');
    const appCountEl = controlPanel.querySelector('[data-gg-app-count]');
    const messageEl = controlPanel.querySelector('[data-gg-message]');
    const adminLinkEl = controlPanel.querySelector('[data-gg-admin-link]');

    const setBadge = (el, text, tone) => {
      if (!el) return;
      el.textContent = text;
      el.classList.remove('control-badge-neutral', 'control-badge-success', 'control-badge-warning', 'control-badge-danger');
      if (tone === 'success') el.classList.add('control-badge-success');
      else if (tone === 'warning') el.classList.add('control-badge-warning');
      else if (tone === 'danger') el.classList.add('control-badge-danger');
      else el.classList.add('control-badge-neutral');
    };

    const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

    const appId = (controlPanel.getAttribute('data-givegigs-app') || 'cryptartist-website').trim();
    const configuredBase = typeof window !== 'undefined' && typeof window.GIVEGIGS_CONTROL_PLANE_URL === 'string'
      ? window.GIVEGIGS_CONTROL_PLANE_URL.trim()
      : '';
    const localOverride = (() => {
      try {
        const raw = localStorage.getItem('givegigs_control_plane_url_override') || '';
        return raw.trim();
      } catch {
        return '';
      }
    })();

    const baseUrl = trimTrailingSlash(localOverride || configuredBase || 'https://givegigs.com');
    const endpoint = `${baseUrl}/api/ecosystem/control-plane?app=${encodeURIComponent(appId)}`;

    fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const connected = !!payload?.controlPlane?.appId;
        const canControl = !!payload?.user?.canControlEcosystem;

        setBadge(connectedEl, connected ? 'Connected' : 'Offline', connected ? 'success' : 'danger');
        setBadge(accessEl, canControl ? 'Access: admin' : 'Access: standard', canControl ? 'success' : 'warning');

        if (authorityEl) authorityEl.textContent = payload?.database?.authorityAppId || 'givegigs';
        if (modeEl) modeEl.textContent = payload?.user?.accessMode || 'unknown';
        if (appCountEl) appCountEl.textContent = String(Array.isArray(payload?.apps) ? payload.apps.length : 0);
        if (messageEl) messageEl.textContent = connected
          ? `Control plane online (${payload?.controlPlane?.version || 'version unknown'})`
          : 'Control plane unreachable';

        if (adminLinkEl && payload?.admin?.url) {
          adminLinkEl.setAttribute('href', payload.admin.url);
        }
      })
      .catch((err) => {
        setBadge(connectedEl, 'Offline', 'danger');
        setBadge(accessEl, 'Access: unknown', 'neutral');
        if (messageEl) messageEl.textContent = `Control plane request failed: ${err?.message || 'unknown error'}`;
      });
  }

  // --- Year in footer ---
  document.querySelectorAll('.current-year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

});
