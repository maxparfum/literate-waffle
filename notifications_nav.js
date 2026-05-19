import { supabase } from './supabase.js';

let currentUser = null;
let notificationChannel = null;
let notifications = [];
let isDropdownOpen = false;

async function initNotifications() {
  const bellBtn = document.getElementById('nav-notifications-btn');
  if (!bellBtn) return;

  if (bellBtn.dataset.notificationsBound === '1') return;
  bellBtn.dataset.notificationsBound = '1';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    if (!currentUser) {
      setupLoggedOutBehavior(bellBtn);
      return;
    }

    await loadUnreadCount();
    setupBellClickHandler(bellBtn);
    setupClickOutsideHandler();
    subscribeToRealtimeNotifications();
  } catch (error) {
    console.error('Error initializing notifications:', error);
    setupLoggedOutBehavior(bellBtn);
  }
}

function setupLoggedOutBehavior(bellBtn) {
  const badge = document.getElementById('notifications-badge');
  if (badge) badge.style.display = 'none';

  bellBtn.addEventListener('click', () => {
    toggleDropdown();
    renderLoggedOutMessage();
  });
}

function setupBellClickHandler(bellBtn) {
  bellBtn.addEventListener('click', async () => {
    toggleDropdown();
    if (isDropdownOpen) {
      await loadNotifications();
    }
  });
}

function toggleDropdown() {
  const dropdown = document.getElementById('notifications-dropdown');
  if (!dropdown) return;

  isDropdownOpen = !isDropdownOpen;

  if (isDropdownOpen) {
    dropdown.classList.remove('hidden');
  } else {
    dropdown.classList.add('hidden');
  }
}

function setupClickOutsideHandler() {
  if (document.body.dataset.notificationsOutsideBound === '1') return;
  document.body.dataset.notificationsOutsideBound = '1';

  document.addEventListener('click', (e) => {
    const bellBtn = document.getElementById('nav-notifications-btn');
    const dropdown = document.getElementById('notifications-dropdown');

    if (!bellBtn || !dropdown) return;

    const isClickInsideBell = bellBtn.contains(e.target);
    const isClickInsideDropdown = dropdown.contains(e.target);

    if (!isClickInsideBell && !isClickInsideDropdown && isDropdownOpen) {
      toggleDropdown();
    }
  });
}

async function loadUnreadCount() {
  if (!currentUser) return;

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error loading unread count:', error);
      return;
    }

    updateBadge(count || 0);
  } catch (err) {
    console.error('Unexpected error loading unread count:', err);
  }
}

function updateBadge(count) {
  const badge = document.getElementById('notifications-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadNotifications() {
  if (!currentUser) return;

  const list = document.getElementById('notifications-list');
  if (!list) return;

  list.innerHTML = '<div class="notifications-loading">Loading...</div>';

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, created_at, message, link, is_read')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error loading notifications:', error);
      list.innerHTML = '<div class="notifications-error">Error loading notifications</div>';
      return;
    }

    notifications = data || [];
    renderNotificationsList();
  } catch (err) {
    console.error('Unexpected error loading notifications:', err);
    list.innerHTML = '<div class="notifications-error">Error loading notifications</div>';
  }
}

function renderNotificationsList() {
  const list = document.getElementById('notifications-list');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = '<div class="notifications-empty">No notifications yet.</div>';
    return;
  }

  list.innerHTML = notifications
    .map((notification) => {
      const isUnread = !notification.is_read;
      const unreadClass = isUnread ? 'notification-unread' : '';
      const timeAgo = formatTimeAgo(new Date(notification.created_at));

      return `
        <div class="notification-item ${unreadClass}" data-notification-id="${notification.id}" data-link="${notification.link || ''}">
          <div class="notification-message">${escapeHtml(notification.message)}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
      `;
    })
    .join('');

  list.querySelectorAll('.notification-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const notificationId = item.dataset.notificationId;
      const link = item.dataset.link;

      await markAsRead(notificationId);

      if (link) {
        window.location.href = link;
      }
    });
  });
}

function renderLoggedOutMessage() {
  const list = document.getElementById('notifications-list');
  if (!list) return;

  list.innerHTML = '<div class="notifications-login-message">Log in to view notifications</div>';
}

async function markAsRead(notificationId) {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', currentUser.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    const notification = notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.is_read = true;
    }

    await loadUnreadCount();
    renderNotificationsList();
  } catch (err) {
    console.error('Unexpected error marking notification as read:', err);
  }
}

async function markAllAsRead() {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return;
    }

    notifications.forEach((n) => {
      n.is_read = true;
    });

    await loadUnreadCount();
    renderNotificationsList();
  } catch (err) {
    console.error('Unexpected error marking all as read:', err);
  }
}

function subscribeToRealtimeNotifications() {
  if (!currentUser || notificationChannel) return;

  notificationChannel = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      },
      (payload) => {
        handleNewNotification(payload.new);
      }
    )
    .subscribe();
}

function handleNewNotification(newNotification) {
  notifications.unshift(newNotification);

  if (notifications.length > 20) {
    notifications = notifications.slice(0, 20);
  }

  const badge = document.getElementById('notifications-badge');
  const currentCount = badge && badge.style.display !== 'none' ? parseInt(badge.textContent) || 0 : 0;
  updateBadge(currentCount + 1);

  if (isDropdownOpen) {
    renderNotificationsList();
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupMarkAllAsReadButton() {
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (!markAllBtn) return;
  if (markAllBtn.dataset.markAllBound === '1') return;

  markAllBtn.dataset.markAllBound = '1';
  markAllBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  });
}

function startNotifications() {
  initNotifications();
  setupMarkAllAsReadButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startNotifications);
} else {
  startNotifications();
}

document.addEventListener('navbar:loaded', startNotifications);