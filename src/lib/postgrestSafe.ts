// Sanitize user-supplied text before it is interpolated into a PostgREST
// filter expression such as `.or("name.ilike.%<text>%,...")`.
// PostgREST treats , ( ) . " as structural characters in these strings and
// % _ * as ilike/like wildcards. Stripping them prevents a search term from
// changing which filter conditions are evaluated.
export function sanitizePostgrestLike(input: string): string {
  return input.replace(/[,()."%*_\\:]/g, " ").replace(/\s+/g, " ").trim();
}
