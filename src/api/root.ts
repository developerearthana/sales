export default async function handler(req: Request) {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Sales Automation API</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
        code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
        a { color: #0070f3; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Sales Automation Multi-Agent API</h1>
      <p>This starter project exposes API routes rather than a full UI design page.</p>
      <p>Try these endpoints:</p>
      <ul>
        <li><a href="/api/health">/api/health</a></li>
        <li><a href="/api/testFlow">/api/testFlow</a></li>
        <li><a href="/api/orchestrator">/api/orchestrator</a> (POST)</li>
        <li><a href="/api/leads">/api/leads</a> (GET)</li>
        <li><a href="/api/notifications">/api/notifications</a> (GET)</li>
      </ul>
      <p>This app now supports human-in-the-loop review flags, a lead scout persona, and a closer copywriter flow for high-conversion outreach.</p>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
