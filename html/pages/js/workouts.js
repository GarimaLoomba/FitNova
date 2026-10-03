/**
 * workouts.js — create, read, update, delete workouts
 *
 * CLASS EXPLANATION:
 * Workouts are an array in localStorage. We use filter(), sort(), and find()
 * to search the list. The form saves one object, then we call saveWorkouts().
 */
(function (root) {
  'use strict';

  // Debounce helper
  function debounce(func, wait = 200) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const Workouts = {
    // Current filter & sort state
    state: {
      search: '',
      type: 'all',
      status: 'all',
      sort: 'newest',
      from: '',
      to: ''
    },

    // Cache of active editing workout ID (null when creating new)
    editingId: null,

    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.bindModal();
      this.bindFilters();
      this.renderHistory();
      this.checkUrlParams();
    },

    checkUrlParams: function () {
      const params = new URLSearchParams(window.location.search);
      const exerciseName = params.get('exercise');
      if (exerciseName) {
        this.openModalWithExercise(exerciseName);
      }
    },

    getAll: function () {
      return root.StorageManager.getWorkouts();
    },

    saveAll: function (workouts) {
      root.StorageManager.saveWorkouts(workouts);
      // Synchronize dashboard and streak whenever workout list changes
      if (root.Dashboard && typeof root.Dashboard.renderAll === 'function') {
        root.Dashboard.renderAll();
      }
      this.renderHistory();
      // Also update existing global calendar/stat renderers if defined
      if (typeof root.renderStats === 'function') root.renderStats();
      if (typeof root.renderCalendar === 'function') root.renderCalendar();
      if (typeof root.renderActivity === 'function') root.renderActivity();
    },

    getFilteredWorkouts: function () {
      const items = this.getAll();
      const { search, type, status, sort, from, to } = this.state;

      // 1. Filtering
      let results = items.filter(function (workout) {
        // Search query
        const query = search.toLowerCase();
        const matchesSearch = !query ||
          (workout.name && workout.name.toLowerCase().includes(query)) ||
          (workout.type && workout.type.toLowerCase().includes(query)) ||
          (workout.notes && workout.notes.toLowerCase().includes(query)) ||
          (workout.exercises && workout.exercises.some(function (exercise) {
            return exercise.name && exercise.name.toLowerCase().includes(query);
          }));

        // Type filter
        const matchesType = type === 'all' || (workout.type && workout.type.toLowerCase() === type.toLowerCase());
        const dateKey = String(workout.date || '').slice(0, 10);
        const matchesFrom = !from || dateKey >= from;
        const matchesTo = !to || dateKey <= to;

        // Status filter
        const isCompleted = workout.completed !== false; // Default true if unspecified
        const matchesStatus = status === 'all' ||
          (status === 'completed' && isCompleted) ||
          (status === 'planned' && !isCompleted);

        return matchesSearch && matchesType && matchesStatus && matchesFrom && matchesTo;
      });

      // 2. Sorting
      results.sort(function (firstWorkout, secondWorkout) {
        if (sort === 'newest') return new Date(secondWorkout.date || 0) - new Date(firstWorkout.date || 0);
        if (sort === 'oldest') return new Date(firstWorkout.date || 0) - new Date(secondWorkout.date || 0);
        if (sort === 'duration') return (Number(secondWorkout.duration) || 0) - (Number(firstWorkout.duration) || 0);
        if (sort === 'calories') return (Number(secondWorkout.calories) || 0) - (Number(firstWorkout.calories) || 0);
        return 0;
      });

      return results;
    },

    renderHistory: function () {
      const container = document.getElementById('workout-history-list');
      const countEl = document.getElementById('workout-history-count');
      if (!container) return;

      const filtered = this.getFilteredWorkouts();
      if (countEl) countEl.textContent = `${filtered.length} session${filtered.length === 1 ? '' : 's'}`;

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <h4>No workouts yet.</h4>
            <p class="muted">Start your first workout to begin tracking, or adjust your filters.</p>
          </div>
        `;
        return;
      }

      const safeText = root.FTUtils ? root.FTUtils.escapeHtml : function (value) { return value; };
      container.innerHTML = filtered.map(function (workout) {
        const isCompleted = workout.completed !== false;
        const exercisesHtml = (workout.exercises && workout.exercises.length)
          ? '<div class="workout-exercise-list">' + workout.exercises.map(function (exercise) {
              return '<div class="workout-exercise-pill"><strong>' + safeText(exercise.name) + '</strong>' +
                '<span class="muted">' + (exercise.sets ? exercise.sets + ' sets' : '') +
                (exercise.reps ? ' × ' + exercise.reps + ' reps' : '') +
                (exercise.weight ? ' @ ' + exercise.weight + 'kg' : '') + '</span></div>';
            }).join('') + '</div>'
          : '';
        return (
          '<article class="panel workout-history-card ' + (isCompleted ? 'is-completed' : 'is-planned') + '" data-workout-id="' + workout.id + '">' +
            '<div class="workout-card-head"><div>' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                '<span class="chip">' + safeText(workout.type || 'Workout') + '</span>' +
                '<span class="status-badge ' + (isCompleted ? 'badge-completed' : 'badge-planned') + '">' +
                  (isCompleted ? '✓ Completed' : '⏱ Planned') +
                '</span>' +
                '<span class="muted" style="font-size:13px;">' + safeText(workout.date || 'Today') + '</span>' +
              '</div>' +
              '<h3 style="margin:4px 0 6px;">' + safeText(workout.name || (workout.type + ' Session')) + '</h3>' +
            '</div>' +
            '<div class="workout-card-actions">' +
              '<button class="btn btn-ghost btn-xs" type="button" data-action="toggle-complete">' +
                (isCompleted ? '↺ Unmark' : '✓ Done') + '</button>' +
              '<button class="btn btn-ghost btn-xs" type="button" data-action="edit">Edit</button>' +
              '<button class="btn btn-secondary btn-xs" type="button" data-action="delete">Delete</button>' +
            '</div></div>' +
            '<div class="workout-meta-row">' +
              '<div><span>Duration</span><strong>' + (workout.duration || 0) + 'm</strong></div>' +
              '<div><span>Calories</span><strong>' + (workout.calories || 0) + ' kcal</strong></div>' +
              (workout.distance ? '<div><span>Distance</span><strong>' + workout.distance + ' mi</strong></div>' : '') +
            '</div>' +
            exercisesHtml +
            (workout.notes ? '<p class="workout-notes muted">“' + safeText(workout.notes) + '”</p>' : '') +
          '</article>'
        );
      }).join('');
    },

    addExerciseRow: function (ex) {
      ex = ex || {};
      const container = document.getElementById('modal-exercises-container');
      if (!container) return;

      const row = document.createElement('div');
      row.className = 'exercise-form-row';
      row.innerHTML = `
        <input type="text" name="ex_name[]" placeholder="Exercise (e.g. Bench Press)" value="${ex.name || ''}" required list="ex-datalist" style="flex:2;">
        <input type="number" name="ex_sets[]" placeholder="Sets" value="${ex.sets || ''}" min="1" max="50" style="flex:1;">
        <input type="number" name="ex_reps[]" placeholder="Reps" value="${ex.reps || ''}" min="1" max="500" style="flex:1;">
        <input type="number" name="ex_weight[]" placeholder="kg" value="${ex.weight || ''}" min="0" step="0.5" style="flex:1;">
        <button type="button" class="btn btn-secondary btn-xs remove-ex-row" title="Remove exercise">✕</button>
      `;

      row.querySelector('.remove-ex-row').addEventListener('click', function () {
        row.remove();
      });

      container.appendChild(row);
    },

    /**
     * Open Modal for preselected exercise from library
     */
    openModalWithExercise: function (exerciseName) {
      this.openModal();
      this.addExerciseRow({ name: exerciseName });
    },

    /**
     * Open Modal (Create or Edit mode)
     */
    openModal: function (workout = null) {
      let modalBackdrop = document.getElementById('crud-workout-modal');
      if (!modalBackdrop) {
        this.createModalMarkup();
        modalBackdrop = document.getElementById('crud-workout-modal');
      }

      const form = document.getElementById('crud-workout-form');
      const title = document.getElementById('modal-crud-title');
      const exContainer = document.getElementById('modal-exercises-container');
      exContainer.innerHTML = '';

      if (workout) {
        // Edit mode
        this.editingId = workout.id;
        title.textContent = 'Edit Workout Session';
        form.name.value = workout.name || '';
        form.type.value = workout.type || 'Strength';
        form.duration.value = workout.duration || '';
        form.distance.value = workout.distance || '';
        form.calories.value = workout.calories || '';
        form.date.value = workout.date || root.StorageManager.getTodayKey();
        form.completed.checked = workout.completed !== false;
        form.notes.value = workout.notes || '';

        if (workout.exercises && workout.exercises.length) {
          workout.exercises.forEach(ex => this.addExerciseRow(ex));
        }
      } else {
        // Create mode
        this.editingId = null;
        title.textContent = 'Log a Workout Session';
        form.reset();
        form.date.value = root.StorageManager.getTodayKey();
        form.completed.checked = true;
      }

      modalBackdrop.classList.add('open');
    },

    closeModal: function () {
      const modal = document.getElementById('crud-workout-modal');
      if (modal) modal.classList.remove('open');
      this.editingId = null;
    },

    createModalMarkup: function () {
      if (document.getElementById('crud-workout-modal')) return;

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.id = 'crud-workout-modal';
      backdrop.innerHTML = `
        <div class="modal modal-lg" role="dialog" aria-modal="true">
          <div class="tracker-header">
            <h3 id="modal-crud-title">Log a Workout Session</h3>
            <button class="btn btn-ghost btn-xs" type="button" data-close-crud>✕</button>
          </div>
          <form id="crud-workout-form" class="form-grid">
            <div class="form-row">
              <label>Session title (optional)
                <input name="name" type="text" placeholder="e.g. Upper Body Power">
              </label>
              <label>Activity type
                <select name="type" required>
                  <option value="Running">Running</option>
                  <option value="Walking">Walking</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Gym">Gym</option>
                  <option value="Strength Training">Strength Training</option>
                  <option value="Strength">Strength</option>
                  <option value="Yoga">Yoga</option>
                  <option value="HIIT">HIIT</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <div class="form-row">
              <label>Duration (minutes) *
                <input name="duration" type="number" min="1" max="1440" required placeholder="45">
              </label>
              <label>Calories burned (kcal) *
                <input name="calories" type="number" min="0" max="10000" required placeholder="320">
              </label>
            </div>
            <p class="help">Calories are an estimate unless you enter a known value. <button class="text-btn" type="button" id="btn-estimate-calories">Estimate from body weight</button></p>

            <div class="form-row">
              <label>Distance (optional mi/km)
                <input name="distance" type="number" min="0" step="0.1" placeholder="0.0">
              </label>
              <label>Date *
                <input name="date" type="date" required>
              </label>
            </div>

            <!-- Dynamic Exercise List Builder -->
            <div class="exercise-builder-section">
              <div class="tracker-header" style="margin-bottom:8px;">
                <span class="tracker-title" style="font-size:12px;">Exercises &amp; Sets</span>
                <button class="btn btn-ghost btn-xs" type="button" id="btn-add-exercise-row">+ Add exercise</button>
              </div>
              <div id="modal-exercises-container" class="exercise-rows-wrap"></div>
              <datalist id="ex-datalist">
                <option value="Barbell Bench Press">
                <option value="Barbell Back Squat">
                <option value="Conventional Deadlift">
                <option value="Overhead Barbell Press">
                <option value="Bent-Over Barbell Row">
                <option value="Pull-Up">
                <option value="Standard Push-Up">
                <option value="Dumbbell Bicep Curl">
                <option value="Parallel Bar Dips">
                <option value="Forearm Plank">
              </datalist>
            </div>

            <label>Notes (optional)
              <input name="notes" type="text" placeholder="RPE, energy levels, personal observations">
            </label>

            <label class="check">
              <input type="checkbox" name="completed" checked>
              <span>Mark this workout session as completed</span>
            </label>

            <div class="hero-actions" style="margin-top:16px;">
              <button class="btn btn-secondary" type="button" data-close-crud>Cancel</button>
              <button class="btn btn-primary" type="submit">Save Session</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(backdrop);

      // Bind close buttons
      backdrop.querySelectorAll('[data-close-crud]').forEach(btn => {
        btn.addEventListener('click', () => this.closeModal());
      });
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) this.closeModal();
      });

      // Bind add exercise row button
      backdrop.querySelector('#btn-add-exercise-row').addEventListener('click', () => {
        this.addExerciseRow();
      });

      const estimateBtn = backdrop.querySelector('#btn-estimate-calories');
      if (estimateBtn) {
        estimateBtn.addEventListener('click', () => {
          const form = backdrop.querySelector('#crud-workout-form');
          const settings = root.StorageManager.getSettings();
          const est = root.FTUtils
            ? root.FTUtils.estimateCalories(settings.weight, form.type.value, form.duration.value)
            : Math.round((Number(form.duration.value) || 30) * 7.5);
          form.calories.value = est;
          if (root.showToast) root.showToast('Estimated ' + est + ' kcal (not a medical measurement)', 'info');
        });
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeModal();
      });

      // Bind form submit
      const form = backdrop.querySelector('#crud-workout-form');
      form.addEventListener('submit', e => {
        e.preventDefault();
        this.handleFormSubmit(new FormData(form));
      });
    },

    /**
     * Handle Workout Save (Add or Update)
     */
    handleFormSubmit: function (data) {
      const items = this.getAll();
      const exNames = Array.from(document.querySelectorAll('input[name="ex_name[]"]')).map(i => i.value.trim());
      const exSets = Array.from(document.querySelectorAll('input[name="ex_sets[]"]')).map(i => parseInt(i.value, 10) || 0);
      const exReps = Array.from(document.querySelectorAll('input[name="ex_reps[]"]')).map(i => parseInt(i.value, 10) || 0);
      const exWeights = Array.from(document.querySelectorAll('input[name="ex_weight[]"]')).map(i => parseFloat(i.value) || 0);

      const exercises = exNames.map((name, i) => ({
        name: name,
        sets: exSets[i],
        reps: exReps[i],
        weight: exWeights[i]
      })).filter(ex => Boolean(ex.name));

      const payload = {
        id: this.editingId || root.StorageManager.generateId(),
        userId: root.StorageManager.getUserId && root.StorageManager.getUserId(),
        name: (data.get('name') || '').trim() || `${data.get('type')} Session`,
        type: data.get('type'),
        duration: Math.max(1, parseInt(data.get('duration'), 10) || 30),
        calories: Math.max(0, parseInt(data.get('calories'), 10) || 0),
        distance: parseFloat(data.get('distance')) || 0,
        date: data.get('date'),
        completed: Boolean(data.get('completed')),
        notes: (data.get('notes') || '').trim(),
        exercises: exercises
      };

      if (this.editingId) {
        const index = items.findIndex(w => w.id === this.editingId);
        if (index !== -1) {
        payload.id = this.editingId;
          items[index] = payload;
          if (root.showToast) root.showToast('Workout session updated');
        }
      } else {
        items.push(payload);
        if (root.showToast) root.showToast('Workout saved successfully.', 'success');
      }

      this.saveAll(items);
      this.closeModal();
    },

    /**
     * Delete Workout
     */
    deleteWorkout: function (id) {
      if (!confirm('Are you sure you want to permanently delete this workout?')) return;
      let items = this.getAll();
      items = items.filter(w => w.id !== id);
      this.saveAll(items);
      if (root.showToast) root.showToast('Workout deleted');
    },

    /**
     * Toggle Completion Status
     */
    toggleComplete: function (id) {
      const items = this.getAll();
      const workout = items.find(w => w.id === id);
      if (!workout) return;
      workout.completed = !workout.completed;
      this.saveAll(items);
      if (root.showToast) root.showToast(`Workout marked as ${workout.completed ? 'completed' : 'planned'}`);
    },

    /**
     * Bind Modal open triggers and event delegation
     */
    bindModal: function () {
      this.createModalMarkup();

      document.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-open-log]');
        if (!btn) return;
        event.preventDefault();
        Workouts.openModal();
      });

      // Event delegation on workout history list
      const container = document.getElementById('workout-history-list');
      if (container) {
        container.addEventListener('click', e => {
          const card = e.target.closest('[data-workout-id]');
          if (!card) return;
          const id = card.getAttribute('data-workout-id');

          const toggleBtn = e.target.closest('[data-action="toggle-complete"]');
          if (toggleBtn) {
            this.toggleComplete(id);
            return;
          }

          const editBtn = e.target.closest('[data-action="edit"]');
          if (editBtn) {
            const workout = this.getAll().find(w => w.id === id);
            if (workout) this.openModal(workout);
            return;
          }

          const deleteBtn = e.target.closest('[data-action="delete"]');
          if (deleteBtn) {
            this.deleteWorkout(id);
          }
        });
      }
    },

    /**
     * Bind search input and filter dropdowns
     */
    bindFilters: function () {
      const workoutPage = this;

      const searchInput = document.getElementById('history-search');
      if (searchInput) {
        searchInput.addEventListener('input', debounce(function (event) {
          workoutPage.state.search = event.target.value.trim();
          workoutPage.renderHistory();
        }, 200));
      }

      const typeFilter = document.getElementById('history-filter-type');
      if (typeFilter) {
        typeFilter.addEventListener('change', function (event) {
          workoutPage.state.type = event.target.value;
          workoutPage.renderHistory();
        });
      }

      const statusFilter = document.getElementById('history-filter-status');
      if (statusFilter) {
        statusFilter.addEventListener('change', function (event) {
          workoutPage.state.status = event.target.value;
          workoutPage.renderHistory();
        });
      }

      const fromDate = document.getElementById('history-filter-from');
      if (fromDate) {
        fromDate.addEventListener('change', function (event) {
          workoutPage.state.from = event.target.value;
          workoutPage.renderHistory();
        });
      }
      const toDate = document.getElementById('history-filter-to');
      if (toDate) {
        toDate.addEventListener('change', function (event) {
          workoutPage.state.to = event.target.value;
          workoutPage.renderHistory();
        });
      }

      const sortFilter = document.getElementById('history-sort');
      if (sortFilter) {
        sortFilter.addEventListener('change', function (event) {
          workoutPage.state.sort = event.target.value;
          workoutPage.renderHistory();
        });
      }
    }
  };

  root.Workouts = Workouts;

})(typeof window !== 'undefined' ? window : this);
