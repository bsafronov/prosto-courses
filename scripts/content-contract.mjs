/**
 * Return whether a value is a Unicode locale identifier accepted by the
 * platform runtime.
 *
 * @param {unknown} value
 */
export function isSupportedLanguage(value) {
  if (typeof value !== "string") return false;

  try {
    new Intl.Locale(value);
    return true;
  } catch {
    return false;
  }
}
