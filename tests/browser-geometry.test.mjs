import assert from "node:assert/strict";
import test from "node:test";
import { expectBoxCloseTo } from "./support/browser-geometry.mjs";

test("browser geometry ignores subpixel platform residue", () => {
  expectBoxCloseTo(
    { width: 36.00000762939453, height: 36, x: 0, y: 0 },
    { width: 36, height: 36 },
  );
});

test("browser geometry rejects material size drift", () => {
  assert.throws(() =>
    expectBoxCloseTo(
      { width: 35.9, height: 36, x: 0, y: 0 },
      { width: 36, height: 36 },
    ),
  );
});
