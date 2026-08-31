import { handleProfile } from './routes/profile'

// Send API requests to their handler and page requests to React.
export default {
  async fetch(request, env): Promise<Response> {
    const path = new URL(request.url).pathname

    if (path !== '/api' && !path.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    let response: Response

    try {
      response =
        path === '/api/profile'
          ? await handleProfile(request, env)
          : Response.json({ error: 'Not found.' }, { status: 404 })
    } catch {
      // Keep personal details and recovery codes out of error logs.
      console.error(JSON.stringify({ message: 'Profile request failed.' }))
      response = Response.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      )
    }

    // Profile responses should not be stored in a shared cache.
    response.headers.set('Cache-Control', 'no-store')
    return response
  },
} satisfies ExportedHandler<Env>
