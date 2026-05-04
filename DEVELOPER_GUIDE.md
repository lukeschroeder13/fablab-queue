# Fablab Queue — Getting Started

## One-Time Setup

1. Install **Node.js** from [https://nodejs.org](https://nodejs.org) (LTS version, green button)
2. Install **VS Code** from [https://code.visualstudio.com](https://code.visualstudio.com)
3. Open Terminal (Mac) or Command Prompt (Windows) and run:

```
cd ~/Desktop
git clone https://github.com/lukeschroeder13/fablab-queue.git
cd fablab-queue
npm install
```

4. Set your Git identity:

```
git config --global user.name "Your Name"
git config --global user.email "your-id@virginia.edu"
```

5. Open the `fablab-queue` folder in VS Code (File → Open Folder)

## Daily Workflow

```
cd ~/Desktop/fablab-queue
git pull
npm run dev
```

This opens the site at [http://localhost:5173](http://localhost:5173). Edit files in VS Code — the browser auto-refreshes when you save.

When you're done, stop the server (Ctrl+C) and push your changes:

```
git add .
git commit -m "what I changed"
git push
```

The live site auto-deploys within ~60 seconds.

## If Git asks for a password

Git doesn't accept passwords anymore. You need a Personal Access Token:

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. **Generate new token (classic)** → check the **repo** box → Generate
3. Copy the token and paste it as your password when Git asks (nothing will appear as you paste — that's normal)

To save it so you don't have to enter it again:

- **Mac:** `git config --global credential.helper osxkeychain`
- **Windows:** `git config --global credential.helper manager`

## Key Files

- `src/App.jsx` — the entire app (this is what you'll edit)
- `src/supabase.js` — database connection (don't change unless credentials rotate)

## Links

- **Live site:** [https://fablab-queue.vercel.app](https://fablab-queue.vercel.app)
- **GitHub:** [https://github.com/lukeschroeder13/fablab-queue](https://github.com/lukeschroeder13/fablab-queue)
