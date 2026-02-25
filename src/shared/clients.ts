import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

const endpoint = process.env.AWS_ENDPOINT_URL;
const config = {
  endpoint,
  region: process.env.AWS_DEFAULT_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
  },
};

export const ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient(config));
export const sqsClient = new SQSClient(config);
