const pkg = (await Bun.file("./package.json").json()) as { version: string };
const version = pkg.version;

const platform = process.env.WTC_TARGET_PLATFORM ?? process.env.platform ?? process.platform;
const arch = process.env.WTC_TARGET_ARCH ?? process.env.arch ?? process.arch;

let targetSuffix: string;
let bunTarget: "bun-darwin-arm64" | "bun-darwin-x64" | "bun-linux-x64";

if (platform === "darwin" && arch === "arm64") {
  targetSuffix = "darwin-arm64";
  bunTarget = "bun-darwin-arm64";
} else if (platform === "darwin" && arch === "x64") {
  targetSuffix = "darwin-x64";
  bunTarget = "bun-darwin-x64";
} else if (platform === "linux" && arch === "x64") {
  targetSuffix = "linux-x64";
  bunTarget = "bun-linux-x64";
} else {
  console.error(`Unsupported platform: ${platform} ${arch}`);
  process.exit(1);
}

const outfile = `wtc-${targetSuffix}`;
const outdir = "dist";
const outfilePath = `${outdir}/${outfile}`;

await Bun.$`mkdir -p ${outdir}`.quiet();

console.log(`Building ${outfilePath} (v${version})...`);

import solidPlugin from "@opentui/solid/bun-plugin";

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  plugins: [solidPlugin],
  compile: {
    target: bunTarget,
    outfile: `./${outfilePath}`,
  },
  define: {
    "process.env.APP_VERSION": JSON.stringify(version),
    "process.env.OPENTUI_LIBC": platform === "linux" ? JSON.stringify("glibc") : "undefined",
  },
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log(`Built ${outfilePath}`);
