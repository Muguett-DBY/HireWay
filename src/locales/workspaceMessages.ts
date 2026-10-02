// Product-owned messages: these do not require machine translation.
const en = {
  'workspace.nav': 'Workspace pages',
  'workspace.currentRole': 'Current role: {role}',
  'workspace.savedSkills': '{n} saved skills',
  'workspace.moreSkills': '+{n} more',
  'workspace.match': '{n}% match',
  'workspace.matchAria': '{role} match',
  'workspace.growth': '{n}% growth',
  'workspace.weeklyPay': 'A${n}/wk',
  'workspace.compare': 'Compare with other matches →',
  'workspace.skillEvidence':
    'From US O*NET 31.0 importance ratings via the ABS OSCA bridge',
  'workspace.progressStatus': '{name} progress status',
  'workspace.promptAria': 'Quick skill question',
  'workspace.pathwaysIntro':
    'Priorities from the gap analysis, training routes linked in official data, and your progress in one view. Everything here refreshes as your profile changes.',
  'workspace.noCompleted':
    'Nothing completed yet — mark a skill as completed when you have it nailed.',
  'workspace.noCurrent':
    'No current skills tracked. Add the strengths you already use.',
  'workspace.noUpcoming':
    'Nothing planned yet. Add a missing skill from the analysis page to start a plan.',
  'workspace.noPriorities':
    'No outstanding priorities — your profile covers the listed skills.',
  'workspace.choosePriorities':
    'Choose a target role to see your learning priorities.',
  'workspace.learningType': 'Learning type:',
  'workspace.topic': 'Topic:',
  'workspace.noTraining':
    'No training pathways are linked to this role yet — only routes published in the official data appear here.',
  'workspace.chooseRoleDetails':
    'Role details describe one occupation — pick a direction and this page fills in.',
  'workspace.coreNote':
    'Broad O*NET abilities commonly associated with this role.',
  'workspace.transferableNote':
    'Abilities that can carry across jobs and industries.',
  'workspace.toolsNote':
    'Named software and technologies found in the source data.',
  'workspace.trajectoryAria':
    'Employment from {start} in {startYear} to {end} in {endYear}',
  'workspace.reason.skills': '{skills} feature in this role’s usual toolkit.',
  'workspace.reason.growth':
    'Projected growth beats {n}% of Australian occupations.',
  'workspace.reason.educationAligned':
    'The typical skill level lines up with your education.',
  'workspace.reason.educationDifferent':
    'Usually asks for a different study level.',
  'workspace.hint.knowledgeOnly':
    'Knowledge areas alone do not drive matching — add a few tools or skills you can use.',
  'workspace.outlook.unknown': 'Outlook unknown',
  'workspace.outlook.strong': 'Growing strongly',
  'workspace.outlook.growing': 'Growing',
  'workspace.outlook.stable': 'Stable',
  'workspace.outlook.declining': 'Declining',
}

type Messages = Record<keyof typeof en, string>

const zh: Messages = {
  'workspace.nav': '工作区页面',
  'workspace.currentRole': '当前职业：{role}',
  'workspace.savedSkills': '已保存 {n} 项技能',
  'workspace.moreSkills': '另有 {n} 项',
  'workspace.match': '匹配度 {n}%',
  'workspace.matchAria': '{role}的职业匹配',
  'workspace.growth': '增长 {n}%',
  'workspace.weeklyPay': '{n} 澳元/周',
  'workspace.compare': '与其他匹配职业比较 →',
  'workspace.skillEvidence':
    '依据美国 O*NET 31.0 重要性评分，通过 ABS OSCA 对照表关联',
  'workspace.progressStatus': '{name}的学习状态',
  'workspace.promptAria': '技能小问答',
  'workspace.pathwaysIntro':
    '集中查看技能差距对应的学习重点、官方数据关联的培训途径，以及你的进度。内容会随档案更新。',
  'workspace.noCompleted':
    '暂无已完成的技能。熟练掌握后，可将技能标为“已完成”。',
  'workspace.noCurrent': '暂无当前技能。添加你已经掌握并使用的技能。',
  'workspace.noUpcoming':
    '暂无学习计划。可从能力分析页添加缺少的技能，开始制定计划。',
  'workspace.noPriorities': '暂无待补齐的重点技能，你的档案已覆盖所列技能。',
  'workspace.choosePriorities': '选择目标职业后，即可查看学习重点。',
  'workspace.learningType': '学习类型：',
  'workspace.topic': '主题：',
  'workspace.noTraining':
    '该职业暂无关联的培训途径；这里只展示官方数据发布的途径。',
  'workspace.chooseRoleDetails':
    '本页介绍某一个职业。选择目标方向后，即可查看详情。',
  'workspace.coreNote': 'O*NET 数据中与该职业通常相关的基础能力。',
  'workspace.transferableNote': '可在不同职业和行业中运用的能力。',
  'workspace.toolsNote': '来源数据中列出的软件和技术工具。',
  'workspace.trajectoryAria':
    '就业人数从 {startYear} 年的 {start} 人变化至 {endYear} 年的 {end} 人',
  'workspace.reason.skills': '{skills}是该职业常用的技能或工具。',
  'workspace.reason.growth': '预计就业增长超过 {n}% 的澳大利亚职业。',
  'workspace.reason.educationAligned': '该职业的典型技能等级与你的学历相符。',
  'workspace.reason.educationDifferent': '该职业通常对应不同的学历层级。',
  'workspace.hint.knowledgeOnly':
    '仅有知识领域不足以进行职业匹配，请添加你会使用的工具或技能。',
  'workspace.outlook.unknown': '暂无前景数据',
  'workspace.outlook.strong': '强劲增长',
  'workspace.outlook.growing': '持续增长',
  'workspace.outlook.stable': '保持稳定',
  'workspace.outlook.declining': '呈下降趋势',
}

const es: Messages = {
  'workspace.nav': 'Páginas del espacio de trabajo',
  'workspace.currentRole': 'Ocupación actual: {role}',
  'workspace.savedSkills': '{n} habilidades guardadas',
  'workspace.moreSkills': '{n} más',
  'workspace.match': '{n}% de afinidad',
  'workspace.matchAria': 'Afinidad con {role}',
  'workspace.growth': '{n}% de crecimiento',
  'workspace.weeklyPay': '{n} AUD/semana',
  'workspace.compare': 'Comparar con otras opciones →',
  'workspace.skillEvidence':
    'Según las puntuaciones de importancia de O*NET 31.0 de EE. UU., vinculadas mediante la correspondencia ABS OSCA',
  'workspace.progressStatus': 'Estado de aprendizaje de {name}',
  'workspace.promptAria': 'Pregunta rápida sobre habilidades',
  'workspace.pathwaysIntro':
    'Consulta las prioridades del análisis de carencias, las vías formativas de fuentes oficiales y tu progreso. Todo se actualiza cuando cambia tu perfil.',
  'workspace.noCompleted':
    'Aún no hay habilidades completadas. Marca una como completada cuando la domines.',
  'workspace.noCurrent':
    'No hay habilidades actuales. Añade las que ya utilizas.',
  'workspace.noUpcoming':
    'Aún no hay planes. Añade una habilidad pendiente desde el análisis para empezar.',
  'workspace.noPriorities':
    'No quedan prioridades pendientes: tu perfil cubre las habilidades indicadas.',
  'workspace.choosePriorities':
    'Elige una ocupación objetivo para ver tus prioridades de aprendizaje.',
  'workspace.learningType': 'Tipo de aprendizaje:',
  'workspace.topic': 'Tema:',
  'workspace.noTraining':
    'Aún no hay vías formativas vinculadas a esta ocupación. Solo se muestran las publicadas en fuentes oficiales.',
  'workspace.chooseRoleDetails':
    'Esta página describe una ocupación. Elige un objetivo para ver sus detalles.',
  'workspace.coreNote':
    'Capacidades generales de O*NET habitualmente asociadas con esta ocupación.',
  'workspace.transferableNote':
    'Capacidades aplicables a distintas ocupaciones y sectores.',
  'workspace.toolsNote':
    'Software y tecnologías que aparecen en los datos originales.',
  'workspace.trajectoryAria':
    'El empleo pasa de {start} en {startYear} a {end} en {endYear}',
  'workspace.reason.skills':
    '{skills} forman parte de las habilidades o herramientas habituales de esta ocupación.',
  'workspace.reason.growth':
    'El crecimiento previsto supera al de un {n}% de las ocupaciones australianas.',
  'workspace.reason.educationAligned':
    'El nivel de cualificación habitual se corresponde con tu formación.',
  'workspace.reason.educationDifferent':
    'Suele requerir un nivel de estudios diferente.',
  'workspace.hint.knowledgeOnly':
    'Las áreas de conocimiento por sí solas no bastan para encontrar afinidades. Añade herramientas o habilidades que utilices.',
  'workspace.outlook.unknown': 'Perspectivas desconocidas',
  'workspace.outlook.strong': 'Fuerte crecimiento',
  'workspace.outlook.growing': 'En crecimiento',
  'workspace.outlook.stable': 'Estable',
  'workspace.outlook.declining': 'En descenso',
}

const ja: Messages = {
  'workspace.nav': 'ワークスペースのページ',
  'workspace.currentRole': '現在の職業：{role}',
  'workspace.savedSkills': '保存済みスキル：{n} 件',
  'workspace.moreSkills': 'ほか {n} 件',
  'workspace.match': '適合度 {n}%',
  'workspace.matchAria': '{role}との適合度',
  'workspace.growth': '成長率 {n}%',
  'workspace.weeklyPay': '週 {n} 豪ドル',
  'workspace.compare': 'ほかの候補と比較する →',
  'workspace.skillEvidence':
    '米国 O*NET 31.0 の重要度評価を ABS OSCA 対応表で関連付けたデータ',
  'workspace.progressStatus': '{name}の学習状況',
  'workspace.promptAria': 'スキルについての簡単な質問',
  'workspace.pathwaysIntro':
    '不足スキルに基づく学習の優先順位、公式データにある研修ルート、進捗をまとめて確認できます。プロフィールの変更に合わせて更新されます。',
  'workspace.noCompleted':
    '完了したスキルはまだありません。習得したスキルを「完了」に変更してください。',
  'workspace.noCurrent':
    '現在のスキルは登録されていません。すでに使っているスキルを追加してください。',
  'workspace.noUpcoming':
    '学習予定はまだありません。分析ページから不足スキルを追加して計画を始めましょう。',
  'workspace.noPriorities':
    '未対応の優先項目はありません。プロフィールは一覧のスキルを満たしています。',
  'workspace.choosePriorities':
    '目標の職業を選ぶと、学習の優先順位を確認できます。',
  'workspace.learningType': '学習の種類：',
  'workspace.topic': '分野：',
  'workspace.noTraining':
    'この職業に関連付けられた研修ルートはまだありません。公式データに掲載されたルートのみ表示します。',
  'workspace.chooseRoleDetails':
    'このページでは一つの職業を紹介します。目標を選ぶと詳細が表示されます。',
  'workspace.coreNote': 'この職業に一般的に関連する O*NET の基礎的な能力。',
  'workspace.transferableNote': 'さまざまな職業や業界で活用できる能力。',
  'workspace.toolsNote': '出典データに掲載されたソフトウェアや技術。',
  'workspace.trajectoryAria':
    '雇用者数は {startYear} 年の {start} 人から {endYear} 年の {end} 人へ変化',
  'workspace.reason.skills':
    '{skills}は、この職業でよく使われるスキルやツールです。',
  'workspace.reason.growth':
    '予測成長率はオーストラリアの職業の {n}% を上回ります。',
  'workspace.reason.educationAligned':
    '一般的な技能水準があなたの学歴に合っています。',
  'workspace.reason.educationDifferent': '通常は異なる学歴水準が求められます。',
  'workspace.hint.knowledgeOnly':
    '知識分野だけでは適合度を判定できません。使えるツールやスキルを追加してください。',
  'workspace.outlook.unknown': '見通し不明',
  'workspace.outlook.strong': '大幅な成長',
  'workspace.outlook.growing': '成長傾向',
  'workspace.outlook.stable': '安定',
  'workspace.outlook.declining': '減少傾向',
}

export const workspaceMessages = { en, zh, es, ja }
