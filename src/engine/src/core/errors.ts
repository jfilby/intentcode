/**
 * Explicit error representation.
 *
 * The engine reports a failure as a stage, a short message the CLI prints, and
 * an optional detail carrying the complete diagnostic. Throwing a bare string
 * loses the stage, so nothing in the engine does that.
 */

export type ErrorCategory =
  | 'ConfigError'
  | 'ProjectError'
  | 'StorageError'
  | 'ModelError'
  | 'AiError'
  | 'ChatError'
  | 'ValidationError'
  | 'ExtensionError'
  | 'CompilerError';

export interface IntentErrorInit {
  category: ErrorCategory
  /** The operation that failed, e.g. `SourceNodeModel.upsert`. */
  stage?: string
  message: string
  detail?: string
}

/**
 * The error every service throws. `instanceof IntentError` is the marker the
 * chat retry loop uses to decide a failure is one it should report rather than
 * dump, so it has to stay a distinct class.
 */
export class IntentError extends Error {
  readonly category: ErrorCategory
  readonly stage?: string
  readonly detail?: string

  constructor(init: IntentErrorInit) {
    super(init.message)
    this.name = 'IntentError'
    this.category = init.category
    this.stage = init.stage
    this.detail = init.detail
  }

  toJSON() {
    return {
      category: this.category,
      stage: this.stage,
      message: this.message,
      detail: this.detail
    }
  }
}

export function isIntentError(value: unknown): value is IntentError {
  return value instanceof IntentError
}

/** Wraps anything thrown into an IntentError without losing the message. */
export function toIntentError(
  value: unknown,
  init: Omit<IntentErrorInit, 'message'> & { message?: string }
): IntentError {

  if (isIntentError(value)) return value

  return new IntentError({
    ...init,
    message: init.message ??
      (value instanceof Error ? value.message : String(value)),
    detail: init.detail ??
      (value instanceof Error && value.stack ? value.stack : undefined)
  })
}
