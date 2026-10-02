import { isTranslationKey, type TranslationKey } from './i18n'

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string

// Legacy API responses still contain English prose. Keep this compatibility
// boundary separate from display text, and preserve unrecognised errors.
const messageKeys: Record<string, TranslationKey> = {
  'Enter your recovery code.': 'profileUi.error.recoveryRequired',
  'Profile not found.': 'profileUi.error.profileNotFound',
  'Could not load a profile with that code.': 'profileUi.error.profileNotFound',
  'Method not allowed.': 'profileUi.error.method',
  'Send a JSON object.': 'profileUi.error.invalidRequest',
  'Not found.': 'profileUi.error.notFound',
  'Something went wrong. Please try again.': 'profileUi.error.unexpected',
  'Could not connect. Please try again.': 'profileUi.error.connection',
  'Choose a course or field of study from the suggestions.':
    'wizard.errors.chooseStudy',
  'Select your education level.': 'wizard.errors.chooseLevel',
  'Choose a valid education level.': 'profileUi.error.educationLevel',
  'Use 120 characters or fewer.': 'profileUi.error.max120',
  'Enter your current role as text.': 'profileUi.error.currentRole',
  'Send a valid skill ID and status.': 'profileUi.error.skillStatus',
  'Enter a valid skill ID.': 'profileUi.error.skillId',
  'Skill not found.': 'profileUi.error.skillNotFound',
  'Choose a skill or tool from the suggestions.': 'profileUi.error.chooseSkill',
  'Use 80 characters or fewer.': 'profileUi.error.max80',
  'This skill is already in your list.': 'profileUi.error.duplicateSkill',
  'Choose a target role first.': 'profileUi.error.targetRequired',
  'Choose a target role from the suggestions.': 'wizard.errors.chooseRole',
  'Choose a valid target role.': 'profileUi.error.validTarget',
  'Could not remove this skill.': 'profile.removeError',
  'Enter a career goal.': 'profileUi.error.goalRequired',
}

// Translate at render time so an already-visible message follows language
// changes. Locally generated messages are stored as keys, never translations.
export function localizeMessage(message: string, t: Translate): string {
  const key = messageKeys[message]
  if (key) return t(key)
  if (isTranslationKey(message)) return t(message)
  return message
}
