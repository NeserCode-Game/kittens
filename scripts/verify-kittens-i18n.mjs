import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const en = JSON.parse(
  readFileSync(
    resolve(root, "src/game/upstream/res/i18n/crowdin/en.json"),
    "utf8"
  )
);
const zh = JSON.parse(
  readFileSync(
    resolve(root, "src/game/upstream/res/i18n/crowdin/zh.json"),
    "utf8"
  )
);
const overrideSource = readFileSync(
  resolve(root, "src/game/kernel/zh-overrides.ts"),
  "utf8"
);
const overrides = [...overrideSource.matchAll(/^  "([^"]+)":/gm)].map(
  (match) => match[1]
);

const overrideKeys = new Set(overrides);
if (overrideKeys.size !== overrides.length) {
  throw new Error("zh-overrides.ts contains duplicate keys.");
}

const missing = Object.keys(en).filter(
  (key) => !(key in zh) && !overrideKeys.has(key)
);
if (missing.length > 0) {
  throw new Error(
    `Chinese dictionary is missing ${missing.length} keys:\n${missing
      .map((key) => `  - ${key}`)
      .join("\n")}`
  );
}

const unused = overrides.filter((key) => key in zh || !(key in en));
if (unused.length > 0) {
  throw new Error(
    `zh-overrides.ts contains ${unused.length} unused keys:\n${unused
      .map((key) => `  - ${key}`)
      .join("\n")}`
  );
}

console.log(
  `Verified Chinese coverage: ${Object.keys(en).length} keys, ${overrides.length} local overrides.`
);
