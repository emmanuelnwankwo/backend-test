import { handler as healthHandler } from "../src/handlers/healthCheck/handler";

describe("HealthCheck Handler", () => {
  test("returns ok for /health path", async () => {
    const res: any = await healthHandler({ rawPath: "/health" } as any);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  test("returns ok for /health resource", async () => {
    const res: any = await healthHandler({ resource: "/health" } as any);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });
});
