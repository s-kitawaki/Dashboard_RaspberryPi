interface Env {
  API: { fetch(request: Request): Promise<Response> };
}

// Preserve /api, query strings, methods, headers and streaming request bodies.
// The service binding invokes the separate Worker without a public HTTP roundtrip.
export async function onRequest(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (!context.env.API) {
    return new Response("API service binding is unavailable", { status: 503 });
  }
  return context.env.API.fetch(context.request);
}
