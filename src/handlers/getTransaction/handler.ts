import { GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { ddbDoc, TABLE_NAME, json, ErrorType, logger } from "../../shared";

export async function handler(event: APIGatewayProxyEvent) {
  try {
    const id = event?.pathParameters?.id;

    if (!id) {
      logger.warn("Missing transaction ID");
      return json(400, { error: ErrorType.VALIDATION_ERROR, message: "Transaction ID is required" });
    }

    const result = await ddbDoc.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } })
    );

    if (!result.Item) {
      logger.info("Transaction not found", { transactionId: id });
      return json(404, { error: ErrorType.NOT_FOUND, message: "Transaction not found" });
    }

    logger.info("Transaction retrieved", { transactionId: id, status: result.Item.status });
    return json(200, result.Item);
  } catch (err: any) {
    logger.error("Get transaction failed", { error: err.message, stack: err.stack });
    return json(500, { error: ErrorType.INTERNAL_ERROR, message: err.message });
  }
}
