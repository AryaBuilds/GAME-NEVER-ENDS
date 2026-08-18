# A Game Never Ends 🎮

🔗 **Live Demo:** https://aryabuilds.github.io/GAME-NEVER-ENDS/

## About this project

Hi! This is a small browser game I built called **Endless Survivor**. The idea
was pretty simple — I wanted to make a game that, true to its name, never
actually ends. There's no "final level" or win screen. You just keep dodging
bombs and mines for as long as you can, and the game keeps getting harder the
longer you survive. Your only goal is to beat your own high score.

I built the whole thing from scratch using just HTML, CSS, and JavaScript —
no game engine, no external libraries, no downloaded images or music files.
Everything you see and hear (the background, the bombs, even the music) is
drawn and generated directly by the code.

## How to play

1. Open the live link above (or open `endless-survivor.html` directly in your
   browser).
2. Click **START GAME**.
3. Move your ship around to dodge the bombs and mines falling toward you.
4. Grab the glowing orbs when you can:
   - 🟢 Green orb → heals you a bit
   - 🟡 Yellow orb → gives bonus score
5. Survive as long as possible. Your score keeps climbing automatically, and
   it climbs faster the longer you last.
6. When your health bar (Hull Integrity) hits zero, it's game over — but your
   best score is saved automatically, so you can try to beat it next time.

### Controls

| Action | Key / Input |
|---|---|
| Move | Mouse, touch drag, or `W A S D` / Arrow keys |
| Dash (brief invincibility) | `Space` or click |
| Pause | `P` |
| Toggle music | 🔊 button, top-right corner |

## Tech stack

I kept this deliberately simple and dependency-free:

- **HTML** – page structure
- **CSS** – styling, glow effects, animations, the UI/HUD
- **JavaScript (vanilla, no frameworks)** – all the game logic
- **Canvas API** – all rendering: the background, bombs, particles, player,
  everything is drawn frame by frame
- **Web Audio API** – the background music and sound effects are generated
  live in code, there are no `.mp3`/`.wav` files anywhere in this project
- **localStorage** – saves your best score in the browser so it's there next
  time you play

There's no build step and nothing to install — it's just a static HTML file.

## How to run it locally

The easiest way is to just open the live link. But if you want to run it on
your own machine:

**Option 1 — Just open the file**
Double-click `endless-survivor.html` and it'll open in your default browser.

**Option 2 — Local server (optional, but recommended for the audio to behave nicely)**
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000/endless-survivor.html` in your browser.

No `npm install`, no build tools, nothing else needed.

## Project structure

```
.
├── endless-survivor.html   # the entire game — HTML, CSS, and JS in one file
└── README.md                # you're reading it
```

I kept everything in a single file on purpose, so the whole project stays
portable and easy to share or copy anywhere without breaking.

## How the difficulty works

The difficulty is designed to never stop scaling:

- The longer you survive, the faster and more frequent the bombs get.
- Every 400 points, your **level** goes up, which also increases the chance
  of tougher spinning mines showing up.
- There's no upper cap — in theory, if you're good enough, the game just
  keeps getting more intense forever. That's the whole point of the "never
  ends" concept.

## How the music works

This part was fun to build. There are no audio files in this project at all —
the background music is generated live using the Web Audio API. As you level
up, the game switches between four different "moods" (Calm → Tense → Hard →
Extreme), each with its own tempo and tone, so the music escalates along with
the on-screen danger. Explosions and pickups also trigger small procedural
sound effects the same way.

## Things worth knowing

- Your best score is saved per-browser (via `localStorage`), so it won't
  carry over if you switch browsers or devices.
- Because of browser autoplay rules, music only starts after you click
  **START GAME** — it can't play on its own before that.
- Tested on Chrome, Edge, and Firefox and works fine on all three. Should
  work on any modern browser that supports Canvas and Web Audio.

## Questions?

for any quirey dm on Aryaman2403 insta
