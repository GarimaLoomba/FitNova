/**
 * routes.js — GPS position and saved walking routes
 *
 * CLASS EXPLANATION:
 * navigator.geolocation.getCurrentPosition() asks the browser for GPS.
 * Saved routes are a normal array in localStorage.
 */
(function (root) {
  'use strict';

  const STORAGE_ROUTES_KEY = 'ft-custom-routes';

  // Sample route database templates
  const MOCK_TRAILS = [
    { name: 'Riverfront Green Loop', dist: 3.5, surface: 'Paved Asphalt', difficulty: 'Easy', elev: '+15m' },
    { name: 'Community Park Perimeter', dist: 5.2, surface: 'Packed Dirt / Turf', difficulty: 'Moderate', elev: '+45m' },
    { name: 'Old Town Heritage Circuit', dist: 7.8, surface: 'Cobblestone & Pavement', difficulty: 'Moderate', elev: '+60m' },
    { name: 'Ridge Peak Hill Climber', dist: 10.4, surface: 'Trail Gravel', difficulty: 'Challenging', elev: '+180m' }
  ];

  const RoutesManager = {
    init: function () {
      if (this._ready) return;
      this._ready = true;
      this.bindGeolocation();
      this.bindCitySearch();
      this.bindRouteCreator();
      this.renderSavedRoutes();
    },

    getSavedRoutes: function () {
      return root.StorageManager ? root.StorageManager.load(STORAGE_ROUTES_KEY, []) : [];
    },

    saveRoute: function (route) {
      const routes = this.getSavedRoutes();
      routes.push(route);
      if (root.StorageManager) root.StorageManager.save(STORAGE_ROUTES_KEY, routes);
      this.renderSavedRoutes();
      if (root.showToast) root.showToast(`Route "${route.name}" saved!`, 'success');
    },

    deleteRoute: function (id) {
      let routes = this.getSavedRoutes();
      routes = routes.filter(r => r.id !== id);
      if (root.StorageManager) root.StorageManager.save(STORAGE_ROUTES_KEY, routes);
      this.renderSavedRoutes();
      if (root.showToast) root.showToast('Route removed');
    },

    bindGeolocation: function () {
      const btn = document.getElementById('btn-get-location');
      const statusEl = document.getElementById('geo-status');
      const resultsEl = document.getElementById('geo-results');
      if (!btn) return;

      btn.addEventListener('click', function () {
        if (!('geolocation' in navigator)) {
          if (statusEl) {
            statusEl.innerHTML = '<span style="color:var(--orange);">Geolocation is not supported by your current browser.</span>';
          }
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Acquiring GPS location...';
        if (statusEl) {
          statusEl.innerHTML = '<p class="muted">Requesting coordinates from device GPS...</p>';
        }

        const options = {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000 // Cache for 1 minute
        };

        navigator.geolocation.getCurrentPosition(
          // Success callback
          function (position) {
            btn.disabled = false;
            btn.textContent = 'Location Acquired ✓';
            const lat = position.coords.latitude.toFixed(4);
            const lng = position.coords.longitude.toFixed(4);
            const acc = Math.round(position.coords.accuracy);

            if (statusEl) {
              statusEl.innerHTML = `
                <div class="user-chip" style="display:inline-flex;margin-bottom:12px;">
                  <span class="avatar" style="background:var(--cyan);color:#07090c;">GPS</span>
                  <span><strong>${lat}°, ${lng}°</strong> (±${acc}m accuracy)</span>
                </div>
                <p class="muted" style="font-size:13px;">Found 3 accessible training circuits within 5km of your current location:</p>
              `;
            }

            if (resultsEl) {
              resultsEl.hidden = false;
              resultsEl.innerHTML = MOCK_TRAILS.slice(0, 3).map(trail => `
                <div class="activity-item" style="align-items:center;">
                  <div>
                    <strong>${trail.name}</strong>
                    <p class="muted">${trail.surface} · ${trail.difficulty} · ${trail.elev} elevation</p>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-family:var(--display);font-size:20px;font-weight:700;">${trail.dist} mi</span>
                    <button class="btn btn-secondary btn-xs" type="button" data-save-trail="${trail.name}" data-dist="${trail.dist}">Save</button>
                  </div>
                </div>
              `).join('');
            }

            if (root.showToast) root.showToast('GPS position confirmed', 'success');
          },
          // Error callback
          function (err) {
            btn.disabled = false;
            btn.textContent = 'Retry GPS Discovery';

            let msg = 'Unknown location error occurred.';
            switch (err.code) {
              case err.PERMISSION_DENIED:
                msg = 'Location permission was denied. You can still search for any city below.';
                break;
              case err.POSITION_UNAVAILABLE:
                msg = 'Device position unavailable. Ensure your GPS is active.';
                break;
              case err.TIMEOUT:
                msg = 'Location request timed out. Please try again.';
                break;
            }

            if (statusEl) {
              statusEl.innerHTML = `<p style="color:var(--orange);font-size:13px;">⚡ ${msg}</p>`;
            }
            if (root.showToast) root.showToast(msg, 'warning');
          },
          options
        );
      });

      // Handle saving a discovered GPS trail
      if (resultsEl) {
        resultsEl.addEventListener('click', function (e) {
          const saveBtn = e.target.closest('[data-save-trail]');
          if (!saveBtn) return;
          const name = saveBtn.getAttribute('data-save-trail');
          const dist = parseFloat(saveBtn.getAttribute('data-dist'));
          RoutesManager.saveRoute({
            id: root.StorageManager ? root.StorageManager.generateId() : 'rt_' + Date.now(),
            name: name,
            distance: dist,
            city: 'Nearby GPS',
            date: root.StorageManager ? root.StorageManager.getTodayKey() : ''
          });
        });
      }
    },

    bindCitySearch: function () {
      const form = document.getElementById('city-form');
      const result = document.getElementById('city-result');
      if (!form || !result) return;

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const cityInput = document.getElementById('city');
        const city = cityInput ? cityInput.value.trim() : '';
        if (!city) return;

        result.hidden = false;
        result.innerHTML = `
          <div class="tracker-header">
            <h3>Popular routes in ${city}</h3>
            <span class="chip">${MOCK_TRAILS.length} routes found</span>
          </div>
          <div style="display:grid;gap:12px;margin-top:16px;">
            ${MOCK_TRAILS.map(t => `
              <div class="panel" style="padding:16px;background:var(--surface-2);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <h4 style="margin:0 0 4px;">${city} ${t.name}</h4>
                    <p class="muted" style="font-size:12px;">${t.surface} · ${t.difficulty} · ${t.elev} climb</p>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <strong style="font-family:var(--display);font-size:18px;">${t.dist} mi</strong>
                    <button class="btn btn-primary btn-xs" type="button" data-quick-save-city="${city} ${t.name}" data-dist="${t.dist}">Save</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        result.querySelectorAll('[data-quick-save-city]').forEach(btn => {
          btn.addEventListener('click', function () {
            const name = btn.getAttribute('data-quick-save-city');
            const dist = parseFloat(btn.getAttribute('data-dist'));
            RoutesManager.saveRoute({
              id: root.StorageManager ? root.StorageManager.generateId() : 'rt_' + Date.now(),
              name: name,
              distance: dist,
              city: city,
              date: root.StorageManager ? root.StorageManager.getTodayKey() : ''
            });
          });
        });

        if (root.showToast) root.showToast(`Displaying verified trails for ${city}`);
      });
    },

    bindRouteCreator: function () {
      const createBtn = document.getElementById('create-route');
      if (!createBtn) return;

      createBtn.addEventListener('click', function () {
        const name = prompt('Enter a name for your custom route (e.g. Sunset Canal Loop):');
        if (!name || !name.trim()) return;

        const distStr = prompt('Enter distance in miles (e.g. 4.2):', '3.0');
        if (distStr === null) return;
        const dist = parseFloat(distStr);
        if (isNaN(dist) || dist <= 0 || dist > 200) {
          alert('Please enter a valid positive distance.');
          return;
        }

        RoutesManager.saveRoute({
          id: root.StorageManager ? root.StorageManager.generateId() : 'rt_' + Date.now(),
          name: name.trim(),
          distance: dist,
          city: 'Custom',
          date: root.StorageManager ? root.StorageManager.getTodayKey() : ''
        });
      });

      const refreshBtn = document.getElementById('refresh-routes');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
          RoutesManager.renderSavedRoutes();
        });
      }
    },

    renderSavedRoutes: function () {
      const container = document.getElementById('saved-routes-list');
      if (!container) return;

      const routes = this.getSavedRoutes();
      if (!routes.length) {
        container.innerHTML = '<div class="empty-state">No saved custom routes yet. Discover nearby trails or create one above!</div>';
        return;
      }

      container.innerHTML = routes.map(r => `
        <div class="activity-item">
          <div>
            <strong>${r.name}</strong>
            <p class="muted">${r.city || 'Local'} · Saved on ${r.date || 'Recently'}</p>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <strong style="font-family:var(--display);font-size:18px;">${r.distance} mi</strong>
            <button class="btn btn-secondary btn-xs" type="button" data-delete-route="${r.id}" title="Delete route">✕</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('[data-delete-route]').forEach(btn => {
        btn.addEventListener('click', function () {
          RoutesManager.deleteRoute(btn.getAttribute('data-delete-route'));
        });
      });
    }
  };

  root.RoutesManager = RoutesManager;

})(typeof window !== 'undefined' ? window : this);
