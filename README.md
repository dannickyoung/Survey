# Pour Claire

A 5-page mobile birthday invitation (envelope → invite → letter → wishes → brunch → mystery scratch card).
Plain HTML/CSS/JS — no build step.

## Edit the words
Everything lives in the `CONFIG` block at the top of `script.js` (brunch venue, time, address, map link, mystery clue, letter).

## Publish on GitHub Pages
1. Create a new repo on github.com (e.g. `claire-birthday`).
2. In this folder:
   ```
   git init && git add . && git commit -m "Pour Claire"
   git branch -M main
   git remote add origin https://github.com/<you>/claire-birthday.git
   git push -u origin main
   ```
3. Repo → Settings → Pages → Source: "Deploy from a branch", Branch: `main` / `(root)` → Save.
4. Link appears in ~1 min: `https://<you>.github.io/claire-birthday/`

## Preview locally
`python3 -m http.server 8000` then open http://localhost:8000
