export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "breathing-monitor",
        timestamp: new Date().toISOString()
      });
    }

    return env.ASSETS.fetch(request);
  }
};
