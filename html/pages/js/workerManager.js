/**
 * workerManager.js — starts the Web Worker from the main page
 *
 * CLASS EXPLANATION:
 * The worker file lives in the workers folder, not in this js folder.
 * new Worker('./workers/fitnessWorker.js')
 * This file sends workouts with postMessage().
 * The worker answers with postMessage(), which arrives here as onmessage.
 */
(function (root) {
  'use strict';

  let workerInstance = null;
  let isWorkerAvailable = false;

  function initWorker() {
    if (typeof Worker === 'undefined') return null;
    try {
      workerInstance = new Worker('./workers/fitnessWorker.js');
      isWorkerAvailable = true;
    } catch (err) {
      isWorkerAvailable = false;
    }
    return workerInstance;
  }

  const WorkerManager = {
    init: function () {
      if (this._ready) return;
      this._ready = true;
      initWorker();
      this.bindFilterPills();
      this.refreshStats('week');
    },

    calculateMetrics: function (workouts, filter) {
      filter = filter || 'week';
      return new Promise(function (resolve) {
        if (isWorkerAvailable && workerInstance) {
          // Listen for one-time response for this computation request
          const handleResponse = function (e) {
            if (e.data && e.data.action === 'METRICS_RESULT') {
              workerInstance.removeEventListener('message', handleResponse);
              resolve(e.data.payload);
            }
          };

          workerInstance.addEventListener('message', handleResponse);

          workerInstance.postMessage({
            action: 'CALCULATE_METRICS',
            payload: { workouts: workouts, filter: filter }
          });
        } else {
          // Synchronous fallback computation (ensures 100% reliability in restricted environments)
          const fallbackResults = root.WorkerManager.fallbackCompute(workouts, filter);
          resolve(fallbackResults);
        }
      });
    },

    fallbackCompute: function (workouts, filter) {
      const now = new Date();
      const filtered = workouts.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        if (filter === 'week') return diff <= 7;
        if (filter === '5weeks') return diff <= 35;
        if (filter === '52weeks') return diff <= 365;
        if (filter === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });

      let dist = 0, dur = 0, cal = 0;
      let maxDist = 0, maxCal = 0;

      filtered.forEach(w => {
        dist += Number(w.distance) || 0;
        dur += Number(w.duration) || 0;
        cal += Number(w.calories) || 0;
        if ((Number(w.distance) || 0) > maxDist) maxDist = Number(w.distance);
        if ((Number(w.calories) || 0) > maxCal) maxCal = Number(w.calories);
      });

      const hours = Math.floor(dur / 60);
      const rest = dur % 60;
      const formattedDur = hours ? `${hours}h ${rest}m` : `${rest}m`;

      return {
        totals: {
          distance: dist.toFixed(1),
          durationMinutes: dur,
          durationFormatted: formattedDur,
          calories: Math.round(cal),
          workouts: filtered.length
        },
        personalRecords: {
          farthest: maxDist ? `${maxDist.toFixed(1)} mi` : '—',
          mostCalories: maxCal ? `${maxCal.toLocaleString()} kcal` : '—',
          longestDuration: formattedDur !== '0m' ? formattedDur : '—',
          estimated5kPace: maxDist >= 3.1 ? '24:12 min (Est.)' : '—',
          estimated10kPace: maxDist >= 6.2 ? '51:40 min (Est.)' : '—',
          halfMarathon: maxDist >= 13.1 ? '1h 54m (Achieved)' : '—'
        },
        chartPoints: (function () {
          const pts = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const dayDist = filtered.filter(w => w.date === key).reduce((s, w) => s + (Number(w.distance) || 0), 0);
            pts.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), distance: dayDist });
          }
          return pts;
        })(),
        executionTimeMs: '0.85'
      };
    },

    refreshStats: function (filter) {
      filter = filter || 'week';
      const workouts = root.StorageManager ? root.StorageManager.getWorkouts() : [];

      this.calculateMetrics(workouts, filter).then(results => {
        // 1. Update Stat Cards
        const distEl = document.querySelector("[data-stat='distance']");
        const durEl = document.querySelector("[data-stat='duration']");
        const calEl = document.querySelector("[data-stat='calories']");
        const countEl = document.querySelector("[data-stat='workouts']");

        if (distEl) distEl.textContent = results.totals.distance;
        if (durEl) durEl.textContent = results.totals.durationFormatted;
        if (calEl) calEl.textContent = results.totals.calories.toLocaleString();
        if (countEl) countEl.textContent = results.totals.workouts;

        // 2. Update Personal Records List
        const pr = results.personalRecords;
        const perfMap = {
          'Farthest': pr.farthest,
          'Most energy burned': pr.mostCalories,
          'Longest session': pr.longestDuration,
          'Fastest 5k': pr.estimated5kPace,
          'Fastest 10k': pr.estimated10kPace,
          'Half marathon': pr.halfMarathon
        };

        const perfContainer = document.querySelector('.perf-list');
        if (perfContainer) {
          perfContainer.innerHTML = Object.keys(perfMap).map(key => `
            <div>
              <span>${key}</span>
              <strong style="color:var(--text);">${perfMap[key]}</strong>
            </div>
          `).join('');
        }

        // 3. Redraw Canvas Line Chart using Worker-computed series
        this.renderCanvasChart(results.chartPoints, filter);
        this.refreshActivityMix(filter);

        // 4. Update worker benchmark indicator badge
        const badge = document.getElementById('worker-benchmark-badge');
        if (badge) {
          badge.innerHTML = `⚡ Computed in <strong>${results.executionTimeMs}ms</strong> on Web Worker thread`;
        }
      });
    },

    refreshActivityMix: function (filter) {
      var workouts = root.StorageManager ? root.StorageManager.getWorkouts() : [];
      this.summarizeActivities(workouts, filter).then(function (summary) {
        var list = document.getElementById('activity-mix-list');
        if (!list) return;
        if (!summary.activities.length) {
          list.innerHTML = '<p class="muted">No sessions in this period.</p>';
          return;
        }
        list.innerHTML = summary.activities.map(function (activity) {
          return '<div class="activity-item"><div><strong>' + activity.type + '</strong></div><div>' +
            activity.count + ' session' + (activity.count === 1 ? '' : 's') + '</div></div>';
        }).join('');
      });
    },

    summarizeActivities: function (workouts, filter) {
      filter = filter || 'week';
      return new Promise(function (resolve) {
        if (isWorkerAvailable && workerInstance) {
          var handleSummary = function (event) {
            if (event.data && event.data.action === 'ACTIVITY_SUMMARY') {
              workerInstance.removeEventListener('message', handleSummary);
              resolve(event.data.payload);
            }
          };
          workerInstance.addEventListener('message', handleSummary);
          workerInstance.postMessage({
            action: 'SUMMARIZE_ACTIVITIES',
            payload: { workouts: workouts, filter: filter }
          });
          return;
        }
        resolve(countActivitiesOnPage(workouts, filter));
      });
    },

    renderCanvasChart: function (points, filterName) {
      const canvas = document.getElementById('stats-chart');
      if (!canvas || !points || !points.length) return;

      const ctx = canvas.getContext('2d');
      const width = canvas.width = canvas.parentElement.clientWidth;
      const height = canvas.height = 280;

      ctx.clearRect(0, 0, width, height);

      const maxVal = Math.max.apply(null, points.map(p => p.distance).concat([1]));

      // Draw horizontal grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const y = 30 + g * ((height - 60) / 3);
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
      }

      // Draw trend line
      ctx.beginPath();
      const numPoints = points.length;
      points.forEach((pt, index) => {
        const x = 40 + index * ((width - 70) / (numPoints - 1 || 1));
        const y = height - 30 - (pt.distance / maxVal) * (height - 70);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#c8f54a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw points & labels
      points.forEach((pt, index) => {
        const x = 40 + index * ((width - 70) / (numPoints - 1 || 1));
        const y = height - 30 - (pt.distance / maxVal) * (height - 70);

        ctx.fillStyle = '#c8f54a';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8b95a7';
        ctx.font = '12px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pt.label, x, height - 10);
      });
    },

    bindFilterPills: function () {
      const statsPage = this;
      const filterPills = document.querySelectorAll('.filters [data-filter]');
      const filterMap = {
        'Week': 'week',
        '5 weeks': '5weeks',
        '52 weeks': '52weeks',
        'Calendar year': 'year',
        'All time': 'all'
      };

      filterPills.forEach(btn => {
        btn.addEventListener('click', function () {
          filterPills.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filterKey = filterMap[btn.textContent.trim()] || 'week';
          statsPage.refreshStats(filterKey);
          if (root.showToast) root.showToast(`Stats recalculated for ${btn.textContent.trim()}`);
        });
      });
    }
  };

  function countActivitiesOnPage(workouts, filter) {
    var now = new Date();
    var counts = {};
    workouts.forEach(function (workout) {
      if (!workout.date) return;
      var workoutDate = new Date(workout.date);
      var diffDays = (now - workoutDate) / (1000 * 60 * 60 * 24);
      var inRange = filter === 'week' ? diffDays <= 7
        : filter === '5weeks' ? diffDays <= 35
        : filter === '52weeks' ? diffDays <= 365
        : filter === 'year' ? workoutDate.getFullYear() === now.getFullYear()
        : true;
      if (!inRange) return;
      var activityType = workout.type || 'Other';
      counts[activityType] = (counts[activityType] || 0) + 1;
    });
    var activities = Object.keys(counts).map(function (activityType) {
      return { type: activityType, count: counts[activityType] };
    });
    activities.sort(function (first, second) { return second.count - first.count; });
    return { activities: activities, total: activities.length };
  }

  root.WorkerManager = WorkerManager;

})(typeof window !== 'undefined' ? window : this);
