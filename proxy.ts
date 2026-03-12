import { verifyRequestOrigin } from "lucia";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function handleProxy(request: NextRequest) {
  if (request.method === "GET") {
    return NextResponse.next();
  }

  const originHeader = request.headers.get("Origin");
  const hostHeader = request.headers.get("Host");

  if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
    return new NextResponse(null, {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const proxy = handleProxy;
export const middleware = handleProxy;
export default handleProxy;

export const config = {
  matcher: "/api/:path((?!webhook).*)",
};
