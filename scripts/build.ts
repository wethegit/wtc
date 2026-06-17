import { mkdir } from "node:fs/promises";

const pkg = (await Bun.file("./package.json").json()) as { version: string };
const version = pkg.version;

const platform = process.env.WTC_TARGET_PLATFORM ?? process.env.platform ?? process.platform;
const arch = process.env.WTC_TARGET_ARCH ?? process.env.arch ?? process.arch;

let targetSuffix: string;
let bunTarget: "bun-darwin-arm64" | "bun-darwin-x64" | "bun-linux-x64";

// The release workflow can override platform/arch to build named targets. Local
// builds default to the current machine so `bun run build` remains ergonomic.
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

await mkdir(outdir, { recursive: true });

console.log(`Building ${outfilePath} (v${version})...`);

import solidPlugin from "@opentui/solid/bun-plugin";

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  // Solid TSX must be compiled into OpenTUI render calls before Bun creates the
  // standalone executable. Avoid using a top-level bunfig preload here because
  // compiled binaries would try to resolve it at runtime.
  plugins: [solidPlugin],
  compile: {
    target: bunTarget,
    outfile: `./${outfilePath}`,
  },
  define: {
    // Inject the package version into the binary so `wtc --version`, CLI update
    // checks, and TUI update dialogs all report the release version.
    "process.env.APP_VERSION": JSON.stringify(version),
    "process.env.OPENTUI_LIBC": platform === "linux" ? JSON.stringify("glibc") : "undefined",
  },
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log(`Built ${outfilePath}`);
