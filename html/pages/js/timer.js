/**
 * timer.js — workout stopwatch + rest countdown
 *
 * CLASS EXPLANATION:
 * setInterval() runs every 1 second and updates the clock text.
 * We also save Date.now() so if the student switches tabs, we can
 * fix the time using document.visibilitychange.
 * Sounds: audio.js    Music: music.js (Punjabi mixes, no Spotify)
 */
(function (root) {
  'use strict';

  function beep(freq, seconds) {
    if (root.FTAudio) root.FTAudio.playBeep(freq, seconds);
  }

  function chime() {
    if (root.FTAudio) root.FTAudio.playCompletionChime();
  }

  function formatTime(totalSeconds) {
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    function pad(n) { return String(n).padStart(2, '0'); }
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  }

  var TimerManager = {
    stopwatch: {
      intervalId: null,
      elapsedSeconds: 0,
      isRunning: false,
      startTime: 0
    },
    rest: {
      intervalId: null,
      totalSeconds: 60,
      remainingSeconds: 60,
      isRunning: false,
      endTime: 0
    },

    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.bindControls();
      this.setupPageVisibility();
      this.restoreSessionState();
    },

    // If the tab was hidden, browsers slow down setInterval.
    // When the tab comes back, we recompute time from Date.now().
    setupPageVisibility: function () {
      var self = this;
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) return;
        if (self.stopwatch.isRunning && self.stopwatch.startTime) {
          self.stopwatch.elapsedSeconds = Math.floor((Date.now() - self.stopwatch.startTime) / 1000);
          self.updateStopwatchDisplay();
        }
        if (self.rest.isRunning && self.rest.endTime) {
          self.rest.remainingSeconds = Math.max(0, Math.ceil((self.rest.endTime - Date.now()) / 1000));
          self.updateRestDisplay();
          if (self.rest.remainingSeconds <= 0) {
            self.resetRest();
            chime();
          }
        }
      });
    },

    restoreSessionState: function () {
      if (!root.StorageManager) return;
      var state = root.StorageManager.load(root.StorageManager.KEYS.TIMER_STATE, null, true);
      if (state && state.isRunning && state.startTime) {
        this.stopwatch.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        this.stopwatch.startTime = state.startTime;
        this.startStopwatch(false);
      }
    },

    saveSessionState: function () {
      if (!root.StorageManager) return;
      if (this.stopwatch.isRunning) {
        root.StorageManager.save(root.StorageManager.KEYS.TIMER_STATE, {
          isRunning: true,
          startTime: this.stopwatch.startTime
        }, true);
      } else {
        root.StorageManager.remove(root.StorageManager.KEYS.TIMER_STATE, true);
      }
    },

    startStopwatch: function (isNew) {
      if (isNew === undefined) isNew = true;
      if (this.stopwatch.intervalId) clearInterval(this.stopwatch.intervalId);

      if (isNew) {
        this.stopwatch.startTime = Date.now() - (this.stopwatch.elapsedSeconds * 1000);
      }
      this.stopwatch.isRunning = true;
      this.saveSessionState();
      this.updateStopwatchButtons();

      if (isNew && root.FTAudio && root.FTAudio.playStartCue) root.FTAudio.playStartCue();
      else beep(523, 0.12);
      if (root.PunjabiPlayer) root.PunjabiPlayer.playWorkoutMix();

      var self = this;
      this.stopwatch.intervalId = setInterval(function () {
        self.stopwatch.elapsedSeconds = Math.floor((Date.now() - self.stopwatch.startTime) / 1000);
        self.updateStopwatchDisplay();
      }, 1000);
      this.updateStopwatchDisplay();
    },

    pauseStopwatch: function () {
      if (!this.stopwatch.isRunning) return;
      clearInterval(this.stopwatch.intervalId);
      this.stopwatch.intervalId = null;
      this.stopwatch.isRunning = false;
      this.saveSessionState();
      this.updateStopwatchButtons();
      if (root.PunjabiPlayer) root.PunjabiPlayer.pause();
    },

    stopStopwatch: function () {
      this.pauseStopwatch();
      var durationMins = Math.max(1, Math.round(this.stopwatch.elapsedSeconds / 60));
      if (this.stopwatch.elapsedSeconds < 10) {
        if (root.showToast) root.showToast('Timer is too short to save yet.', 'warning');
        return;
      }
      if (root.Workouts && root.Workouts.openModal) {
        var settings = root.StorageManager.getSettings();
        var calories = root.FTUtils
          ? root.FTUtils.estimateCalories(settings.weight, 'Strength', durationMins)
          : Math.round(durationMins * 7.5);
        root.Workouts.openModal({
          type: 'Gym',
          duration: durationMins,
          calories: calories,
          date: root.StorageManager.getTodayKey(),
          completed: true
        });
      }
    },

    resetStopwatch: function () {
      this.pauseStopwatch();
      this.stopwatch.elapsedSeconds = 0;
      this.stopwatch.startTime = 0;
      this.saveSessionState();
      this.updateStopwatchDisplay();
      this.updateStopwatchButtons();
    },

    updateStopwatchDisplay: function () {
      var el = document.getElementById('stopwatch-display');
      if (el) el.textContent = formatTime(this.stopwatch.elapsedSeconds);
    },

    updateStopwatchButtons: function () {
      var startBtn = document.getElementById('btn-stopwatch-start');
      var pauseBtn = document.getElementById('btn-stopwatch-pause');
      if (!startBtn || !pauseBtn) return;
      if (this.stopwatch.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
      } else {
        startBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        startBtn.textContent = this.stopwatch.elapsedSeconds > 0 ? 'Resume' : 'Start Workout';
      }
    },

    setRestDuration: function (seconds) {
      this.resetRest();
      this.rest.totalSeconds = seconds;
      this.rest.remainingSeconds = seconds;
      this.updateRestDisplay();
    },

    startRest: function () {
      if (this.rest.intervalId) clearInterval(this.rest.intervalId);
      this.rest.isRunning = true;
      this.rest.endTime = Date.now() + (this.rest.remainingSeconds * 1000);
      this.updateRestButtons();
      beep(440, 0.1);
      if (root.PunjabiPlayer) root.PunjabiPlayer.playRestMix();

      var self = this;
      this.rest.intervalId = setInterval(function () {
        if (self.rest.remainingSeconds > 0) {
          self.rest.remainingSeconds -= 1;
          self.updateRestDisplay();
          if (self.rest.remainingSeconds <= 3 && self.rest.remainingSeconds > 0) {
            beep(523, 0.1);
          }
        } else {
          self.resetRest();
          chime();
          if (root.showToast) root.showToast('Rest complete! Time for the next set.', 'success');
          if (self.stopwatch.isRunning && root.PunjabiPlayer) {
            root.PunjabiPlayer.playWorkoutMix();
          }
        }
      }, 1000);
      this.updateRestDisplay();
    },

    pauseRest: function () {
      clearInterval(this.rest.intervalId);
      this.rest.intervalId = null;
      this.rest.isRunning = false;
      this.updateRestButtons();
    },

    resetRest: function () {
      if (this.rest.intervalId) clearInterval(this.rest.intervalId);
      this.rest.intervalId = null;
      this.rest.isRunning = false;
      this.rest.remainingSeconds = this.rest.totalSeconds;
      this.updateRestDisplay();
      this.updateRestButtons();
    },

    updateRestDisplay: function () {
      var displayEl = document.getElementById('rest-display');
      var progressEl = document.getElementById('rest-progress-bar');
      if (displayEl) displayEl.textContent = formatTime(this.rest.remainingSeconds);
      if (progressEl) {
        var pct = Math.round((this.rest.remainingSeconds / this.rest.totalSeconds) * 100);
        progressEl.style.width = pct + '%';
      }
    },

    updateRestButtons: function () {
      var startBtn = document.getElementById('btn-rest-start');
      var pauseBtn = document.getElementById('btn-rest-pause');
      if (!startBtn || !pauseBtn) return;
      if (this.rest.isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-flex';
      } else {
        startBtn.style.display = 'inline-flex';
        pauseBtn.style.display = 'none';
        startBtn.textContent = this.rest.remainingSeconds < this.rest.totalSeconds ? 'Resume' : 'Start Rest';
      }
    },

    bindControls: function () {
      var self = this;

      var swStart = document.getElementById('btn-stopwatch-start');
      if (swStart) swStart.addEventListener('click', function () { self.startStopwatch(); });

      var swPause = document.getElementById('btn-stopwatch-pause');
      if (swPause) swPause.addEventListener('click', function () { self.pauseStopwatch(); });

      var swReset = document.getElementById('btn-stopwatch-reset');
      if (swReset) swReset.addEventListener('click', function () { self.resetStopwatch(); });

      var swStop = document.getElementById('btn-stopwatch-stop');
      if (swStop) swStop.addEventListener('click', function () { self.stopStopwatch(); });

      var swLog = document.getElementById('btn-stopwatch-log');
      if (swLog) {
        swLog.addEventListener('click', function () {
          var durationMins = Math.max(1, Math.round(self.stopwatch.elapsedSeconds / 60));
          if (root.Workouts && root.Workouts.openModal) {
            root.Workouts.openModal({
              type: 'Strength',
              duration: durationMins,
              calories: Math.round(durationMins * 7.5),
              date: root.StorageManager.getTodayKey(),
              completed: true
            });
          }
        });
      }

      var rStart = document.getElementById('btn-rest-start');
      if (rStart) rStart.addEventListener('click', function () { self.startRest(); });

      var rPause = document.getElementById('btn-rest-pause');
      if (rPause) rPause.addEventListener('click', function () { self.pauseRest(); });

      var rReset = document.getElementById('btn-rest-reset');
      if (rReset) rReset.addEventListener('click', function () { self.resetRest(); });

      document.querySelectorAll('[data-rest-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll('[data-rest-preset]').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          self.setRestDuration(parseInt(btn.getAttribute('data-rest-preset'), 10));
        });
      });

      var customRestBtn = document.getElementById('btn-custom-rest');
      if (customRestBtn) {
        customRestBtn.addEventListener('click', function () {
          var val = prompt('Enter custom rest duration in seconds (e.g. 75):', self.rest.totalSeconds);
          if (val === null) return;
          var secs = parseInt(val, 10);
          if (isNaN(secs) || secs < 5 || secs > 600) {
            alert('Please enter a duration between 5 and 600 seconds.');
            return;
          }
          document.querySelectorAll('[data-rest-preset]').forEach(function (b) { b.classList.remove('active'); });
          self.setRestDuration(secs);
        });
      }

      var soundToggle = document.getElementById('sound-toggle-btn');
      function updateSoundIcon() {
        if (!soundToggle || !root.StorageManager) return;
        var enabled = root.StorageManager.getSettings().soundEnabled !== false;
        soundToggle.textContent = enabled ? '🔊 Sound On' : '🔇 Muted';
        soundToggle.classList.toggle('active', enabled);
      }
      if (soundToggle) {
        updateSoundIcon();
        soundToggle.addEventListener('click', function () {
          var current = root.StorageManager.getSettings().soundEnabled;
          root.StorageManager.updateSettings({ soundEnabled: !current });
          updateSoundIcon();
          if (root.PunjabiPlayer && root.PunjabiPlayer.syncSound) root.PunjabiPlayer.syncSound();
          if (!current && root.FTAudio && root.FTAudio.test) root.FTAudio.test();
          else if (root.showToast) root.showToast(!current ? 'Sound on. Songs can play.' : 'Sound muted. Songs are paused.');
        });
      }

      var testSoundBtn = document.getElementById('btn-test-sound');
      if (testSoundBtn) {
        testSoundBtn.addEventListener('click', function () {
          if (root.StorageManager) root.StorageManager.updateSettings({ soundEnabled: true });
          updateSoundIcon();
          if (root.PunjabiPlayer && root.PunjabiPlayer.syncSound) root.PunjabiPlayer.syncSound();
          if (root.FTAudio && root.FTAudio.test) root.FTAudio.test();
          else chime();
        });
      }
    }
  };

  root.TimerManager = TimerManager;

})(typeof window !== 'undefined' ? window : this);
