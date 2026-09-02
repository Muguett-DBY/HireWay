// Keep each feature's API logic in its own file.
import { handleProfile } from './routes/profile'
import { handleSkills } from './routes/skills'
import { handleGoal } from './routes/goal'
import { handleOptions } from './routes/options'
import { handleTargetRole } from './routes/targetRole'

// Send API requests to their handler and page requests to React.
export default {
  async fetch(request, env): Promise<Response> {
    const path = new URL(request.url).pathname

    if (path !== '/api' && !path.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    let response: Response

    try {
      if (path === '/api/profile') {
        response = await handleProfile(request, env)
      } else if (path === '/api/skills') {
        response = await handleSkills(request, env)
      } else if (path === '/api/goal') {
        response = await handleGoal(request, env)
      } else if (path === '/api/target-role') {
        response = await handleTargetRole(request, env)
      } else if (
        path.startsWith('/api/options/') ||
        path === '/api/recommendations/skills'
      ) {
        response = await handleOptions(request, env)
      } else {
        response = Response.json({ error: 'Not found.' }, { status: 404 })
      }
    } catch {
      // Keep personal details and recovery codes out of error logs.
      console.error(JSON.stringify({ message: 'API request failed.' }))
      response = Response.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      )
    }

    // Personal records stay private; public catalogues can be reused for an hour.
    response.headers.set(
      'Cache-Control',
      response.ok &&
        (path.startsWith('/api/options/') ||
          path.startsWith('/api/recommendations/'))
        ? 'public, max-age=3600'
        : 'no-store',
    )
    return response
  },
} satisfies ExportedHandler<Env>
