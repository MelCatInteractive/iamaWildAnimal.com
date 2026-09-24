# iamawildanimal.com

Static site for the iamaWildAnimal BRB screen archive. Served by GitHub Pages, no build step.

## Layout

- `index.html`, `site.css`, `site.js`: the main page.
- `iscatinjail.html`: the coin flip.
- `images/jpg_imageN.jpg`: original screens, N from 0 to 360.
- `media/t400`, `media/t800`: WebP thumbnails, 16:9, generated.
- `media/jail`: WebP versions of `jailimages/`.
- `data/screens.js`: screen count and one accent colour per screen, generated.

## Adding screens

1. Drop the new screen in `images/` as `jpg_imageN.jpg`, continuing the numbering.
2. Run `python3 tools/build_media.py` (needs Pillow). It writes the thumbnails, the jail WebPs and `data/screens.js`.
3. Commit everything under `media/` and `data/` along with the image.

Deep links: `#s/42` opens screen 42 in the viewer.
