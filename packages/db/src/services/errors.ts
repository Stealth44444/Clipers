export type ServiceError = {
  ok: false;
  code: string;
  message: string;
};

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

export function err(code: string, message: string): ServiceError {
  return { ok: false, code, message };
}

export function ok<T>(data: T): ServiceSuccess<T> {
  return { ok: true, data };
}
