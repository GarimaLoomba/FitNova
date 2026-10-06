/**
 * goals.js — progress bars and custom goals
 *
 * CLASS EXPLANATION:
 * System goals are calculated from workouts (distance, count).
 * Custom goals are a saved array: title, current, target.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'ft-custom-goals';

  const Goals = {
    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.renderSystemGoals();
      this.renderCustomGoals();
      this.bindModal();
    },

    getCustomGoals: function () {
      return root.StorageManager ? root.StorageManager.load(STORAGE_KEY, [
        {
          id: 'cg_1',
          title: 'Morning Run Consistency',
          category: 'Running',
          current: 4,
          target: 10,
          unit: 'runs',
          completed: false
        },
        {
          id: 'cg_2',
          title: 'Target Bodyweight Goal',
          category: 'Weight',
          current: 72.5,
          target: 70.0,
          unit: 'kg',
          completed: false
        }
      ]) : [];
    },

    saveCustomGoals: function (goals) {
      if (root.StorageManager) root.StorageManager.save(STORAGE_KEY, goals);
      this.renderCustomGoals();
    },

    /**
     * Render system default targets linked with live workout logs
     */
    renderSystemGoals: function () {
      if (!root.StorageManager) return;
      const workouts = root.StorageManager.getWorkouts();
      const dailyData = root.StorageManager.getDailyData();

      const totalMiles = workouts.reduce((sum, w) => sum + (Number(w.distance) || 0), 0);
      const totalSessions = workouts.length;
      const strengthLifts = workouts.filter(w => w.type === 'Strength').length;

      const systemTargets = {
        miles: { current: totalMiles, target: 80, unit: 'mi' },
        sessions: { current: totalSessions, target: 16, unit: 'sessions' },
        strength: { current: strengthLifts, target: 8, unit: 'lifts' },
        steps: { current: dailyData.steps, target: dailyData.stepsGoal, unit: 'steps' },
        water: { current: dailyData.water, target: dailyData.waterGoal, unit: 'glasses' }
      };

      Object.keys(systemTargets).forEach(key => {
        const item = systemTargets[key];
        const bar = document.querySelector(`[data-goal="${key}"]`);
        const copy = document.querySelector(`[data-goal-copy="${key}"]`);

        const pct = Math.min(100, Math.round((item.current / item.target) * 100));
        if (bar) {
          bar.style.width = `${pct}%`;
          bar.parentElement.setAttribute('aria-valuenow', pct);
        }
        if (copy) {
          const formattedCurrent = key === 'miles' ? item.current.toFixed(1) : item.current.toLocaleString();
          copy.textContent = `${formattedCurrent} / ${item.target.toLocaleString()} ${item.unit} (${pct}%)`;
        }
      });
    },

    /**
     * Render Custom Goals cards
     */
    renderCustomGoals: function () {
      const container = document.getElementById('custom-goals-grid');
      if (!container) return;

      const goals = this.getCustomGoals();
      if (!goals.length) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h4>No custom targets yet</h4>
            <p class="muted">Set a personal benchmark like "Bench 100kg" or "Run 50km this month".</p>
          </div>
        `;
        return;
      }

      container.innerHTML = goals.map(g => {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        const isDone = g.completed || pct >= 100;
        return `
          <article class="card ${isDone ? 'is-completed' : ''}">
            <div class="tracker-header">
              <span class="chip">${g.category || 'Personal'}</span>
              <span class="status-badge ${isDone ? 'badge-completed' : 'badge-planned'}">
                ${isDone ? '✓ Achieved' : `${pct}%`}
              </span>
            </div>
            <h3 style="margin:8px 0 4px;">${g.title}</h3>
            <p class="muted" style="font-size:13px;">Target: ${g.target} ${g.unit}</p>
            <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <span style="width:${pct}%;background:${isDone ? 'var(--accent)' : 'linear-gradient(90deg,var(--cyan),var(--accent))'}"></span>
            </div>
            <p class="help" style="margin: 8px 0 16px;">
              Current: <strong>${g.current} / ${g.target} ${g.unit}</strong>
            </p>
            <div class="tracker-actions" style="justify-content:space-between;align-items:center;">
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-xs" type="button" data-action="increment" data-id="${g.id}">+1 ${g.unit}</button>
                <button class="btn btn-ghost btn-xs" type="button" data-action="edit-val" data-id="${g.id}">Set</button>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-xs" type="button" data-action="toggle" data-id="${g.id}">
                  ${isDone ? '↺' : '✓ Done'}
                </button>
                <button class="btn btn-secondary btn-xs" type="button" data-action="delete" data-id="${g.id}">✕</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    },

    bindModal: function () {
      const goalsPage = this;
      const addBtn = document.getElementById('btn-add-custom-goal');

      if (addBtn) {
        addBtn.addEventListener('click', function () {
          const title = prompt('Enter goal title (e.g. Run 100 Miles, Hydrate consistently):');
          if (!title || !title.trim()) return;

          const targetStr = prompt('Enter target number (e.g. 50):', '50');
          if (targetStr === null) return;
          const target = parseFloat(targetStr);
          if (isNaN(target) || target <= 0) {
            alert('Please enter a positive numeric target.');
            return;
          }

          const unit = prompt('Enter unit (e.g. km, miles, workouts, kg):', 'km') || 'units';
          const category = prompt('Category (e.g. Cardio, Strength, Habit):', 'Fitness') || 'Fitness';

          const goals = goalsPage.getCustomGoals();
          goals.push({
            id: root.StorageManager ? root.StorageManager.generateId() : 'cg_' + Date.now(),
            title: title.trim(),
            category: category.trim(),
            current: 0,
            target: target,
            unit: unit.trim(),
            completed: false
          });

          goalsPage.saveCustomGoals(goals);
          if (root.showToast) root.showToast(`New goal "${title}" created!`, 'success');
        });
      }

      // Event delegation on custom goals container
      const container = document.getElementById('custom-goals-grid');
      if (container) {
        container.addEventListener('click', function (e) {
          const actionBtn = e.target.closest('[data-action]');
          if (!actionBtn) return;

          const action = actionBtn.getAttribute('data-action');
          const id = actionBtn.getAttribute('data-id');
          let goals = goalsPage.getCustomGoals();
          const goal = goals.find(g => g.id === id);
          if (!goal) return;

          if (action === 'increment') {
            goal.current = Math.min(goal.target, goal.current + 1);
            if (goal.current >= goal.target) goal.completed = true;
            goalsPage.saveCustomGoals(goals);
            if (root.showToast) root.showToast(`Progress logged: ${goal.current} / ${goal.target}`);
          } else if (action === 'edit-val') {
            const valStr = prompt(`Update current progress for "${goal.title}" (${goal.unit}):`, goal.current);
            if (valStr === null) return;
            const val = parseFloat(valStr);
            if (!isNaN(val) && val >= 0) {
              goal.current = val;
              if (goal.current >= goal.target) goal.completed = true;
              goalsPage.saveCustomGoals(goals);
              if (root.showToast) root.showToast('Goal progress updated');
            }
          } else if (action === 'toggle') {
            goal.completed = !goal.completed;
            goalsPage.saveCustomGoals(goals);
            if (root.showToast) root.showToast(goal.completed ? 'Goal marked as achieved!' : 'Goal marked in-progress');
          } else if (action === 'delete') {
            if (confirm(`Delete goal "${goal.title}"?`)) {
              goals = goals.filter(g => g.id !== id);
              goalsPage.saveCustomGoals(goals);
              if (root.showToast) root.showToast('Goal removed');
            }
          }
        });
      }
    }
  };

  root.Goals = Goals;

})(typeof window !== 'undefined' ? window : this);
