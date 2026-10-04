/**
 * api.js — fetch() demo with a backup list if the internet is off
 *
 * CLASS EXPLANATION:
 *   try { await fetch(url) } catch { use FALLBACK_FITNESS_DATA }
 * Promise.all() waits for two requests at the same time.
 */
(function (root) {
  'use strict';

  var FALLBACK = {
    quote: {
      text: 'Consistency is what transforms average into excellence.',
      author: 'Training Principle'
    },
    nutritionTip: {
      title: 'Hydration & Electrolytes',
      tip: 'Drink water regularly during the day to stay hydrated for training.'
    }
  };

  var ApiService = {
    fetchDailyQuote: async function () {
      try {
        var response = await fetch('https://api.quotable.io/random?tags=fitness|inspirational');
        if (!response.ok) throw new Error('bad status');
        var data = await response.json();
        return { text: data.content, author: data.author, isLive: true };
      } catch (err) {
        return { text: FALLBACK.quote.text, author: FALLBACK.quote.author, isLive: false };
      }
    },

    fetchNutritionTip: function () {
      return Promise.resolve(FALLBACK.nutritionTip);
    },

    fetchDailyInsights: async function () {
      var results = await Promise.all([
        this.fetchDailyQuote(),
        this.fetchNutritionTip()
      ]);
      return { quote: results[0], nutrition: results[1] };
    },

    renderAdviceWidget: async function () {
      var container = document.getElementById('daily-advice-widget');
      if (!container) return;
      container.innerHTML = '<p class="muted">Loading daily tip...</p>';

      var insights = await this.fetchDailyInsights();
      var live = insights.quote.isLive ? '(from internet)' : '(saved locally)';
      container.innerHTML =
        '<p><strong>“' + insights.quote.text + '”</strong></p>' +
        '<p class="muted">— ' + insights.quote.author + ' ' + live + '</p>' +
        '<p><strong>Tip: ' + insights.nutrition.title + '</strong><br>' +
        '<span class="muted">' + insights.nutrition.tip + '</span></p>';
    },

    setExerciseStatus: function (state, message) {
      var el = document.getElementById('exercise-api-status');
      if (!el) return;
      el.textContent = message;
      el.dataset.state = state;
    },

    enrichExercises: async function (exercisesModule) {
      this.setExerciseStatus('loading', 'Loading extra exercise ideas…');
      if (!navigator.onLine) {
        this.setExerciseStatus('empty', 'Offline — using the local exercise library.');
        return;
      }
      try {
        var response = await fetch('https://wger.de/api/v2/exerciseinfo/?language=2&limit=12');
        if (!response.ok) throw new Error('bad status');
        var data = await response.json();
        var remote = (data.results || []).map(function (item, index) {
          var translation = (item.translations || [])[0] || {};
          var name = translation.name || item.name || ('Exercise ' + (index + 1));
          var description = String(translation.description || '')
            .replace(/<[^>]+>/g, ' ')
            .trim() || 'No description.';
          return {
            id: 'wger_' + (item.id || index),
            name: name,
            muscle: 'Full Body',
            secondary: [],
            equipment: 'Mixed',
            difficulty: 'Intermediate',
            category: 'Catalog',
            description: description.slice(0, 280),
            instructions: [description.slice(0, 280)],
            calories: 6,
            videoId: '',
            source: 'wger'
          };
        });
        var known = {};
        exercisesModule.items.forEach(function (item) {
          known[item.name.toLowerCase()] = true;
        });
        var added = 0;
        remote.forEach(function (item) {
          if (!known[item.name.toLowerCase()]) {
            exercisesModule.items.push(item);
            added += 1;
          }
        });
        exercisesModule.renderCategoryCounts();
        exercisesModule.renderList();
        this.setExerciseStatus('success', 'Local library plus ' + added + ' extra catalog entries.');
      } catch (err) {
        this.setExerciseStatus('error', 'Could not reach the public catalog. Local library still works.');
      }
    }
  };

  root.ApiService = ApiService;

})(typeof window !== 'undefined' ? window : this);
