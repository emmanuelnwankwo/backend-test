import { jest } from '@jest/globals';
import { handler as processHandler } from "../src/handlers/processTransaction/handler";
import { TransactionStatus } from "../src/shared/types";
import * as clients from "../src/shared/clients";

type AnyMock = jest.Mock<any>;


const mockDdbDoc = clients.ddbDoc as jest.Mocked<typeof clients.ddbDoc>;

describe("ProcessTransaction Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
    // override send mock
    (mockDdbDoc.send as AnyMock) = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("processes transaction successfully", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (mockDdbDoc.send as AnyMock)
      .mockResolvedValueOnce({ Item: mockTransaction })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "test-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(mockDdbDoc.send).toHaveBeenCalledTimes(3);
  });

  test("skips non-existent transaction", async () => {
    (mockDdbDoc.send as AnyMock).mockResolvedValueOnce({ Item: undefined });

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "non-existent-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(mockDdbDoc.send).toHaveBeenCalledTimes(1);
  });

  test("skips already processed transaction", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.COMPLETED,
    };

    (mockDdbDoc.send as AnyMock).mockResolvedValueOnce({ Item: mockTransaction });

    const event = {
      Records: [
        {
          body: JSON.stringify({ transactionId: "test-id" }),
        },
      ],
    };

    await processHandler(event as any);
    expect(mockDdbDoc.send).toHaveBeenCalledTimes(1);
  });

  test("handles conditional check failure gracefully", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (mockDdbDoc.send as AnyMock)
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
    expect(mockDdbDoc.send).toHaveBeenCalledTimes(2);
  });

  test("processes multiple records", async () => {
    const mockTransaction = {
      id: "test-id",
      status: TransactionStatus.PENDING,
    };

    (mockDdbDoc.send as AnyMock)
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
    expect(mockDdbDoc.send).toHaveBeenCalledTimes(6);
  });
});
