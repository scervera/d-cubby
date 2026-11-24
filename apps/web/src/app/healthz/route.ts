// Health check for the web container (docker-compose.yml healthcheck). Not under /api:
// Caddy sends /api/* to Rails.
// Keep it dependency-free: it must answer even when the API is down.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
