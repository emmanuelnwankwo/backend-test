import { jest } from '@jest/globals';
import { handler as getHandler } from "../src/handlers/getTransaction/handler";
import { TransactionStatus, ErrorType } from "../src/shared/types";
import * as clients from "../src/shared/clients";

type AnyMock = jest.Mock<any>;

const mockDdbDoc = clients.ddbDoc as jest.Mocked<typeof clients.ddbDoc>;

describe("GetTransaction Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // override send mock
    (clients.ddbDoc.send as AnyMock) = jest.fn();
  });

  test("retrieves transaction successfully", async () => {
    const mockTransaction = {
      id: "test-id",
      amount: 100,
      currency: "USD",
      reference: "INV-001",
      status: TransactionStatus.COMPLETED,
      createdAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-15T10:00:10.000Z",
    };

    (mockDdbDoc.send as AnyMock).mockResolvedValueOnce({ Item: mockTransaction });

    const event = {
      pathParameters: { id: "test-id" },
    };

    const res: any = await getHandler(event as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe("test-id");
    expect(body.status).toBe(TransactionStatus.COMPLETED);
  });

  test("returns 404 for non-existent transaction", async () => {
    (mockDdbDoc.send as AnyMock).mockResolvedValueOnce({ Item: undefined });

    const event = {
      pathParameters: { id: "non-existent-id" },
    };

    const res: any = await getHandler(event as any);
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.NOT_FOUND);
  });

  test("returns 400 for missing transaction ID", async () => {
    const event = {
      pathParameters: {},
    };

    const res: any = await getHandler(event as any);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.VALIDATION_ERROR);
  });

  test("returns 500 for database error", async () => {
    (mockDdbDoc.send as AnyMock).mockRejectedValueOnce(new Error("DB Error"));

    const event = {
      pathParameters: { id: "test-id" },
    };

    const res: any = await getHandler(event as any);
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.INTERNAL_ERROR);
  });
});
