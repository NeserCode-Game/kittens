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

The vendored logic files and their SHA-256 hashes are recorded in
[`src/game/upstream/SOURCE.json`](src/game/upstream/SOURCE.json). The compatibility
layer supplies browser implementations of Dojo declaration helpers, jQuery, and
LZString to the isolated engine closure; it does not render the original UI.

The application framework itself remains covered by the repository's MIT
license. That license does not override the WET PAWS LICENSE for the included
Kittens Game logic and assets.
