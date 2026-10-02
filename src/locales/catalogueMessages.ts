const en = {
  'catalogue.translating': 'Translating reference information…',
  'catalogue.failed':
    'Some reference information could not be translated. The original text is shown.',
  'catalogue.retry': 'Retry translation',
  'catalogue.notice':
    'Some reference information has not been translated yet. Its original text is kept; product and technology names are unchanged.',
}
type Messages = Record<keyof typeof en, string>
const zh: Messages = {
  'catalogue.translating': '正在翻译职业和学习资料…',
  'catalogue.failed': '部分资料暂时无法翻译，现显示原文。',
  'catalogue.retry': '重试翻译',
  'catalogue.notice':
    '部分职业资料尚未收录译文，暂保留原文；产品和技术专有名称保持不变。',
}
const es: Messages = {
  'catalogue.translating': 'Traduciendo la información de referencia…',
  'catalogue.failed':
    'No se ha podido traducir parte de la información. Se muestra el texto original.',
  'catalogue.retry': 'Reintentar traducción',
  'catalogue.notice':
    'Parte de la información aún no tiene traducción y conserva el original. Los nombres de productos y tecnologías no cambian.',
}
const ja: Messages = {
  'catalogue.translating': '職業・学習資料を翻訳しています…',
  'catalogue.failed':
    '一部の資料を翻訳できなかったため、原文を表示しています。',
  'catalogue.retry': '翻訳を再試行',
  'catalogue.notice':
    '一部の職業資料は未翻訳のため原文を表示します。製品名や技術の固有名詞は原表記のままです。',
}
export const catalogueMessages = { en, zh, es, ja }
