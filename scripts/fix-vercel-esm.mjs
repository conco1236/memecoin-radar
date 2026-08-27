import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs";
import path from "node:path";

const root = "/home/ubuntu/memecoin-radar";
const files = [];
for (const directory of ["api", "server", "shared"]) {
  const stack = [path.join(root, directory)];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of await (await import("node:fs/promises")).readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  }
}

for (const file of files) {
  const relativeFile = path.relative(root, file);
  const source = await readFile(file, "utf8");
  const directory = path.dirname(relativeFile);
  const updated = source
    .replace(/from\s+"(\.\.?\/[^"']+)"/g, (match, specifier) => {
      if (/\.(?:js|ts|tsx|json)$/.test(specifier)) return match;
      return `from "${specifier}.js"`;
    })
    .replace(/from\s+"@shared\/const"/g, `from "${path.relative(directory, "shared/const.js").replaceAll("\\", "/")}"`)
    .replace(/from\s+"@shared\/_core\/errors"/g, `from "${path.relative(directory, "shared/_core/errors.js").replaceAll("\\", "/")}"`);
  if (updated !== source) await writeFile(file, updated);
}
