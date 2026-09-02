// The profile uses a short level name while CRICOS keeps the full award type.
export function simplifyEducationLevel(level: string): string {
  const value = level.toLowerCase()

  if (value.includes('doctor')) return 'Doctorate'
  if (value.includes('master')) return 'Master'
  if (value.includes('bachelor')) return 'Bachelor'
  if (
    value.includes('diploma') ||
    value.includes('certificate') ||
    value.includes('associate')
  ) {
    return 'Diploma / Certificate'
  }
  if (
    value.includes('school') ||
    value.includes('secondary') ||
    value.includes('foundation')
  ) {
    return 'High School'
  }

  return 'Other'
}
