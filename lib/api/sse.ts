export function withSSEHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Content-Type', 'text/event-stream; charset=utf-8');
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('Connection', 'keep-alive');
  headers.set('X-Accel-Buffering', 'no');
  return new Response(res.body, { status: 200, headers });
}


