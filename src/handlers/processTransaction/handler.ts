import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";
import { ddbDoc, TABLE_NAME, Transaction, TransactionStatus, logger } from "../../shared";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    try {
      const { transactionId } = JSON.parse(record.body);
      
      const result = await ddbDoc.send(
        new GetCommand({ TableName: TABLE_NAME, Key: { id: transactionId } })
      );

      if (!result.Item) {
        logger.error("Transaction not found", { transactionId });
        continue;
      }

      const tx = result.Item as Transaction;

      if (tx.status !== TransactionStatus.PENDING) {
        logger.info("Transaction already processed", { transactionId, status: tx.status });
        continue;
      }

      await ddbDoc.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: transactionId },
        UpdateExpression: "SET #status = :processing, updatedAt = :now",
        ConditionExpression: "#status = :pending",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":processing": TransactionStatus.PROCESSING,
          ":pending": TransactionStatus.PENDING,
          ":now": new Date().toISOString(),
        },
      }));

      logger.info("Status updated", { transactionId, status: TransactionStatus.PROCESSING });

      await delay(5000); // Simulate processing delay

      const isSuccess = Math.random() < 0.8;
      const finalStatus = isSuccess ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;
      const updateParams: any = {
        TableName: TABLE_NAME,
        Key: { id: transactionId },
        UpdateExpression: "SET #status = :finalStatus, updatedAt = :now",
        ConditionExpression: "#status = :processing",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":finalStatus": finalStatus,
          ":processing": TransactionStatus.PROCESSING,
          ":now": new Date().toISOString(),
        },
      };

      if (!isSuccess) {
        updateParams.UpdateExpression += ", failureReason = :reason";
        updateParams.ExpressionAttributeValues[":reason"] = "Simulated processing failure";
      }

      await delay(5000); // Simulate additional processing delay

      await ddbDoc.send(new UpdateCommand(updateParams));

      logger.info("Status updated", { transactionId, status: finalStatus });

    } catch (err: any) {
      if (err.name === "ConditionalCheckFailedException") {
        logger.warn("Transaction status already changed", { error: err.message });
        continue;
      }
      logger.error("Process transaction failed", { error: err.message, stack: err.stack });
      throw err;
    }
  }
}
