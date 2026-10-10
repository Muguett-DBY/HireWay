// Earnings come from Australian labour-market data. The language changes
// presentation, never the currency or amount.
const locales: Record<string, string> = {
  en: 'en-AU',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
}
const formatters = new Map<string, Intl.NumberFormat>()

export function formatAud(value: number, language: string): string {
  const locale = locales[language] ?? locales.en
  let formatter = formatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'AUD',
      currencyDisplay: 'code',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    formatters.set(locale, formatter)
  }
  return formatter.format(value)
}
