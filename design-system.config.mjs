export const typographyRoles = [
  "meta",
  "supporting",
  "body",
  "reading",
  "component-title",
  "section-title",
  "page-title",
];

export const approvedThemeVariables = {
  "--text-type-meta": "0.75rem",
  "--text-type-meta--line-height": "1rem",
  "--text-type-meta--font-weight": "500",
  "--text-type-supporting": "0.875rem",
  "--text-type-supporting--line-height": "1.25rem",
  "--text-type-supporting--font-weight": "400",
  "--text-type-body": "1rem",
  "--text-type-body--line-height": "1.5rem",
  "--text-type-body--font-weight": "400",
  "--text-type-reading": "1.125rem",
  "--text-type-reading--line-height": "1.75rem",
  "--text-type-reading--font-weight": "400",
  "--text-type-component-title": "1.25rem",
  "--text-type-component-title--line-height": "1.75rem",
  "--text-type-component-title--font-weight": "600",
  "--text-type-section-title": "1.875rem",
  "--text-type-section-title--line-height": "2.25rem",
  "--text-type-section-title--font-weight": "600",
  "--text-type-page-title": "2.25rem",
  "--text-type-page-title--line-height": "2.5rem",
  "--text-type-page-title--font-weight": "600",
  "--text-type-page-title--desktop-font-size": "3rem",
  "--text-type-page-title--desktop-line-height": "3rem",
  "--color-canvas": "#fafafa",
  "--color-surface": "#ffffff",
  "--color-ink": "#18181b",
  "--color-muted": "#71717a",
  "--color-border": "#e4e4e7",
  "--color-focus": "#3f3f46",
  "--color-brand": "#27272a",
  "--color-completed": "#e7f2ea",
  "--color-warning": "#8a5a00",
  "--color-error": "#a12828",
  "--color-data-series-1": "#3d566e",
  "--color-data-series-2": "#695d4e",
  "--color-data-series-3": "#47665b",
  "--color-data-series-4": "#625771",
  "--color-data-series-5": "#704f5c",
  "--spacing-1": "0.25rem",
  "--spacing-2": "0.5rem",
  "--spacing-3": "0.75rem",
  "--spacing-4": "1rem",
  "--spacing-5": "1.25rem",
  "--spacing-6": "1.5rem",
  "--spacing-8": "2rem",
  "--spacing-12": "3rem",
  "--spacing-16": "4rem",
  "--radius-surface": "0.25rem",
  "--radius-control": "0.5rem",
  "--radius-round": "9999px",
  "--border-width-none": "0px",
  "--border-width-default": "1px",
  "--border-width-emphasis": "2px",
  "--border-width-accent": "4px",
  "--shadow-overlay": "0 1rem 3rem rgb(24 24 27 / 10%)",
  "--breakpoint-sm": "40rem",
  "--breakpoint-md": "48rem",
  "--breakpoint-lg": "64rem",
  "--measure-shell": "80rem",
  "--measure-intro": "48rem",
  "--measure-reading": "65ch",
  "--font-ui": '"Onest", ui-sans-serif, system-ui, sans-serif',
  "--font-code": '"IBM Plex Mono", ui-monospace, monospace',
  "--font-weight-strong": "700",
  "--control-compact": "2rem",
  "--control-default": "3rem",
  "--icon-sm": "1rem",
  "--icon-md": "1.25rem",
  "--icon-lg": "1.5rem",
};

export const approvedThemeSourceFingerprint =
  "eb95a2e0deb0a8f3834600369c3ba238caa08180b4e1c6cf3ef9b8cee972c748";

// Each fingerprint freezes only presentation fragments (`<style>`, inline
// `style`, or a CSS file), not component behavior. Remove an owner when its
// presentation moves to the semantic Tailwind API.
export const legacyStyleOwners = {
  "src/components/AuthoredImage.astro":
    "c81195f4615778fb48095a68a5baf329bf162e550f647c414dffd6216a334960",
  "src/components/Callout.astro":
    "1055729dcbdf575075592f675eddf21b07e076fd7a27ea097cc8a2ec32f08fbf",
  "src/components/Chart.astro":
    "6cf6b610ad406c397a6763b5b685e7161db3179ae324cb74ae7d5bcea68069a7",
  "src/components/CompletionControl.astro":
    "6e02b5d01179f202398314d88ffa30f6f83b8da9b21e293a1fc3dbaeaacc8b9f",
  "src/components/ContentFreshness.astro":
    "7e2233b884493e07551f7d7beb9dc493b6597bcd2d45e59d4b43d673b66eb511",
  "src/components/CourseLessonList.astro":
    "d747fae85a08c2f1eea59cb1070e49569c0507548b8ddb2be25fc5f33a2995ea",
  "src/components/CourseOutline.astro":
    "1535fcc87110fd364a3de9f1f556dcf7a5a96c75cebfb8134795f0f99ccb6750",
  "src/components/Diagram.astro":
    "074eaa7041561978cdf00ab1c7cdf4f9c3e3f34e5035403dc31ab5fd58227557",
  "src/components/KnowledgeCheck.astro":
    "f579afedd022a9e8a342efaa0c07d20daa7564f5d8692d2386cb14a0b7cbe8a7",
  "src/components/LearningShell.astro":
    "5bd0ace76cb0c8f30d157e260b68bdb4ceff774b1a900bb4583386f9beb597f6",
  "src/components/PracticeTask.astro":
    "18e0f3085c2fa56d112dfd089bdda29836aa14b058a0cc75e8d73bc565d07863",
  "src/components/ProgressStatus.astro":
    "0c0eac4e068ce0e1d6f7757e5794ac4cbdfa2305c52f2951a99e6ae443062766",
  "src/components/PwaControl.astro":
    "d24f0336e303ae672872105d6c09c170c4bf412b4662e4029ffcd046bc29b13b",
  "src/components/Reflection.astro":
    "9497ab1eeee8d60c813620c7253c740823f74253ad11033c84740a6542bdb3e3",
  "src/components/SequenceDestinationLink.astro":
    "b1008bb78b6fb5cb7f043e6398a22e4684b6ed98ebea1e41e27525f3d7ab73c8",
  "src/components/TaskFeedback.astro":
    "0f4c9e44e04e436b580f3325afc61f64f81fda4c923d11fccc33a4aceefa5c8c",
  "src/components/TaskRubric.astro":
    "1510597db319b947add374cb87815b55087095e27e7054806af5a691bb7ddc8a",
  "src/components/TaskSolution.astro":
    "cc5329ec46f0aaeeaaac5d1db2ae5748a31ddac6247bdb77deabf5639afb7303",
  "src/components/ThemeControl.astro":
    "7d4237500554cd4f1920d04b2f4345bcfe41ba75344f420bb8c2e603ad4d3a04",
  "src/components/WorkloadSummary.astro":
    "48940fd535327a27950c26f2c5af1ddcda351d11fb7e70201d1efe4f199171a5",
  "src/layouts/BaseLayout.astro":
    "f242c1d7626879612560ed6a78d6c668b1fc62aa571ef151027a64a1eec14ea8",
  "src/pages/courses/[course].astro":
    "787d70810a8d6ddc3e3b75e5aa2fd4c3265c172f57cd3d097565fccb3994200d",
  "src/pages/courses/[course]/capstone.astro":
    "1d221884911aa0f685dfd58b3887f2daf99055698cf31f10e522c6a0983f1c71",
  "src/pages/courses/[course]/lessons/[lesson].astro":
    "087e30f29d7704a6315f8330abda83c7b194adae5696ec21404786e2f23edb2f",
  "src/pages/courses/[course]/modules/[module].astro":
    "4d90bbc4f838555a605085568f84da96e70601b804aa84619da6b8b02839452a",
  "src/pages/courses/[course]/modules/[module]/checkpoint.astro":
    "4126c393e1873518a76f70086c78ce70765277c4f31c955cf670ad7cc686df9b",
  "src/pages/index.astro":
    "d65a1eda65cac5b0b04772a358959062a5871d70b180785a9ed2e7596df57b84",
  "src/pages/offline.astro":
    "5abf5e8e90feb25a84f5dced7c9443f1e3d3a8a7a1536f10743155cdfa090705",
  "src/styles/global.css":
    "63cc470c5f065d61a6edb067f30c2c36c002700fc399d0512409d5afc0d3109c",
};

// Narrow exceptions for presentation values that are computed from runtime
// data and cannot be represented by a finite utility. Fingerprints prevent an
// exception from becoming permission for unrelated styling.
export const technicalStyleExceptions = {
  "src/scripts/home-progress.ts": {
    reason: "Catalog progress width is completion data expressed as geometry.",
    fingerprint: "56fc8e5c35051f34258198fc0dee972720d8150519573d9a55093d4e2b78af07",
  },
  "src/scripts/progress.ts": {
    reason: "Course progress width is completion data expressed as geometry.",
    fingerprint: "a974e641906f43fab0c32bd33549c1503f0582656f646758c6937c97de15e93c",
  },
};
