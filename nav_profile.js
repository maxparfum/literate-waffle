import { supabase } from './supabase.js';

async function initNavProfile() {
  const profileBtn = document.getElementById('nav-profile-btn');
  if (!profileBtn) return;

  if (profileBtn.dataset.navProfileBound === '1') return;
  profileBtn.dataset.navProfileBound = '1';

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      profileBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
      });
      return;
    }

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('profile_picture')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
    }

    if (userProfile && userProfile.profile_picture) {
      profileBtn.innerHTML = `<img src="${userProfile.profile_picture}" alt="Profile" class="nav-profile-img" />`;
    }

    profileBtn.addEventListener('click', () => {
      window.location.href = 'profile.html';
    });
  } catch (error) {
    console.error('Error initializing nav profile:', error);
    profileBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavProfile);
} else {
  initNavProfile();
}

document.addEventListener('navbar:loaded', initNavProfile);