export enum TransactionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ErrorType {
  VALIDATION_ERROR = "ValidationError",
  NOT_FOUND = "NotFound",
  DUPLICATE_REFERENCE = "DuplicateReference",
  DUPLICATE_TRANSACTION = "DuplicateTransaction",
  INTERNAL_ERROR = "InternalError",
}

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}
