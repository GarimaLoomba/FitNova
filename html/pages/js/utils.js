/**
 * utils.js — small helper functions used by many pages
 *
 * CLASS EXPLANATION:
 * Instead of copying the same date / calorie code into every file,
 * we keep it here and call FTUtils.formatDateKey(), FTUtils.estimateCalories(), etc.
 */
(function (root) {
  'use strict';

  // findOne('#greeting') returns the first matching element, or null.
  function findOne(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  // findAll('.card') returns every matching element as a normal array.
  function findAll(selector, parent) {
    return Array.from((parent || document).querySelectorAll(selector));
  }

  // Wait until the user stops typing, then run the function once.
  function debounce(callback, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var owner = this;
      clearTimeout(timer);
      timer = setTimeout(function () { callback.apply(owner, args); }, wait || 200);
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateKey(date) {
    var d = date ? new Date(date) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function formatDisplayDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }).format(date instanceof Date ? date : new Date(date));
  }

  function formatDuration(mins) {
    var total = Math.max(0, Math.round(Number(mins) || 0));
    var hours = Math.floor(total / 60);
    var rest = total % 60;
    if (!hours) return rest + 'm';
    return hours + 'h ' + rest + 'm';
  }

  function formatClock(totalSeconds) {
    var secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var hours = Math.floor(secs / 3600);
    var minutes = Math.floor((secs % 3600) / 60);
    var seconds = secs % 60;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  }

  function initials(name) {
    return (name || 'Athlete')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part[0].toUpperCase(); })
      .join('');
  }

  var METS = {
    Running: 9.8,
    Walking: 3.5,
    Cycling: 7.5,
    Gym: 5.0,
    'Strength Training': 5.0,
    Strength: 5.0,
    Yoga: 3.0,
    HIIT: 8.0,
    Swimming: 8.0,
    Cardio: 7.0,
    Other: 5.0
  };

  function estimateCalories(weightKg, activityType, durationMin) {
    var met = METS[activityType] || METS.Other;
    var hours = Math.max(0, Number(durationMin) || 0) / 60;
    var kg = Math.max(30, Number(weightKg) || 70);
    return Math.round(met * kg * hours);
  }

  function kgToLb(kg) {
    return Number(kg) * 2.20462;
  }

  function lbToKg(lb) {
    return Number(lb) / 2.20462;
  }

  function kmToMiles(km) {
    return Number(km) * 0.621371;
  }

  function milesToKm(mi) {
    return Number(mi) / 0.621371;
  }

  function mlToOz(ml) {
    return Number(ml) / 29.5735;
  }

  function formatWeight(kg, unit) {
    var value = Number(kg) || 0;
    if (unit === 'lbs') return (kgToLb(value)).toFixed(1) + ' lbs';
    return value.toFixed(1) + ' kg';
  }

  function formatDistance(miles, unit) {
    var value = Number(miles) || 0;
    if (unit === 'km') return milesToKm(value).toFixed(1) + ' km';
    return value.toFixed(1) + ' mi';
  }

  function formatWater(ml, unit) {
    var value = Number(ml) || 0;
    if (unit === 'oz') return Math.round(mlToOz(value)) + ' oz';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' L';
    return Math.round(value) + ' ml';
  }

  function youtubeIdFromUrl(url) {
    if (!url) return '';
    var match = String(url).match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : '';
  }

  function onAppReady(callback) {
    if (root.__FT_READY) {
      callback();
      return;
    }
    document.addEventListener('ft:ready', callback, { once: true });
  }

  function emitDataChange(type, extra) {
    document.dispatchEvent(new CustomEvent('ft:datachange', {
      detail: Object.assign({ type: type || 'all' }, extra || {})
    }));
  }

  root.FTUtils = {
    findOne: findOne,
    findAll: findAll,
    $: findOne,
    $$: findAll,
    debounce: debounce,
    escapeHtml: escapeHtml,
    formatDateKey: formatDateKey,
    formatDisplayDate: formatDisplayDate,
    formatDuration: formatDuration,
    formatClock: formatClock,
    initials: initials,
    estimateCalories: estimateCalories,
    METS: METS,
    kgToLb: kgToLb,
    lbToKg: lbToKg,
    kmToMiles: kmToMiles,
    milesToKm: milesToKm,
    formatWeight: formatWeight,
    formatDistance: formatDistance,
    formatWater: formatWater,
    youtubeIdFromUrl: youtubeIdFromUrl,
    onAppReady: onAppReady,
    emitDataChange: emitDataChange
  };

  root.onAppReady = onAppReady;
})(typeof window !== 'undefined' ? window : this);
