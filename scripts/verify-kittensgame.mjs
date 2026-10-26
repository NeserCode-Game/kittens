import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const upstreamDir = resolve(repoRoot, "src", "game", "upstream");
const manifestPath = resolve(upstreamDir, "SOURCE.json");
const writeMode = process.argv.includes("--write");

const source = {
  repository: "https://github.com/nuclear-unicorn/kittensgame",
  commit: "781e379f79f1e7512d168849cba21ed111502644",
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function manifestPathFor(absolutePath) {
  return relative(upstreamDir, absolutePath).split(sep).join("/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function buildFileMap() {
  const files = (await walk(upstreamDir))
    .filter((file) => file !== manifestPath)
    .sort((left, right) =>
      manifestPathFor(left).localeCompare(manifestPathFor(right))
    );
  const fileMap = {};

  for (const file of files) {
    fileMap[manifestPathFor(file)] = sha256(await readFile(file));
  }

  return fileMap;
}

async function readVersion() {
  const version = JSON.parse(
    await readFile(resolve(upstreamDir, "version.json"), "utf8")
  );
  return version.version;
}

async function writeManifest() {
  const manifest = {
    manifestVersion: 2,
    source,
    gameVersion: await readVersion(),
    license: "WET PAWS LICENSE",
    runtime: {
      page: false,
      iframe: false,
      compatibility: [
        "compat/dojo-declare.js",
        "compat/jquery.js",
        "compat/lz-string.js",
      ],
    },
    files: await buildFileMap(),
  };

  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  console.log(
    `Wrote ${manifestPathFor(manifestPath)} with ${
      Object.keys(manifest.files).length
    } logic source hashes.`
  );
}

async function verifyManifest() {
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read source manifest at ${manifestPath}. Run this script with --write first.`,
      { cause: error }
    );
  }

  if (manifest.source?.commit !== source.commit) {
    throw new Error(
      `Upstream commit mismatch: manifest=${manifest.source?.commit}, expected=${source.commit}`
    );
  }

  const version = await readVersion();
  if (manifest.gameVersion !== version) {
    throw new Error(
      `Game version mismatch: manifest=${manifest.gameVersion}, runtime=${version}`
    );
  }

  const actualFiles = await buildFileMap();
  const expectedFiles = manifest.files ?? {};
  const allFiles = new Set([
    ...Object.keys(expectedFiles),
    ...Object.keys(actualFiles),
  ]);
  const differences = [];

  for (const file of [...allFiles].sort()) {
    if (!(file in expectedFiles)) {
      differences.push(`unexpected: ${file}`);
    } else if (!(file in actualFiles)) {
      differences.push(`missing: ${file}`);
    } else if (expectedFiles[file] !== actualFiles[file]) {
      differences.push(`modified: ${file}`);
    }
  }

  if (differences.length > 0) {
    throw new Error(
      `Kittens Game logic source does not match SOURCE.json:\n${differences
        .map((difference) => `  - ${difference}`)
        .join("\n")}`
    );
  }

  console.log(
    `Verified ${Object.keys(actualFiles).length} logic files from Kittens Game ${
      manifest.gameVersion
    } (${manifest.source.commit.slice(0, 12)}).`
  );
}

try {
  if (writeMode) {
    await writeManifest();
  } else {
    await verifyManifest();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
