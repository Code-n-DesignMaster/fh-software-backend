// eslint-disable-next-line no-shadow
export enum ResultStatus {
  OK,
  FAIL,
  ERROR
}

export class DataResponse<D> {
  constructor(
    public readonly status: ResultStatus,
    public readonly data?: D,
    public readonly message?: string,
    public readonly error?: Error
  ) {
  }

  isOk() {
    return this.status === ResultStatus.OK;
  }

  isFail() {
    return this.status === ResultStatus.FAIL;
  }

  isError() {
    return this.status === ResultStatus.ERROR;
  }

  // eslint-disable-next-line no-shadow
  static ok<D>(data?: D) {
    return new DataResponse(ResultStatus.OK, data);
  }

  // eslint-disable-next-line no-shadow
  static fail<D>(error: Error) {
    return new DataResponse<D>(ResultStatus.FAIL, (error as any).data, error.message, error);
  }

  // eslint-disable-next-line no-shadow
  static error<D>(error: Error, data?: D) {
    return new DataResponse(ResultStatus.ERROR, data, error.message, error);
  }
}
