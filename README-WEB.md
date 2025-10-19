Attendance Tracker — static site

Open `attendance.html` in your browser or use the Live Server extension in VS Code.

Features

- Add/remove students
- Mark present per date
- Edit student names inline
- Import/export CSV
- Data stored locally (localStorage)

How to run

1. Install Live Server extension if you haven't already.
2. Right-click `attendance.html` → Open with Live Server (or use the Live Server button).

Files

- attendance.html — main page
- css/style.css — styles
- js/app.js — application logic
- sample-attendance.csv — import example

Design

- Responsive layout
- Accessible controls with keyboard support

If you want, I can:

- Add more features (bulk import, print-friendly export)
- Convert to a small Node/Express app with server-side storage
- Package as a PWA for offline install

Deployed site

- This project is set up to deploy the `WEB/` folder to GitHub Pages using the included GitHub Actions workflow (`.github/workflows/deploy.yml`). After pushing to `main`, the workflow publishes to the `gh-pages` branch and the site should be available at:

  https://FirdaushAnwer.github.io/vs-code/

Index page

- A landing page `WEB/index.html` is included and serves as the site root. It links to `attendance.html` and automatically redirects there after a short delay. If you want `attendance.html` to be the direct root, I can change `index.html` to immediately redirect or replace it with `attendance.html`.
