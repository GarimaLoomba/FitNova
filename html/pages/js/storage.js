/**
 * storage.js — save and load app data
 *
 * CLASS EXPLANATION:
 * localStorage can only save STRINGS. So we:
 *   JSON.stringify(object)  → save
 *   JSON.parse(text)        → load
 *
 * Keys look like "ft-workouts". The current user id is stored in the session,
 * so workouts belong to the person who logged in.
 *
 * IndexedDB (db.js) gets a copy when we save. If IndexedDB fails, the app
 * still works from localStorage.
 */
(function (root) {
  'use strict';

  var KEYS = {
    WORKOUTS: 'ft-workouts',
    USERS: 'ft-users',
    SESSION: 'ft-session',
    USER_SETTINGS: 'ft-user-settings',
    DAILY_TRACKER: 'ft-daily-tracker',
    WEIGHT_HISTORY: 'ft-weight-history',
    CUSTOM_GOALS: 'ft-custom-goals',
    TIMER_STATE: 'ft-timer-state',
    CUSTOM_ROUTES: 'ft-custom-routes'
  };

  var DEFAULT_SETTINGS = {
    name: 'Athlete',
    stepGoal: 10000,
    waterGoal: 8,
    waterGoalMl: 2000,
    calorieGoal: 2200,
    weeklyWorkoutGoal: 4,
    weightUnit: 'kg',
    distanceUnit: 'mi',
    waterUnit: 'ml',
    height: 175,
    weight: 70,
    soundEnabled: true,
    notificationsEnabled: false,
    waterReminder: true,
    workoutReminder: true,
    goalReminder: true,
    theme: 'dark'
  };

  function todayKey() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function read(key, fallback, useSession) {
    try {
      var box = useSession ? sessionStorage : localStorage;
      var raw = box.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value, useSession) {
    try {
      var box = useSession ? sessionStorage : localStorage;
      box.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('Could not save', key, err);
      return false;
    }
  }

  function copyToIndexedDB(storeName, value) {
    if (!root.FitnessDB || !value) return;
    root.FitnessDB.put(storeName, value).catch(function () {
      // IndexedDB is optional. localStorage already has the data.
    });
  }

  var StorageManager = {
    KEYS: KEYS,

    init: function () {
      this.applyTheme();
      if (root.FitnessDB) {
        return root.FitnessDB.openDatabase().then(function () { return true; }).catch(function () { return true; });
      }
      return Promise.resolve(true);
    },

    generateId: function () {
      return 'ft_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },

    getTodayKey: function () {
      return todayKey();
    },

    getUserId: function () {
      var session = this.getSessionUser();
      return session && session.userId ? session.userId : null;
    },

    save: function (key, value, useSession) {
      return write(key, value, useSession);
    },

    load: function (key, fallback, useSession) {
      return read(key, fallback, useSession);
    },

    remove: function (key, useSession) {
      try {
        (useSession ? sessionStorage : localStorage).removeItem(key);
      } catch (err) {}
    },

    getUsers: function () {
      return read(KEYS.USERS, []);
    },

    saveUsers: function (users) {
      write(KEYS.USERS, users);
      (users || []).forEach(function (user) {
        copyToIndexedDB('users', user);
      });
    },

    getSessionUser: function () {
      return read(KEYS.SESSION, null, true) || read(KEYS.SESSION, null, false);
    },

    setSessionUser: function (user, remember) {
      var payload = {
        userId: user.id || user.userId,
        name: user.name,
        email: user.email
      };
      write(KEYS.SESSION, payload, true);
      if (remember) write(KEYS.SESSION, payload, false);
      else localStorage.removeItem(KEYS.SESSION);
    },

    clearSession: function () {
      this.remove(KEYS.SESSION, true);
      this.remove(KEYS.SESSION, false);
    },

    getSettings: function () {
      var saved = read(KEYS.USER_SETTINGS, {});
      return Object.assign({}, DEFAULT_SETTINGS, saved);
    },

    updateSettings: function (partial) {
      var next = Object.assign({}, this.getSettings(), partial);
      write(KEYS.USER_SETTINGS, next);
      this.applyTheme();
      return next;
    },

    applyTheme: function () {
      document.documentElement.setAttribute('data-theme', this.getSettings().theme || 'dark');
    },

    getWorkouts: function () {
      var userId = this.getUserId();
      var all = read(KEYS.WORKOUTS, []);
      if (!userId) return all;
      return all.filter(function (w) { return !w.userId || w.userId === userId; });
    },

    saveWorkouts: function (workouts) {
      var userId = this.getUserId();
      var tagged = (workouts || []).map(function (w) {
        var copy = Object.assign({}, w);
        if (!copy.id) copy.id = StorageManager.generateId();
        if (userId) copy.userId = userId;
        return copy;
      });
      write(KEYS.WORKOUTS, tagged);
      tagged.forEach(function (w) { copyToIndexedDB('workouts', w); });
      return true;
    },

    getDailyTrackerMap: function () {
      return read(KEYS.DAILY_TRACKER, {});
    },

    getDailyData: function (dateStr) {
      var key = dateStr || todayKey();
      var map = this.getDailyTrackerMap();
      var settings = this.getSettings();
      var empty = {
        date: key,
        steps: 0,
        stepsGoal: settings.stepGoal,
        water: 0,
        waterGoal: settings.waterGoal,
        waterMl: 0,
        waterGoalMl: settings.waterGoalMl || settings.waterGoal * 250,
        calories: 0,
        caloriesGoal: settings.calorieGoal
      };
      var row = Object.assign({}, empty, map[key] || {});
      if (!row.waterMl) row.waterMl = (row.water || 0) * 250;
      return row;
    },

    updateDailyData: function (partial, dateStr) {
      var key = dateStr || todayKey();
      var map = this.getDailyTrackerMap();
      var row = Object.assign({}, this.getDailyData(key), partial, { date: key });
      if (row.steps < 0) row.steps = 0;
      if (row.water < 0) row.water = 0;
      if (row.waterMl < 0) row.waterMl = 0;
      if (partial && Object.prototype.hasOwnProperty.call(partial, 'waterMl')) {
        row.water = Math.round(row.waterMl / 250);
      } else if (partial && Object.prototype.hasOwnProperty.call(partial, 'water')) {
        row.waterMl = row.water * 250;
      }
      map[key] = row;
      write(KEYS.DAILY_TRACKER, map);
      return row;
    },

    addWaterMl: function (amount, dateStr) {
      var key = dateStr || todayKey();
      var current = this.getDailyData(key);
      return this.updateDailyData({ waterMl: (current.waterMl || 0) + Number(amount || 0) }, key);
    },

    getWaterHistory: function () {
      var map = this.getDailyTrackerMap();
      return Object.keys(map).map(function (date) {
        return { id: date, date: date, amount: map[date].waterMl || (map[date].water || 0) * 250 };
      });
    },

    calculateStreak: function () {
      var workouts = this.getWorkouts();
      var days = {};
      workouts.forEach(function (w) {
        if (w.date && w.completed !== false) days[String(w.date).slice(0, 10)] = true;
      });
      var check = new Date();
      var key = todayKey();
      if (!days[key]) {
        check.setDate(check.getDate() - 1);
        key = check.getFullYear() + '-' + String(check.getMonth() + 1).padStart(2, '0') + '-' + String(check.getDate()).padStart(2, '0');
        if (!days[key]) return 0;
      }
      var streak = 0;
      while (days[key]) {
        streak += 1;
        check = new Date(key);
        check.setDate(check.getDate() - 1);
        key = check.getFullYear() + '-' + String(check.getMonth() + 1).padStart(2, '0') + '-' + String(check.getDate()).padStart(2, '0');
      }
      return streak;
    },

    calculateWorkoutStreak: function () {
      var current = this.calculateStreak();
      return { current: current, longest: current };
    },

    weeklyConsistency: function () {
      var workouts = this.getWorkouts();
      var start = new Date();
      start.setDate(start.getDate() - 6);
      var count = 0;
      for (var i = 0; i < 7; i += 1) {
        var d = new Date(start);
        d.setDate(start.getDate() + i);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        var hit = workouts.some(function (w) { return String(w.date).slice(0, 10) === key; });
        if (hit) count += 1;
      }
      return count;
    },

    getPersonalRecords: function () {
      var workouts = this.getWorkouts();
      var bestTime = 0;
      var bestCal = 0;
      var bestDist = 0;
      var bestName = '—';
      workouts.forEach(function (w) {
        if ((w.duration || 0) > bestTime) bestTime = w.duration;
        if ((w.calories || 0) > bestCal) bestCal = w.calories;
        if ((w.distance || 0) > bestDist) {
          bestDist = w.distance;
          bestName = w.name || w.type;
        }
      });
      var mostSteps = 0;
      var map = this.getDailyTrackerMap();
      Object.keys(map).forEach(function (date) {
        if ((map[date].steps || 0) > mostSteps) mostSteps = map[date].steps;
      });
      return {
        longestWorkout: { label: bestTime ? bestTime + ' min' : '—' },
        highestCalories: { label: bestCal ? bestCal + ' kcal' : '—' },
        longestDistance: { label: bestDist ? bestDist.toFixed(1) + ' mi · ' + bestName : '—' },
        fastest5k: { label: '—' },
        mostSteps: { label: mostSteps ? mostSteps.toLocaleString() + ' steps' : '—' }
      };
    },

    refreshPersonalRecords: function () {
      return { records: this.getPersonalRecords(), unlocked: [] };
    },

    exportAll: function () {
      return {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        profile: this.getSessionUser(),
        settings: this.getSettings(),
        workouts: this.getWorkouts(),
        weightRecords: read(KEYS.WEIGHT_HISTORY, []),
        goals: read(KEYS.CUSTOM_GOALS, []),
        dailyTracker: this.getDailyTrackerMap()
      };
    },

    importAll: function (data) {
      if (!data || typeof data !== 'object') throw new Error('Invalid file');
      if (data.settings) write(KEYS.USER_SETTINGS, data.settings);
      if (Array.isArray(data.workouts)) this.saveWorkouts(data.workouts);
      if (Array.isArray(data.weightRecords)) write(KEYS.WEIGHT_HISTORY, data.weightRecords);
      if (Array.isArray(data.weightHistory)) write(KEYS.WEIGHT_HISTORY, data.weightHistory);
      if (Array.isArray(data.goals)) write(KEYS.CUSTOM_GOALS, data.goals);
      if (Array.isArray(data.customGoals)) write(KEYS.CUSTOM_GOALS, data.customGoals);
      if (data.dailyTracker) write(KEYS.DAILY_TRACKER, data.dailyTracker);
      this.applyTheme();
    },

    loadDemoData: function () {
      var userId = this.getUserId();
      var workouts = [];
      var types = ['Running', 'Strength', 'Cycling', 'Yoga'];
      for (var i = 6; i >= 0; i -= 1) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        workouts.push({
          id: this.generateId(),
          userId: userId,
          name: types[i % 4] + ' session',
          type: types[i % 4],
          duration: 30 + i,
          distance: i % 2 === 0 ? 3.2 : 0,
          calories: 250 + i * 10,
          date: key,
          notes: '',
          exercises: [],
          completed: true
        });
      }
      this.saveWorkouts(workouts);
    },

    clearAll: function (clearAuth) {
      localStorage.removeItem(KEYS.WORKOUTS);
      localStorage.removeItem(KEYS.DAILY_TRACKER);
      localStorage.removeItem(KEYS.WEIGHT_HISTORY);
      localStorage.removeItem(KEYS.CUSTOM_GOALS);
      localStorage.removeItem(KEYS.USER_SETTINGS);
      if (clearAuth) {
        localStorage.removeItem(KEYS.USERS);
        this.clearSession();
      }
    }
  };

  root.StorageManager = StorageManager;
})(typeof window !== 'undefined' ? window : this);
