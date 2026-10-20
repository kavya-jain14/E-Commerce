# E-Commerce layout practice

A static storefront exercise built with HTML, CSS and JavaScript. Search filters the eight product sections; the All menu supports keyboard opening, Escape dismissal and focus return. The account, cart, product and promotion links are layout examples.

Serve this directory with any static web server, for example:

```sh
python -m http.server 8000
```

The header places search on its own row on smaller screens, product sections adapt to the available width, and the menu reserves room for its close control. The mobile hero keeps its original proportions so its text is not cropped.

## Browser checks

```sh
npm ci
npx playwright install chromium
npm test
```

An existing compatible Chromium can be selected with `CHROMIUM_EXECUTABLE=/path/to/chromium npm test`.

The tests check horizontal overflow, visible search width, matching and empty search results, reset, and menu focus/dismissal at 320, 375, 768 and 1440 pixels. External requests are blocked during these checks to make layout and behavior independent of third-party availability. Essential search and close icons are also checked for visible SVG geometry. Icons are inline SVGs and require no external font. Product photographs and the logo sprite still use external hosts; these checks do not verify their live availability.
