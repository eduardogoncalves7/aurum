import { NextRequest, NextResponse } from "next/server";

// Protege /admin e /api/admin com HTTP Basic Auth. Credenciais vêm de
// variáveis de ambiente (ADMIN_USER / ADMIN_PASSWORD) — nunca hardcoded.
// Se não estiverem configuradas, bloqueia por padrão (falha fechada) em vez
// de deixar o painel aberto por engano em produção.
//
// Next.js 16 renomeou "middleware.ts"/"export function middleware" para
// "proxy.ts"/"export function proxy" (a antiga convenção middleware.ts
// ainda funciona, mas está deprecated) — ver aviso do próprio `next build`.
export function proxy(request: NextRequest) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return new NextResponse(
      "Painel administrativo desabilitado: configure ADMIN_USER e ADMIN_PASSWORD.",
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf-8");
    const separatorIndex = decoded.indexOf(":");
    const providedUser = decoded.slice(0, separatorIndex);
    const providedPassword = decoded.slice(separatorIndex + 1);

    if (providedUser === expectedUser && providedPassword === expectedPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Aurum Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
