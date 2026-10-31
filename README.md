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
5. Answers show up live in the host's inbox, along with how long each team took.
   **Faster answers score more**, timed from when the question opened to the team's
   *last* submitted answer (changing an answer resets the clock):
   - **Multiple choice** is scored automatically when time runs out: a correct answer
     earns **50 to 100 points**, scaling with speed (instant = 100, buzzer = 50).
   - **Free text** is scored by the host (who can reveal the correct answer to check):
     a correct answer earns **100 points plus up to 50 bonus points** for speed.
6. A leaderboard is shown after each round.
7. The game ends with the **Results** show 🏆: a Frutiger Aero–style reveal with a
   drumroll, the top three rising on glossy podiums (confetti, crown, fanfare), and
   everyone else dropped into the **LOSERS** Recycle Bin (sad trombone included 🎺).
   Each team's phone reveals their own placement right as the big screen finishes.

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
  test-trivia.json    # A short set of test questions for quick demos (host with ?test)
  results.js          # The final Results show (animation timeline, synthesized sounds, confetti)
  results.css         # Results styles (Frutiger Aero: glass, gel podiums, bubbles)
  results-demo.html   # Preview the Results screen with sample teams
  img/results/        # Results artwork (SVG): hills, trophy, crown, fish, recycle bin
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

## Demoing with test questions

For a quick demo or to test a change, host with `?test` in the URL (e.g.
https://y2k-trivia.web.app/?test or `http://localhost:3000/?test`). The host then loads
`public/test-trivia.json` instead of the real questions: 2 short rounds with a mix of
multiple-choice and free-text questions, so a full game takes a few minutes. The host
dashboard shows a **TEST QUESTIONS** badge. Teams join normally (no `?test` needed).

## Previewing the Results screen

You don't need to play a whole game to see the final Results show. Open
`/results-demo.html` (e.g. https://y2k-trivia.web.app/results-demo.html) and hit
**Start the show** (turn your sound on 🔊). Options:

| URL | Shows |
|-----|-------|
| `results-demo.html?teams=3` | Number of sample teams (default 8, max 14) |
| `results-demo.html?view=player&me=1` | A phone's reveal for the team in that position (1 = winner, 5 = a loser) |
| `results-demo.html?instant=1` | Skip straight to the final state |

## Deployment

Merging to `main` deploys automatically to Firebase Hosting through GitHub Actions.

**Want to see a change before merging it?** Every pull request gets its own
temporary preview site. A few minutes after the PR is opened (or updated), the
Firebase bot comments on the PR with a link like
`https://y2k-trivia--pr8-some-branch-xxxx.web.app`. Open it to try the branch
exactly as it would look live; the real site isn't touched until you merge.

> Previews use the same Firebase database as the live site, so a game played on a
> preview is a real game.
