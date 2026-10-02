// Finite display translations of PUBLIC catalogue text, not official translations.
// Sources: data/occupation_osca_master.csv (OSCA 2024 lead statements/tasks),
// data/training_occupation_pathways.csv, data/hireway_degree_options.csv, and
// data_source metadata in data/generated/*reference_data.sql and market_data.sql.
// [English source, Simplified Chinese, Spanish, Japanese]
export const publicCatalogueMessages: readonly (readonly [
  string,
  string,
  string,
  string,
])[] = [
  [
    'Gathers, processes, analyses and interprets data using data analytical tools. Communicates findings through reports and data visualisations, such as charts and infographics.',
    '使用数据分析工具收集、处理、分析和解读数据，并通过报告、图表和信息图等数据可视化形式传达分析结果。',
    'Recopila, procesa, analiza e interpreta datos mediante herramientas de análisis. Comunica los resultados a través de informes y visualizaciones, como gráficos e infografías.',
    'データ分析ツールを使ってデータを収集、処理、分析、解釈します。報告書やグラフ、インフォグラフィックなどの可視化を通じて分析結果を伝えます。',
  ],
  [
    'Applies analytical techniques and scientific procedures to datasets by creating algorithms and using statistical models. Builds and deploys analytics frameworks, such as machine learning, to obtain information for strategic planning and decision-making.',
    '通过编写算法和使用统计模型，将分析技术和科学方法应用于数据集。构建并部署机器学习等分析框架，为战略规划和决策提供信息。',
    'Aplica técnicas analíticas y procedimientos científicos a conjuntos de datos mediante algoritmos y modelos estadísticos. Crea e implementa marcos de análisis, como el aprendizaje automático, para obtener información destinada a la planificación estratégica y la toma de decisiones.',
    'アルゴリズムの作成や統計モデルを通じて、データセットに分析技術と科学的手法を適用します。機械学習などの分析基盤を構築・導入し、戦略策定や意思決定に役立つ情報を得ます。',
  ],
  [
    'Designs, develops, modifies, documents, tests and maintains software applications and systems using programming languages and development tools.',
    '使用编程语言和开发工具，设计、开发、修改、记录、测试和维护软件应用及系统。',
    'Diseña, desarrolla, modifica, documenta, prueba y mantiene aplicaciones y sistemas de software mediante lenguajes de programación y herramientas de desarrollo.',
    'プログラミング言語と開発ツールを使って、ソフトウェアやシステムを設計、開発、修正、文書化、テスト、保守します。',
  ],
  [
    'Provides services relating to compliance-based financial, non-financial and sustainability-related reporting, auditing, insolvency and accounting information systems, and advises on association record-keeping requirements.',
    '提供与合规性财务、非财务及可持续发展报告、审计、资不抵债事务和会计信息系统有关的服务，并就协会记录保存要求提供建议。',
    'Presta servicios de informes financieros, no financieros y de sostenibilidad orientados al cumplimiento, auditoría, insolvencia y sistemas de información contable. Asesora sobre los requisitos de conservación de registros de las asociaciones.',
    '法令等への準拠を目的とした財務・非財務・持続可能性の報告、監査、支払不能への対応、会計情報システムに関する業務を提供し、団体の記録保存要件について助言します。',
  ],
  [
    'Analyses mathematical, statistical, demographic, financial or economic data to predict and assess long-term risks and potential impacts of future events.',
    '分析数学、统计、人口、财务或经济数据，预测和评估长期风险及未来事件的潜在影响。',
    'Analiza datos matemáticos, estadísticos, demográficos, financieros o económicos para prever y evaluar riesgos a largo plazo y los posibles efectos de acontecimientos futuros.',
    '数学、統計、人口、財務、経済に関するデータを分析し、長期的なリスクや将来の出来事がもたらす影響を予測・評価します。',
  ],
  [
    'Prepares patients for dental examination, and assists dental practitioners, Hygienists and Therapists in providing care and treatment.',
    '为患者做好牙科检查准备，并协助牙医、口腔卫生师和口腔治疗师提供护理及治疗。',
    'Prepara a los pacientes para los exámenes dentales y ayuda a dentistas, higienistas y terapeutas dentales a prestar atención y tratamiento.',
    '歯科検診を受ける患者の準備を行い、歯科医、歯科衛生士、歯科セラピストによるケアや治療を補助します。',
  ],
  [
    'Sets up processes to securely collect, store, process and validate data',
    '建立安全收集、存储、处理和验证数据的流程',
    'Establece procesos para recopilar, almacenar, procesar y validar datos de forma segura',
    'データを安全に収集、保存、処理、検証する手順を整えます',
  ],
  [
    'Evaluates the accuracy and reliability of data',
    '评估数据的准确性和可靠性',
    'Evalúa la exactitud y fiabilidad de los datos',
    'データの正確性と信頼性を評価します',
  ],
  [
    'Analyses and interprets data to produce relevant statistics to describe and infer trends and patterns, solve problems and answer data-related queries',
    '分析和解读数据，生成相关统计信息，以描述和推断趋势与规律、解决问题并回答数据相关问题',
    'Analiza e interpreta datos para generar estadísticas que describan e infieran tendencias y patrones, resuelvan problemas y respondan consultas sobre datos',
    'データを分析・解釈して統計情報を作成し、傾向やパターンの説明・推測、問題解決、データに関する質問への回答に役立てます',
  ],
  [
    'Prepares data for analysis, cleans data, and recognises and overcomes data anomalies',
    '准备并清洗待分析的数据，识别和处理数据异常',
    'Prepara y depura los datos para el análisis, e identifica y resuelve anomalías',
    '分析用のデータを準備・整備し、データの異常を特定して対処します',
  ],
  [
    'Applies analytics techniques that incorporate mathematical, statistical, programming and database skills',
    '运用结合数学、统计、编程和数据库技能的分析技术',
    'Aplica técnicas de análisis que integran conocimientos matemáticos, estadísticos, de programación y de bases de datos',
    '数学、統計、プログラミング、データベースの技能を組み合わせた分析手法を用います',
  ],
  [
    'Builds and deploys machine learning and artificial intelligence frameworks',
    '构建并部署机器学习和人工智能框架',
    'Crea e implementa marcos de aprendizaje automático e inteligencia artificial',
    '機械学習と人工知能の基盤を構築・導入します',
  ],
  [
    'Designs and implements software architectures to solve complex technical issues in alignment with specified requirements',
    '依据既定要求设计和实现软件架构，解决复杂的技术问题',
    'Diseña e implementa arquitecturas de software para resolver problemas técnicos complejos conforme a los requisitos especificados',
    '指定された要件に沿ってソフトウェア構成を設計・実装し、複雑な技術的課題を解決します',
  ],
  [
    'Writes, tests and debugs code to ensure functionality, efficiency and adherence to quality accredited standards',
    '编写、测试和调试代码，确保功能、效率和质量认证标准得到满足',
    'Escribe, prueba y depura código para garantizar su funcionalidad, eficiencia y cumplimiento de estándares de calidad acreditados',
    'コードの作成、テスト、デバッグを行い、機能性、効率性、認定された品質基準への適合を確保します',
  ],
  [
    'Performs code reviews and optimises algorithms to ensure software quality, maintainability and adherence to best practices',
    '审查代码并优化算法，确保软件质量、可维护性及对最佳实践的遵循',
    'Revisa el código y optimiza algoritmos para garantizar la calidad, mantenibilidad y cumplimiento de las buenas prácticas',
    'コードレビューとアルゴリズムの最適化を行い、ソフトウェアの品質、保守性、推奨される開発手法への適合を確保します',
  ],
  [
    'Provides advice regarding business plans, structures and accounting systems',
    '就商业计划、组织架构和会计系统提供建议',
    'Asesora sobre planes empresariales, estructuras y sistemas contables',
    '事業計画、組織構造、会計システムについて助言します',
  ],
  [
    'Examines the income and expenditure of individuals and organisations',
    '审查个人和组织的收入及支出',
    'Examina los ingresos y gastos de personas y organizaciones',
    '個人や組織の収入と支出を調査します',
  ],
  [
    'Applies and examines complex models to forecast future events that may have financial, social or environmental impacts',
    '应用和检验复杂模型，预测可能产生财务、社会或环境影响的未来事件',
    'Aplica y examina modelos complejos para prever acontecimientos futuros con posibles efectos financieros, sociales o ambientales',
    '複雑なモデルを適用・検証し、財務、社会、環境に影響しうる将来の出来事を予測します',
  ],
  [
    'Formulates and proposes strategies to mitigate risks and uncertainties',
    '制定并提出减轻风险和不确定性的策略',
    'Formula y propone estrategias para reducir riesgos e incertidumbres',
    'リスクや不確実性を軽減する戦略を策定・提案します',
  ],
  [
    'Assists dental practitioners during dental procedures',
    '在牙科操作中协助牙医',
    'Ayuda a los dentistas durante los procedimientos dentales',
    '歯科処置中に歯科医を補助します',
  ],
  [
    'Sterilises and prepares dental instruments and equipment',
    '对牙科器械和设备进行灭菌并做好使用准备',
    'Esteriliza y prepara los instrumentos y equipos dentales',
    '歯科器具や機器を滅菌し、使用の準備をします',
  ],
  [
    'Occupation ready',
    '具备从业准备',
    'Preparación para ejercer la profesión',
    '就業に必要な準備',
  ],
  ['Specialised training', '专项培训', 'Formación especializada', '専門研修'],
  [
    'Progression pathway',
    '职业进阶路径',
    'Itinerario de progresión profesional',
    'キャリアアップの経路',
  ],
  [
    'Pre-vocational',
    '职业预备培训',
    'Formación preprofesional',
    '就業前の準備教育',
  ],
  ['Related', '相关培训', 'Formación relacionada', '関連する研修'],
  ['Advanced Diploma', '高级文凭', 'Diploma avanzado', '上級ディプロマ'],
  ['Diploma', '文凭', 'Diploma', 'ディプロマ'],
  [
    'Graduate Certificate',
    '研究生证书',
    'Certificado de posgrado',
    '大学院修了証',
  ],
  ['Graduate Diploma', '研究生文凭', 'Diploma de posgrado', '大学院ディプロマ'],
  [
    'ABS OSCA 2024',
    'ABS OSCA 2024（澳大利亚职业标准分类）',
    'ABS OSCA 2024 (clasificación australiana de ocupaciones)',
    'ABS OSCA 2024（オーストラリア職業標準分類）',
  ],
  [
    'O*NET 31.0',
    'O*NET 31.0（职业信息网络）',
    'O*NET 31.0 (red de información ocupacional)',
    'O*NET 31.0（職業情報ネットワーク）',
  ],
  [
    'Australian training pathways',
    '澳大利亚培训路径',
    'Itinerarios formativos de Australia',
    'オーストラリアの職業訓練経路',
  ],
  [
    'Australian labour market outlook',
    '澳大利亚劳动力市场展望',
    'Perspectivas del mercado laboral australiano',
    'オーストラリアの労働市場見通し',
  ],
  [
    'Australian Bureau of Statistics',
    '澳大利亚统计局',
    'Oficina Australiana de Estadística',
    'オーストラリア統計局',
  ],
  [
    'Jobs and Skills Australia',
    '澳大利亚就业与技能署',
    'Jobs and Skills Australia (organismo australiano de empleo y competencias)',
    'Jobs and Skills Australia（オーストラリア雇用・技能機関）',
  ],
  [
    'Jobs and Skills Australia and the Australian Bureau of Statistics',
    '澳大利亚就业与技能署及澳大利亚统计局',
    'Jobs and Skills Australia y la Oficina Australiana de Estadística',
    'Jobs and Skills Australia およびオーストラリア統計局',
  ],
  [
    'U.S. Department of Labor, Employment and Training Administration',
    '美国劳工部就业与培训管理局',
    'Administración de Empleo y Formación del Departamento de Trabajo de Estados Unidos',
    '米国労働省雇用訓練局',
  ],
  [
    'Creative Commons Attribution 4.0 International',
    '知识共享署名 4.0 国际许可协议',
    'Creative Commons Atribución 4.0 Internacional',
    'クリエイティブ・コモンズ 表示 4.0 国際ライセンス',
  ],
  [
    'Creative Commons Attribution 2.5 Australia',
    '知识共享署名 2.5 澳大利亚许可协议',
    'Creative Commons Atribución 2.5 Australia',
    'クリエイティブ・コモンズ 表示 2.5 オーストラリアライセンス',
  ],
]

const columns = { zh: 1, es: 2, ja: 3 } as const
const messages = new Map(
  publicCatalogueMessages.map((entry) => [entry[0], entry]),
)

export function catalogueTranslation(
  text: string,
  locale: keyof typeof columns,
): string | undefined {
  return messages.get(text.trim())?.[columns[locale]]
}
