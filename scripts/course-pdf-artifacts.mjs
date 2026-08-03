export const COURSE_PDF_PRINT_DIRECTORY = "course-pdf-print";
export const COURSE_PDF_EXTENSION = ".pdf";
export const COURSE_PDF_FILENAME_PREFIX = "prosto-courses-";
export const MAX_COURSE_PDF_BYTES = 20 * 1024 * 1024;

const formatArtifactSize = (bytes) => {
  if (bytes < 1024 * 1024) {
    return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
};

export const COURSE_PDF_PRECACHE_GLOB_IGNORES = [
  `${COURSE_PDF_PRINT_DIRECTORY}/**/*`,
  `**/*${COURSE_PDF_EXTENSION}`,
];

export function isCoursePdfOfflineExcluded(url) {
  return (
    url.startsWith(`${COURSE_PDF_PRINT_DIRECTORY}/`) ||
    url.endsWith(COURSE_PDF_EXTENSION)
  );
}

export function isCoursePdfArtifactName(filename) {
  return (
    filename.startsWith(COURSE_PDF_FILENAME_PREFIX) &&
    filename.endsWith(COURSE_PDF_EXTENSION)
  );
}

export function coursePdfArtifactName(courseSlug) {
  return `${COURSE_PDF_FILENAME_PREFIX}${courseSlug}${COURSE_PDF_EXTENSION}`;
}

export const normalizePdfText = (value) =>
  value.normalize("NFKC").replaceAll(/[\s\u00ad]+/g, "");

export function assertCoursePdfSize(courseSlug, measuredBytes) {
  if (measuredBytes > 0 && measuredBytes <= MAX_COURSE_PDF_BYTES) return;
  if (measuredBytes === 0) {
    throw new Error(`Course "${courseSlug}" PDF artifact is empty`);
  }
  throw new Error(
    `Course "${courseSlug}" PDF measured ${formatArtifactSize(measuredBytes)}, ` +
      `above the ${formatArtifactSize(MAX_COURSE_PDF_BYTES)} limit`,
  );
}
