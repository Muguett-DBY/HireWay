// Keep the first recommendation list small enough to review and explain.
export type MajorOption = {
  name: string
  keywords: string[]
  skills: string[]
}

// These common fields give the profile form useful suggestions straight away.
export const majorOptions: MajorOption[] = [
  {
    name: 'Data Science',
    keywords: ['data', 'analytics', 'machine learning'],
    skills: [
      'Python',
      'SQL',
      'Statistics',
      'Data Visualisation',
      'Machine Learning',
    ],
  },
  {
    name: 'Business Analytics',
    keywords: ['data', 'business', 'analytics'],
    skills: ['Excel', 'SQL', 'Power BI', 'Statistics', 'Data Visualisation'],
  },
  {
    name: 'Computer Science',
    keywords: ['computing', 'programming', 'software'],
    skills: ['Python', 'JavaScript', 'Algorithms', 'Git', 'SQL'],
  },
  {
    name: 'Software Engineering',
    keywords: ['software', 'programming', 'development'],
    skills: ['JavaScript', 'TypeScript', 'Git', 'Software Testing', 'APIs'],
  },
  {
    name: 'Information Technology',
    keywords: ['it', 'computing', 'technology'],
    skills: [
      'Technical Support',
      'Networking',
      'SQL',
      'Cybersecurity',
      'Cloud Computing',
    ],
  },
  {
    name: 'Cybersecurity',
    keywords: ['security', 'network', 'information technology'],
    skills: [
      'Network Security',
      'Linux',
      'Python',
      'Risk Assessment',
      'Incident Response',
    ],
  },
  {
    name: 'Statistics',
    keywords: ['data', 'mathematics', 'analytics'],
    skills: ['Statistics', 'R', 'Python', 'Data Analysis', 'Probability'],
  },
  {
    name: 'Mathematics',
    keywords: ['maths', 'quantitative', 'modelling'],
    skills: [
      'Mathematics',
      'Statistics',
      'Python',
      'Problem Solving',
      'Modelling',
    ],
  },
  {
    name: 'Finance',
    keywords: ['business', 'banking', 'economics'],
    skills: [
      'Excel',
      'Financial Modelling',
      'Data Analysis',
      'Risk Analysis',
      'Economics',
    ],
  },
  {
    name: 'Accounting',
    keywords: ['business', 'finance', 'bookkeeping'],
    skills: [
      'Excel',
      'Financial Reporting',
      'Bookkeeping',
      'Data Analysis',
      'Tax',
    ],
  },
  {
    name: 'Marketing',
    keywords: ['business', 'advertising', 'communications'],
    skills: [
      'Market Research',
      'Content Strategy',
      'Analytics',
      'Communication',
      'SEO',
    ],
  },
  {
    name: 'Psychology',
    keywords: ['behaviour', 'social science', 'research'],
    skills: [
      'Research',
      'Statistics',
      'Communication',
      'Critical Thinking',
      'SPSS',
    ],
  },
  {
    name: 'Civil Engineering',
    keywords: ['engineering', 'construction', 'infrastructure'],
    skills: [
      'AutoCAD',
      'Project Management',
      'Structural Analysis',
      'Mathematics',
      'Technical Drawing',
    ],
  },
  {
    name: 'Mechanical Engineering',
    keywords: ['engineering', 'mechanics', 'manufacturing'],
    skills: ['CAD', 'MATLAB', 'Mechanics', 'Product Design', 'Problem Solving'],
  },
  {
    name: 'Electrical Engineering',
    keywords: ['engineering', 'electronics', 'systems'],
    skills: [
      'Circuit Design',
      'MATLAB',
      'Embedded Systems',
      'Python',
      'Signal Processing',
    ],
  },
  {
    name: 'Nursing',
    keywords: ['health', 'healthcare', 'clinical'],
    skills: [
      'Patient Care',
      'Clinical Assessment',
      'Communication',
      'Documentation',
      'First Aid',
    ],
  },
  {
    name: 'Education',
    keywords: ['teaching', 'learning', 'training'],
    skills: [
      'Lesson Planning',
      'Communication',
      'Classroom Management',
      'Assessment',
      'Curriculum Design',
    ],
  },
]

// Match both the displayed name and familiar search words such as "data".
export function findMajorMatches(query: string) {
  const search = query.trim().toLowerCase()
  if (search.length < 2) return []

  return majorOptions
    .filter((option) =>
      [option.name, ...option.keywords].some((value) =>
        value.toLowerCase().includes(search),
      ),
    )
    .slice(0, 6)
}

// Skill suggestions appear only after a full major name has been chosen.
export function findMajorOption(value: string) {
  const name = value.trim().toLowerCase()
  return majorOptions.find((option) => option.name.toLowerCase() === name)
}
