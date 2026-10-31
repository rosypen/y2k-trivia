# ✨ Y2K Trivia Party

A multiplayer, real-time trivia game for parties, themed around 2000s pop culture and
styled like a soft pastel Y2K-era desktop.

**Play it live:** https://y2k-trivia.web.app

## How it works

One person **hosts** on a big screen (TV, projector, laptop), and each team **joins**
from their own phone or computer.

1. **Host** opens the site and picks **Host the Game**. A 4-character room code appears.
2. **Teams** open the site, pick **Join Team**, and enter the room code and a team name.
3. The host starts the game, goes over the rules, and runs through the rounds.
4. Each question has a **30-second timer**. Teams can submit and change their answer
   until time runs out.
5. Answers show up live in the host's inbox. The host can reveal the correct answer
   and award **100 points** per correct answer.
6. A leaderboard is shown after each round, with final standings at the end.

## The rounds

| Round | Theme | Format |
|-------|-------|--------|
| 1 | Cartoons & Nick/Disney | Multiple choice |
| 2 | Teen Pop Music | Mixed |
| 3 | DCOMs (Disney Channel Original Movies) | Mixed |
| 4 | Books & Fads | Free text |

## Tech stack

- **HTML + vanilla JavaScript**: the game lives in `public/index.html`, with questions in `public/trivia.json`
- **Tailwind CSS** (via CDN) for styling, with the VT323 and Inter Google Fonts
- **Firebase Realtime Database** to sync rooms, players, questions and answers live
- **Firebase Hosting** for deployment, via GitHub Actions

## Project structure

```
public/
  index.html          # The app: UI, styles and game logic
  trivia.json         # The trivia rounds and questions
  404.html            # Not-found page
firebase.json         # Firebase Hosting config (serves the public/ folder)
.firebaserc           # Firebase project alias (y2k-trivia)
.github/workflows/    # Auto-deploy on merge to main, preview deploys on PRs
```

## Running locally

There's no build step, but the site needs to be served over HTTP (opening
`index.html` directly from disk won't work, since browsers block loading
`trivia.json` from `file://`). Either of these works:

```bash
# Firebase CLI
npm install -g firebase-tools
firebase serve

# or any static file server, e.g.
npx serve public
```

> **Note:** the app connects to the real `y2k-trivia` Firebase database even when run locally.

## Editing the questions

The questions live in `public/trivia.json`, as a list of rounds:

```json
[
  {
    "round": "Round 1: Cartoons & Nick/Disney",
    "questions": [
      { "type": "mcq", "q": "Question text?", "a": "Correct answer", "options": ["A", "B", "C", "D"] },
      { "type": "text", "q": "Question text?", "a": "Correct answer" }
    ]
  }
]
```

- `type`: `"mcq"` (multiple choice) or `"text"` (free-text answer)
- `options`: only for `mcq`; `a` must exactly match one of the options

## Deployment

Merging to `main` deploys automatically to Firebase Hosting through GitHub Actions.
Pull requests get a preview deploy link.
