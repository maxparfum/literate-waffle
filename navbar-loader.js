(async function loadNavbar() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  if (container.dataset.navbarLoaded === '1') {
    initNavbarInteractions(container);
    return;
  }

  try {
    const res = await fetch('/navbar.html?v=20260313-1', {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to load navbar.html: ${res.status}`);
    }

    const html = await res.text();
    container.innerHTML = html;
    container.dataset.navbarLoaded = '1';

    initNavbarInteractions(container);

    document.dispatchEvent(
      new CustomEvent('navbar:loaded', {
        detail: { container }
      })
    );
  } catch (err) {
    console.error('Failed to load navbar:', err);
  }
})();

(function initSupportPopup() {
  if (document.body.dataset.supportPopupBound === '1') return;
  document.body.dataset.supportPopupBound = '1';

  const STORAGE_KEY = 'mp_support_popup_dismissed';
  const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  const SHOW_DELAY_MS = 6000;

  const isSupport = window.location.pathname.replace(/\/+$/, '').endsWith('support.html') ||
    window.location.pathname.replace(/\/+$/, '').endsWith('/support');

  if (isSupport) return;

  const dismissed = localStorage.getItem(STORAGE_KEY);
  if (dismissed) {
    const dismissedAt = parseInt(dismissed, 10);
    if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
  }

  const style = document.createElement('style');
  style.textContent = `
    #mp-support-popup {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      width: 280px;
      background: #111;
      border: 1px solid rgba(196, 160, 80, 0.5);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(196,160,80,0.12);
      padding: 20px 20px 18px;
      font-family: 'Cinzel', Georgia, serif;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    #mp-support-popup.mp-popup-visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      animation: mp-popup-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes mp-popup-bounce {
      0%   { opacity:0; transform: translateY(24px); }
      60%  { opacity:1; transform: translateY(-6px); }
      80%  { transform: translateY(3px); }
      100% { opacity:1; transform: translateY(0); }
    }
    #mp-support-popup-close {
      position: absolute;
      top: 10px;
      right: 13px;
      background: none;
      border: none;
      color: rgba(196,160,80,0.6);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 5px;
      border-radius: 4px;
      transition: color 0.2s;
    }
    #mp-support-popup-close:hover { color: #c4a050; }
    #mp-support-popup-headline {
      font-size: 13px;
      font-weight: 700;
      color: #c4a050;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin: 0 0 6px;
    }
    #mp-support-popup-body {
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin: 0 0 14px;
      line-height: 1.55;
      font-family: Georgia, serif;
    }
    #mp-support-popup-cta {
      display: block;
      width: 100%;
      text-align: center;
      background: linear-gradient(135deg, #c4a050 0%, #e8c96a 50%, #c4a050 100%);
      background-size: 200% 100%;
      color: #111;
      text-decoration: none;
      font-family: 'Cinzel', Georgia, serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: background-position 0.4s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 12px rgba(196,160,80,0.25);
      animation: mp-cta-shine 3s ease infinite;
    }
    @keyframes mp-cta-shine {
      0%   { background-position: 100% 0; }
      50%  { background-position: 0% 0; box-shadow: 0 2px 18px rgba(196,160,80,0.45); }
      100% { background-position: 100% 0; }
    }
    #mp-support-popup-cta:hover {
      box-shadow: 0 4px 20px rgba(196,160,80,0.5);
    }
    @media (max-width: 480px) {
      #mp-support-popup {
        bottom: 16px;
        right: 12px;
        left: 12px;
        width: auto;
      }
    }
  `;
  document.head.appendChild(style);

  const popup = document.createElement('div');
  popup.id = 'mp-support-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-label', 'Support MaxParfum');
  popup.innerHTML = `
    <button id="mp-support-popup-close" aria-label="Close">&times;</button>
    <p id="mp-support-popup-headline">Enjoying MaxParfum?</p>
    <p id="mp-support-popup-body">Help us keep the site ad-light and improving.</p>
    <a href="/support.html" id="mp-support-popup-cta">Support MaxParfum</a>
  `;
  document.body.appendChild(popup);

  popup.querySelector('#mp-support-popup-close').addEventListener('click', () => {
    popup.classList.remove('mp-popup-visible');
    popup.style.pointerEvents = 'none';
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  });

  setTimeout(() => {
    popup.classList.add('mp-popup-visible');
  }, SHOW_DELAY_MS);
})();

function initNavbarInteractions(container) {
  const root = container.querySelector('#mp-navbar-root');
  if (!root) {
    console.error('Navbar root not found inside #navbar-container');
    return;
  }

  const mobileHamburger = root.querySelector('#mobileHamburger');
  const mobileMenu = root.querySelector('#mobileMenu');
  const mobileMenuOverlay = root.querySelector('#mobileMenuOverlay');
  const mobileMenuClose = root.querySelector('#mobileMenuClose');
  const mobileGamesToggle = root.querySelector('#mobileGamesToggle');
  const mobileGamesMenu = root.querySelector('#mobileGamesMenu');
  const mobileCommunityToggle = root.querySelector('#mobileCommunityToggle');
  const mobileCommunityMenu = root.querySelector('#mobileCommunityMenu');

  function openMobileMenu() {
    mobileMenu?.classList.add('active');
    mobileMenuOverlay?.classList.add('active');
    mobileHamburger?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu?.classList.remove('active');
    mobileMenuOverlay?.classList.remove('active');
    mobileHamburger?.classList.remove('active');

    mobileGamesToggle?.classList.remove('active');
    mobileGamesMenu?.classList.remove('active');

    mobileCommunityToggle?.classList.remove('active');
    mobileCommunityMenu?.classList.remove('active');

    document.body.style.overflow = '';
  }

  if (mobileHamburger && mobileHamburger.dataset.bound !== '1') {
    mobileHamburger.addEventListener('click', openMobileMenu);
    mobileHamburger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMobileMenu();
      }
    });
    mobileHamburger.dataset.bound = '1';
  }

  if (mobileMenuClose && mobileMenuClose.dataset.bound !== '1') {
    mobileMenuClose.addEventListener('click', closeMobileMenu);
    mobileMenuClose.dataset.bound = '1';
  }

  if (mobileMenuOverlay && mobileMenuOverlay.dataset.bound !== '1') {
    mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    mobileMenuOverlay.dataset.bound = '1';
  }

  if (mobileGamesToggle && mobileGamesMenu && mobileGamesToggle.dataset.bound !== '1') {
    mobileGamesToggle.addEventListener('click', (e) => {
      e.preventDefault();
      mobileGamesToggle.classList.toggle('active');
      mobileGamesMenu.classList.toggle('active');
    });
    mobileGamesToggle.dataset.bound = '1';
  }

  if (mobileCommunityToggle && mobileCommunityMenu && mobileCommunityToggle.dataset.bound !== '1') {
    mobileCommunityToggle.addEventListener('click', (e) => {
      e.preventDefault();
      mobileCommunityToggle.classList.toggle('active');
      mobileCommunityMenu.classList.toggle('active');
    });
    mobileCommunityToggle.dataset.bound = '1';
  }

  root.querySelectorAll('.mobile-menu a').forEach((link) => {
    if (link.dataset.bound === '1') return;
    link.addEventListener('click', closeMobileMenu);
    link.dataset.bound = '1';
  });

  if (document.body.dataset.navbarEscapeBound !== '1') {
    document.addEventListener('keydown', (e) => {
      const activeMenu = document.querySelector('#navbar-container #mobileMenu.active');
      if (e.key === 'Escape' && activeMenu) {
        const activeRoot = document.querySelector('#navbar-container #mp-navbar-root');
        activeRoot?.querySelector('#mobileMenu')?.classList.remove('active');
        activeRoot?.querySelector('#mobileMenuOverlay')?.classList.remove('active');
        activeRoot?.querySelector('#mobileHamburger')?.classList.remove('active');
        activeRoot?.querySelector('#mobileGamesToggle')?.classList.remove('active');
        activeRoot?.querySelector('#mobileGamesMenu')?.classList.remove('active');
        activeRoot?.querySelector('#mobileCommunityToggle')?.classList.remove('active');
        activeRoot?.querySelector('#mobileCommunityMenu')?.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
    document.body.dataset.navbarEscapeBound = '1';
  }
}