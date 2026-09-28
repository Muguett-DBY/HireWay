// OSCA occupation titles end in "nec" (not elsewhere classified). The
// abbreviation reads like a truncation, so spell it out at display time.
export function occupationTitle(title: string): string {
  return title.replace(/\s+nec$/i, ' (other)')
}
