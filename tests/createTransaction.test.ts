import { handler as createHandler } from "../src/handlers/createTransaction/handler";
import { TransactionStatus, ErrorType } from "../src/shared/types";
import { ddbDoc, sqsClient } from "../src/shared/clients";

jest.mock("../src/shared/clients", () => ({
  ddbDoc: {
    send: jest.fn(),
  },
  sqsClient: {
    send: jest.fn(),
  },
}));

describe("CreateTransaction Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates transaction successfully", async () => {
    (ddbDoc.send as jest.Mock)
      .mockResolvedValueOnce({ Items: [] }) // QueryCommand - no duplicate
      .mockResolvedValueOnce({}); // PutCommand
    (sqsClient.send as jest.Mock).mockResolvedValueOnce({});

    const event = {
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        reference: "INV-001",
      }),
    };

    const res: any = await createHandler(event as any);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.amount).toBe(100);
    expect(body.currency).toBe("USD");
    expect(body.reference).toBe("INV-001");
    expect(body.status).toBe(TransactionStatus.PENDING);
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  test("returns 400 for invalid input", async () => {
    const event = {
      body: JSON.stringify({
        amount: -50,
        currency: "USD",
        reference: "INV-001",
      }),
    };

    const res: any = await createHandler(event as any);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("returns 409 for duplicate reference", async () => {
    (ddbDoc.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ id: "existing-id", reference: "INV-001" }],
    });

    const event = {
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        reference: "INV-001",
      }),
    };

    const res: any = await createHandler(event as any);
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.DUPLICATE_REFERENCE);
    expect(body.existingTransactionId).toBe("existing-id");
  });

  test("returns 409 for conditional check failure", async () => {
    (ddbDoc.send as jest.Mock)
      .mockResolvedValueOnce({ Items: [] })
      .mockRejectedValueOnce({ name: "ConditionalCheckFailedException" });

    const event = {
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        reference: "INV-001",
      }),
    };

    const res: any = await createHandler(event as any);
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.DUPLICATE_TRANSACTION);
  });

  test("returns 500 for database error", async () => {
    (ddbDoc.send as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

    const event = {
      body: JSON.stringify({
        amount: 100,
        currency: "USD",
        reference: "INV-001",
      }),
    };

    const res: any = await createHandler(event as any);
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.INTERNAL_ERROR);
  });
});
