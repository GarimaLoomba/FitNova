/**
 * dashboard.js — today's steps, water, calories, streak, and quick actions
 *
 * CLASS EXPLANATION:
 * renderAll() reads StorageManager and writes numbers into the HTML.
 * Button clicks change the numbers, save them, then renderAll() again.
 */
(function (root) {
  'use strict';

  function findOne(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function findAll(selector, parent) {
    return Array.from((parent || document).querySelectorAll(selector));
  }

  const Dashboard = {
    init: function () {
      this.renderAll();
      this.bindEvents();
    },

    renderAll: function () {
      if (!root.StorageManager) return;
      const data = root.StorageManager.getDailyData();
      const streak = root.StorageManager.calculateStreak();
      const workoutStreak = root.StorageManager.calculateWorkoutStreak
        ? root.StorageManager.calculateWorkoutStreak()
        : { current: streak, longest: streak };

      this.renderStreak(workoutStreak.current || streak);
      this.renderSteps(data);
      this.renderWater(data);
      this.renderCalories(data);
      this.renderDailyCompletion(data);
      this.renderTodayActivity(data);
      this.renderGoalStrip(data, workoutStreak);
      this.renderPersonalRecords();
      this.renderCalendar();
      this.renderActivity();
      this.renderTotals();
    },

    renderStreak: function (streak) {
      const badge = findOne('#streak-badge');
      if (!badge) return;
      if (streak > 0) {
        badge.innerHTML = `<span class="streak-flame" aria-hidden="true">🔥</span> <strong>${streak} Day Streak</strong>`;
        badge.classList.add('active-streak');
      } else {
        badge.innerHTML = `<span class="streak-flame" aria-hidden="true">⚡</span> <span>Start your streak today</span>`;
        badge.classList.remove('active-streak');
      }
    },

    renderSteps: function (data) {
      const stepCount = data.steps || 0;
      const stepGoal = data.stepsGoal || 10000;
      const stepPercent = Math.min(100, Math.round((stepCount / stepGoal) * 100));

      const stepCountLabel = findOne('[data-step-current]');
      const stepGoalLabel = findOne('[data-step-goal]');
      const stepPercentLabel = findOne('[data-step-pct]');
      const stepBar = findOne('[data-step-bar]');

      if (stepCountLabel) stepCountLabel.textContent = stepCount.toLocaleString();
      if (stepGoalLabel) stepGoalLabel.textContent = stepGoal.toLocaleString();
      if (stepPercentLabel) stepPercentLabel.textContent = stepPercent + '%';
      if (stepBar) {
        stepBar.style.width = stepPercent + '%';
        stepBar.setAttribute('aria-valuenow', stepPercent);
      }
    },

    renderWater: function (data) {
      const glasses = data.water || 0;
      const goal = data.waterGoal || 8;
      const currentMl = data.waterMl || glasses * 250;
      const goalMl = data.waterGoalMl || goal * 250;
      const percentage = Math.min(100, Math.round((currentMl / Math.max(1, goalMl)) * 100));

      const countEl = findOne('[data-water-current]');
      const goalEl = findOne('[data-water-goal]');
      const mlEl = findOne('[data-water-ml]');
      const pctEl = findOne('[data-water-pct]');
      const barEl = findOne('[data-water-bar]');
      const visualGrid = findOne('[data-water-visual]');

      if (countEl) countEl.textContent = glasses;
      if (goalEl) goalEl.textContent = goal;
      if (mlEl) mlEl.textContent = `${currentMl} / ${goalMl} ml`;
      if (pctEl) pctEl.textContent = `${percentage}%`;
      if (barEl) {
        barEl.style.width = `${percentage}%`;
        barEl.setAttribute('aria-valuenow', percentage);
      }

      if (visualGrid) {
        const totalIcons = Math.max(goal, glasses);
        visualGrid.innerHTML = Array.from({ length: totalIcons }).map(function (_, index) {
          const isFilled = index < glasses;
          return `<button type="button" class="water-glass ${isFilled ? 'filled' : ''}" data-glass-index="${index + 1}" title="Glass ${index + 1}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 2h14l-2 18a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 2z"/>
              <path d="M6 7h12"/>
            </svg>
          </button>`;
        }).join('');
      }
    },

    renderCalories: function (data) {
      const consumed = data.calories || 0;
      const goal = data.caloriesGoal || 2200;
      const remaining = goal - consumed;
      const percentage = Math.min(100, Math.round((consumed / goal) * 100));

      const consumedEl = findOne('[data-cal-consumed]');
      const goalEl = findOne('[data-cal-goal]');
      const remEl = findOne('[data-cal-remaining]');
      const pctEl = findOne('[data-cal-pct]');
      const barEl = findOne('[data-cal-bar]');

      if (consumedEl) consumedEl.textContent = consumed.toLocaleString();
      if (goalEl) goalEl.textContent = goal.toLocaleString();
      if (pctEl) pctEl.textContent = `${percentage}%`;
      if (barEl) {
        barEl.style.width = `${percentage}%`;
        barEl.setAttribute('aria-valuenow', percentage);
      }

      if (remEl) {
        if (remaining >= 0) {
          remEl.textContent = `${remaining.toLocaleString()} kcal left`;
          remEl.className = 'delta cal-positive';
        } else {
          remEl.textContent = `${Math.abs(remaining).toLocaleString()} kcal over goal`;
          remEl.className = 'delta cal-warning';
        }
      }
    },

    // Daily score = steps 40% + water 30% + calories 15% + workout today 15%
    renderDailyCompletion: function (data) {
      const todayKey = root.StorageManager.getTodayKey();
      const workouts = root.StorageManager.getWorkouts();
      const hasWorkoutToday = workouts.some(function (w) { return w.date === todayKey; });

      const stepRatio = Math.min(1, (data.steps || 0) / (data.stepsGoal || 10000));
      const waterRatio = Math.min(1, (data.water || 0) / (data.waterGoal || 8));
      const calRatio = Math.min(1, (data.calories || 0) / (data.caloriesGoal || 2200));
      const workoutRatio = hasWorkoutToday ? 1.0 : 0.0;

      // Weighted overall calculation (0 - 100)
      const overall = Math.round(
        (stepRatio * 40) +
        (waterRatio * 30) +
        (calRatio * 15) +
        (workoutRatio * 15)
      );

      const overallEl = findOne('[data-daily-overall]');
      const ringEl = findOne('[data-daily-ring]');
      const labelEl = findOne('[data-daily-label]');

      if (overallEl) overallEl.textContent = `${overall}%`;
      if (ringEl) {
        ringEl.style.background = `conic-gradient(var(--accent) 0% ${overall}%, var(--surface-3) ${overall}% 100%)`;
      }
      if (labelEl) {
        labelEl.textContent = overall >= 100
          ? 'Daily targets completed! Outstanding work.'
          : `${overall}% of your daily targets achieved today`;
      }
    },

    renderTodayActivity: function (data) {
      const workouts = root.StorageManager.getWorkouts();
      const today = root.StorageManager.getTodayKey();
      const todaysWorkouts = workouts.filter(function (workout) {
        return String(workout.date).slice(0, 10) === today && workout.completed !== false;
      });
      const distance = todaysWorkouts.reduce(function (total, workout) { return total + (Number(workout.distance) || 0); }, 0);
      const caloriesBurned = todaysWorkouts.reduce(function (total, workout) { return total + (Number(workout.calories) || 0); }, 0);
      const minutes = todaysWorkouts.reduce(function (total, workout) { return total + (Number(workout.duration) || 0); }, 0);
      const settings = root.StorageManager.getSettings();
      function writeText(selector, value) {
        const element = findOne(selector);
        if (element) element.textContent = value;
      }
      writeText('[data-today-steps]', (data.steps || 0).toLocaleString());
      writeText('[data-today-distance]', root.FTUtils ? root.FTUtils.formatDistance(distance, settings.distanceUnit === 'km' ? 'km' : 'mi') : distance.toFixed(1) + ' mi');
      writeText('[data-today-calories]', caloriesBurned.toLocaleString());
      writeText('[data-today-minutes]', minutes + ' min');
      writeText('[data-today-water]', root.FTUtils ? root.FTUtils.formatWater(data.waterMl || 0, settings.waterUnit) : ((data.waterMl || 0) / 1000).toFixed(1) + ' L');
      writeText('[data-today-workouts]', String(todaysWorkouts.length));
    },

    renderGoalStrip: function (data, workoutStreak) {
      const settings = root.StorageManager.getSettings();
      const weekly = root.StorageManager.weeklyConsistency ? root.StorageManager.weeklyConsistency() : 0;
      const weeklyGoal = Number(settings.weeklyWorkoutGoal) || 4;
      const setBar = function (selector, current, goal) {
        const bar = findOne(selector);
        if (!bar) return;
        const percent = Math.min(100, Math.round((current / Math.max(1, goal)) * 100));
        bar.style.width = percent + '%';
      };
      const setText = function (selector, text) {
        const label = findOne(selector);
        if (label) label.textContent = text;
      };
      setBar('[data-goal-bar="steps"]', data.steps || 0, data.stepsGoal || 10000);
      setBar('[data-goal-bar="water"]', data.waterMl || 0, data.waterGoalMl || 2000);
      setBar('[data-goal-bar="weekly"]', weekly, weeklyGoal);
      setText('[data-goal-copy="dash-steps"]', (data.steps || 0).toLocaleString() + ' / ' + (data.stepsGoal || 10000).toLocaleString());
      setText('[data-goal-copy="dash-water"]', ((data.waterMl || 0) / 1000).toFixed(1) + ' L / ' + ((data.waterGoalMl || 2000) / 1000).toFixed(1) + ' L');
      setText('[data-goal-copy="dash-weekly"]', weekly + ' / ' + weeklyGoal + ' workouts');
      setText('[data-goal-copy="dash-streak"]', (workoutStreak.current || 0) + ' day streak · best ' + (workoutStreak.longest || 0));
    },

    renderPersonalRecords: function () {
      const records = root.StorageManager.getPersonalRecords ? root.StorageManager.getPersonalRecords() : {};
      const map = {
        longest: records.longestWorkout,
        calories: records.highestCalories,
        distance: records.longestDistance,
        fivek: records.fastest5k,
        steps: records.mostSteps
      };
      Object.keys(map).forEach(function (key) {
        const el = findOne('[data-pr="' + key + '"]');
        if (el) el.textContent = (map[key] && map[key].label) || '—';
      });
    },

    renderTotals: function () {
      const items = root.StorageManager.getWorkouts();
      const sum = items.reduce(function (acc, item) {
        acc.distance += Number(item.distance) || 0;
        acc.duration += Number(item.duration) || 0;
        acc.calories += Number(item.calories) || 0;
        acc.count += 1;
        return acc;
      }, { distance: 0, duration: 0, calories: 0, count: 0 });
      const settings = root.StorageManager.getSettings();
      findAll('[data-stat="distance"]').forEach(function (el) {
        el.textContent = settings.distanceUnit === 'km'
          ? (root.FTUtils.milesToKm(sum.distance)).toFixed(1)
          : sum.distance.toFixed(1);
      });
      findAll('[data-stat="duration"]').forEach(function (el) {
        el.textContent = root.FTUtils ? root.FTUtils.formatDuration(sum.duration) : sum.duration + 'm';
      });
      findAll('[data-stat="calories"]').forEach(function (el) { el.textContent = Math.round(sum.calories); });
      findAll('[data-stat="workouts"]').forEach(function (el) { el.textContent = sum.count; });
    },

    renderCalendar: function () {
      const node = findOne('#calendar');
      if (!node) return;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const workouts = root.StorageManager.getWorkouts();
      const byDay = {};
      workouts.forEach(function (item) {
        if (!item.date) return;
        const parts = String(item.date).split('-');
        if (Number(parts[0]) !== year || Number(parts[1]) !== month + 1) return;
        const day = Number(parts[2]);
        byDay[day] = (byDay[day] || 0) + 1;
      });
      const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let html = labels.map(function (d) { return '<div class="cal-label">' + d + '</div>'; }).join('');
      for (let i = 0; i < first.getDay(); i += 1) html += '<div class="cal-day empty"></div>';
      for (let day = 1; day <= last.getDate(); day += 1) {
        let classes = 'cal-day';
        if (day === now.getDate()) classes += ' today';
        if (byDay[day]) classes += ' has-workout';
        html += '<div class="' + classes + '"><strong>' + day + '</strong>' +
          (byDay[day] ? '<p class="muted">' + byDay[day] + ' session' + (byDay[day] > 1 ? 's' : '') + '</p>' : '') +
          '</div>';
      }
      node.innerHTML = html;
    },

    renderActivity: function () {
      const list = findOne('#activity-list');
      if (!list) return;
      const items = root.StorageManager.getWorkouts().slice().sort(function (a, b) {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }).slice(0, 5);
      if (!items.length) {
        list.innerHTML = '<div class="empty-state">No workouts yet.<br>Start your first workout to begin tracking.</div>';
        return;
      }
      const safeText = root.FTUtils ? root.FTUtils.escapeHtml : function (value) { return value; };
      list.innerHTML = items.map(function (workout) {
        return '<div class="activity-item"><div><strong>' + safeText(workout.type) + '</strong><p class="muted">' +
          safeText(workout.date) + '</p></div><div>' + (workout.distance || 0) + ' · ' +
          (root.FTUtils ? root.FTUtils.formatDuration(workout.duration) : workout.duration + 'm') + '</div></div>';
      }).join('');
    },

    bindEvents: function () {
      const dashboard = this;

      function showMessage(message) {
        if (root.showToast) root.showToast(message);
      }

      function saveToday(changes) {
        root.StorageManager.updateDailyData(changes);
        dashboard.renderAll();
      }

      // +500, +1000, and -500 step buttons.
      findAll('[data-step-add]').forEach(function (button) {
        button.addEventListener('click', function () {
          const stepChange = Number(button.getAttribute('data-step-add'));
          const currentSteps = root.StorageManager.getDailyData().steps || 0;
          saveToday({ steps: Math.max(0, currentSteps + stepChange) });
          showMessage((stepChange > 0 ? '+' : '') + stepChange.toLocaleString() + ' steps');
        });
      });

      const customStepsButton = findOne('[data-step-custom]');
      if (customStepsButton) {
        customStepsButton.addEventListener('click', function () {
          const currentSteps = root.StorageManager.getDailyData().steps || 0;
          const typedSteps = prompt('Enter today’s total steps:', currentSteps);
          if (typedSteps === null) return;
          const stepCount = parseInt(typedSteps, 10);
          if (isNaN(stepCount) || stepCount < 0 || stepCount > 150000) {
            alert('Please enter a valid step count between 0 and 150,000.');
            return;
          }
          saveToday({ steps: stepCount });
          showMessage('Steps updated to ' + stepCount.toLocaleString());
        });
      }

      const resetStepsButton = findOne('[data-step-reset]');
      if (resetStepsButton) {
        resetStepsButton.addEventListener('click', function () {
          if (confirm('Reset today’s step count to 0?')) {
            saveToday({ steps: 0 });
            showMessage('Steps reset to 0');
          }
        });
      }

      findAll('[data-water-add-ml]').forEach(function (button) {
        button.addEventListener('click', function () {
          const waterAmount = Number(button.getAttribute('data-water-add-ml'));
          if (root.StorageManager.addWaterMl) root.StorageManager.addWaterMl(waterAmount);
          else {
            const todayData = root.StorageManager.getDailyData();
            root.StorageManager.updateDailyData({ waterMl: (todayData.waterMl || 0) + waterAmount });
          }
          dashboard.renderAll();
          showMessage('+' + waterAmount + ' ml water');
        });
      });

      const customWaterButton = findOne('[data-water-custom]');
      if (customWaterButton) {
        customWaterButton.addEventListener('click', function () {
          const typedWater = prompt('Enter water amount in ml:', '300');
          if (typedWater === null) return;
          const waterAmount = parseInt(typedWater, 10);
          if (isNaN(waterAmount) || waterAmount <= 0 || waterAmount > 5000) {
            alert('Enter a water amount between 1 and 5000 ml.');
            return;
          }
          if (root.StorageManager.addWaterMl) root.StorageManager.addWaterMl(waterAmount);
          dashboard.renderAll();
          showMessage('+' + waterAmount + ' ml water');
        });
      }

      const addGlassButton = findOne('[data-water-add]');
      if (addGlassButton) {
        addGlassButton.addEventListener('click', function () {
          if (root.StorageManager.addWaterMl) root.StorageManager.addWaterMl(250);
          else {
            const currentGlasses = root.StorageManager.getDailyData().water || 0;
            root.StorageManager.updateDailyData({ water: currentGlasses + 1 });
          }
          dashboard.renderAll();
          showMessage('Hydration logged: +1 Glass (250ml)');
        });
      }

      const removeGlassButton = findOne('[data-water-remove]');
      if (removeGlassButton) {
        removeGlassButton.addEventListener('click', function () {
          const today = root.StorageManager.getDailyData();
          const currentMl = today.waterMl || (today.water || 0) * 250;
          if (currentMl <= 0) return;
          saveToday({ waterMl: Math.max(0, currentMl - 250) });
          showMessage('Water removed (-1 Glass)');
        });
      }

      const resetWaterButton = findOne('[data-water-reset]');
      if (resetWaterButton) {
        resetWaterButton.addEventListener('click', function () {
          if (confirm('Reset today’s water intake to 0?')) {
            saveToday({ water: 0, waterMl: 0 });
            showMessage('Water intake reset to 0');
          }
        });
      }

      const waterGlasses = findOne('[data-water-visual]');
      if (waterGlasses) {
        waterGlasses.addEventListener('click', function (event) {
          const glassButton = event.target.closest('[data-glass-index]');
          if (!glassButton) return;
          const glassNumber = Number(glassButton.getAttribute('data-glass-index'));
          saveToday({ water: glassNumber });
          showMessage('Water set to ' + glassNumber + ' glasses');
        });
      }

      findAll('[data-cal-add]').forEach(function (button) {
        button.addEventListener('click', function () {
          const calorieChange = Number(button.getAttribute('data-cal-add'));
          const currentCalories = root.StorageManager.getDailyData().calories || 0;
          saveToday({ calories: Math.max(0, currentCalories + calorieChange) });
          showMessage('+' + calorieChange + ' kcal added');
        });
      });

      const customCaloriesButton = findOne('[data-cal-custom]');
      if (customCaloriesButton) {
        customCaloriesButton.addEventListener('click', function () {
          const typedCalories = prompt('Enter calories to add (e.g. 450):');
          if (typedCalories === null) return;
          const calorieAmount = parseInt(typedCalories, 10);
          if (isNaN(calorieAmount) || calorieAmount <= 0 || calorieAmount > 10000) {
            alert('Please enter a realistic positive calorie number.');
            return;
          }
          const currentCalories = root.StorageManager.getDailyData().calories || 0;
          saveToday({ calories: currentCalories + calorieAmount });
          showMessage('+' + calorieAmount + ' kcal added');
        });
      }

      const resetCaloriesButton = findOne('[data-cal-reset]');
      if (resetCaloriesButton) {
        resetCaloriesButton.addEventListener('click', function () {
          if (confirm('Reset today’s calorie intake to 0?')) {
            saveToday({ calories: 0 });
            showMessage('Calories reset to 0');
          }
        });
      }

      document.addEventListener('click', function (event) {
        const quickButton = event.target.closest('[data-quick]');
        if (!quickButton) return;
        const actionName = quickButton.getAttribute('data-quick');
        if (actionName === 'log' && root.Workouts && typeof root.Workouts.openModal === 'function') {
          root.Workouts.openModal();
        }
        if (actionName === 'water' && root.StorageManager.addWaterMl) {
          root.StorageManager.addWaterMl(250);
          dashboard.renderAll();
          showMessage('+250 ml water');
        }
        if (actionName === 'steps') {
          const currentSteps = root.StorageManager.getDailyData().steps || 0;
          saveToday({ steps: currentSteps + 1000 });
        }
      });
    }
  };

  root.Dashboard = Dashboard;

})(typeof window !== 'undefined' ? window : this);
