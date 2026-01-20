import { prisma } from '@/db'
import { WaitlistModel } from '@/models/waitlist/waitlist-model'


// Models
const waitlistModel = new WaitlistModel()


// Code
export async function signUpForWaitlist(parent: any, args: { email: string }, context: any, info: any) {

  // Debug
  const fnName = `signUpForWaitlist()`

  console.log(`${fnName}: args: ${JSON.stringify(args)}`)

  // Email must be provided
  if (!args.email) {
    return {
      status: false,
      message: 'Email not specified'
    }
  }

  // Email
  const email = args.email.toLowerCase().trim()

  // Verify that the email isn't already in Waitlist
  var waitlist = await
        waitlistModel.getByEmail(
          prisma,
          email)

  // If found
  if (waitlist != null) {
    return {
      status: false,
      message: `You've already signed-up for the waitlist`
    }
  }

  // Insert into Waitlist
  await waitlistModel.create(
          prisma,
          email)

  // Return OK
  return {
    status: true
  }
}
