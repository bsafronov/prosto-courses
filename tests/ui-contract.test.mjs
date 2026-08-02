import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

async function validateUi(root = repositoryRoot) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ["scripts/validate-ui-contract.mjs", "--root", root],
      { cwd: repositoryRoot },
    );
    return { exitCode: 0, output: result.stdout + result.stderr };
  } catch (error) {
    return {
      exitCode: error.code,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function validateRepository() {
  try {
    const result = await execFileAsync("pnpm", ["validate"], {
      cwd: repositoryRoot,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    });
    return { exitCode: 0, output: result.stdout + result.stderr };
  } catch (error) {
    return {
      exitCode: error.code,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function withUiFixture(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), "prosto-ui-contract-"));

  try {
    for (const [relativePath, source] of Object.entries({
      "src/styles/tokens.css": `
:root {
  --color-ink: #18181b;
  --font-size-body: 1rem;
  --line-height-body: 1.5;
  --font-weight-regular: 400;
  --space-4: 1rem;
  --radius: 0.25rem;
  --shadow: 0 1rem 3rem rgb(24 24 27 / 10%);
  --border-subtle: 0.0625rem solid var(--color-ink);
  --breakpoint-content: 40rem;
}
`,
      ...files,
    })) {
      const file = path.join(root, relativePath);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, source);
    }

    await run(await validateUi(root));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("canonical repository satisfies the public UI contract", async () => {
  const result = await validateUi();
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.output, /Validated UI contract/i);
});

test("existing repository validation command enforces the UI contract", async () => {
  const result = await validateRepository();
  assert.equal(result.exitCode, 0, result.output);
  assert.match(result.output, /Validated UI contract/i);
});

test("rejects raw visual values with source, property, value, and remedy", async () => {
  await withUiFixture(
    {
      "src/components/Drift.astro": `
<style>
  .drift {
    color: #123456;
    font-size: 18px;
    line-height: 1.4;
    font-weight: 650;
    padding: 8px;
    border: 1px solid red;
    stroke-width: 1.5px;
    transform: rotate(12deg);
    --local-weight: 650;
    font-size: calc(var(--font-size-body) + 2px);
    font-weight: var(--font-weight-regular, 650);
    transition: opacity var(--motion-duration), transform 500ms;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
  }
</style>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /src\/components\/Drift\.astro:\d+/);
      for (const [property, value] of [
        ["color", "#123456"],
        ["font-size", "18px"],
        ["line-height", "1.4"],
        ["font-weight", "650"],
        ["padding", "8px"],
        ["border", "1px solid red"],
        ["stroke-width", "1.5px"],
        ["transform", "rotate(12deg)"],
        ["--local-weight", "650"],
        ["font-size", "calc(var(--font-size-body) + 2px)"],
        ["font-weight", "var(--font-weight-regular, 650)"],
        ["transition", "opacity var(--motion-duration), transform 500ms"],
        ["border-radius", "6px"],
        ["box-shadow", "0 2px 8px rgb(0 0 0 / 20%)"],
      ]) {
        assert.match(result.output, new RegExp(`${property}.*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
      }
      assert.match(result.output, /use a central token/i);
    },
  );
});

test("rejects local layer, opacity, and motion scales", async () => {
  await withUiFixture(
    {
      "src/components/LocalScale.astro": `
<style>
  .local-scale {
    z-index: 99;
    opacity: .72;
    transition: opacity 180ms var(--motion-easing);
  }
  .mixed-motion { transition: opacity var(--motion-duration) ease-in; }
  .longhand-motion {
    transition-timing-function: ease-in;
    animation-timing-function: cubic-bezier(0, 0, 1, 1);
  }
</style>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /z-index.*99.*central token/i);
      assert.match(result.output, /opacity.*\.72.*central token/i);
      assert.match(result.output, /transition.*180ms.*central token/i);
      assert.match(result.output, /transition.*ease-in.*central token/i);
      assert.match(result.output, /transition-timing-function.*ease-in.*central token/i);
      assert.match(result.output, /animation-timing-function.*cubic-bezier.*central token/i);
    },
  );
});

test("rejects raw sizes in CSS grids, script styles, and JSX style objects", async () => {
  await withUiFixture(
    {
      "src/components/Grid.astro": `
<style>.grid { grid-template-columns: 12rem 1fr; }</style>
`,
      "src/scripts/presentation.ts": `
element.style.width = "12px";
element.style.setProperty("margin-top", "8px");
`,
      "src/components/Inline.tsx": `
export const Inline = () => <div style={{ padding: "6px" }} />;
`,
      "src/components/Expression.astro": `
<div style={"padding: 5px"}></div>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /grid-template-columns.*12rem 1fr/i);
      assert.match(result.output, /width.*12px/i);
      assert.match(result.output, /margin-top.*8px/i);
      assert.match(result.output, /padding.*6px/i);
      assert.match(result.output, /padding.*5px/i);
    },
  );
});

test("accepts tokens plus zero, auto, inherit, and percentage geometry", async () => {
  await withUiFixture(
    {
      "src/components/Stable.astro": `
<style>
  .stable {
    color: var(--color-ink);
    font-size: var(--font-size-body);
    line-height: inherit;
    font-weight: var(--font-weight-regular);
    margin: 0 auto;
    padding: var(--space-4);
    width: 100%;
    height: auto;
    inset: 0;
    border: var(--border-subtle);
    border-radius: var(--radius);
    box-shadow: none;
  }
</style>
`,
      "src/components/DataGeometry.astro": `
<!-- ui-contract-exception data-driven-geometry: completion and segment ratios come from rendered data -->
<div style={\`--segment-weight: \${items.length}; --completion: \${progress}%\`}></div>
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("requires narrow documentation for dynamic presentation geometry", async () => {
  await withUiFixture(
    {
      "src/components/DynamicDrift.astro": `
<div style={\`padding: \${gap}px; --mystery: \${value}\`}></div>
`,
      "src/scripts/dynamic.ts": `
element.style.width = progress + "%";
`,
      "src/components/Dynamic.tsx": `
export const Dynamic = () => <div style={{ padding: gap }} />;
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /padding.*\$\{gap\}px.*data-driven geometry exception/i);
      assert.match(result.output, /--mystery.*\$\{value\}.*data-driven geometry exception/i);
      assert.match(result.output, /width.*progress.*data-driven geometry exception/i);
      assert.match(result.output, /padding.*gap.*data-driven geometry exception/i);
    },
  );
});

test("rejects opaque inline presentation expressions", async () => {
  await withUiFixture(
    {
      "src/components/Opaque.astro": `
<div style={presentation}></div>
`,
      "src/components/Opaque.tsx": `
export const Opaque = () => <div style={presentation} />;
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /src\/components\/Opaque\.astro:\d+.*style.*presentation/i);
      assert.match(result.output, /src\/components\/Opaque\.tsx:\d+.*style.*presentation/i);
      assert.match(result.output, /explicit token-backed declarations/i);
    },
  );
});

test("rejects undocumented raw SVG presentation attributes", async () => {
  await withUiFixture(
    {
      "src/components/RawSvg.astro": `
<svg width="16" height="24" viewBox="0 0 16 24">
  <circle r="1.5" fill="red" stroke-width="2" opacity=".72" />
</svg>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const [property, value] of [
        ["width", "16"],
        ["height", "24"],
        ["r", "1.5"],
        ["fill", "red"],
        ["stroke-width", "2"],
        ["opacity", ".72"],
      ]) {
        assert.match(result.output, new RegExp(`${property}.*${value}`));
      }
      assert.match(
        result.output,
        /document this narrow SVG geometry exception/i,
      );
      assert.match(result.output, /use a central token/i);
    },
  );
});

test("rejects raw and opaque SVG presentation expressions", async () => {
  await withUiFixture(
    {
      "src/components/ExpressionSvg.astro": `
<svg width={16} height={24} viewBox="0 0 16 24">
  <circle r={1.5} fill={"red"} stroke-width={2} opacity={0.72} />
  <path stroke={paint} />
</svg>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const [property, value] of [
        ["width", "16"],
        ["height", "24"],
        ["r", "1.5"],
        ["fill", "red"],
        ["stroke-width", "2"],
        ["opacity", "0.72"],
        ["stroke", "paint"],
      ]) {
        assert.match(result.output, new RegExp(`${property}.*${value}`));
      }
      assert.match(result.output, /document this narrow SVG token expression/i);
    },
  );
});

test("accepts only breakpoints declared by the central token source", async () => {
  await withUiFixture(
    {
      "src/components/Responsive.astro": `
<style>
  @media (min-width: 40rem) { .responsive { padding: var(--space-4); } }
  @media (max-width: 41rem) { .drift { padding: var(--space-4); } }
  @container (max-width: 42rem) { .drift { padding: var(--space-4); } }
  @media (width >= 43rem) { .drift { padding: var(--space-4); } }
  @media screen and (max-width: 44rem) { .drift { padding: var(--space-4); } }
  @container sidebar (max-width: 45rem) { .drift { padding: var(--space-4); } }
  @media (40rem <= width <= 46rem) { .drift { padding: var(--space-4); } }
</style>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.doesNotMatch(result.output, /breakpoint.*40rem/i);
      assert.match(result.output, /breakpoint.*41rem/i);
      assert.match(result.output, /breakpoint.*42rem/i);
      assert.match(result.output, /breakpoint.*43rem/i);
      assert.match(result.output, /breakpoint.*44rem/i);
      assert.match(result.output, /breakpoint.*45rem/i);
      assert.match(result.output, /breakpoint.*46rem/i);
      assert.match(result.output, /central token source/i);
    },
  );
});
