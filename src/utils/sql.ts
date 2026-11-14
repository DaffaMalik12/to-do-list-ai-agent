/**
 * Escape karakter khusus LIKE (`\`, `%`, `_`) agar diperlakukan sebagai literal.
 * Hasil WAJIB dipakai bersama klausa `ESCAPE '\'` pada query.
 */
const LIKE_SPECIAL_CHARACTER = /[\\%_]/g;

export function escapeLikePattern(input: string): string {
  return input.replace(LIKE_SPECIAL_CHARACTER, (character) => `\\${character}`);
}

/** Pattern "mengandung": `%<escaped>%`. */
export function toContainsPattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}

/** Pattern "diawali": `<escaped>%`. */
export function toPrefixPattern(term: string): string {
  return `${escapeLikePattern(term)}%`;
}
