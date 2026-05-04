# Fablab 3D Printer Queue — Developer Guide

## For new team members setting up their environment and contributing code.

---

## 1. Install Required Tools

You need three things: **Node.js**, **Git**, and a **code editor**.

### Node.js

Node.js runs the project locally on your machine.

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the big green button)
3. Run the installer, accept all defaults
4. Verify it worked — open **Terminal** (Mac) or **Command Prompt** (Windows) and run:

```
node --version
```

You should see something like `v20.x.x` or `v22.x.x`. Any version 18+ is fine.

### Git

Git tracks code changes and syncs with GitHub.

- **Mac:** Open Terminal and type `git --version`. If it's not installed, it will prompt you to install Xcode Command Line Tools — click Install.
- **Windows:** Download from [https://git-scm.com](https://git-scm.com) and run the installer with default settings.

Verify:

```
git --version
```

### VS Code (recommended editor)

Download from [https://code.visualstudio.com](https://code.visualstudio.com). Free, works on Mac/Windows/Linux.

---

## 2. Clone the Repository

This downloads the project to your computer. Open Terminal and run:

```
cd ~/Desktop
git clone https://github.com/lukeschroeder13/fablab-queue.git
cd fablab-queue
```

If Git asks for authentication, you'll need a **Personal Access Token** from GitHub:

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Name it anything (e.g., "fablab"), check the **repo** box, click **Generate token**
4. Copy the token — use it as your password when Git asks

To avoid re-entering it every time:

- **Mac:** `git config --global credential.helper osxkeychain`
- **Windows:** `git config --global credential.helper manager`

Set your Git identity (use your real name and email):

```
git config --global user.name "Your Name"
git config --global user.email "your-id@virginia.edu"
```

---

## 3. Install Dependencies

From inside the project folder:

```
cd ~/Desktop/fablab-queue
npm install
```

This reads `package.json` and downloads everything the project needs. You only need to do this once (or after someone adds a new dependency).

---

## 4. Run Locally

```
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. You'll see the app running locally, connected to the live Supabase database.

**Hot reload is enabled** — when you save a file in VS Code, the browser updates automatically. No need to restart.

To stop the dev server, press **Ctrl+C** in Terminal.

---

## 5. Project Structure

```
fablab-queue/
├── src/
│   ├── App.jsx          ← The entire app (all pages, components, logic)
│   ├── supabase.js      ← Supabase client connection
│   ├── main.jsx         ← Entry point (don't edit)
│   ├── App.css          ← Empty (styles are inline in App.jsx)
│   └── index.css        ← Empty (styles are inline in App.jsx)
├── public/              ← Static files
├── index.html           ← HTML shell (don't edit)
├── package.json         ← Dependencies and scripts
└── vite.config.js       ← Build config (don't edit)
```

**Almost all your work will be in `src/App.jsx`.** It contains:

- **Helper functions** (date formatting, FCFS queue engine) — top of file
- **Icons** — SVG icon components
- **Page components** — HomePage, JoinQueuePage, ReservePage, SchedulePage, CheckInPage, AdminPage
- **Main App component** — at the bottom, handles state, Supabase queries, and routing

---

## 6. Making Changes

### The workflow

1. **Pull the latest code** before you start working:

```
git pull
```

2. **Edit files** in VS Code. Test with `npm run dev`.

3. **Commit and push** when you're done:

```
git add .
git commit -m "Short description of what you changed"
git push
```

Vercel automatically deploys every push to `main`. The live site updates within ~60 seconds.

### Using branches (recommended for bigger changes)

If you're making a bigger change and don't want to break the live site:

```
git checkout -b my-feature-name
```

Make your changes, commit, then push the branch:

```
git push -u origin my-feature-name
```

Go to GitHub and open a **Pull Request** to merge into `main`. Someone else can review it before it goes live.

When approved, merge it on GitHub, then locally:

```
git checkout main
git pull
```

---

## 7. Database (Supabase)

The app uses Supabase (a hosted Postgres database). The connection is in `src/supabase.js`.

### Tables

| Table | Purpose |
|-------|---------|
| `printers` | id, name, model, online status |
| `jobs` | All reservations — name, comp_id, email, printer_id, date, start_hour, duration, status |
| `notifications` | In-app alerts — comp_id, message, type, read status |
| `users` | User accounts (for future auth) — name, comp_id, email, role |

### Viewing/editing data directly

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select the `fablab-queue` project
3. Click **Table Editor** in the left sidebar
4. You can view, add, edit, or delete rows directly

Ask Luke for the Supabase login if you need dashboard access.

### How the code talks to Supabase

Read data:
```javascript
const { data, error } = await supabase.from("jobs").select("*");
```

Insert:
```javascript
await supabase.from("jobs").insert({ name: "John", comp_id: "jd3ab", ... });
```

Update:
```javascript
await supabase.from("jobs").update({ status: "checkedIn" }).eq("id", jobId);
```

Delete:
```javascript
await supabase.from("printers").delete().eq("id", printerId);
```

Real-time subscriptions (already set up in App.jsx) automatically refresh data when any user makes a change.

---

## 8. Common Tasks

### Adding a new page

1. Create a new function component in `App.jsx`:

```jsx
function MyNewPage({ printers, jobs, showToast }) {
  return (
    <div>
      <h1 style={{ fontFamily: "'Playfair Display',serif" }}>My Page</h1>
      {/* your content */}
    </div>
  );
}
```

2. Add a nav item in the `navItems` array at the bottom of App.jsx:

```javascript
{ key: "mypage", label: "My Page", icon: I.check },
```

3. Add the route in the `<main>` section:

```jsx
{page === "mypage" && <MyNewPage printers={printers} jobs={jobs} showToast={showToast} />}
```

### Adding a new database column

1. Go to Supabase dashboard → SQL Editor
2. Run: `ALTER TABLE jobs ADD COLUMN my_column text;`
3. Update the relevant insert/update calls in App.jsx to include the new column

### Changing styles

All styles are inline in App.jsx. The main design tokens are:

- **Navy:** `#1a1a2e` (headers, dark backgrounds)
- **Orange:** `#d4740e` (primary accent, buttons)
- **Green:** `#22c55e` (available/success)
- **Red:** `#ef4444` (offline/error)
- **Fonts:** `'Playfair Display'` for headings, `'DM Sans'` for body text

---

## 9. Troubleshooting

**"Module not found" error after pulling:**
Someone added a new dependency. Run `npm install` and restart the dev server.

**Port 5173 already in use:**
Another dev server is running. Find and kill it: `lsof -i :5173` then `kill -9 <PID>`, or just use a different port: `npm run dev -- --port 5174`.

**Changes not showing on the live site:**
Make sure you pushed: `git push`. Check [https://vercel.com/dashboard](https://vercel.com/dashboard) for build errors.

**Supabase errors in console:**
Check that `src/supabase.js` has the correct URL and key. If you see 401 errors, the anon key may have been rotated — check the Supabase dashboard under Settings → API.

**Merge conflicts:**
If `git pull` fails with conflicts, open the conflicting file in VS Code — it highlights the conflicts. Pick the version you want, delete the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), save, then:

```
git add .
git commit -m "Resolve merge conflict"
git push
```

---

## 10. Useful Links

| Resource | URL |
|----------|-----|
| Live site | [https://fablab-queue.vercel.app](https://fablab-queue.vercel.app) |
| GitHub repo | [https://github.com/lukeschroeder13/fablab-queue](https://github.com/lukeschroeder13/fablab-queue) |
| Vercel dashboard | [https://vercel.com/dashboard](https://vercel.com/dashboard) |
| Supabase dashboard | [https://supabase.com/dashboard](https://supabase.com/dashboard) |
| React docs | [https://react.dev](https://react.dev) |
| Supabase JS docs | [https://supabase.com/docs/reference/javascript](https://supabase.com/docs/reference/javascript) |
