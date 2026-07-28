import path from "node:path";

const specsPathSegment = `${path.sep}_specs${path.sep}`;

function filterSpecs(files) {
  return files.filter((file) => !file.includes(specsPathSegment));
}

function quoteFiles(files) {
  return files.map((file) => JSON.stringify(file)).join(" ");
}

function runOnNonSpecFiles(files, commands) {
  const filtered = filterSpecs(files);
  if (filtered.length === 0) return [];

  const fileArgs = quoteFiles(filtered);
  return commands.map((command) => `${command} ${fileArgs}`);
}

export default {
  "*.{ts,tsx}": (files) => runOnNonSpecFiles(files, ["oxfmt --write", "oxlint --fix"]),
  "*.{md,json,yaml,yml,toml}": (files) => runOnNonSpecFiles(files, ["oxfmt --write"]),
};
