const { build } = require("esbuild");
const { readFileSync, writeFileSync } = require("fs");

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "iife",
  target: "es2020",
  outfile: "dist/index.js",
}).then(() => {
  // Post-process: unwrap the IIFE so all functions are global
  // Nakama's goja runtime needs InitModule (and all other functions) at global scope
  let code = readFileSync("dist/index.js", "utf-8");

  // Remove "use strict" — not needed in goja
  code = code.replace('"use strict";\n', "");

  // Remove IIFE wrapper: starts with (() => {  and ends with })();
  code = code.replace(/^\(\(\) => \{\n/, "");
  code = code.replace(/\n\}\)\(\);\s*$/, "\n");

  writeFileSync("dist/index.js", code);
  console.log("✓ Built dist/index.js for Nakama runtime");
});
