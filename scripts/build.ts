const platform = process.platform;
const arch = process.arch;

let targetSuffix: string;
if (platform === "darwin" && arch === "arm64") {
  targetSuffix = "darwin-arm64";
} else if (platform === "darwin" && arch === "x64") {
  targetSuffix = "darwin-x64";
} else if (platform === "linux" && arch === "x64") {
  targetSuffix = "linux-x64";
} else {
  console.error(`Unsupported platform: ${platform} ${arch}`);
  process.exit(1);
}

const outfile = `wtc-${targetSuffix}`;

console.log(`Building ${outfile}...`);

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "bun",
  outdir: ".",
  naming: outfile,
  compile: true,
  external: ["yargs", "zod"],
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log(`Built ${outfile}`);
