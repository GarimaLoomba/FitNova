/**
 * workers/fitnessWorker.js — background thread, not a page script
 *
 * workerManager.js (in the js folder) sends workouts with postMessage().
 * This file adds the numbers, then sends the result back with postMessage().
 * That reply is received by workerManager.js in its message listener.
 */
self.onmessage = function (event) {
  'use strict';

  var data = event.data || {};
  var workouts = (data.payload && data.payload.workouts) || [];
  var filter = (data.payload && data.payload.filter) || 'week';

  // Job 1: totals, records, and chart points.
  if (data.action === 'CALCULATE_METRICS') {
    self.postMessage({
      action: 'METRICS_RESULT',
      payload: processFitnessMetrics(workouts, filter),
      filter: filter
    });
    return;
  }

  // Job 2: how many sessions of each activity type.
  if (data.action === 'SUMMARIZE_ACTIVITIES') {
    self.postMessage({
      action: 'ACTIVITY_SUMMARY',
      payload: summarizeActivities(workouts, filter),
      filter: filter
    });
    return;
  }

  self.postMessage({ error: 'Unknown action' });
};

function workoutsInRange(workouts, filter) {
  var now = new Date();
  return workouts.filter(function (item) {
    if (!item.date) return false;
    var itemDate = new Date(item.date);
    var diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
    if (filter === 'week') return diffDays <= 7;
    if (filter === '5weeks') return diffDays <= 35;
    if (filter === '52weeks') return diffDays <= 365;
    if (filter === 'year') return itemDate.getFullYear() === now.getFullYear();
    return true;
  });
}

function summarizeActivities(workouts, filter) {
  var counts = {};
  var matched = workoutsInRange(workouts, filter);
  matched.forEach(function (workout) {
    var activityType = workout.type || 'Other';
    counts[activityType] = (counts[activityType] || 0) + 1;
  });

  var activities = Object.keys(counts).map(function (activityType) {
    return { type: activityType, count: counts[activityType] };
  });
  activities.sort(function (first, second) { return second.count - first.count; });

  return {
    activities: activities,
    total: matched.length
  };
}

function processFitnessMetrics(workouts, filter) {
  var startTime = performance.now();
  var now = new Date();

  var filtered = workoutsInRange(workouts, filter);

  var totalDistance = 0;
  var totalDuration = 0;
  var totalCalories = 0;
  var maxDistance = { value: 0, date: '—', name: '—' };
  var maxCalories = { value: 0, date: '—', name: '—' };
  var maxDuration = { value: 0, date: '—', name: '—' };
  var activityDistribution = {};

  filtered.forEach(function (w) {
    var dist = Number(w.distance) || 0;
    var dur = Number(w.duration) || 0;
    var cal = Number(w.calories) || 0;
    var type = w.type || 'Other';
    totalDistance += dist;
    totalDuration += dur;
    totalCalories += cal;
    activityDistribution[type] = (activityDistribution[type] || 0) + 1;
    if (dist > maxDistance.value) maxDistance = { value: dist, date: w.date, name: w.name || type };
    if (cal > maxCalories.value) maxCalories = { value: cal, date: w.date, name: w.name || type };
    if (dur > maxDuration.value) maxDuration = { value: dur, date: w.date, name: w.name || type };
  });

  var chartPoints = [];
  var i;
  if (filter === 'week') {
    for (i = 6; i >= 0; i -= 1) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      var dayDistance = 0;
      var dayCalories = 0;
      filtered.forEach(function (w) {
        if (w.date === key) {
          dayDistance += Number(w.distance) || 0;
          dayCalories += Number(w.calories) || 0;
        }
      });
      chartPoints.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: key,
        distance: dayDistance,
        calories: dayCalories
      });
    }
  } else {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var currentMonth = now.getMonth();
    for (i = 5; i >= 0; i -= 1) {
      var monthIndex = (currentMonth - i + 12) % 12;
      var monthDist = 0;
      filtered.forEach(function (w) {
        if (new Date(w.date).getMonth() === monthIndex) monthDist += Number(w.distance) || 0;
      });
      chartPoints.push({ label: months[monthIndex], distance: Number(monthDist.toFixed(1)), calories: 0 });
    }
  }

  var count = filtered.length;
  return {
    totals: {
      distance: totalDistance.toFixed(1),
      durationMinutes: totalDuration,
      durationFormatted: formatDuration(totalDuration),
      calories: Math.round(totalCalories),
      workouts: count,
      avgDuration: count ? Math.round(totalDuration / count) : 0,
      avgCalories: count ? Math.round(totalCalories / count) : 0
    },
    personalRecords: {
      farthest: maxDistance.value ? maxDistance.value.toFixed(1) + ' mi (' + maxDistance.name + ')' : '—',
      mostCalories: maxCalories.value ? Math.round(maxCalories.value) + ' kcal (' + maxCalories.name + ')' : '—',
      longestDuration: maxDuration.value ? formatDuration(maxDuration.value) + ' (' + maxDuration.name + ')' : '—',
      estimated5kPace: '—',
      estimated10kPace: '—',
      halfMarathon: '—'
    },
    activityDistribution: activityDistribution,
    chartPoints: chartPoints,
    executionTimeMs: (performance.now() - startTime).toFixed(2)
  };
}

function formatDuration(mins) {
  var hours = Math.floor(mins / 60);
  var rest = Math.round(mins % 60);
  if (!hours) return rest + 'm';
  return hours + 'h ' + rest + 'm';
}
