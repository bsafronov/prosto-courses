const configuredBasePath = process.env.SITE_BASE_PATH ?? "/prosto-courses";

export const siteBasePath =
  configuredBasePath === "/" ? "/" : configuredBasePath.replace(/\/+$/, "");
export const siteOrigin = "https://bsafronov.github.io";
