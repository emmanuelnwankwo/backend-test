import { handler as getHandler } from "../src/handlers/getTransaction/handler";
import { TransactionStatus, ErrorType } from "../src/shared/types";
import { ddbDoc } from "../src/shared/clients";

jest.mock("../src/shared/clients", () => ({
  ddbDoc: {
    send: jest.fn(),
  },
  sqsClient: {
    send: jest.fn(),
  },
}));

describe("GetTransaction Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    (ddbDoc.send as jest.Mock).mockResolvedValueOnce({ Item: mockTransaction });

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
    (ddbDoc.send as jest.Mock).mockResolvedValueOnce({ Item: undefined });

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
    (ddbDoc.send as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

    const event = {
      pathParameters: { id: "test-id" },
    };

    const res: any = await getHandler(event as any);
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toBe(ErrorType.INTERNAL_ERROR);
  });
});
