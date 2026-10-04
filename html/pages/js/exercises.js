/**
 * exercises.js — exercise library, search, and YouTube tutorial
 *
 * CLASS EXPLANATION:
 * EXERCISE_LIBRARY is a normal JavaScript array of objects.
 * We filter that array when the user types, then rebuild the cards with map().
 */
(function (root) {
  'use strict';

  // Comprehensive static library of exercises
  const EXERCISE_LIBRARY = [
    {
      id: 'ex_bench_press',
      name: 'Barbell Bench Press',
      muscle: 'Chest',
      secondary: ['Shoulders', 'Triceps'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      description: 'Lie flat on a bench, grip the barbell slightly wider than shoulder-width, lower the bar smoothly to your mid-chest, and press back up with control.'
    },
    {
      id: 'ex_pushup',
      name: 'Standard Push-Up',
      muscle: 'Chest',
      secondary: ['Triceps', 'Core'],
      equipment: 'Bodyweight',
      difficulty: 'Beginner',
      description: 'Maintain a rigid plank position with hands slightly wider than shoulder-width. Lower until chest nearly touches the floor and push back up.'
    },
    {
      id: 'ex_incline_db_press',
      name: 'Incline Dumbbell Press',
      muscle: 'Chest',
      secondary: ['Shoulders', 'Triceps'],
      equipment: 'Dumbbells',
      difficulty: 'Intermediate',
      description: 'Set an incline bench to 30-45 degrees. Press dumbbells upwards while squeezing the upper chest at the top.'
    },
    {
      id: 'ex_barbell_squat',
      name: 'Barbell Back Squat',
      muscle: 'Legs',
      secondary: ['Glutes', 'Core', 'Hamstrings'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      description: 'Rest barbell across upper traps, brace core, hinge hips back and descend until thighs are parallel to the floor, then drive through heels.'
    },
    {
      id: 'ex_romanian_deadlift',
      name: 'Romanian Deadlift (RDL)',
      muscle: 'Legs',
      secondary: ['Hamstrings', 'Glutes', 'Lower Back'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      description: 'Stand tall with barbell, hinge at hips while keeping a flat back, push hips backward until hamstrings stretch, then engage glutes to return.'
    },
    {
      id: 'ex_bodyweight_lunge',
      name: 'Walking Lunges',
      muscle: 'Legs',
      secondary: ['Quads', 'Glutes', 'Calves'],
      equipment: 'Bodyweight',
      difficulty: 'Beginner',
      description: 'Step forward with one leg, lowering hips until both knees bend at approximately 90 degrees. Push forward into the next step.'
    },
    {
      id: 'ex_deadlift',
      name: 'Conventional Deadlift',
      muscle: 'Back',
      secondary: ['Hamstrings', 'Glutes', 'Forearms', 'Core'],
      equipment: 'Barbell',
      difficulty: 'Advanced',
      description: 'Stand with mid-foot under barbell. Grip bar, push chest out, keep spine neutral, and pull weight smoothly from floor by extending hips and knees.'
    },
    {
      id: 'ex_pullup',
      name: 'Pull-Up',
      muscle: 'Back',
      secondary: ['Biceps', 'Forearms', 'Core'],
      equipment: 'Bodyweight',
      difficulty: 'Intermediate',
      description: 'Overhand grip on bar slightly wider than shoulders. Pull chest up to the bar leading with elbows, then lower slowly with full extension.'
    },
    {
      id: 'ex_bent_over_row',
      name: 'Bent-Over Barbell Row',
      muscle: 'Back',
      secondary: ['Lats', 'Rhomboids', 'Biceps'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      description: 'Hinge forward at 45 degrees, pull barbell toward lower ribcage keeping elbows tucked, and squeeze shoulder blades together.'
    },
    {
      id: 'ex_overhead_press',
      name: 'Overhead Barbell Press',
      muscle: 'Shoulders',
      secondary: ['Triceps', 'Upper Chest', 'Core'],
      equipment: 'Barbell',
      difficulty: 'Intermediate',
      description: 'Stand with bar at shoulder level. Press bar directly overhead, locking arms and bringing head slightly forward at top of movement.'
    },
    {
      id: 'ex_lateral_raise',
      name: 'Dumbbell Lateral Raise',
      muscle: 'Shoulders',
      secondary: ['Traps'],
      equipment: 'Dumbbells',
      difficulty: 'Beginner',
      description: 'Hold dumbbells at sides with slight elbow bend. Raise arms outward until parallel to floor, then lower under steady control.'
    },
    {
      id: 'ex_bicep_curl',
      name: 'Dumbbell Bicep Curl',
      muscle: 'Arms',
      secondary: ['Forearms'],
      equipment: 'Dumbbells',
      difficulty: 'Beginner',
      description: 'Stand with dumbbells at sides, palms forward. Curl weights towards shoulders while keeping elbows stationary by your ribcage.'
    },
    {
      id: 'ex_tricep_dips',
      name: 'Parallel Bar Dips',
      muscle: 'Arms',
      secondary: ['Chest', 'Shoulders'],
      equipment: 'Bodyweight',
      difficulty: 'Intermediate',
      description: 'Support body on parallel bars, lower torso by bending elbows to 90 degrees, then push upwards to lockout.'
    },
    {
      id: 'ex_plank',
      name: 'Forearm Plank',
      muscle: 'Core',
      secondary: ['Shoulders', 'Glutes'],
      equipment: 'Bodyweight',
      difficulty: 'Beginner',
      description: 'Rest on forearms and toes, creating a straight line from head to heels. Brace abdominal wall tightly without letting hips sag.'
    },
    {
      id: 'ex_hanging_leg_raise',
      name: 'Hanging Leg Raise',
      muscle: 'Core',
      secondary: ['Hip Flexors', 'Grip'],
      equipment: 'Bodyweight',
      difficulty: 'Advanced',
      description: 'Hang from pull-up bar, raise straight legs until parallel to floor or higher, avoiding swinging momentum, then lower with control.'
    },
    {
      id: 'ex_kettlebell_swing',
      name: 'Kettlebell Swing',
      muscle: 'Full Body',
      secondary: ['Glutes', 'Hamstrings', 'Lower Back', 'Shoulders'],
      equipment: 'Kettlebell',
      difficulty: 'Intermediate',
      description: 'Hinge hips back with kettlebell between knees, then snap hips forward explosively to drive kettlebell to shoulder height.'
    },
    {
      id: 'ex_burpees',
      name: 'Full Burpee',
      muscle: 'Full Body',
      secondary: ['Chest', 'Quads', 'Core', 'Cardio'],
      equipment: 'Bodyweight',
      difficulty: 'Intermediate',
      description: 'Drop from standing into a push-up position, complete a push-up, jump feet forward, and leap explosively with arms overhead.'
    },
    {
      id: 'ex_running_intervals',
      name: 'High-Intensity Treadmill Intervals',
      muscle: 'Cardio',
      secondary: ['Quads', 'Hamstrings', 'Calves'],
      equipment: 'Machine',
      difficulty: 'Intermediate',
      description: 'Alternate between 60 seconds of maximum sprint effort and 60 seconds of recovery walking or jogging for 10-15 cycles.'
    },
    {
      id: 'ex_cycling_sprint',
      name: 'Stationary Bike Sprints',
      muscle: 'Cardio',
      secondary: ['Quads', 'Glutes', 'Calves'],
      equipment: 'Machine',
      difficulty: 'Beginner',
      description: 'High cadence sprints with moderate-to-high resistance, alternating 30 seconds sprint with 45 seconds low-resistance spin.'
    },
    {
      id: 'ex_face_pull',
      name: 'Cable Face Pull',
      muscle: 'Shoulders',
      secondary: ['Rear Delts', 'Rotator Cuff', 'Upper Back'],
      equipment: 'Cable',
      difficulty: 'Beginner',
      description: 'Attach rope to cable pulley at eye level. Pull rope directly toward face while separating hands and rotating shoulders outward.'
    },
    {
      id: 'ex_leg_press',
      name: '45-Degree Leg Press',
      muscle: 'Legs',
      secondary: ['Quads', 'Glutes'],
      equipment: 'Machine',
      difficulty: 'Beginner',
      description: 'Place feet shoulder-width on sled platform, release safety latches, lower sled until knees bend at 90 degrees, and push back up.'
    },
    {
      id: 'ex_cable_tricep_pushdown',
      name: 'Cable Rope Tricep Pushdown',
      muscle: 'Arms',
      secondary: ['Triceps'],
      equipment: 'Cable',
      difficulty: 'Beginner',
      description: 'Hold rope attachment with elbows tucked at sides. Push down and flare rope outward at the bottom for maximum tricep contraction.'
    }
  ];

  const TUTORIALS = {
    ex_bench_press: { videoId: 'gRVjAtPip0Y', calories: 8, category: 'Strength', instructions: ['Lie on a flat bench with eyes under the bar.', 'Grip slightly wider than shoulders and unrack with locked elbows.', 'Lower to mid-chest, pause, then press to lockout.'] },
    ex_pushup: { videoId: 'IODxDxX7oi4', calories: 7, category: 'Strength', instructions: ['Set hands under shoulders and brace a rigid plank.', 'Lower until chest is just above the floor.', 'Press the floor away without letting hips sag.'] },
    ex_incline_db_press: { videoId: '8iPEnn-ltC8', calories: 8, category: 'Strength', instructions: ['Set the bench to 30–45 degrees.', 'Press dumbbells up over the upper chest.', 'Lower with control until elbows are just below the bench line.'] },
    ex_barbell_squat: { videoId: 'ultWZbUMPL8', calories: 9, category: 'Strength', instructions: ['Bar on the upper back, brace, and sit the hips down.', 'Keep knees tracking over mid-foot.', 'Stand by driving the floor away.'] },
    ex_romanian_deadlift: { videoId: 'jEy_czb3RKA', calories: 8, category: 'Strength', instructions: ['Soft knees, bar close to the legs.', 'Hinge until hamstrings load.', 'Stand tall by squeezing glutes.'] },
    ex_bodyweight_lunge: { videoId: 'QOVaHwm-Q6U', calories: 7, category: 'Strength', instructions: ['Step forward to a long stance.', 'Drop the back knee toward the floor.', 'Push through the front heel to stand.'] },
    ex_deadlift: { videoId: 'op9kVnSso6Q', calories: 10, category: 'Strength', instructions: ['Mid-foot under the bar, hinge and grip.', 'Brace, push the floor, keep the bar close.', 'Stand tall, then reverse the motion.'] },
    ex_pullup: { videoId: 'eGo4IYlbE5g', calories: 8, category: 'Strength', instructions: ['Hang with a shoulder-width overhand grip.', 'Pull elbows down until chin clears the bar.', 'Lower under control to a full hang.'] },
    ex_bent_over_row: { videoId: 'FWJR5Ve8bnQ', calories: 8, category: 'Strength', instructions: ['Hinge to about 45 degrees.', 'Row the bar to the lower ribs.', 'Squeeze the back, then lower.'] },
    ex_overhead_press: { videoId: '2yjwXTZQDDI', calories: 7, category: 'Strength', instructions: ['Bar at the shoulders, ribs down.', 'Press straight up.', 'Lock out overhead without leaning back.'] },
    ex_lateral_raise: { videoId: '3VcKaXpzqRo', calories: 5, category: 'Strength', instructions: ['Soft elbows, raise arms to shoulder height.', 'Lead with the elbows, not the wrists.', 'Lower slowly.'] },
    ex_bicep_curl: { videoId: 'ykJmrZ5v0Oo', calories: 5, category: 'Strength', instructions: ['Elbows pinned to the sides.', 'Curl without swinging.', 'Lower to a full stretch.'] },
    ex_tricep_dips: { videoId: '0326dy_-CzM', calories: 7, category: 'Strength', instructions: ['Support on bars or a bench.', 'Lower until elbows are near 90 degrees.', 'Press back to lockout.'] },
    ex_plank: { videoId: 'ASdvN_XEl_c', calories: 4, category: 'Core', instructions: ['Forearms and toes, body in a straight line.', 'Brace the trunk.', 'Breathe without dropping the hips.'] },
    ex_hanging_leg_raise: { videoId: 'Pr1ieGZ5atk', calories: 6, category: 'Core', instructions: ['Hang still, then raise legs without swinging.', 'Control the lowering phase.'] },
    ex_kettlebell_swing: { videoId: 'YSxHifyI8s8', calories: 11, category: 'HIIT', instructions: ['Hinge, hike the bell, snap the hips.', 'The arms only guide the bell.'] },
    ex_burpees: { videoId: 'auBLPXO8Fww', calories: 12, category: 'HIIT', instructions: ['Squat, plank, optional push-up.', 'Jump the feet in and leap up.'] },
    ex_running_intervals: { videoId: 'wDJEI5t2qKA', calories: 13, category: 'Cardio', instructions: ['Warm up easy.', 'Alternate hard and easy efforts.', 'Cool down.'] },
    ex_cycling_sprint: { videoId: 'qY9U7G3Zg3I', calories: 12, category: 'Cardio', instructions: ['Build cadence.', 'Sprint, then recover with easy spinning.'] },
    ex_face_pull: { videoId: 'rep-1Lb0pz8', calories: 5, category: 'Strength', instructions: ['Pull the rope to the face.', 'Externally rotate at the end.'] },
    ex_leg_press: { videoId: 'IZxyjW7MPJQ', calories: 8, category: 'Strength', instructions: ['Feet mid-platform.', 'Lower with control, then press without locking harshly.'] },
    ex_cable_tricep_pushdown: { videoId: '2-LAMcpzODU', calories: 5, category: 'Strength', instructions: ['Elbows glued to the ribs.', 'Push down and spread the rope.'] }
  };

  EXERCISE_LIBRARY.forEach(function (item) {
    var extra = TUTORIALS[item.id] || {};
    item.category = extra.category || item.muscle;
    item.calories = extra.calories || 6;
    item.videoId = extra.videoId || '';
    item.instructions = extra.instructions || [item.description];
  });

  function debounce(func, wait) {
    wait = wait || 250;
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const Exercises = {
    items: EXERCISE_LIBRARY,

    // Active filter state
    state: {
      search: '',
      muscle: 'all',
      equipment: 'all',
      difficulty: 'all',
      sort: 'name-asc'
    },

    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.renderCategoryCounts();
      this.renderList();
      this.bindControls();
    },

    getCategoryCounts: function () {
      return this.items.reduce(function (counts, exercise) {
        counts[exercise.muscle] = (counts[exercise.muscle] || 0) + 1;
        counts.all = (counts.all || 0) + 1;
        return counts;
      }, { all: 0 });
    },

    renderCategoryCounts: function () {
      const counts = this.getCategoryCounts();
      Object.keys(counts).forEach(function (muscleName) {
        const countLabel = document.querySelector('[data-count="' + muscleName.toLowerCase() + '"]');
        if (countLabel) countLabel.textContent = counts[muscleName];
      });
    },

    getFilteredAndSorted: function () {
      const { search, muscle, equipment, difficulty, sort } = this.state;

      let results = this.items.filter(function (exercise) {
        const matchesSearch = !search ||
          exercise.name.toLowerCase().includes(search.toLowerCase()) ||
          exercise.description.toLowerCase().includes(search.toLowerCase()) ||
          (exercise.secondary && exercise.secondary.some(function (muscleName) {
            return muscleName.toLowerCase().includes(search.toLowerCase());
          }));

        const matchesMuscle = muscle === 'all' || exercise.muscle.toLowerCase() === muscle.toLowerCase();
        const matchesEquipment = equipment === 'all' || exercise.equipment.toLowerCase() === equipment.toLowerCase();
        const matchesDifficulty = difficulty === 'all' || exercise.difficulty.toLowerCase() === difficulty.toLowerCase();

        return matchesSearch && matchesMuscle && matchesEquipment && matchesDifficulty;
      });

      results.sort(function (firstExercise, secondExercise) {
        if (sort === 'name-asc') return firstExercise.name.localeCompare(secondExercise.name);
        if (sort === 'name-desc') return secondExercise.name.localeCompare(firstExercise.name);
        if (sort === 'muscle') return firstExercise.muscle.localeCompare(secondExercise.muscle);
        if (sort === 'difficulty') {
          const difficultyRank = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          return difficultyRank[firstExercise.difficulty] - difficultyRank[secondExercise.difficulty];
        }
        return 0;
      });

      return results;
    },

    renderList: function () {
      const container = document.getElementById('exercise-grid');
      const countEl = document.getElementById('exercise-results-count');
      if (!container) return;

      const filtered = this.getFilteredAndSorted();
      if (countEl) countEl.textContent = `${filtered.length} exercise${filtered.length === 1 ? '' : 's'}`;

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h3>No exercises found</h3>
            <p class="muted">Try adjusting your search terms or clearing your category filters.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(function (item) {
        const diffColor = item.difficulty === 'Beginner' ? 'var(--accent)' : item.difficulty === 'Intermediate' ? 'var(--cyan)' : 'var(--orange)';
        return `
          <article class="card exercise-card" data-exercise-id="${item.id}">
            <div class="exercise-card-header">
              <span class="chip" style="border-color:${diffColor}; color:${diffColor}">${item.difficulty}</span>
              <span class="muted" style="font-size:12px; font-weight:700;">${item.equipment}</span>
            </div>
            <h3 style="margin: 10px 0 6px;">${item.name}</h3>
            <p class="muted" style="font-size:12px;margin:0 0 8px;">${item.category || item.muscle} • ${item.difficulty}</p>
            <div class="exercise-tags">
              <span class="pill-tag">${item.muscle}</span>
              ${(item.secondary || []).slice(0, 2).map(s => `<span class="pill-tag muted-tag">${s}</span>`).join('')}
              <span class="pill-tag muted-tag">~${item.calories || 6} kcal/min</span>
            </div>
            <p class="muted" style="font-size:13px; margin: 12px 0 16px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.description}
            </p>
            <div class="exercise-card-footer">
              <button class="btn btn-ghost btn-xs" type="button" data-action="view-details" data-id="${item.id}">View instructions</button>
              <button class="btn btn-secondary btn-xs" type="button" data-action="watch-tutorial" data-id="${item.id}">Watch tutorial</button>
              <button class="btn btn-primary btn-xs" type="button" data-action="quick-log" data-id="${item.id}">Add to workout</button>
            </div>
          </article>
        `;
      }).join('');
    },

    showDetailsModal: function (id) {
      const exercise = this.items.find(item => item.id === id);
      if (!exercise) return;

      let modalBackdrop = document.getElementById('exercise-detail-modal');
      if (!modalBackdrop) {
        modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'modal-backdrop';
        modalBackdrop.id = 'exercise-detail-modal';
        document.body.appendChild(modalBackdrop);
      }

      modalBackdrop.innerHTML = `
        <div class="modal" role="dialog" aria-labelledby="modal-ex-title" aria-modal="true">
          <div class="tracker-header">
            <span class="chip">${exercise.difficulty}</span>
            <button class="btn btn-ghost btn-xs" type="button" data-close-modal>✕</button>
          </div>
          <h2 id="modal-ex-title" style="margin: 12px 0 8px; font-family: var(--display);">${exercise.name}</h2>
          <div class="exercise-tags" style="margin-bottom: 16px;">
            <span class="pill-tag">Primary: ${exercise.muscle}</span>
            <span class="pill-tag muted-tag">Equipment: ${exercise.equipment}</span>
            ${exercise.secondary && exercise.secondary.length ? `<span class="pill-tag muted-tag">Secondary: ${exercise.secondary.join(', ')}</span>` : ''}
          </div>
          <h4 style="margin-bottom: 6px;">How to perform:</h4>
          <ol class="muted" style="line-height: 1.6; margin-bottom: 16px; padding-left: 18px;">
            ${(exercise.instructions || [exercise.description]).map(function (step) { return '<li>' + step + '</li>'; }).join('')}
          </ol>
          <p class="help" style="margin-bottom:16px;">Estimated calories: about ${exercise.calories || 6} kcal per minute. This is a general estimate, not a medical measurement.</p>
          <div class="hero-actions">
            <button class="btn btn-secondary" type="button" data-close-modal>Close</button>
            <button class="btn btn-ghost" type="button" data-action="watch-from-modal" data-id="${exercise.id}">Watch tutorial</button>
            <button class="btn btn-primary" type="button" data-action="add-and-close" data-name="${exercise.name}">Add to workout</button>
          </div>
        </div>
      `;

      modalBackdrop.classList.add('open');

      // Bind close events
      modalBackdrop.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => modalBackdrop.classList.remove('open'));
      });
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
      });

      const useBtn = modalBackdrop.querySelector('[data-action="add-and-close"]');
      if (useBtn) {
        useBtn.addEventListener('click', () => {
          modalBackdrop.classList.remove('open');
          if (root.Workouts && typeof root.Workouts.openModalWithExercise === 'function') {
            root.Workouts.openModalWithExercise(exercise.name);
          } else {
            window.location.href = `workout.html?exercise=${encodeURIComponent(exercise.name)}`;
          }
        });
      }
      const watchFromModal = modalBackdrop.querySelector('[data-action="watch-from-modal"]');
      if (watchFromModal) {
        watchFromModal.addEventListener('click', () => this.openTutorial(exercise));
      }
    },

    openTutorial: function (exercise) {
      if (!exercise || !exercise.videoId) {
        if (root.showToast) root.showToast('Tutorial unavailable.', 'warning');
        return;
      }
      let modal = document.getElementById('exercise-video-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.id = 'exercise-video-modal';
        document.body.appendChild(modal);
      }
      modal.innerHTML = `
        <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="video-title">
          <div class="tracker-header">
            <h3 id="video-title">${exercise.name} tutorial</h3>
            <button class="btn btn-ghost btn-xs" type="button" data-close-video>✕</button>
          </div>
          <div class="video-frame">
            <iframe src="https://www.youtube-nocookie.com/embed/${exercise.videoId}?rel=0" title="${exercise.name} tutorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <p class="muted" style="font-size:13px;">Opens a curated YouTube embed. Close this window to stop playback.</p>
        </div>
      `;
      modal.classList.add('open');
      const close = () => {
        modal.classList.remove('open');
        modal.innerHTML = '';
      };
      modal.querySelectorAll('[data-close-video]').forEach(btn => btn.addEventListener('click', close));
      modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
      document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') {
          close();
          document.removeEventListener('keydown', onEsc);
        }
      });
    },

    /**
     * Binds search, filter pills, sorting, and delegation
     */
    bindControls: function () {
      const exercisePage = this;

      const searchInput = document.getElementById('exercise-search');
      if (searchInput) {
        searchInput.addEventListener('input', debounce(function (event) {
          exercisePage.state.search = event.target.value.trim();
          exercisePage.renderList();
        }, 200));
      }

      document.querySelectorAll('[data-muscle-filter]').forEach(function (pill) {
        pill.addEventListener('click', function () {
          document.querySelectorAll('[data-muscle-filter]').forEach(function (otherPill) {
            otherPill.classList.remove('active');
          });
          pill.classList.add('active');
          exercisePage.state.muscle = pill.getAttribute('data-muscle-filter');
          exercisePage.renderList();
        });
      });

      const equipmentSelect = document.getElementById('filter-equipment');
      if (equipmentSelect) {
        equipmentSelect.addEventListener('change', function (event) {
          exercisePage.state.equipment = event.target.value;
          exercisePage.renderList();
        });
      }

      const difficultySelect = document.getElementById('filter-difficulty');
      if (difficultySelect) {
        difficultySelect.addEventListener('change', function (event) {
          exercisePage.state.difficulty = event.target.value;
          exercisePage.renderList();
        });
      }

      const sortSelect = document.getElementById('sort-exercises');
      if (sortSelect) {
        sortSelect.addEventListener('change', function (event) {
          exercisePage.state.sort = event.target.value;
          exercisePage.renderList();
        });
      }

      const grid = document.getElementById('exercise-grid');
      if (grid) {
        grid.addEventListener('click', function (event) {
          const detailsButton = event.target.closest('[data-action="view-details"]');
          if (detailsButton) {
            exercisePage.showDetailsModal(detailsButton.getAttribute('data-id'));
            return;
          }

          const watchButton = event.target.closest('[data-action="watch-tutorial"]');
          if (watchButton) {
            const exercise = exercisePage.items.find(function (item) {
              return item.id === watchButton.getAttribute('data-id');
            });
            exercisePage.openTutorial(exercise);
            return;
          }

          const logButton = event.target.closest('[data-action="quick-log"]');
          if (logButton) {
            const exercise = exercisePage.items.find(function (item) {
              return item.id === logButton.getAttribute('data-id');
            });
            if (exercise) {
              if (root.Workouts && typeof root.Workouts.openModalWithExercise === 'function') {
                root.Workouts.openModalWithExercise(exercise.name);
              } else {
                window.location.href = 'workout.html?exercise=' + encodeURIComponent(exercise.name);
              }
            }
          }
        });
      }
    }
  };

  root.Exercises = Exercises;

})(typeof window !== 'undefined' ? window : this);
