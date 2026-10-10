import { lazy, Suspense } from 'react'
import type { AppPage } from './AppNav'
import { SkillPromptCard } from './SkillPromptCard'
import type { Profile } from '../../lib/profileApi'
import type { Skill, SkillStatus, SaveSkillResult } from '../../lib/skillsApi'
import type { TargetRole } from '../../lib/targetRoleApi'
import type { RoleSuggestion } from '../../lib/suggestionApi'
import type { RoleRequirements } from '../../lib/roleRequirementsApi'
import { useI18n } from '../../lib/useI18n'

const OverviewPage = lazy(() =>
  import('./OverviewPage').then((module) => ({ default: module.OverviewPage })),
)
const MatchesPage = lazy(() =>
  import('./MatchesPage').then((module) => ({ default: module.MatchesPage })),
)
const AnalysisPage = lazy(() =>
  import('./AnalysisPage').then((module) => ({ default: module.AnalysisPage })),
)
const RoleDetailsPage = lazy(() =>
  import('./RoleDetailsPage').then((module) => ({
    default: module.RoleDetailsPage,
  })),
)
const PathwaysPage = lazy(() =>
  import('./PathwaysPage').then((module) => ({ default: module.PathwaysPage })),
)
const MyProfilePage = lazy(() =>
  import('./MyProfilePage').then((module) => ({
    default: module.MyProfilePage,
  })),
)

type Prompt = { code: string; label: string }
type AppWorkspaceProps = {
  page: AppPage
  onGoPage: (page: AppPage) => void
  profile: Profile
  recoveryCode: string
  skills: Skill[]
  targetRole: TargetRole | null
  suggestions: RoleSuggestion[]
  suggestionHint: string | null
  requirements: RoleRequirements | null
  skillsBusy: boolean
  targetRoleBusy: boolean
  skillPrompt: Prompt | null
  elicitation: Prompt | null
  skillPromptBusy: boolean
  skillPromptError: string
  onPromptYes: (prompt: Prompt | null) => Promise<void>
  onPromptNotYet: (prompt: Prompt | null) => void
  onAddSkill: (
    name: string,
    code: string,
    status?: 'current' | 'upcoming',
  ) => Promise<SaveSkillResult>
  onRemoveSkill: (id: number) => Promise<SaveSkillResult>
  onSkillStatus: (skill: Skill, status: SkillStatus) => Promise<void>
  onPlan: (suggestion: RoleSuggestion) => Promise<void>
  onEditTargetRole: () => void
  onEditBackground: () => void
  onPromptAccepted: (code: string) => void
}

// Page selection and feature loading belong to the workspace; the parent
// owns the profile and its mutations so moving between pages keeps state.
export function AppWorkspace(props: AppWorkspaceProps) {
  const { t } = useI18n()
  const {
    page,
    onGoPage,
    profile,
    recoveryCode,
    skills,
    targetRole,
    suggestions,
    suggestionHint,
    requirements,
    skillsBusy,
    targetRoleBusy,
    skillPrompt,
    elicitation,
    skillPromptBusy,
    skillPromptError,
    onPromptYes,
    onPromptNotYet,
    onAddSkill,
    onRemoveSkill,
    onSkillStatus,
    onPlan,
    onEditTargetRole,
    onEditBackground,
    onPromptAccepted,
  } = props

  return (
    <Suspense
      fallback={
        <p className="empty-note" role="status">
          {t('common.loading')}
        </p>
      }
    >
      {page === 'overview' && (
        <>
          {skillPrompt && (
            <SkillPromptCard
              courseTitle={profile.qualification}
              skillLabel={skillPrompt.label}
              busy={skillPromptBusy}
              error={skillPromptError}
              onYes={() => void onPromptYes(skillPrompt)}
              onNotYet={() => onPromptNotYet(skillPrompt)}
            />
          )}
          <OverviewPage
            profile={profile}
            skills={skills}
            targetRole={targetRole}
            suggestions={suggestions}
            requirements={requirements}
            busy={skillsBusy || targetRoleBusy}
            onEditTargetRole={onEditTargetRole}
            onPlan={onPlan}
            onGoMatches={() => onGoPage('matches')}
            onGoWizard={onEditBackground}
            onGoPage={onGoPage}
          />
        </>
      )}
      {page === 'matches' && (
        <MatchesPage
          suggestions={suggestions}
          targetRole={targetRole}
          hint={suggestionHint}
          skillsCount={skills.length}
          busy={skillsBusy || targetRoleBusy}
          onPlan={onPlan}
        />
      )}
      {page === 'analysis' && (
        <AnalysisPage
          skills={skills}
          targetRole={targetRole}
          suggestions={suggestions}
          requirements={requirements}
          busy={skillsBusy}
          onAddSkill={(skill) => onAddSkill(skill.name, skill.code, 'upcoming')}
          onSkillStatus={onSkillStatus}
          onRemoveSkill={(skill) => onRemoveSkill(skill.id)}
          onGoMatches={() => onGoPage('matches')}
          onEditTargetRole={onEditTargetRole}
        />
      )}
      {page === 'role' && (
        <RoleDetailsPage
          targetRole={targetRole}
          skills={skills}
          requirements={requirements}
          busy={skillsBusy}
          onAddSkill={(name, code) => onAddSkill(name, code, 'upcoming')}
          onGoPathways={() => onGoPage('pathways')}
        />
      )}
      {page === 'pathways' && (
        <PathwaysPage
          targetRole={targetRole}
          requirements={requirements}
          skills={skills}
          profileCode={profile.code}
          busy={skillsBusy}
          onGoRole={() => onGoPage('role')}
          onSkillStatus={onSkillStatus}
        />
      )}
      {page === 'profile' && (
        <MyProfilePage
          profile={profile}
          recoveryCode={recoveryCode}
          skills={skills}
          targetRole={targetRole}
          busy={skillsBusy || targetRoleBusy}
          onAddSkill={async (name, code) => {
            const result = await onAddSkill(name, code)
            if (result.ok && elicitation?.code === code) onPromptAccepted(code)
            return result
          }}
          onRemoveSkill={(skill) => onRemoveSkill(skill.id)}
          onSkillStatus={onSkillStatus}
          onEditBackground={onEditBackground}
          onEditTargetRole={onEditTargetRole}
          promptSkill={elicitation}
          onDeclineSkill={(code) => onPromptNotYet({ code, label: '' })}
        />
      )}
    </Suspense>
  )
}
