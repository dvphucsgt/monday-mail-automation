import { handleAuth } from "./handlers/auth";
import { handleTemplates } from "./handlers/templates";
import { handleIntegrations } from "./handlers/integrations";
import { handleEmail } from "./handlers/email";
import { handleWebhook } from "./handlers/webhook";
import { jsonResponse } from "./utils/response";
import type { Env } from "./utils/types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS
    const origin = request.headers.get("Origin") || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, ngrok-skip-browser-warning",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // API Routes - Explicitly check paths
      if (path.startsWith("/auth")) {
        const response = await handleAuth(request, env, url);
        return withCors(response, corsHeaders);
      }

      if (path.startsWith("/templates")) {
        const response = await handleTemplates(request, env, url);
        return withCors(response, corsHeaders);
      }

      if (path.startsWith("/integrations")) {
        const response = await handleIntegrations(request, env, url);
        return withCors(response, corsHeaders);
      }

      if (path.startsWith("/email")) {
        const response = await handleEmail(request, env, url);
        return withCors(response, corsHeaders);
      }

      if (path === "/webhook") {
        const response = await handleWebhook(request, env);
        return withCors(response, corsHeaders);
      }

      // Health check
      if (path === "/health") {
        const response = jsonResponse({
          status: "ok",
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
        });
        return withCors(response, corsHeaders);
      }

      // Proxy everything else to frontend (Vite dev server on port 8301)
      const frontendUrl = new URL(request.url);
      frontendUrl.protocol = "http:";
      frontendUrl.host = "localhost:8301";

      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.delete("Host");

      try {
        const frontendResponse = await fetch(frontendUrl.toString(), {
          method: request.method,
          headers: proxyHeaders,
          body:
            request.method !== "GET" && request.method !== "HEAD"
              ? await request.arrayBuffer()
              : undefined,
          redirect: "manual",
        });

        const responseHeaders = new Headers(frontendResponse.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          responseHeaders.set(key, value);
        });

        return new Response(frontendResponse.body, {
          status: frontendResponse.status,
          statusText: frontendResponse.statusText,
          headers: responseHeaders,
        });
      } catch (proxyError: any) {
        console.error("Proxy error:", proxyError.message);
        return errorResponse(
          new Error(
            `Frontend not reachable at 127.0.0.1:8301. Make sure 'npm start' is running in the frontend directory.`,
          ),
          502,
        );
      }
    } catch (error: any) {
      console.error("CRITICAL ERROR:", error.message);
      if (error.stack) console.error(error.stack);

      const response = errorResponse(error, error.statusCode || 500);
      return withCors(response, corsHeaders);
    }
  },
};

// Helper to add CORS to any response
export function withCors(response: Response, corsHeaders: any) {
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  // Force JSON content type for API responses if not set
  if (!newResponse.headers.has("Content-Type")) {
    newResponse.headers.set("Content-Type", "application/json");
  }

  return newResponse;
}

// Export for testing
export { handleAuth } from "./handlers/auth";
export { handleTemplates } from "./handlers/templates";
export { handleIntegrations } from "./handlers/integrations";
export { handleEmail } from "./handlers/email";
export { handleWebhook } from "./handlers/webhook";
