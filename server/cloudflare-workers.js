// Simple stateless Github OAuth dance on Cloudflare Workers 
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  const REDIRECT_URI = `${url.origin}/callback`;
  
  const CLIENT_URL = env.CLIENT_URL;
  const CLIENT_ID = env.CLIENT_ID;
  const CLIENT_SECRET = env.CLIENT_SECRET;

  try {
    // Redirect to Github OAuth login page
    if (path === '/login') {
      return Response.redirect(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=repo`, 302);
    }

    // Exchange code for access token
    if (path === '/callback' && url.searchParams.has('code')) {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: url.searchParams.get('code'),
          redirect_uri: REDIRECT_URI,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error fetching access token: ${response.statusText}. GitHub says: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        return Response.redirect(`${CLIENT_URL}/?access_token=${data.access_token}`, 302);
      } else {
        throw new Error('Access token not found');
      }
    }

    // Revoke access token
    if (path === '/revoke') {
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response('Token parameter is required', {status: 400});
      }
      
      const response = await fetch(`https://api.github.com/applications/${CLIENT_ID}/tokens/${token}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        }
      });
    
      if (!response.ok) {
        const errorText = await response.text();  // Capture any error message returned from GitHub
        throw new Error(`Error revoking access token: ${response.statusText}. GitHub says: ${errorText}`);
      }
    
      return new Response('Token revoked', {status: 200});
    }

    return new Response('Not Found', {status: 404});

  } catch (error) {
    console.error(error);
    return new Response('Internal Server Error', {status: 500});
  }
}

export default {
  async fetch(request, env) {
    return await handleRequest(request, env);
  },
};
