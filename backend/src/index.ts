import type { Env } from "./utils/types";
import { errorResponse, jsonResponse } from "./utils/response";

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
      // Auth routes
      if (path.startsWith("/auth/")) {
        const { handleAuth } = await import("./handlers/auth");
        return withCors(await handleAuth(request, env, url), corsHeaders);
      }

      // Template routes
      if (path.startsWith("/templates")) {
        const { handleTemplates } = await import("./handlers/templates");
        return withCors(await handleTemplates(request, env, url), corsHeaders);
      }

      // Integration routes
      if (path.startsWith("/integrations")) {
        const { handleIntegrations } = await import("./handlers/integrations");
        return withCors(
          await handleIntegrations(request, env, url),
          corsHeaders,
        );
      }

      // Email routes
      if (path.startsWith("/email/")) {
        const { handleEmail } = await import("./handlers/email");
        return withCors(await handleEmail(request, env, url), corsHeaders);
      }

      // Webhook route
      if (path === "/webhook") {
        const { handleWebhook } = await import("./handlers/webhook");
        return withCors(await handleWebhook(request, env), corsHeaders);
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
      // This allows using a single tunnel for both frontend and backend
      const frontendUrl = new URL(request.url);
      frontendUrl.protocol = "http:";
      frontendUrl.host = "localhost:8301";

      const proxyHeaders = new Headers(request.headers);
      // Crucial: Delete Host header to let Vite handle it
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

        // Create a new response with the frontend body
        const responseHeaders = new Headers(frontendResponse.headers);
        // Ensure CORS headers are present
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
  return newResponse;
}

// Export for testing
export { handleAuth } from "./handlers/auth";
export { handleTemplates } from "./handlers/templates";
export { handleIntegrations } from "./handlers/integrations";
export { handleEmail } from "./handlers/email";
export { handleWebhook } from "./handlers/webhook";
