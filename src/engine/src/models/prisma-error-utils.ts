import { Prisma } from '@/prisma/client.js'

// Prisma reports a missing record as a PrismaClientKnownRequestError carrying
// the code P2025. Model methods used to guard with
// `if (!(error instanceof error.NotFound))`, but `error.NotFound` is undefined,
// so `instanceof` threw "Right-hand side of 'instanceof' is not an object"
// from inside the catch block itself. Every Prisma failure was replaced by
// that TypeError, and the not-found tolerance these guards exist to provide
// never applied.
export function isPrismaNotFound(error: unknown): boolean {

  // `code` is the stable, documented discriminator here. Narrowing on
  // `instanceof Prisma.PrismaClientKnownRequestError` does not give TypeScript
  // a type that exposes `code`, and the generated client is the one place
  // where that class identity is not guaranteed to be shared.
  if (error == null ||
      typeof error !== 'object' ||
      !('code' in error)) {

    return false
  }

  return error.code === 'P2025'
}
