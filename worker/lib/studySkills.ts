type StudySkillRule = {
  terms: string[]
  skills: string[]
}

// These small starter sets point to names already stored in the O*NET catalogue.
const studySkillRules: StudySkillRule[] = [
  {
    terms: [
      'data science',
      'data analytics',
      'business analytics',
      'statistics',
    ],
    skills: [
      'Python',
      'SQL',
      'R',
      'Microsoft Excel',
      'Power BI',
      'Tableau',
      'Programming',
      'Git',
    ],
  },
  {
    terms: ['information systems'],
    skills: [
      'SQL',
      'Microsoft Excel',
      'Power BI',
      'Tableau',
      'Programming',
      'Python',
      'Git',
      'JavaScript',
    ],
  },
  {
    terms: [
      'computer science',
      'software engineering',
      'information technology',
      'cyber security',
      'cybersecurity',
    ],
    skills: ['Programming', 'Python', 'JavaScript', 'SQL', 'Git'],
  },
  {
    terms: [
      'accounting',
      'finance',
      'economics',
      'business administration',
      'business management',
      'marketing',
    ],
    skills: ['Microsoft Excel', 'Power BI', 'SQL', 'Tableau'],
  },
]

// The first specific title match wins so broad words do not replace a closer set.
export function findStudySkillNames(title: string): string[] {
  const normalisedTitle = title.toLowerCase()
  return (
    studySkillRules.find((rule) =>
      rule.terms.some((term) => normalisedTitle.includes(term)),
    )?.skills ?? []
  )
}
