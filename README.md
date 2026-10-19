# Mohammad Dipu Islam — Portfolio

Static site served by GitHub Pages at <https://dipui7.github.io/my-portfolio/>.

```
index.html                    Home: hero, films, photography, impact stories, about, contact
stories/index.html            Impact Stories hub (category filters)
stories/article-template.html Long-form article layout — duplicate it to publish a story
404.html                      Not-found page (uses absolute /my-portfolio/ paths)
assets/css/main.css           Compiled Tailwind CSS (committed; Pages has no build step)
assets/js/main.js             Navbar, scroll reveals, video/photo lightbox, filters, reading time
assets/img/                   Optimised images (WebP + JPEG), OG cover, favicons
src/input.css                 Tailwind source and component styles
```

## Editing styles

```bash
npm install
npm run dev     # rebuild on change
npm run build   # minified build — commit assets/css/main.css afterwards
```

## Adding media

- **Film:** any link or button with `data-video="youtube:VIDEO_ID"`, `data-video="vimeo:VIDEO_ID"` or `data-video="path/to/film.mp4"` opens in the 16:9 player. Add `data-title` for the caption.
- **Photo:** add an `<a href="full.jpg" data-photo data-gallery="photos" data-caption="…">` wrapping a lazy `<img>` inside `.masonry` on the home page.
- **Story:** copy `stories/article-template.html`, edit it, remove the `noindex` meta tag, add a card to `stories/index.html` (and the sitemap). Reading time is computed automatically.
