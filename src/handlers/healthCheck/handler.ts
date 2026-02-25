import type { APIGatewayProxyEvent } from "aws-lambda";
import { json, ErrorType, logger } from "../../shared";

export async function handler(event: APIGatewayProxyEvent | any) {
  try {
    const path =
      event?.path ??
      event?.rawPath ??
      event?.requestContext?.http?.path ??
      "";

    const resource = event?.resource ?? "";

    if (path.endsWith("/health") || resource === "/health") {
      logger.info("Health check", { status: "ok" });
      return json(200, { ok: true });
    }

  } catch (err: any) {
    logger.error("Health check failed", { error: err.message });
    return json(500, { error: ErrorType.INTERNAL_ERROR });
  }
}
