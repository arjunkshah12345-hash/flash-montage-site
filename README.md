# flash-montage — site

The website for [flash-montage](https://github.com/arjunkshah12345-hash/flash-montage), an open agent skill for the
flash-montage launch teaser. Live at **https://arjunkshah12345-hash.github.io/flash-montage-site/**.

Plain HTML, CSS and one ES module; no build step. The hero plays a real cut list produced by the skill's own builder
(`media/cut.json`: 154 shots on the measured burst curve, three live Three.js holds that glitch out into code, the
mark). The burst designer runs the same curve, `d(i) = a + (b − a)(i/(n−1))^p`, and prints a plan the builder accepts.

- `js/procedural/`: the skill's specimens and glitch layer, with Three.js r184 (MIT) vendored
- `media/`: shots and stills from the open [library](https://github.com/arjunkshah12345-hash/flash-montage-library);
  every credit is on `credits.html`
- Fonts: Clash Grotesk from Fontshare

Run locally with any static server, e.g. `python3 -m http.server`. Code: MIT.
