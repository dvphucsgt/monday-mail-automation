import type { Env, Template } from "../utils/types";
import { errorResponse, successResponse } from "../utils/response";
import { ValidationError, NotFoundError } from "../utils/errors";
import { verifyAuth } from "../utils/auth";

export async function handleTemplates(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const path = url.pathname;
  const method = request.method;
  console.log(`[Templates] Handling ${method} ${path}`);

  // Verify auth for all template routes
  const auth = verifyAuth(request, env, url);
  if (!auth.isValid) {
    return errorResponse(new Error(auth.error), auth.status || 401);
  }
  const jwtPayload = auth.payload;

  // GET /templates?board_id=xxx
  if (path === "/templates" && request.method === "GET") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    const templates = await env.DB.prepare(
      "SELECT * FROM templates WHERE board_id = ? ORDER BY created_at DESC",
    )
      .bind(boardId)
      .all();

    return successResponse({ templates: templates.results });
  }

  // POST /templates?board_id=xxx
  if (path === "/templates" && request.method === "POST") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    const body = await request.json();
    const { name, subject, body: content, attachments, created_user } = body;

    if (!name || !subject || !content) {
      return errorResponse(
        new ValidationError("name, subject, and body are required"),
        400,
      );
    }

    const result = await env.DB.prepare(
      `
      INSERT INTO templates (board_id, name, subject, body, attachments, created_user)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(boardId, name, subject, content, JSON.stringify(attachments || []), created_user || null)
      .run();

    const template = (await env.DB.prepare(
      "SELECT * FROM templates WHERE id = ?",
    )
      .bind(result.meta.last_row_id)
      .first()) as Template;

    return successResponse({ template }, "Template created successfully");
  }

  console.log(`[Templates] Path starts with /templates/: ${path.startsWith("/templates/")}`);
  console.log(`[Templates] Method is PUT: ${request.method === "PUT"}`);

  // PUT /templates/:id
  if (path.startsWith("/templates/") && request.method === "PUT") {
    const segments = path.split("/");
    const templateIdStr = segments.pop() || segments.pop(); // Handle potential trailing slash
    const templateId = parseInt(templateIdStr!);
    console.log(`[Templates] Updating template ID: ${templateId}`);
    const body = await request.json();
    const { name, subject, body: content, attachments } = body;

    const existing = await env.DB.prepare(
      "SELECT * FROM templates WHERE id = ?",
    )
      .bind(templateId)
      .first();

    if (!existing) {
      return errorResponse(new NotFoundError("Template not found"), 404);
    }

    await env.DB.prepare(
      `
      UPDATE templates
      SET name = ?, subject = ?, body = ?, attachments = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    )
      .bind(
        name || existing.name,
        subject || existing.subject,
        content || existing.body,
        JSON.stringify(attachments || []),
        templateId,
      )
      .run();

    const template = (await env.DB.prepare(
      "SELECT * FROM templates WHERE id = ?",
    )
      .bind(templateId)
      .first()) as Template;

    return successResponse({ template }, "Template updated successfully");
  }

  // DELETE /templates/:id
  if (path.startsWith("/templates/") && request.method === "DELETE") {
    const templateId = parseInt(path.split("/").pop()!);

    const existing = await env.DB.prepare(
      "SELECT * FROM templates WHERE id = ?",
    )
      .bind(templateId)
      .first();

    if (!existing) {
      return errorResponse(new NotFoundError("Template not found"), 404);
    }

    await env.DB.prepare("DELETE FROM templates WHERE id = ?")
      .bind(templateId)
      .run();

    return successResponse({ success: true }, "Template deleted successfully");
  }

  return errorResponse(new Error("Not found"), 404);
}
