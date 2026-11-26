import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function pngSize(path) {
  const bytes = readFileSync(join(process.cwd(), path));
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", `${path} is not a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test("the app can be added to a phone home screen", () => {
  const manifest = read("src/app/manifest.ts");
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /start_url: "\/dashboard"/);
  assert.match(manifest, /purpose: "maskable"/);
  assert.deepEqual(pngSize("public/icons/icon-192.png"), [192, 192]);
  assert.deepEqual(pngSize("public/icons/icon-512.png"), [512, 512]);
  assert.deepEqual(pngSize("src/app/apple-icon.png"), [180, 180]);
});

test("iPhones open it full screen with a matching status bar", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /appleWebApp: \{\s+capable: true,/);
  assert.match(layout, /export const viewport: Viewport = \{\s+themeColor:/);
});

test("the proxy lets the manifest and icons through without a session", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /png/);
  assert.ok(existsSync(join(process.cwd(), "src/app/favicon.ico")));
});
