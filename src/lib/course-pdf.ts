import { sitePath } from "./courses";

export const coursePdfFilename = (courseSlug: string) =>
  `prosto-courses-${courseSlug}.pdf`;

export const coursePdfPath = (courseSlug: string) =>
  sitePath(coursePdfFilename(courseSlug));
