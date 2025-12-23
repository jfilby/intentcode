export class CustomError extends Error {

  name = 'CustomError'

  constructor(message: string) {
    super(message)
    this.name = 'CustomError'
    Error.captureStackTrace?.(this, CustomError)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
    }
  }
}
