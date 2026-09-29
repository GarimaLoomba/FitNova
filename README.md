# FitNova

FitNova is a frontend-only web app for logging workouts, daily steps, water, calories, goals, routes, and a workout timer. Accounts and training data stay in the browser. There is no backend database.

## Features

- Sign up, log in, and log out
- Create, read, update, and delete workouts
- Daily steps, water, and calorie tracking
- Goals, exercise library, routes, timer, music, and progress charts
- Responsive layout for mobile, tablet, and desktop

## Tech stack

- HTML, CSS, and JavaScript
- No JavaScript frameworks or libraries
- Google Fonts for typography only

## Browser storage

| Storage | What it keeps |
|---|---|
| localStorage | Users, workouts, settings, goals, daily totals, routes |
| sessionStorage | Login session when “Remember me” is off |
| Cookie `ft-last-visit` | The date and time of the previous visit, shown on the dashboard |
| IndexedDB (`FitnessDB`) | A second copy of users and workouts, plus uploaded songs |

## Browser APIs

- `fetch` for a daily quote and extra exercises
- Web Worker for progress totals and activity counts
- Geolocation, Notifications, Web Audio, and Page Visibility
- `crypto.subtle` to hash passwords before they are saved
- `FileReader` and `Blob` for JSON backup and music playback

## Project layout

```text
server.js                 local file server
html/pages/               HTML pages
html/pages/css/           stylesheets
html/pages/js/            page scripts
html/pages/workers/       web worker
html/pages/png/           logo.png
```

## Prerequisites

- A modern browser (Chrome, Edge, or Firefox)
- Node.js, only if you want the included local server

You can also open the HTML files through any static server. Opening `index.html` as a file may block some browser APIs.

## Run the app

1. Open a terminal in this folder.
2. Start the server:

```bash
node server.js
```

3. Open [http://localhost:3000](http://localhost:3000).
4. Create an account on the sign-up page.
5. Log a workout from the dashboard.

## Pages

- Home, sign up, and log in
- Dashboard, history, exercises, goals, and routes
- Timer, progress, profile, and settings

## License

This project is released under the MIT License. See [LICENSE](LICENSE).
