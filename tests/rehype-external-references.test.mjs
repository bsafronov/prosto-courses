import assert from "node:assert/strict";
import test from "node:test";
import { externalReferences } from "../scripts/rehype-external-references.mjs";

const link = (href, className = undefined) => ({
  type: "element",
  tagName: "a",
  properties: { href, ...(className ? { className } : {}) },
  children: [{ type: "text", value: href }],
});

test("external references are marked without changing platform links", () => {
  const external = link("https://www.w3.org/WAI/", ["existing"]);
  const protocolRelative = link("//developer.mozilla.org/en-US/");
  const sharedOrigin = link("https://example.com/shared/reference");
  const platformAbsolute = link(
    "https://example.com/prosto-courses/courses/markdown/",
  );
  const platformRelative = link("/prosto-courses/courses/markdown/");
  const nonHttp = link("mailto:author@example.com");
  const tree = {
    type: "root",
    children: [
      external,
      protocolRelative,
      sharedOrigin,
      platformAbsolute,
      platformRelative,
      nonHttp,
    ],
  };

  externalReferences({
    siteBasePath: "/prosto-courses",
    siteOrigin: "https://example.com",
  })(tree);

  for (const reference of [external, protocolRelative, sharedOrigin]) {
    assert.equal(reference.properties["data-external-reference"], "");
    assert.equal(reference.properties.target, "_blank");
    assert.deepEqual(reference.properties.rel, ["noopener", "noreferrer"]);
    assert.deepEqual(reference.children.at(-1), {
      type: "element",
      tagName: "sup",
      properties: {
        "aria-hidden": "true",
        className: ["external-reference-marker"],
      },
      children: [{ type: "text", value: "↗" }],
    });
  }
  assert.deepEqual(external.properties.className, [
    "existing",
    "external-reference",
  ]);

  for (const reference of [platformAbsolute, platformRelative, nonHttp]) {
    assert.equal(reference.properties["data-external-reference"], undefined);
    assert.equal(reference.properties.target, undefined);
    assert.equal(reference.children.length, 1);
  }
});
