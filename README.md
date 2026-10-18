# CLM Solutions website

Static one-page site for CLM Solutions (Cox · Lozano · Manley). No build step, no dependencies beyond two Google Fonts.

## Files

```
index.html          Page markup and sections
styles.css          Theme, animation, responsive layout
script.js           Boot sequence, particles, sound effects, interactions, contact form
assets/clm-badge.png    Round CLM badge (transparent background)
assets/brand-board.png  Brand board showcase
assets/favicon.svg      Browser tab icon
```

## Run locally

Open `index.html` in a browser. Nothing needs to be installed.

## Publish on GitHub Pages

1. Create a repository and upload these files to the root (keep the `assets/` folder).
2. Go to **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`.
3. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

## Before you launch

The contact email is `clmsolutions.co@gmail.com`. It appears in the contact list and the JSON-LD block in `index.html`. The contact form's mailto target is read automatically from the contact list. The site has no phone number.

Also confirm:
- **Services and values copy.** The services are web design and development, and drop shipping. The drop shipping description is a draft. The value words come from the brand board. The sentences under them are placeholders written for review.
- **Brand colors.** The palette in `styles.css` (`:root`) is an approximation. Replace the hex values with the ones in the official brand guide.
- **Our designs section.** The six capabilities and the upgrade offer are written for review. Edit them to match what you actually sell.
- **Process steps.** Discover, Design, Build, Launch are generic. Edit them to match how you actually work.
- **Purpose section.** The "Why we do this" copy is a draft. Rewrite it in your own words.
- **Music.** All three tracks are generated in the browser, so there is no licensing to clear. Each track's tempo, chords and length are in the `TRACKS` list in the `Music` block of `script.js`.

## Features

- Animated boot sequence with a drawn logo and progress readout
- Particle network that reacts to the cursor
- Animated color fades in the background, a moving holographic floor, scanlines
- Glitch and gradient-shift effects on the headline, text scramble on section titles
- Tilt and spotlight service cards, magnetic buttons, ripple feedback, custom cursor glow
- Scroll-linked reveals, timeline that lights up as you scroll, progress bar
- A three-track chill playlist generated live in the browser (Web Audio, no audio files). Tracks play one after another and loop. Off by default, with a Music on/off button that shows the current track.
- Optional synthesized sound effects. Off until a visitor turns them on, because browsers block sound until the visitor interacts with the page.
- Reduced-motion support: animations and the loader are disabled for visitors who request it
- Contact form that opens the visitor's email app with the inquiry filled in (no server needed)

## Notes

- Sound effects respect the visitor's choice and are remembered in `localStorage`.
- The particle network and hover effects are disabled on touch devices where they don't apply.
