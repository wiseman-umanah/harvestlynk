import type { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:4000";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");
  if (auth) headers.set("authorization", auth);
  if (contentType) headers.set("content-type", contentType);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-expect-error duplex is required for streaming request bodies
    duplex: hasBody ? "half" : undefined,
  });

  const resHeaders = new Headers();
  const upstreamType = upstream.headers.get("content-type");
  if (upstreamType) resHeaders.set("content-type", upstreamType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
