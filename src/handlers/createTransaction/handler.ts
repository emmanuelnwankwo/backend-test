import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { v4 as uuidv4 } from "uuid";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { ddbDoc, sqsClient, TABLE_NAME, QUEUE_URL, json, validateCreateTransaction, Transaction, TransactionStatus, ErrorType, logger } from "../../shared";

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    const validation = validateCreateTransaction(body);
    if (!validation.success) {
      const error = validation.error.errors[0];
      logger.warn("Validation failed", { error: error.message, body });
      return json(400, { error: ErrorType.VALIDATION_ERROR, message: error.message });
    }

    const reference = validation.data.reference;

    const existingTx = await ddbDoc.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "ReferenceIndex",
      KeyConditionExpression: "#ref = :ref",
      ExpressionAttributeNames: { "#ref": "reference" },
      ExpressionAttributeValues: { ":ref": reference },
      Limit: 1,
    }));

    if (existingTx.Items && existingTx.Items.length > 0) {
      logger.warn("Duplicate reference detected", { reference, existingTransactionId: existingTx.Items[0].id });
      return json(409, { 
        error: ErrorType.DUPLICATE_REFERENCE, 
        message: `Transaction with reference '${reference}' already exists`,
        existingTransactionId: existingTx.Items[0].id,
      });
    }

    const now = new Date().toISOString();
    const tx: Transaction = {
      id: uuidv4(),
      amount: validation.data.amount,
      currency: validation.data.currency,
      reference: reference,
      status: TransactionStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await ddbDoc.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: tx,
      ConditionExpression: "attribute_not_exists(id)",
    }));

    await sqsClient.send(new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ transactionId: tx.id }),
    }));

    logger.info("Transaction created", { transactionId: tx.id, reference: tx.reference, status: tx.status });

    return json(201, tx);
  } catch (err: any) {
    if (err.name === "ConditionalCheckFailedException") {
      logger.warn("Duplicate transaction detected", { error: err.message });
      return json(409, { error: ErrorType.DUPLICATE_TRANSACTION, message: "Transaction already exists" });
    }
    logger.error("Create transaction failed", { error: err.message, stack: err.stack });
    return json(500, { error: ErrorType.INTERNAL_ERROR, message: err.message });
  }
}
