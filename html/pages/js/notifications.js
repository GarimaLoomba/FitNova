/**
 * notifications.js — browser notification permission and messages
 *
 * CLASS EXPLANATION:
 * We only ask Notification.requestPermission() after the user clicks a button.
 */
(function (root) {
  'use strict';

  const Notifications = {
    isSupported: function () {
      return 'Notification' in window;
    },

    getPermission: function () {
      if (!this.isSupported()) return 'unsupported';
      return Notification.permission;
    },

    requestPermission: function () {
      if (!this.isSupported()) {
        if (root.showToast) {
          root.showToast('Browser notifications are not supported in this environment.', 'warning');
        }
        return Promise.resolve('unsupported');
      }

      return Notification.requestPermission().then(function (permission) {
        if (root.StorageManager) {
          root.StorageManager.updateSettings({
            notificationsEnabled: permission === 'granted'
          });
        }

        if (permission === 'granted') {
          if (root.showToast) root.showToast('Notifications enabled! You will receive training reminders.', 'success');
          Notifications.send('FitNova Activated', {
            body: 'You are ready to receive workout and hydration alerts!'
          });
        } else if (permission === 'denied') {
          if (root.showToast) root.showToast('Notification permission was blocked in browser settings.', 'warning');
        }

        Notifications.updateToggleButtons();
        return permission;
      });
    },

    send: function (title, options) {
      options = options || {};
      const settings = root.StorageManager ? root.StorageManager.getSettings() : { notificationsEnabled: true };
      if (!settings.notificationsEnabled) return;

      const defaultOptions = {
        icon: './png/logo.png',
        badge: './png/logo.png',
        tag: 'fitness-tracker-alert',
        renotify: true,
        body: ''
      };

      const finalOptions = Object.assign({}, defaultOptions, options);

      if (this.isSupported() && Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, finalOptions);
          notification.onclick = function () {
            window.focus();
            notification.close();
          };
          return notification;
        } catch (err) {
          console.warn('[Notifications] Native notification failed, falling back to toast:', err);
        }
      }

      if (root.showToast) {
        root.showToast(`${title}: ${finalOptions.body}`, 'info');
      }
    },

    checkDailyMilestones: function () {
      if (!root.StorageManager) return;
      const data = root.StorageManager.getDailyData();

      // Step goal achieved alert
      if (data.steps && data.steps >= data.stepsGoal) {
        this.send('Step Goal Smashed! 🎉', {
          body: `Awesome work! You completed ${data.steps.toLocaleString()} steps today.`,
          tag: 'step-goal-achieved'
        });
      }

      // Hydration reminder alert
      if (data.water < Math.floor(data.waterGoal / 2)) {
        this.send('Hydration Check 💧', {
          body: `You have logged ${data.water} of ${data.waterGoal} glasses today. Take a quick sip!`,
          tag: 'water-reminder'
        });
      }
    },

    updateToggleButtons: function () {
      const toggle = document.getElementById('notification-toggle-btn');
      if (!toggle) return;

      const perm = this.getPermission();
      if (perm === 'granted') {
        toggle.textContent = '🔔 Alerts Enabled';
        toggle.classList.add('active');
      } else if (perm === 'denied') {
        toggle.textContent = '🔕 Alerts Blocked';
        toggle.classList.remove('active');
        toggle.title = 'Unblock notifications in your browser address bar settings to re-enable.';
      } else {
        toggle.textContent = '🔔 Enable Alerts';
        toggle.classList.remove('active');
      }
    },

    bindControls: function () {
      const toggle = document.getElementById('notification-toggle-btn');
      if (toggle) {
        this.updateToggleButtons();
        toggle.addEventListener('click', () => {
          if (this.getPermission() === 'granted') {
            // Already granted, toggle preference off/on in storage
            const current = root.StorageManager.getSettings().notificationsEnabled;
            root.StorageManager.updateSettings({ notificationsEnabled: !current });
            if (root.showToast) {
              root.showToast(!current ? 'Fitness reminders enabled' : 'Fitness reminders muted');
            }
            this.updateToggleButtons();
          } else {
            this.requestPermission();
          }
        });
      }

      // Demo notification trigger button
      const testBtn = document.getElementById('test-notification-btn');
      if (testBtn) {
        testBtn.addEventListener('click', () => {
          this.send('Hydration Reminder 💧', {
            body: 'Time to drink a fresh glass of water to stay hydrated!'
          });
        });
      }
    },

    scheduleReminders: function () {
      if (this._reminderTimer) return;
      const notificationPage = this;
      this._reminderTimer = setInterval(function () {
        const settings = root.StorageManager ? root.StorageManager.getSettings() : {};
        if (!settings.notificationsEnabled) return;
        const data = root.StorageManager.getDailyData();
        const hour = new Date().getHours();
        if (settings.waterReminder && hour >= 9 && hour <= 20 && (data.waterMl || 0) < (data.waterGoalMl || 2000) / 2) {
          notificationPage.send('Drink water', { body: 'A quick sip keeps today’s hydration goal moving.', tag: 'water-reminder' });
        }
        if (settings.workoutReminder && hour === 18) {
          const today = root.StorageManager.getTodayKey();
          const trained = root.StorageManager.getWorkouts().some(function (w) { return String(w.date).slice(0, 10) === today; });
          if (!trained) notificationPage.send('Workout reminder', { body: 'A short session still counts toward your streak.', tag: 'workout-reminder' });
        }
        if (settings.goalReminder) notificationPage.checkDailyMilestones();
      }, 30 * 60 * 1000);
    }
  };

  root.Notifications = Notifications;

  (root.onAppReady || function (fn) { document.addEventListener('DOMContentLoaded', fn); })(function () {
    Notifications.bindControls();
    Notifications.scheduleReminders();
  });

})(typeof window !== 'undefined' ? window : this);
