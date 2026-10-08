/**
 * settings.js — save preferences, export JSON, import JSON, reset
 *
 * CLASS EXPLANATION:
 * Export: JSON.stringify → Blob → fake download link.
 * Import: FileReader reads the chosen .json file → JSON.parse → storage.
 */
(function (root) {
  'use strict';

  const Settings = {
    init: function () {
      this.populateForm();
      this.bindForms();
      this.bindDataPortability();
      this.bindReset();
      this.bindDemo();
    },

    populateForm: function () {
      if (!root.StorageManager) return;
      const settings = root.StorageManager.getSettings();

      const nameInput = document.getElementById('setting-name');
      const heightInput = document.getElementById('setting-height');
      const weightInput = document.getElementById('setting-weight');
      const stepInput = document.getElementById('setting-steps');
      const waterInput = document.getElementById('setting-water');
      const calInput = document.getElementById('setting-calories');
      const soundCheck = document.getElementById('setting-sound');
      const notifyCheck = document.getElementById('setting-notifications');

      if (nameInput) nameInput.value = settings.name || '';
      if (heightInput) heightInput.value = settings.height || 175;
      if (weightInput) weightInput.value = settings.weight || 70;
      if (stepInput) stepInput.value = settings.stepGoal || 10000;
      if (waterInput) waterInput.value = settings.waterGoal || 8;
      if (calInput) calInput.value = settings.calorieGoal || 2200;
      if (soundCheck) soundCheck.checked = Boolean(settings.soundEnabled);
      if (notifyCheck) notifyCheck.checked = Boolean(settings.notificationsEnabled);

      const weekly = document.getElementById('setting-weekly');
      const distUnit = document.getElementById('setting-distance-unit');
      const weightUnit = document.getElementById('setting-weight-unit');
      const waterUnit = document.getElementById('setting-water-unit');
      const theme = document.getElementById('setting-theme');
      const waterRem = document.getElementById('setting-water-reminder');
      const workoutRem = document.getElementById('setting-workout-reminder');
      const goalRem = document.getElementById('setting-goal-reminder');
      if (weekly) weekly.value = settings.weeklyWorkoutGoal || 4;
      if (distUnit) distUnit.value = settings.distanceUnit || 'mi';
      if (weightUnit) weightUnit.value = settings.weightUnit || 'kg';
      if (waterUnit) waterUnit.value = settings.waterUnit || 'ml';
      if (theme) theme.value = settings.theme || 'dark';
      if (waterRem) waterRem.checked = settings.waterReminder !== false;
      if (workoutRem) workoutRem.checked = settings.workoutReminder !== false;
      if (goalRem) goalRem.checked = settings.goalReminder !== false;
    },

    bindForms: function () {
      const form = document.getElementById('settings-form');
      if (!form) return;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const updates = {
          name: document.getElementById('setting-name').value.trim() || 'Athlete',
          height: parseFloat(document.getElementById('setting-height').value) || 175,
          weight: parseFloat(document.getElementById('setting-weight').value) || 70,
          stepGoal: parseInt(document.getElementById('setting-steps').value, 10) || 10000,
          waterGoal: parseInt(document.getElementById('setting-water').value, 10) || 8,
          waterGoalMl: (parseInt(document.getElementById('setting-water').value, 10) || 8) * 250,
          calorieGoal: parseInt(document.getElementById('setting-calories').value, 10) || 2200,
          weeklyWorkoutGoal: parseInt((document.getElementById('setting-weekly') || {}).value, 10) || 4,
          distanceUnit: (document.getElementById('setting-distance-unit') || {}).value || 'mi',
          weightUnit: (document.getElementById('setting-weight-unit') || {}).value || 'kg',
          waterUnit: (document.getElementById('setting-water-unit') || {}).value || 'ml',
          theme: (document.getElementById('setting-theme') || {}).value || 'dark',
          soundEnabled: document.getElementById('setting-sound').checked,
          notificationsEnabled: document.getElementById('setting-notifications').checked,
          waterReminder: (document.getElementById('setting-water-reminder') || { checked: true }).checked,
          workoutReminder: (document.getElementById('setting-workout-reminder') || { checked: true }).checked,
          goalReminder: (document.getElementById('setting-goal-reminder') || { checked: true }).checked
        };

        root.StorageManager.updateSettings(updates);
        const session = root.StorageManager.getSessionUser();
        if (session) {
          session.name = updates.name;
          root.StorageManager.setSessionUser(session, true);
        }
        if (root.showToast) root.showToast('Settings saved successfully', 'success');
      });

      const testSound = document.getElementById('btn-test-sound');
      if (testSound) {
        testSound.addEventListener('click', function () {
          const soundCheck = document.getElementById('setting-sound');
          if (soundCheck) soundCheck.checked = true;
          root.StorageManager.updateSettings({ soundEnabled: true });
          if (root.FTAudio && root.FTAudio.test) root.FTAudio.test();
        });
      }
    },

    /**
     * Export JSON file / Import JSON file
     */
    bindDataPortability: function () {
      // 1. EXPORT TO JSON
      const exportBtn = document.getElementById('btn-export-data');
      if (exportBtn) {
        exportBtn.addEventListener('click', function () {
          const exportPayload = root.StorageManager.exportAll
            ? root.StorageManager.exportAll()
            : {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            settings: root.StorageManager.getSettings(),
            workouts: root.StorageManager.getWorkouts(),
            dailyTracker: root.StorageManager.getDailyTrackerMap(),
            weightHistory: root.StorageManager.load(root.StorageManager.KEYS.WEIGHT_HISTORY, []),
            customGoals: root.StorageManager.load(root.StorageManager.KEYS.CUSTOM_GOALS, []),
            customRoutes: root.StorageManager.load('ft-custom-routes', [])
          };

          const jsonString = JSON.stringify(exportPayload, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `fitness-data-${root.StorageManager.getTodayKey()}.json`;
          document.body.appendChild(a);
          a.click();

          setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);

          if (root.showToast) root.showToast('Data exported to fitness-data.json', 'success');
        });
      }

      // 2. IMPORT FROM JSON
      const importInput = document.getElementById('input-import-file');
      const importBtn = document.getElementById('btn-import-trigger');

      if (importBtn && importInput) {
        importBtn.addEventListener('click', function () {
          importInput.click();
        });

        importInput.addEventListener('change', function (event) {
          const file = event.target.files[0];
          if (!file) return;

          const reader = new FileReader();

          reader.onload = function (e) {
            try {
              const imported = JSON.parse(e.target.result);

              if (!imported || typeof imported !== 'object') {
                throw new Error('Imported file does not contain a valid JSON object.');
              }

              if (confirm('Importing will replace this profile’s fitness records on this device. Continue?')) {
                if (root.StorageManager.importAll) {
                  root.StorageManager.importAll(imported);
                } else {
                  if (imported.settings) root.StorageManager.save(root.StorageManager.KEYS.USER_SETTINGS, imported.settings);
                  if (Array.isArray(imported.workouts)) root.StorageManager.saveWorkouts(imported.workouts);
                }
                alert('Fitness data successfully imported. The page will now refresh.');
                window.location.reload();
              }
            } catch (err) {
              console.error('[Import] Failed to parse JSON file:', err);
              alert('Failed to import file. Ensure you uploaded a valid fitness-data.json file.');
            } finally {
              importInput.value = ''; // Reset input
            }
          };

          reader.readAsText(file);
        });
      }
    },

    /**
     * Type RESET to confirm wipe
     */
    bindReset: function () {
      const resetBtn = document.getElementById('btn-reset-all');
      if (!resetBtn) return;

      resetBtn.addEventListener('click', function () {
        const promptAnswer = prompt('WARNING: This will permanently delete all your workouts, weight logs, step history, and custom goals.\n\nType "RESET" to confirm:');
        if (promptAnswer === 'RESET') {
          root.StorageManager.clearAll(false); // preserves login credentials
          alert('All fitness data has been reset to defaults.');
          window.location.href = 'workout.html';
        } else if (promptAnswer !== null) {
          alert('Reset cancelled. Word did not match "RESET".');
        }
      });
    },

    bindDemo: function () {
      const demoBtn = document.getElementById('btn-load-demo');
      if (!demoBtn) return;
      demoBtn.addEventListener('click', function () {
        if (!confirm('Load demo data? This adds sample workouts, weight, water, steps, and goals for the current profile.')) return;
        if (root.StorageManager.getWorkouts().length && !confirm('You already have workouts. Mix demo data with existing records?')) return;
        root.StorageManager.loadDemoData();
        if (root.showToast) root.showToast('Demo data loaded.', 'success');
        window.location.reload();
      });
    }
  };

  root.Settings = Settings;

  (root.onAppReady || function (fn) { document.addEventListener('DOMContentLoaded', fn); })(function () {
    if (document.getElementById('settings-form')) {
      Settings.init();
    }
  });

})(typeof window !== 'undefined' ? window : this);
