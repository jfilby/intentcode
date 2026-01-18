import 'db'
import { upsertUserPreference } from './mutations/user-preferences'
import { createBlankUser, createUserByEmail, getOrCreateSignedOutUser, getOrCreateUserByEmail } from './mutations/users'
import { isAdminUser } from './queries/access'
import { validateProfileCompleted } from './queries/profile'
import { getUserPreferences } from './queries/user-preferences'
import { userById, verifySignedInUserProfileId } from './queries/users'
import { getResourceQuotaUsage } from './queries/quotas'
import { getTechs } from './queries/tech'

// Code
const Query = {
  // Profile
  validateProfileCompleted,

  // Quotas
  getResourceQuotaUsage,

  // Tech
  getTechs,

  // Users
  userById,
  verifySignedInUserProfileId,

  // User preferences
  getUserPreferences
}

const Mutation = {
  // Access
  isAdminUser,

  // Users
  createBlankUser,
  createUserByEmail,
  getOrCreateSignedOutUser,
  getOrCreateUserByEmail,

  // User preferences
  upsertUserPreference
}

const resolvers = { Query, Mutation }

export default resolvers
