# Third-Party Notices

## Kittens Game

This application includes an unmodified extraction of the Kittens Game
simulation source. The application renders a separate React interface and does
not load or embed the original game page.

- Project: https://github.com/nuclear-unicorn/kittensgame
- Official game: https://kittensgame.com/web/
- English wiki: https://wiki.kittensgame.com/en/home
- Chinese wiki: https://lolitalibrary.com/wiki/
- Upstream commit: `781e379f79f1e7512d168849cba21ed111502644`
- Game version: `1.6.1.6`
- Author and original project: bloodrizer / Nuclear Unicorn
- License: WET PAWS LICENSE

The complete upstream license is distributed at
[`src/game/upstream/license.txt`](src/game/upstream/license.txt).

The WET PAWS LICENSE permits changes for personal or educational use and
permits hosting translated versions when all game links are retained. It does
not permit commercial use or creation of derivative works for commercial gain.
The in-game navigation exposes the official game, wiki, source repository, and
Chinese wiki links.

The application, bundle, and tray icons are derived from the upstream
`res/favicon.gif` file at the pinned commit. The tracked `public/favicon.gif`
is byte-identical to that source (SHA-256
`A2A05F1658F7ED95E8B920C6DF01FEB75AA50872E364F76C3FD3F5F8E82FF1AB`).
`app-icon.png` is a transparent square enlargement generated with
nearest-neighbor scaling, and the platform icon files under
`src-tauri/icons/` are generated from it by the official Tauri icon tool. These
icon assets remain covered by the WET PAWS LICENSE and are not relicensed under
MIT.

The vendored logic files and their SHA-256 hashes are recorded in
[`src/game/upstream/SOURCE.json`](src/game/upstream/SOURCE.json). The compatibility
layer supplies browser implementations of Dojo declaration helpers, jQuery, and
LZString to the isolated engine closure; it does not render the original UI.

The application framework itself remains covered by the repository's MIT
license. That license does not override the WET PAWS LICENSE for the included
Kittens Game logic and assets.
