/**
 * music.js — built-in Punjabi mixes + upload your own songs
 *
 * CLASS EXPLANATION:
 * Built-in mixes: we create a small WAV in JavaScript.
 * Your songs: <input type="file"> → File object → audio.src = URL.createObjectURL(file)
 * Big files are saved in IndexedDB (userSongs), not localStorage, and never uploaded to a server.
 */
(function (root) {
  'use strict';

  var PRESETS = [
    { id: 'gym', name: 'Bhangra Gym Mix', hint: 'Tumbi melody with a dhol beat' },
    { id: 'cardio', name: 'Punjabi Cardio', hint: 'Fast beat for running and HIIT' },
    { id: 'dhol', name: 'Dhol Power', hint: 'Heavy dhol drums, almost no melody' },
    { id: 'jatt', name: 'Jatt Energy', hint: 'Deep bass and sharp high notes' },
    { id: 'rest', name: 'Soft Punjabi Rest', hint: 'Slow and calm — for rest time' }
  ];

  var MAX_SIZE = 20 * 1024 * 1024;
  var wavUrls = {};
  var fileUrls = {};
  var uploads = [];
  var currentId = 'gym';
  var ready = false;

  function getPlayer() {
    return document.getElementById('punjabi-audio');
  }

  function soundOn() {
    if (!root.StorageManager) return true;
    return root.StorageManager.getSettings().soundEnabled !== false;
  }

  function muteMessage() {
    if (root.showToast) root.showToast('Sound is muted. Turn sound on to hear songs.', 'warning');
  }

  function applyMute() {
    var player = getPlayer();
    var allowed = soundOn();
    if (!player) return allowed;
    if (allowed) {
      player.muted = false;
      player.volume = 0.9;
      return true;
    }
    player.muted = true;
    player.volume = 0;
    if (!player.paused) player.pause();
    return false;
  }

  function allTracks() {
    return PRESETS.concat(uploads);
  }

  function findTrack(id) {
    var list = allTracks();
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }
    return PRESETS[0];
  }

  function pluck(freq, t, start, life, volume) {
    var age = t - start;
    if (age < 0 || age > life) return 0;
    return Math.sin(2 * Math.PI * freq * t) * Math.exp(-age / (life * 0.28)) * volume;
  }

  function drum(freq, t, start, volume) {
    var age = t - start;
    if (age < 0 || age > 0.18) return 0;
    return Math.sin(2 * Math.PI * freq * t) * Math.exp(-age * 18) * volume;
  }

  function mixForSong(song, t) {
    var beatLen;
    var beat;
    var start;

    if (song.id === 'gym') {
      beatLen = 60 / 132 / 2;
      beat = Math.floor(t / beatLen) % 8;
      start = Math.floor(t / beatLen) * beatLen;
      var tumbi = [784, 659, 784, 880, 659, 587, 659, 784];
      var sound = pluck(tumbi[beat], t, start, beatLen, 0.34);
      if (beat === 0 || beat === 4) sound += drum(72, t, start, 0.7);
      if (beat === 2 || beat === 6) sound += drum(160, t, start, 0.35);
      if (beat === 1 || beat === 5) sound += drum(420, t, start, 0.12);
      return sound;
    }

    if (song.id === 'cardio') {
      beatLen = 60 / 152 / 2;
      beat = Math.floor(t / beatLen) % 8;
      start = Math.floor(t / beatLen) * beatLen;
      var run = [523, 659, 784, 659, 880, 784, 659, 523];
      var sound = pluck(run[beat], t, start, beatLen * 0.7, 0.22);
      sound += drum(88, t, start, beat % 2 === 0 ? 0.55 : 0.22);
      return sound;
    }

    if (song.id === 'dhol') {
      beatLen = 60 / 116 / 2;
      beat = Math.floor(t / beatLen) % 8;
      start = Math.floor(t / beatLen) * beatLen;
      var sound = 0;
      if (beat === 0 || beat === 4) sound += drum(60, t, start, 0.9);
      if (beat === 2 || beat === 6) sound += drum(95, t, start, 0.7);
      if (beat === 1 || beat === 3 || beat === 5 || beat === 7) sound += drum(210, t, start, 0.4);
      return sound;
    }

    if (song.id === 'jatt') {
      beatLen = 60 / 140 / 2;
      beat = Math.floor(t / beatLen) % 8;
      start = Math.floor(t / beatLen) * beatLen;
      var notes = [220, 330, 277, 440, 330, 220, 370, 440];
      var age = t - start;
      var env = Math.max(0, 1 - age / (beatLen * 0.9));
      var f = notes[beat];
      var sound = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t)) * env * 0.28;
      if (beat === 0 || beat === 4) sound += drum(55, t, start, 0.75);
      if (beat === 2 || beat === 6) sound += drum(110, t, start, 0.3);
      return sound;
    }

    beatLen = 60 / 72;
    beat = Math.floor(t / beatLen) % 4;
    start = Math.floor(t / beatLen) * beatLen;
    var flute = [330, 392, 349, 294];
    var pad = Math.sin(2 * Math.PI * 196 * t) * 0.08 + Math.sin(2 * Math.PI * 294 * t) * 0.06;
    return pad + pluck(flute[beat], t, start, beatLen * 0.95, 0.2);
  }

  function makeWavUrl(song) {
    if (wavUrls[song.id]) return wavUrls[song.id];
    var sampleRate = 22050;
    var total = sampleRate * 6;
    var samples = new Int16Array(total);
    for (var i = 0; i < total; i += 1) {
      var mix = mixForSong(song, i / sampleRate);
      if (mix > 1) mix = 1;
      if (mix < -1) mix = -1;
      samples[i] = Math.round(mix * 30000);
    }
    var bytes = samples.length * 2;
    var buffer = new ArrayBuffer(44 + bytes);
    var view = new DataView(buffer);
    function text(offset, str) {
      for (var c = 0; c < str.length; c += 1) view.setUint8(offset + c, str.charCodeAt(c));
    }
    text(0, 'RIFF');
    view.setUint32(4, 36 + bytes, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, bytes, true);
    for (var w = 0; w < samples.length; w += 1) {
      view.setInt16(44 + w * 2, samples[w], true);
    }
    wavUrls[song.id] = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    return wavUrls[song.id];
  }

  function trackUrl(track) {
    if (track.blob) {
      if (!fileUrls[track.id]) fileUrls[track.id] = URL.createObjectURL(track.blob);
      return fileUrls[track.id];
    }
    return makeWavUrl(track);
  }

  function setLabel() {
    var song = findTrack(currentId);
    var player = getPlayer();
    var playing = player && !player.paused;
    var title = document.getElementById('music-now-playing');
    var hint = document.getElementById('music-now-hint');
    if (title) title.textContent = song.name + (playing ? ' · playing' : ' · paused');
    if (hint) hint.textContent = song.hint || 'Your uploaded song';
    document.querySelectorAll('[data-track-id]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-track-id') === currentId);
    });
  }

  function loadCurrent(thenPlay) {
    var player = getPlayer();
    var song = findTrack(currentId);
    if (!player) return;
    player.loop = true;
    player.src = trackUrl(song);
    player.title = song.name;
    applyMute();
    setLabel();
    if (!thenPlay) return;
    if (!soundOn()) {
      muteMessage();
      return;
    }
    function startPlay() {
      player.onloadeddata = null;
      player.oncanplay = null;
      try { player.currentTime = 0; } catch (err) {}
      var start = player.play();
      if (start && start.catch) start.catch(function () { setLabel(); });
      setLabel();
    }
    player.onloadeddata = startPlay;
    player.oncanplay = startPlay;
    setTimeout(function () {
      if (player.paused) startPlay();
    }, 400);
  }

  function esc(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function renderUploads() {
    var box = document.getElementById('my-songs-list');
    if (!box) return;
    if (!uploads.length) {
      box.innerHTML = '<div class="empty-state">No uploaded songs yet. Use Upload songs to add your Punjabi playlist.</div>';
      return;
    }
    box.innerHTML = uploads.map(function (song) {
      return (
        '<div class="activity-item">' +
          '<div><strong>' + esc(song.name) + '</strong><p class="muted">Saved on this device</p></div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-primary btn-xs" type="button" data-play-upload="' + song.id + '">Play</button>' +
            '<button class="btn btn-secondary btn-xs" type="button" data-delete-upload="' + song.id + '">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function saveUpload(record) {
    if (!root.FitnessDB) return;
    root.FitnessDB.put('userSongs', record).catch(function () {});
  }

  function loadUploads() {
    if (!root.FitnessDB) return Promise.resolve();
    return root.FitnessDB.getAll('userSongs').then(function (rows) {
      uploads = (rows || []).filter(function (row) { return row && row.blob; });
      renderUploads();
    }).catch(function () {
      uploads = [];
      renderUploads();
    });
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    var added = 0;
    files.forEach(function (file) {
      var isAudio = !file.type ||
        file.type.indexOf('audio/') === 0 ||
        file.type === 'video/mp4' ||
        /\.(mp3|wav|m4a|ogg|aac|mpeg|mp4)$/i.test(file.name);
      if (!isAudio) {
        alert(file.name + ' is not an audio file. Please choose MP3, WAV, or M4A.');
        return;
      }
      if (file.size > MAX_SIZE) {
        alert(file.name + ' is larger than 20 MB.');
        return;
      }
      var record = {
        id: 'song_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: file.name.replace(/\.[^.]+$/, '') || 'My song',
        hint: 'Your uploaded song',
        type: file.type || 'audio/mpeg',
        blob: file
      };
      uploads.push(record);
      saveUpload(record);
      currentId = record.id;
      added += 1;
    });
    renderUploads();
    if (added) {
      if (!soundOn()) {
        loadCurrent(false);
        muteMessage();
      } else {
        loadCurrent(true);
        if (root.showToast) root.showToast('Song added. Press Play if you do not hear it yet.');
      }
    }
  }

  function deleteUpload(id) {
    uploads = uploads.filter(function (song) { return song.id !== id; });
    if (fileUrls[id]) {
      URL.revokeObjectURL(fileUrls[id]);
      delete fileUrls[id];
    }
    if (root.FitnessDB) root.FitnessDB.delete('userSongs', id).catch(function () {});
    if (currentId === id) currentId = 'gym';
    renderUploads();
    loadCurrent(false);
  }

  var PunjabiPlayer = {
    init: function () {
      if (ready) return;
      var list = document.getElementById('punjabi-track-list');
      var player = getPlayer();
      if (!list || !player) return;
      ready = true;

      list.innerHTML = PRESETS.map(function (song) {
        return '<button class="pill" type="button" data-track-id="' + song.id + '">' + song.name + '</button>';
      }).join('');

      loadCurrent(false);
      loadUploads();

      list.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-track-id]');
        if (!btn) return;
        PunjabiPlayer.playId(btn.getAttribute('data-track-id'));
      });

      var playBtn = document.getElementById('btn-music-play');
      var pauseBtn = document.getElementById('btn-music-pause');
      var nextBtn = document.getElementById('btn-music-next');
      if (playBtn) playBtn.addEventListener('click', function () { PunjabiPlayer.play(); });
      if (pauseBtn) pauseBtn.addEventListener('click', function () { PunjabiPlayer.pause(); });
      if (nextBtn) nextBtn.addEventListener('click', function () { PunjabiPlayer.next(); });

      var upload = document.getElementById('song-upload');
      var uploadBtn = document.getElementById('btn-upload-songs');
      if (uploadBtn && upload) {
        uploadBtn.addEventListener('click', function () {
          upload.click();
        });
      }
      if (upload) {
        upload.addEventListener('change', function () {
          if (upload.files && upload.files.length) addFiles(upload.files);
          upload.value = '';
        });
      }

      var myList = document.getElementById('my-songs-list');
      if (myList) {
        myList.addEventListener('click', function (event) {
          var playBtnU = event.target.closest('[data-play-upload]');
          var delBtn = event.target.closest('[data-delete-upload]');
          if (playBtnU) PunjabiPlayer.playId(playBtnU.getAttribute('data-play-upload'));
          if (delBtn) {
            var id = delBtn.getAttribute('data-delete-upload');
            if (confirm('Remove this song from My songs?')) deleteUpload(id);
          }
        });
      }

      player.addEventListener('play', function () {
        if (!soundOn()) {
          player.pause();
          player.muted = true;
          player.volume = 0;
          muteMessage();
        }
        setLabel();
      });
      player.addEventListener('pause', setLabel);
      player.addEventListener('volumechange', function () {
        if (!soundOn() && (!player.muted || player.volume > 0)) {
          player.muted = true;
          player.volume = 0;
        }
      });
      applyMute();
      setLabel();
    },

    syncSound: function () {
      applyMute();
      setLabel();
    },

    playId: function (id) {
      currentId = id;
      if (!soundOn()) {
        loadCurrent(false);
        muteMessage();
        return;
      }
      loadCurrent(true);
    },

    play: function () {
      this.init();
      var player = getPlayer();
      if (!player) return;
      if (!soundOn()) {
        applyMute();
        muteMessage();
        return;
      }
      if (!player.src) {
        loadCurrent(true);
        return;
      }
      var start = player.play();
      if (start && start.catch) start.catch(function () { setLabel(); });
      setLabel();
    },

    pause: function () {
      var player = getPlayer();
      if (player) player.pause();
      setLabel();
    },

    next: function () {
      var list = allTracks();
      var index = 0;
      list.forEach(function (song, i) {
        if (song.id === currentId) index = i;
      });
      currentId = list[(index + 1) % list.length].id;
      if (!soundOn()) {
        loadCurrent(false);
        muteMessage();
        return;
      }
      loadCurrent(true);
    },

    playWorkoutMix: function () {
      if (!soundOn()) return;
      if (currentId === 'rest') currentId = 'gym';
      loadCurrent(true);
    },

    playRestMix: function () {
      if (!soundOn()) return;
      currentId = 'rest';
      loadCurrent(true);
    }
  };

  root.PunjabiPlayer = PunjabiPlayer;

})(typeof window !== 'undefined' ? window : this);
