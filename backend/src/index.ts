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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Auth routes
      if (path.startsWith("/auth/")) {
        const { handleAuth } = await import("./handlers/auth");
        const response = await handleAuth(request, env, url);
        return withCors(response, corsHeaders);
      }

      // Template routes
      if (path.startsWith("/templates")) {
        const { handleTemplates } = await import("./handlers/templates");
        const response = await handleTemplates(request, env, url);
        return withCors(response, corsHeaders);
      }

      // Integration routes
      if (path.startsWith("/integrations")) {
        const { handleIntegrations } = await import("./handlers/integrations");
        const response = await handleIntegrations(request, env, url);
        return withCors(response, corsHeaders);
      }

      // Email routes
      if (path.startsWith("/email/")) {
        const { handleEmail } = await import("./handlers/email");
        const response = await handleEmail(request, env, url);
        return withCors(response, corsHeaders);
      }

      // Webhook route
      if (path === "/webhook") {
        const { handleWebhook } = await import("./handlers/webhook");
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

      // 404
      const response = errorResponse(new Error("Not found"), 404);
      return withCors(response, corsHeaders);
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
