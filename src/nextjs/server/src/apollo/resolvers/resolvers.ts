// Serene Core query imports
import { isAdminUser } from '@/serene-core-server/apollo/resolvers/queries/access'
// import { getOrCreateChatSession } from '@/serene-ai-server/apollo/resolvers/mutations/chats'
// import { getTipsByUserProfileIdAndTags, tipGotItExists } from '@/serene-core-server/apollo/resolvers/queries/tips'

// Serene Core mutations imports
// import { getChatMessages, getChatSessions } from '@/serene-ai-server/apollo/resolvers/queries/chats'
import { createBlankUser, createUserByEmail, getOrCreateSignedOutUser, getOrCreateUserByEmail } from '@/serene-core-server/apollo/resolvers/mutations/users'
import { validateProfileCompleted } from '@/serene-core-server/apollo/resolvers/queries/profile'
// import { deleteTipGotIt, upsertTipGotIt } from '@/serene-core-server/apollo/resolvers/mutations/tips'
import { userById, verifySignedInUserProfileId } from '@/serene-core-server/apollo/resolvers/queries/users'
import { getUserPreferences } from '@/serene-core-server/apollo/resolvers/queries/user-preferences'
import { upsertUserPreference } from '@/serene-core-server/apollo/resolvers/mutations/user-preferences'

// Concept queries imports
// import { filterInstances, filterProjectInstances, instanceById } from './queries/instances'

// Concept mutations imports
import { loadServerStartData } from './mutations/server-data-start'
import { signUpForWaitlist } from './mutations/sign-ups'
// import { upsertInstance } from './mutations/instances'

// Code
const Query = {

  // Serene Core
  // ---

  // Chats
  // getChatMessages,
  // getChatParticipants,
  // getChatSession,

  // Profile
  validateProfileCompleted,

  // Quotas
  // getResourceQuotaUsage,

  // Tech
  // getTechs,

  // Tips
  // getTipsByUserProfileIdAndTags,
  // tipGotItExists,

  // Users
  isAdminUser,
  userById,
  verifySignedInUserProfileId,

  // User preferences
  getUserPreferences,

  // IntentCode
  // ---

  // Instances
  // filterInstances,
  // filterProjectInstances,
  // instanceById,
  // instanceSharedGroups,
  // instancesSharedPublicly,
}

const Mutation = {

  // Serene Core
  // ---

  // Chats
  // getOrCreateChatSession,

  // Tips
  // deleteTipGotIt,
  // upsertTipGotIt,

  // Users
  createBlankUser,
  createUserByEmail,
  getOrCreateSignedOutUser,
  getOrCreateUserByEmail,

  // User preferences
  upsertUserPreference,

  // IntentCode
  // ---

  // Instances
  // upsertInstance,

  // General
  loadServerStartData,
  signUpForWaitlist
}

const resolvers = { Query, Mutation }

export default resolvers
