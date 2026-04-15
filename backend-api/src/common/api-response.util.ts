export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export class ApiResponseFactory {
  static success<T>(message: string, data: T): ApiResponse<T> {
    return { success: true, message, data };
  }

  static error(message: string): ApiResponse<never> {
    return { success: false, message, data: null };
  }
}