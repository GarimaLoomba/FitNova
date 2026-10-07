/**
 * tracker.js — BMI calculator and weight log
 *
 * CLASS EXPLANATION:
 * BMI = weight(kg) / height(m)²
 * Weight history is an array we push to, then save with StorageManager.
 */
(function (root) {
  'use strict';

  const Tracker = {
    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.initBmi();
      this.initWeightHistory();
      this.initCalorieEstimator();
    },

    // ==========================================
    // BMI CALCULATOR MODULE
    // ==========================================

    initBmi: function () {
      const heightInput = document.getElementById('bmi-height');
      const weightInput = document.getElementById('bmi-weight');
      const unitSelect = document.getElementById('bmi-unit');

      if (!heightInput || !weightInput) return;

      // Pre-fill inputs with current user settings or latest logged weight
      const settings = root.StorageManager.getSettings();
      const latestWeight = this.getLatestWeight();

      if (settings.height) heightInput.value = settings.height;
      if (latestWeight) {
        weightInput.value = latestWeight;
      } else if (settings.weight) {
        weightInput.value = settings.weight;
      }

      const calculateAndDisplay = () => {
        const height = parseFloat(heightInput.value);
        const weight = parseFloat(weightInput.value);
        const unit = unitSelect ? unitSelect.value : 'metric';

        if (!height || !weight || height <= 0 || weight <= 0) {
          this.resetBmiDisplay();
          return;
        }

        let heightMeters, weightKg;
        if (unit === 'imperial') {
          // Imperial: height in inches, weight in lbs
          heightMeters = (height * 2.54) / 100;
          weightKg = weight * 0.453592;
        } else {
          // Metric: height in cm, weight in kg
          heightMeters = height / 100;
          weightKg = weight;
        }

        const bmi = weightKg / (heightMeters * heightMeters);

        if (!isFinite(bmi) || bmi <= 5 || bmi >= 100) {
          this.resetBmiDisplay('Enter valid height and weight values');
          return;
        }

        this.renderBmi(bmi);
      };

      heightInput.addEventListener('input', calculateAndDisplay);
      weightInput.addEventListener('input', calculateAndDisplay);
      if (unitSelect) unitSelect.addEventListener('change', calculateAndDisplay);

      // Initial calculation
      calculateAndDisplay();
    },

    /**
     * Determines category, color, and updates the visual BMI gauge
     */
    renderBmi: function (bmi) {
      const scoreEl = document.getElementById('bmi-score');
      const categoryEl = document.getElementById('bmi-category');
      const markerEl = document.getElementById('bmi-gauge-marker');
      const descEl = document.getElementById('bmi-desc');

      const score = bmi.toFixed(1);
      let category = '';
      let color = '';
      let message = '';

      if (bmi < 18.5) {
        category = 'Underweight';
        color = 'var(--cyan)';
        message = 'Below typical healthy weight range. Consider nutrition consultation.';
      } else if (bmi < 25) {
        category = 'Normal weight';
        color = 'var(--accent)';
        message = 'Optimal healthy weight zone. Great job maintaining fitness balance.';
      } else if (bmi < 30) {
        category = 'Overweight';
        color = 'var(--orange)';
        message = 'Above typical weight zone. Regular exercise and nutrition adjustments recommended.';
      } else {
        category = 'Obese';
        color = 'var(--red)';
        message = 'Significantly elevated weight range. Focus on sustainable lifestyle habits.';
      }

      if (scoreEl) {
        scoreEl.textContent = score;
        scoreEl.style.color = color;
      }

      if (categoryEl) {
        categoryEl.textContent = category;
        categoryEl.style.color = color;
        categoryEl.style.borderColor = color;
      }

      if (descEl) descEl.textContent = message + ' BMI is a general calculation, not a medical diagnosis.';

      // Position the visual marker along the gauge (mapped between 15 and 35 BMI)
      if (markerEl) {
        const clamped = Math.min(35, Math.max(15, bmi));
        const percentage = ((clamped - 15) / (35 - 15)) * 100;
        markerEl.style.left = `${percentage}%`;
        markerEl.style.borderColor = color;
      }
    },

    resetBmiDisplay: function (msg = 'Enter your height and weight to calculate BMI. This is a general calculation, not a medical diagnosis.') {
      const scoreEl = document.getElementById('bmi-score');
      const categoryEl = document.getElementById('bmi-category');
      const descEl = document.getElementById('bmi-desc');

      if (scoreEl) {
        scoreEl.textContent = '—';
        scoreEl.style.color = 'inherit';
      }
      if (categoryEl) {
        categoryEl.textContent = 'Awaiting input';
        categoryEl.style.color = 'var(--muted)';
        categoryEl.style.borderColor = 'var(--line)';
      }
      if (descEl) descEl.textContent = msg;
    },

    initCalorieEstimator: function () {
      const form = document.getElementById('calorie-estimate-form');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('est-weight').value);
        const type = document.getElementById('est-type').value;
        const duration = parseFloat(document.getElementById('est-duration').value);
        const out = document.getElementById('est-result');
        if (!weight || !duration || weight < 30 || duration <= 0) {
          if (out) out.textContent = 'Enter a valid weight and duration.';
          return;
        }
        const value = root.FTUtils.estimateCalories(weight, type, duration);
        if (out) out.textContent = 'Estimated ' + value + ' kcal. This is an estimate, not a lab measurement.';
      });
    },

    getWeightHistory: function () {
      return root.StorageManager.load(root.StorageManager.KEYS.WEIGHT_HISTORY, []);
    },

    saveWeightHistory: function (records) {
      root.StorageManager.save(root.StorageManager.KEYS.WEIGHT_HISTORY, records);
    },

    getLatestWeight: function () {
      const history = this.getWeightHistory();
      if (!history.length) return null;
      // Sorted chronologically; last element is latest
      return history[history.length - 1].weight;
    },

    initWeightHistory: function () {
      this.renderWeightStats();
      this.renderWeightTable();
      this.renderWeightChart();
      this.bindWeightEvents();
    },

    renderWeightStats: function () {
      const history = this.getWeightHistory();
      const currentEl = document.getElementById('weight-current');
      const startingEl = document.getElementById('weight-starting');
      const changeEl = document.getElementById('weight-change');
      const highestEl = document.getElementById('weight-highest');
      const lowestEl = document.getElementById('weight-lowest');

      if (!history.length) {
        if (currentEl) currentEl.textContent = '—';
        if (startingEl) startingEl.textContent = '—';
        if (changeEl) changeEl.textContent = '—';
        if (highestEl) highestEl.textContent = '—';
        if (lowestEl) lowestEl.textContent = '—';
        return;
      }

      // Weights array for calculations
      const weights = history.map(item => Number(item.weight));
      const starting = weights[0];
      const current = weights[weights.length - 1];
      const change = current - starting;
      const highest = Math.max.apply(null, weights);
      const lowest = Math.min.apply(null, weights);

      if (currentEl) currentEl.textContent = `${current.toFixed(1)} kg`;
      if (startingEl) startingEl.textContent = `${starting.toFixed(1)} kg`;
      if (highestEl) highestEl.textContent = `${highest.toFixed(1)} kg`;
      if (lowestEl) lowestEl.textContent = `${lowest.toFixed(1)} kg`;

      if (changeEl) {
        const sign = change > 0 ? '+' : '';
        changeEl.textContent = `${sign}${change.toFixed(1)} kg`;
        if (change < 0) {
          changeEl.style.color = 'var(--accent)'; // Weight loss
        } else if (change > 0) {
          changeEl.style.color = 'var(--orange)'; // Weight gain
        } else {
          changeEl.style.color = 'var(--muted)';
        }
      }
    },

    renderWeightTable: function () {
      const tbody = document.getElementById('weight-table-body');
      if (!tbody) return;

      const history = this.getWeightHistory().slice().reverse(); // Show newest first

      if (!history.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="empty-state" style="padding: 24px; text-align: center;">
              No weight logs recorded yet. Add your first entry above.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = history.map(function (item) {
        return `
          <tr>
            <td><strong>${item.date}</strong></td>
            <td><strong>${Number(item.weight).toFixed(1)} kg</strong></td>
            <td>${item.note ? `<span class="muted">${item.note}</span>` : '—'}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-xs" type="button" data-delete-weight="${item.id}" title="Delete entry">✕</button>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderWeightChart: function () {
      const canvas = document.getElementById('weight-chart');
      if (!canvas) return;
      const history = this.getWeightHistory();
      const ctx = canvas.getContext('2d');
      const width = canvas.width = canvas.parentElement.clientWidth || 600;
      const height = canvas.height = 220;
      ctx.clearRect(0, 0, width, height);
      if (history.length < 2) {
        ctx.fillStyle = '#8b95a7';
        ctx.font = '14px Manrope, sans-serif';
        ctx.fillText('Log at least two weigh-ins to see the trend.', 16, 40);
        return;
      }
      const values = history.map(function (item) { return Number(item.weight); });
      const min = Math.min.apply(null, values) - 1;
      const max = Math.max.apply(null, values) + 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let g = 0; g < 4; g += 1) {
        const y = 20 + g * ((height - 40) / 3);
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
      }
      ctx.beginPath();
      values.forEach(function (value, index) {
        const x = 24 + index * ((width - 48) / (values.length - 1));
        const y = height - 20 - ((value - min) / (max - min)) * (height - 40);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#6ee7d8';
      ctx.lineWidth = 3;
      ctx.stroke();
    },

    bindWeightEvents: function () {
      const trackerPage = this;
      const form = document.getElementById('weight-log-form');
      const dateInput = document.getElementById('weight-log-date');

      // Default date to today
      if (dateInput) {
        dateInput.value = root.StorageManager.getTodayKey();
      }

      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const weightVal = parseFloat(document.getElementById('weight-log-val').value);
          const dateVal = document.getElementById('weight-log-date').value;
          const noteVal = (document.getElementById('weight-log-note').value || '').trim();

          if (isNaN(weightVal) || weightVal < 20 || weightVal > 350) {
            alert('Please enter a realistic weight value between 20kg and 350kg.');
            return;
          }

          const history = trackerPage.getWeightHistory();
          history.push({
            id: root.StorageManager.generateId(),
            date: dateVal,
            weight: weightVal,
            note: noteVal
          });

          // Sort chronologically by date
          history.sort((a, b) => new Date(a.date) - new Date(b.date));
          trackerPage.saveWeightHistory(history);

          // Update user settings weight as well
          root.StorageManager.updateSettings({ weight: weightVal });

          form.reset();
          if (dateInput) dateInput.value = root.StorageManager.getTodayKey();

          trackerPage.renderWeightStats();
          trackerPage.renderWeightTable();
          trackerPage.renderWeightChart();
          trackerPage.initBmi(); // Re-sync BMI with newly logged weight

          if (root.showToast) root.showToast(`Weight recorded: ${weightVal.toFixed(1)} kg`);
        });
      }

      // Event delegation for deleting weight record
      const tbody = document.getElementById('weight-table-body');
      if (tbody) {
        tbody.addEventListener('click', function (e) {
          const deleteBtn = e.target.closest('[data-delete-weight]');
          if (!deleteBtn) return;
          const id = deleteBtn.getAttribute('data-delete-weight');
          if (confirm('Delete this weight record?')) {
            let history = trackerPage.getWeightHistory();
            history = history.filter(item => item.id !== id);
            trackerPage.saveWeightHistory(history);
            trackerPage.renderWeightStats();
            trackerPage.renderWeightTable();
            trackerPage.renderWeightChart();
            trackerPage.initBmi();
            if (root.showToast) root.showToast('Weight log deleted');
          }
        });
      }
    }
  };

  root.Tracker = Tracker;

})(typeof window !== 'undefined' ? window : this);
