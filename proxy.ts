import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_FAILURE_LIMIT,
  ADMIN_AUTH_WINDOW_SECONDS,
  consumeRateLimit,
  resetRateLimit,
} from "@/lib/request-security";

// Protege /admin e /api/admin com HTTP Basic Auth. Credenciais vêm de
// variáveis de ambiente (ADMIN_USER / ADMIN_PASSWORD) — nunca hardcoded.
// Se não estiverem configuradas, bloqueia por padrão (falha fechada) em vez
// de deixar o painel aberto por engano em produção.
//
// Next.js 16 renomeou "middleware.ts"/"export function middleware" para
// "proxy.ts"/"export function proxy" (a antiga convenção middleware.ts
// ainda funciona, mas está deprecated) — ver aviso do próprio `next build`.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/uploads/") {
    return NextResponse.json({ error: "Rota não encontrada." }, { status: 404 });
  }

  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return NextResponse.json({ error: "Painel administrativo indisponível." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const providedUser = decoded.slice(0, separatorIndex);
    const providedPassword = decoded.slice(separatorIndex + 1);

    if (separatorIndex >= 0 && providedUser === expectedUser && providedPassword === expectedPassword) {
      // A valid login starts a fresh failure window for this client.
      resetRateLimit("admin-auth", request);
      return NextResponse.next();
    }
  }

  const rateLimit = consumeRateLimit(
    "admin-auth",
    request,
    ADMIN_AUTH_FAILURE_LIMIT,
    ADMIN_AUTH_WINDOW_SECONDS,
  );
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(rateLimit.retryAfter),
        },
      },
    );
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Aurum Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/uploads/"],
};
