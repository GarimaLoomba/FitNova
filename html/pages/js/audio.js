/**
 * audio.js — beep sounds with the Web Audio API
 *
 * CLASS EXPLANATION:
 * We do not use MP3 files. The browser can make a beep with:
 *   AudioContext → Oscillator (the pitch) → Gain (the volume) → speakers
 *
 * Chrome starts AudioContext as "suspended". The user must click first,
 * then we call resume() so the beep can play.
 */
(function (root) {
  'use strict';

  var ctx = null;

  function soundAllowed() {
    if (!root.StorageManager) return true;
    return root.StorageManager.getSettings().soundEnabled !== false;
  }

  function getAudio() {
    var API = window.AudioContext || window.webkitAudioContext;
    if (!API) return null;
    if (!ctx) ctx = new API();
    return ctx;
  }

  function playBeep(frequency, duration) {
    if (!soundAllowed()) return;
    var audio = getAudio();
    if (!audio) return;

    // Unlock after a click
    if (audio.state === 'suspended') {
      audio.resume();
    }

    try {
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      var now = audio.currentTime;
      osc.frequency.value = frequency || 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, now + (duration || 0.2));
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + (duration || 0.2) + 0.05);
    } catch (err) {
      console.warn('Beep failed', err);
    }
  }

  function playCompletionChime() {
    playBeep(660, 0.15);
    setTimeout(function () { playBeep(880, 0.3); }, 160);
  }

  document.addEventListener('click', function () {
    var audio = getAudio();
    if (audio && audio.state === 'suspended') audio.resume();
  });

  root.FTAudio = {
    playBeep: playBeep,
    playCompletionChime: playCompletionChime,
    playStartCue: function () { playBeep(523, 0.12); },
    test: function () {
      if (root.StorageManager) root.StorageManager.updateSettings({ soundEnabled: true });
      playCompletionChime();
      if (root.showToast) root.showToast('Sound is on');
    }
  };
  root.playBeep = playBeep;
  root.playCompletionChime = playCompletionChime;
})(typeof window !== 'undefined' ? window : this);
