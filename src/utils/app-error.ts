export interface ErrorDetail {
  path: string;
  message: string;
}

/**
 * Error yang sudah dipetakan ke HTTP status + kode error kontrak API.
 * Hanya error jenis ini yang boleh membocorkan pesan ke client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(details: ErrorDetail[], message = "Validasi request gagal"): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static notFound(message = "Data tidak ditemukan"): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }
}
