import type { Env } from "../utils/types";
import {
  corsResponse,
  errorResponse,
  successResponse,
} from "../utils/response";
import { ValidationError, NotFoundError } from "../utils/errors";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";

import { verifyAuth, verifyMondayJwt } from "../utils/auth";

function encryptToken(token: string, key: string) {
  return CryptoJS.AES.encrypt(token, key).toString();
}

function decryptToken(encrypted: string, key: string) {
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function handleAuth(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const path = url.pathname;

  // Verify JWT for all auth routes (except callbacks)
  let jwtPayload: any = null;
  if (path !== "/auth/google/callback" && path !== "/auth/microsoft/callback") {
    const auth = verifyAuth(request, env, url);
    if (!auth.isValid) {
      return errorResponse(new Error(auth.error), auth.status || 401);
    }
    jwtPayload = auth.payload;
  }

  // GET /auth/status?board_id=xxx
  if (path === "/auth/status") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    // Security check: verify boardId in JWT matches boardId in query (only if boardId exists in JWT)
    const parsedBoardId = parseInt(boardId);
    if (!isNaN(parsedBoardId) && jwtPayload.dat.boardId !== undefined && jwtPayload.dat.boardId !== parsedBoardId) {
      return errorResponse(new Error("Forbidden: Board ID mismatch"), 403);
    }

    const board = await env.DB.prepare(
      "SELECT * FROM boards WHERE board_id = ?",
    )
      .bind(boardId)
      .first();

    if (!board) {
      return successResponse({ authenticated: false });
    }

    return successResponse({
      authenticated: true,
      provider: board.email_provider,
      email: board.email,
    });
  }

  // GET /auth/google?board_id=xxx
  if (path === "/auth/google") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    // Security check: verify boardId in JWT matches boardId in query (only if boardId exists in JWT)
    const parsedBoardId = parseInt(boardId);
    if (!isNaN(parsedBoardId) && jwtPayload.dat.boardId !== undefined && jwtPayload.dat.boardId !== parsedBoardId) {
      return errorResponse(new Error("Forbidden: Board ID mismatch"), 403);
    }

    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return errorResponse(new Error("Google OAuth not configured"), 500);
    }

    const accountId = jwtPayload.dat.accountId;
    
    // Detect public origin (important for ngrok/tunnels)
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = request.headers.get('x-forwarded-host') || url.host;
    const publicOrigin = `${forwardedProto}://${forwardedHost}`;
    
    const redirectUri = `${publicOrigin}/auth/google/callback`;
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
    );
    const state = encodeURIComponent(
      JSON.stringify({ board_id: boardId, account_id: accountId }),
    );
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

    return successResponse({ auth_url: authUrl });
  }

  // GET /auth/google/callback
  if (path === "/auth/google/callback") {
    const code = url.searchParams.get("code");
    const stateStr = url.searchParams.get("state");
    const { board_id, account_id } = JSON.parse(
      decodeURIComponent(stateStr || "{}"),
    );
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(
        `
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    if (!code || !stateStr) {
      return errorResponse(
        new ValidationError("Invalid callback parameters"),
        400,
      );
    }

    try {
      // Exchange code for tokens
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      const forwardedHost = request.headers.get('x-forwarded-host') || url.host;
      const publicOrigin = `${forwardedProto}://${forwardedHost}`;
      const redirectUri = `${publicOrigin}/auth/google/callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Google token exchange failed:", errorText);
        throw new Error(`Google token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Fetch user email
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("Google user info fetch failed:", errorText);
        throw new Error(`Google user info fetch failed: ${errorText}`);
      }

      const userData = await userResponse.json();
      const email = userData.email;

      // Save to database
      const encryptedAccessToken = tokens.access_token 
        ? encryptToken(tokens.access_token, env.ENCRYPTION_KEY)
        : null;
        
      const encryptedRefreshToken = tokens.refresh_token
        ? encryptToken(tokens.refresh_token, env.ENCRYPTION_KEY)
        : null;

      await env.DB.prepare(
        `
        INSERT OR REPLACE INTO boards (board_id, account_id, email_provider, access_token, refresh_token, email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      )
        .bind(
          board_id ?? null,
          account_id ?? null,
          "gmail",
          encryptedAccessToken ?? null,
          encryptedRefreshToken ?? null,
          email ?? null,
        )
        .run();

      return new Response(
        `
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage('auth-success', '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    } catch (error: any) {
      console.error("Google auth error:", error);
      return new Response(
        `
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #df2f4a;">✗ Authentication Failed</h1>
            <p>Could not complete authentication. Please try again.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    }
  }

  // GET /auth/microsoft?board_id=xxx
  if (path === "/auth/microsoft") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    const clientId = env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return errorResponse(new Error("Microsoft OAuth not configured"), 500);
    }

    // Detect public origin (important for ngrok/tunnels)
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = request.headers.get('x-forwarded-host') || url.host;
    const publicOrigin = `${forwardedProto}://${forwardedHost}`;
    
    const redirectUri = encodeURIComponent(
      `${publicOrigin}/auth/microsoft/callback`,
    );
    const scope = encodeURIComponent(
      "https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read",
    );
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${boardId}&response_mode=query`;

    return successResponse({ auth_url: authUrl });
  }

  // GET /auth/microsoft/callback
  if (path === "/auth/microsoft/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // board_id
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(
        `
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>${error}</p>
            <p>You can close this window.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    if (!code || !state) {
      return errorResponse(
        new ValidationError("Invalid callback parameters"),
        400,
      );
    }

    try {
      // Exchange code for tokens
      const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
      const forwardedHost = request.headers.get('x-forwarded-host') || url.host;
      const publicOrigin = `${forwardedProto}://${forwardedHost}`;
      const redirectUri = `${publicOrigin}/auth/microsoft/callback`;
      const tokenResponse = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.MICROSOFT_CLIENT_ID!,
            client_secret: env.MICROSOFT_CLIENT_SECRET!,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        },
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Microsoft token exchange failed:", errorText);
        throw new Error(`Microsoft token exchange failed: ${errorText}`);
      }

      const tokens = await tokenResponse.json();

      // Fetch user email
      const userResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("Microsoft user info fetch failed:", errorText);
        throw new Error(`Microsoft user info fetch failed: ${errorText}`);
      }

      const userData = await userResponse.json();
      const email = userData.mail || userData.userPrincipalName;

      // Save to database
      const encryptedAccessToken = tokens.access_token 
        ? encryptToken(tokens.access_token, env.ENCRYPTION_KEY)
        : null;
        
      const encryptedRefreshToken = tokens.refresh_token
        ? encryptToken(tokens.refresh_token, env.ENCRYPTION_KEY)
        : null;

      await env.DB.prepare(
        `
        INSERT OR REPLACE INTO boards (board_id, account_id, email_provider, access_token, refresh_token, email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      )
        .bind(
          state ?? null, // state is board_id for Microsoft
          null, // account_id
          "outlook",
          encryptedAccessToken ?? null,
          encryptedRefreshToken ?? null,
          email ?? null,
        )
        .run();

      return new Response(
        `
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage('auth-success', '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    } catch (error: any) {
      console.error("Microsoft auth error:", error);
      return new Response(
        `
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #df2f4a;">✗ Authentication Failed</h1>
            <p>Could not complete authentication. Please try again.</p>
          </body>
        </html>
      `,
        { headers: { "Content-Type": "text/html" } },
      );
    }
  }

  // POST /auth/remove?board_id=xxx
  if (path === "/auth/remove" && request.method === "POST") {
    const boardId = url.searchParams.get("board_id");
    if (!boardId) {
      return errorResponse(new ValidationError("board_id is required"), 400);
    }

    await env.DB.prepare("DELETE FROM boards WHERE board_id = ?")
      .bind(boardId)
      .run();

    return successResponse({ success: true });
  }

  return errorResponse(new Error("Not found"), 404);
}
