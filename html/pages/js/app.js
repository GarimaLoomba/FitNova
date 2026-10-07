/**
 * app.js — login, header, sidebar, and page start-up
 *
 * CLASS EXPLANATION:
 * 1. guardRoutes()  → if this is an app page and nobody is logged in, go to login.html
 * 2. StorageManager.init() → ready storage + theme
 * 3. mountChrome() → insert header, sidebar, footer
 * 4. bindAuth() → signup / login / logout buttons
 */
(function (root) {
  'use strict';

  var LOGO = './png/logo.png';

  var pages = {
    home: 'index.html',
    login: 'login.html',
    signup: 'signup.html',
    dashboard: 'workout.html',
    workouts: 'history.html',
    history: 'history.html',
    exercises: 'exercises.html',
    timer: 'timer.html',
    goals: 'goals.html',
    routes: 'route.html',
    progress: 'detailedstats.html'
  };

  var APP_NAV = [
    { key: 'dashboard', href: 'workout.html', label: 'Dashboard', icon: '▣' },
    { key: 'workouts', href: 'history.html', label: 'Workouts', icon: '☰' },
    { key: 'exercises', href: 'exercises.html', label: 'Exercises', icon: '＋' },
    { key: 'history', href: 'history.html', label: 'History', icon: '◷' },
    { key: 'progress', href: 'detailedstats.html', label: 'Progress', icon: '▲' },
    { key: 'goals', href: 'goals.html', label: 'Goals', icon: '☆' },
    { key: 'timer', href: 'timer.html', label: 'Timer', icon: '▶' },
    { key: 'routes', href: 'route.html', label: 'Routes', icon: '⌖' },
    { key: 'profile', label: 'Profile', icon: '☺' },
    { key: 'settings', label: 'Settings', icon: '⚙' }
  ];

  function findOne(selector, parent) { return (parent || document).querySelector(selector); }
  function findAll(selector, parent) { return Array.from((parent || document).querySelectorAll(selector)); }

  function initials(name) {
    return root.FTUtils ? root.FTUtils.initials(name) : 'FT';
  }

  function formatDate(date) {
    return root.FTUtils ? root.FTUtils.formatDisplayDate(date) : String(date);
  }

  function showToast(message, type) {
    var toastBox = findOne('.toast');
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'toast';
      toastBox.setAttribute('role', 'status');
      document.body.appendChild(toastBox);
    }
    toastBox.textContent = message;
    toastBox.className = 'toast show' + (type ? ' toast-' + type : '');
    if (toastBox._timer) clearTimeout(toastBox._timer);
    toastBox._timer = setTimeout(function () { toastBox.classList.remove('show'); }, 2800);
  }

  root.showToast = showToast;
  root.toast = showToast;

  // SHA-256 hash so we do not save the raw password in localStorage
  function hashPassword(password, email) {
    var payload = String(email || '').toLowerCase() + ':' + String(password || '');
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)).then(function (buffer) {
      return Array.from(new Uint8Array(buffer)).map(function (byte) {
        return byte.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function navClass(active, key) {
    if (active === key) return 'active';
    if (key === 'workouts' && active === 'history') return 'active';
    if (key === 'progress' && active === 'stats') return 'active';
    if (key === 'timer' && active === 'timer') return 'active';
    return '';
  }

  function navInner(item) {
    return '<span class="nav-ico" aria-hidden="true">' + item.icon + '</span><span>' + item.label + '</span>';
  }

  function navItemMarkup(item, active) {
    var cls = navClass(active, item.key);
    if (item.href) {
      return '<a class="' + cls + '" href="' + item.href + '">' + navInner(item) + '</a>';
    }
    return '<button class="linkish ' + cls + '" type="button">' + navInner(item) + '</button>';
  }

  function headerNavItem(item, active) {
    var cls = navClass(active, item.key);
    if (item.href) {
      return '<a class="' + cls + '" href="' + item.href + '">' + item.label + '</a>';
    }
    return '<button class="linkish ' + cls + '" type="button">' + item.label + '</button>';
  }

  function sidebarMarkup(active, user) {
    var links = APP_NAV.map(function (item) {
      return navItemMarkup(item, active);
    }).join('');
    return (
      '<aside class="app-sidebar" id="app-sidebar" aria-label="Main">' +
        '<a class="brand" href="workout.html"><span class="brand-mark"><img src="' + LOGO + '" alt="" width="28" height="28"></span><span>FitNova</span></a>' +
        '<nav class="sidebar-nav">' + links + '</nav>' +
        '<div class="sidebar-foot">' +
          '<div class="user-chip">' +
            '<span class="avatar">' + initials(user && user.name) + '</span>' +
            '<span>' + ((user && user.name) || 'Athlete') + '</span>' +
          '</div>' +
          '<button class="btn btn-secondary btn-sm" type="button" data-logout>Log out</button>' +
        '</div>' +
      '</aside>'
    );
  }

  function bottomNavMarkup(active) {
    var items = [
      APP_NAV[0], APP_NAV[2], APP_NAV[1], APP_NAV[4], APP_NAV[9]
    ];
    return '<nav class="bottom-nav" aria-label="Mobile">' + items.map(function (item) {
      return navItemMarkup(item, active);
    }).join('') + '</nav>';
  }

  function headerMarkup(chrome, active) {
    var user = root.StorageManager ? root.StorageManager.getSessionUser() : null;
    var isApp = chrome === 'app';
    var online = navigator.onLine;

    var left = isApp
      ? '<nav class="nav-links header-app-links">' +
          APP_NAV.slice(0, 6).map(function (item) {
            return headerNavItem(item, active);
          }).join('') +
        '</nav>'
      : chrome === 'auth'
        ? '<nav class="nav-links"><button class="linkish" type="button" data-go="home">Home</button></nav>'
        : '<nav class="nav-links">' +
            '<a href="workout.html">Dashboard</a>' +
            '<a href="history.html">Workouts</a>' +
            '<a href="exercises.html">Exercises</a>' +
            '<a href="detailedstats.html">Progress</a>' +
          '</nav>';

    var right = isApp
      ? '<span class="net-status ' + (online ? 'is-online' : 'is-offline') + '" id="net-status" role="status">' +
          '<span class="net-dot" aria-hidden="true"></span>' + (online ? 'Online' : 'Offline') +
        '</span>' +
        '<button class="btn btn-primary btn-sm" type="button" data-open-log>+ Log workout</button>' +
        '<span class="user-chip" title="' + ((user && user.email) || '') + '">' +
          '<span class="avatar">' + initials(user && user.name) + '</span>' +
          '<span>' + ((user && user.name) || 'Athlete') + '</span>' +
        '</span>' +
        '<button class="btn btn-secondary btn-sm" type="button" data-logout>Log out</button>'
      : chrome === 'auth'
        ? (active === 'login'
            ? '<button class="btn btn-primary" type="button" data-go="signup">Create account</button>'
            : '<button class="btn btn-secondary" type="button" data-go="login">Log in</button>')
        : '<button class="btn btn-secondary" type="button" data-go="login">Log in</button>' +
          '<button class="btn btn-primary" type="button" data-go="signup">Start free</button>';

    return (
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header">' +
        '<div class="header-inner">' +
          '<button class="brand" type="button" data-go="home"><span class="brand-mark"><img src="' + LOGO + '" alt="FitNova" width="28" height="28"></span>FitNova</button>' +
          '<button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="app-sidebar">☰</button>' +
          '<div class="header-menus">' + left +
            '<div class="nav-actions">' + right + '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function footerMarkup(chrome) {
    var training;
    var desk;
    training =
      '<a href="workout.html">Dashboard</a>' +
      '<a href="exercises.html">Exercise Library</a>' +
      '<a href="detailedstats.html">Progress</a>' +
      '<a href="timer.html">Timer</a>' +
      '<a href="route.html">Routes</a>';
    desk =
      '<a href="goals.html">Goals</a>' +
      '<a href="history.html">History</a>' +
      '<button class="linkish" type="button">Settings</button>' +
      '<button class="linkish" type="button">Profile</button>';
    return (
      '<footer class="site-footer">' +
        '<div class="wrap footer-grid">' +
          '<div>' +
            '<button class="brand" type="button" data-go="home"><span class="brand-mark"><img src="' + LOGO + '" alt="" width="28" height="28"></span>FitNova</button>' +
          '</div>' +
          '<div>' +
            '<h4>Training</h4>' +
            training +
          '</div>' +
          '<div>' +
            '<h4>Desk</h4>' +
            desk +
          '</div>' +
        '</div>' +
        '<div class="wrap legal">© ' + new Date().getFullYear() + ' FitNova. Built with HTML, CSS &amp; Vanilla JavaScript.</div>' +
      '</footer>'
    );
  }

  function setSiteImages() {
    var icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.href = LOGO;
  }

  function mountChrome() {
    var headerHost = findOne('[data-header]');
    var footerHost = findOne('[data-footer]');
    var chrome = document.body.getAttribute('data-chrome') || 'marketing';
    var active = document.body.getAttribute('data-active') || '';
    var user = root.StorageManager ? root.StorageManager.getSessionUser() : null;

    if (headerHost) headerHost.outerHTML = headerMarkup(chrome, active);
    if (footerHost) footerHost.outerHTML = footerMarkup(chrome);

    if (chrome === 'app') {
      document.body.classList.add('has-app-nav');
      if (!findOne('.app-sidebar')) {
        document.body.insertAdjacentHTML('afterbegin', sidebarMarkup(active, user));
      }
      if (!findOne('.bottom-nav')) {
        document.body.insertAdjacentHTML('beforeend', bottomNavMarkup(active));
      }
    }

    var toggle = findOne('.menu-toggle');
    var menus = findOne('.header-menus');
    var sidebar = findOne('.app-sidebar');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = false;
        if (window.matchMedia('(max-width: 1024px)').matches && sidebar) {
          open = sidebar.classList.toggle('open');
          document.body.classList.toggle('sidebar-open', open);
        } else if (menus) {
          open = menus.classList.toggle('open');
        }
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    document.addEventListener('click', function (event) {
      if (!sidebar || !sidebar.classList.contains('open')) return;
      if (sidebar.contains(event.target) || (toggle && toggle.contains(event.target))) return;
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    });
  }

  function guardRoutes() {
    var chrome = document.body.getAttribute('data-chrome');
    var active = document.body.getAttribute('data-active');
    var user = root.StorageManager ? root.StorageManager.getSessionUser() : null;
    if (chrome === 'app' && !user) {
      window.location.replace('login.html');
      return false;
    }
    if ((active === 'login' || active === 'signup') && user) {
      window.location.replace('workout.html');
      return false;
    }
    return true;
  }

  function setupNetworkStatus() {
    function paint(isOnline) {
      var badge = findOne('#net-status');
      if (badge) {
        badge.className = 'net-status ' + (isOnline ? 'is-online' : 'is-offline');
        badge.innerHTML = '<span class="net-dot" aria-hidden="true"></span>' + (isOnline ? 'Online' : 'Offline');
      }
      var banner = findOne('#network-banner');
      if (!isOnline) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'network-banner';
          banner.className = 'network-banner offline';
          banner.setAttribute('role', 'status');
          banner.innerHTML = '<span>You’re offline — local tracking still works. Exercise videos and live quotes need a connection.</span>';
          document.body.prepend(banner);
        }
        banner.style.display = 'block';
      } else if (banner) {
        banner.style.display = 'none';
      }
    }

    window.addEventListener('online', function () {
      paint(true);
      showToast("You're back online.", 'success');
    });
    window.addEventListener('offline', function () {
      paint(false);
      showToast("You're offline — local fitness data is still available.", 'warning');
    });
    if (!navigator.onLine) paint(false);
  }

  function bindGoPages() {
    document.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-go]');
      if (!btn) return;
      var go = btn.getAttribute('data-go');
      if (go === 'home') window.location.href = 'index.html';
      if (go === 'login') window.location.href = 'login.html';
      if (go === 'signup') window.location.href = 'signup.html';
      if (go === 'dashboard') window.location.href = 'workout.html';
      if (go === 'workouts' || go === 'history') window.location.href = 'history.html';
      if (go === 'exercises') window.location.href = 'exercises.html';
      if (go === 'timer') window.location.href = 'timer.html';
      if (go === 'goals') window.location.href = 'goals.html';
      if (go === 'routes') window.location.href = 'route.html';
      if (go === 'progress') window.location.href = 'detailedstats.html';
    });
  }

  function bindAuth() {
    var signup = findOne('#signup-form');
    var login = findOne('#login-form');

    findAll('[data-toggle-password]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = document.getElementById(button.getAttribute('data-toggle-password'));
        if (!input) return;
        var hidden = input.type === 'password';
        input.type = hidden ? 'text' : 'password';
        button.textContent = hidden ? 'Hide' : 'Show';
      });
    });

    findAll('[data-logout]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (root.StorageManager) root.StorageManager.clearSession();
        window.location.href = 'login.html';
      });
    });

    if (signup) {
      signup.addEventListener('submit', function (event) {
        event.preventDefault();
        var data = new FormData(signup);
        var error = findOne('#signup-error');
        var email = String(data.get('email') || '').trim().toLowerCase();
        var password = String(data.get('password') || '');
        error.classList.remove('show');
        if (password.length < 6) {
          error.textContent = 'Password must be at least 6 characters.';
          error.classList.add('show');
          return;
        }
        var users = root.StorageManager.getUsers();
        if (users.some(function (u) { return u.email === email; })) {
          error.textContent = 'That email already has an account. Please log in.';
          error.classList.add('show');
          return;
        }
        hashPassword(password, email).then(function (passwordHash) {
          var newUser = {
            id: root.StorageManager.generateId(),
            name: String(data.get('fname') || '').trim() + ' ' + String(data.get('lname') || '').trim(),
            email: email,
            passwordHash: passwordHash,
            birthdate: data.get('birthdate'),
            gender: data.get('gender'),
            country: data.get('country'),
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          root.StorageManager.saveUsers(users);
          root.StorageManager.setSessionUser(newUser, true);
          window.location.href = 'workout.html';
        });
      });
    }

    if (login) {
      login.addEventListener('submit', function (event) {
        event.preventDefault();
        var data = new FormData(login);
        var error = findOne('#login-error');
        var email = String(data.get('email') || '').trim().toLowerCase();
        var password = String(data.get('password') || '');
        var remember = Boolean(data.get('remember'));
        error.classList.remove('show');
        if (!email || !password) {
          error.textContent = 'Please enter your email and password.';
          error.classList.add('show');
          return;
        }
        var user = root.StorageManager.getUsers().find(function (item) { return item.email === email; });
        if (!user) {
          error.textContent = 'No account found with that email. Please sign up.';
          error.classList.add('show');
          return;
        }
        hashPassword(password, email).then(function (passwordHash) {
          if (passwordHash !== user.passwordHash) {
            error.textContent = 'Incorrect password. Try again.';
            error.classList.add('show');
            return;
          }
          root.StorageManager.setSessionUser(user, remember);
          window.location.href = 'workout.html';
        });
      });
    }

  }

  function readCookie(name) {
    var cookies = document.cookie ? document.cookie.split('; ') : [];
    var i;
    for (i = 0; i < cookies.length; i += 1) {
      var parts = cookies[i].split('=');
      if (parts[0] === name) return decodeURIComponent(parts.slice(1).join('='));
    }
    return '';
  }

  function writeCookie(name, value, days) {
    var expires = new Date();
    expires.setDate(expires.getDate() + days);
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax';
  }

  function greet() {
    var greeting = findOne('#greeting');
    var user = root.StorageManager ? root.StorageManager.getSessionUser() : null;
    if (greeting) greeting.textContent = user && user.name ? 'Welcome back, ' + user.name.split(' ')[0] : 'Welcome back';
    var dateLabel = findOne('#today-date');
    if (dateLabel) dateLabel.textContent = formatDate(new Date());

    var lastVisitLabel = findOne('#last-visit');
    var lastVisit = readCookie('ft-last-visit');
    if (lastVisitLabel && lastVisit) lastVisitLabel.textContent = 'Last visit: ' + lastVisit;
    writeCookie('ft-last-visit', new Date().toLocaleString(), 30);
  }

  function refreshLiveSurfaces() {
    if (root.Dashboard && typeof root.Dashboard.renderAll === 'function') root.Dashboard.renderAll();
    if (root.Workouts && typeof root.Workouts.renderHistory === 'function') root.Workouts.renderHistory();
    if (root.Goals && typeof root.Goals.renderSystemGoals === 'function') root.Goals.renderSystemGoals();
    if (root.Tracker && typeof root.Tracker.renderWeightStats === 'function') root.Tracker.renderWeightStats();
    if (root.WorkerManager && typeof root.WorkerManager.refreshStats === 'function' && document.getElementById('stats-chart')) {
      root.WorkerManager.refreshStats('week');
    }
    if (root.Profile && typeof root.Profile.render === 'function') root.Profile.render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!guardRoutes()) return;
    var boot = root.StorageManager && root.StorageManager.init
      ? root.StorageManager.init()
      : Promise.resolve();
    boot.then(function () {
      mountChrome();
      setSiteImages();
      greet();
      setupNetworkStatus();
      bindAuth();
      bindGoPages();
      root.__FT_READY = true;
      document.dispatchEvent(new CustomEvent('ft:ready'));
      if (root.Dashboard && typeof root.Dashboard.init === 'function') root.Dashboard.init();
      if (root.Workouts && typeof root.Workouts.init === 'function') root.Workouts.init();
      if (root.Exercises && typeof root.Exercises.init === 'function') root.Exercises.init();
      if (root.ApiService && typeof root.ApiService.enrichExercises === 'function' && root.Exercises) {
        root.ApiService.enrichExercises(root.Exercises);
      }
      if (root.ApiService && typeof root.ApiService.renderAdviceWidget === 'function') {
        root.ApiService.renderAdviceWidget();
      }
      if (root.TimerManager && typeof root.TimerManager.init === 'function') root.TimerManager.init();
      if (root.PunjabiPlayer && typeof root.PunjabiPlayer.init === 'function') root.PunjabiPlayer.init();
      if (root.Goals && typeof root.Goals.init === 'function') root.Goals.init();
      if (root.RoutesManager && typeof root.RoutesManager.init === 'function') root.RoutesManager.init();
      if (root.WorkerManager && typeof root.WorkerManager.init === 'function' && document.getElementById('stats-chart')) {
        root.WorkerManager.init();
      }
      if (root.Tracker && typeof root.Tracker.init === 'function') root.Tracker.init();
    });
  });

  document.addEventListener('ft:datachange', function () {
    refreshLiveSurfaces();
  });

  root.App = {
    pages: pages,
    showToast: showToast,
    formatDate: formatDate,
    initials: initials,
    hashPassword: hashPassword
  };
})(typeof window !== 'undefined' ? window : this);


