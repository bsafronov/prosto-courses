export const COURSE_PDF_PRINT_DIRECTORY = "course-pdf-print";
export const COURSE_PDF_EXTENSION = ".pdf";

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
