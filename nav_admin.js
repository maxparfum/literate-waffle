import { supabase } from './supabase.js';

async function checkAdminStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

function getNavbarRoot() {
  return document.querySelector('#navbar-container #mp-navbar-root') || document.querySelector('#mp-navbar-root');
}

async function initNavAdmin() {
  const isAdmin = await checkAdminStatus();
  const root = getNavbarRoot();

  if (!root) return;
  if (!isAdmin) return;

  const navLeft = root.querySelector('.nav-left');
  if (navLeft) {
    const existingAdminLink = navLeft.querySelector('.nav-admin-link');
    if (!existingAdminLink) {
      const adminLink = document.createElement('a');
      adminLink.href = '/admin-fragrances.html';
      adminLink.className = 'nav-link nav-admin-link desktop-only';
      adminLink.textContent = 'Admin';
      adminLink.style.color = '#d4af37';
      adminLink.style.fontWeight = '600';
      navLeft.appendChild(adminLink);
    }
  }

  const mobileMenuNav = root.querySelector('.mobile-menu-nav');
  if (mobileMenuNav) {
    const existingMobileAdminLink = mobileMenuNav.querySelector('.mobile-admin-link');
    if (!existingMobileAdminLink) {
      const mobileAdminLink = document.createElement('a');
      mobileAdminLink.href = '/admin-fragrances.html';
      mobileAdminLink.className = 'mobile-menu-link mobile-admin-link';
      mobileAdminLink.textContent = 'Admin';
      mobileAdminLink.style.color = '#d4af37';
      mobileAdminLink.style.fontWeight = '600';

      const aboutLink = mobileMenuNav.querySelector('a[href="/about.html"]');
      if (aboutLink) {
        mobileMenuNav.insertBefore(mobileAdminLink, aboutLink);
      } else {
        mobileMenuNav.appendChild(mobileAdminLink);
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavAdmin);
} else {
  initNavAdmin();
}

document.addEventListener('navbar:loaded', initNavAdmin);