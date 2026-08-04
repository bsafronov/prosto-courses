import { expect } from "@playwright/test";

/**
 * @typedef {{ height: number, width: number, x: number, y: number }} BoundingBox
 */

/**
 * @param {BoundingBox | null} box
 * @param {Partial<BoundingBox>} expected
 */
export function expectBoxCloseTo(box, expected) {
  expect(box).not.toBeNull();
  for (const [dimension, value] of Object.entries(expected)) {
    expect(box[dimension], `bounding box ${dimension}`).toBeCloseTo(value, 4);
  }
}
