/**
 * profile.js — show the logged-in user's name, BMI, streak
 *
 * CLASS EXPLANATION:
 * Read StorageManager, then put values into HTML with getElementById.
 */
(function (root) {
  'use strict';

  const Profile = {
    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.render();
    },

    render: function () {
      if (!root.StorageManager) return;
      const session = root.StorageManager.getSessionUser() || {};
      const settings = root.StorageManager.getSettings();
      const workouts = root.StorageManager.getWorkouts();
      const streak = root.StorageManager.calculateWorkoutStreak ? root.StorageManager.calculateWorkoutStreak() : { current: 0, longest: 0 };
      const set = function (id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };
      set('profile-name', session.name || settings.name || 'Athlete');
      set('profile-email', session.email || 'Local profile');
      set('profile-userid', session.userId || '—');
      set('profile-workouts', String(workouts.length));
      set('profile-streak', String(streak.current || 0));
      set('profile-best-streak', String(streak.longest || 0));
      const heightM = (Number(settings.height) || 175) / 100;
      const bmi = (Number(settings.weight) || 70) / (heightM * heightM);
      set('profile-bmi', isFinite(bmi) ? bmi.toFixed(1) : '—');
    }
  };

  root.Profile = Profile;
})(typeof window !== 'undefined' ? window : this);
