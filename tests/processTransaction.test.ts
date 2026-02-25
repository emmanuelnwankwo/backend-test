import { handler as processHandler } from "../src/handlers/processTransaction/handler";
import { TransactionStatus } from "../src/shared/types";
import { ddbDoc } from "../src/shared/clients";

jest.mock("../src/shared/clients", () => ({
  ddbDoc: {
    send: jest.fn(),
  },
  sqsClient: {
    send: jest.fn(),
  },
}));

describe("ProcessTransaction Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("processes transaction successfully", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (ddbDoc.send as jest.Mock)
      .mockResolvedValueOnce({ Item: mockTransaction }) // GetCommand
      .mockResolvedValueOnce({}) // UpdateCommand - PROCESSING
      .mockResolvedValueOnce({}); // UpdateCommand - COMPLETED/FAILED

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "test-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(ddbDoc.send).toHaveBeenCalledTimes(3);
  });

  test("skips non-existent transaction", async () => {
    (ddbDoc.send as jest.Mock).mockResolvedValueOnce({ Item: undefined });

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "non-existent-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(ddbDoc.send).toHaveBeenCalledTimes(1); // Only GetCommand
  });

  test("skips already processed transaction", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.COMPLETED,
    };

    (ddbDoc.send as jest.Mock).mockResolvedValueOnce({ Item: mockTransaction });

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "test-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(ddbDoc.send).toHaveBeenCalledTimes(1); // Only GetCommand
  });

  test("handles conditional check failure gracefully", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (ddbDoc.send as jest.Mock)
      .mockResolvedValueOnce({ Item: mockTransaction })
      .mockRejectedValueOnce({ name: "ConditionalCheckFailedException" });

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "test-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(ddbDoc.send).toHaveBeenCalledTimes(2);
  });

  test("processes multiple records", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (ddbDoc.send as jest.Mock)
      .mockResolvedValueOnce({ Item: mockTransaction })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: mockTransaction })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const event = {
      Records: [
        { body: JSON.stringify({ transactionId: "test-id-1" }) },
        { body: JSON.stringify({ transactionId: "test-id-2" }) },
      ],
    };

    await processHandler(event as any);
    expect(ddbDoc.send).toHaveBeenCalledTimes(6); // 3 calls per record
  });
});
