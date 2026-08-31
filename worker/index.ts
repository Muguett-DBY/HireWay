// Keep each feature's API logic in its own file.
import { handleProfile } from './routes/profile'
import { handleSkills } from './routes/skills'

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

    // Keep profile and skill responses out of shared caches.
    response.headers.set('Cache-Control', 'no-store')
    return response
  },
} satisfies ExportedHandler<Env>
