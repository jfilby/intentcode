export const typeDefs = `#graphql

  type ChatMessage {
    id: String!
    name: String!
    message: String!
    created: String!
    updated: String
  }

  type ChatMessageResults {
    status: Boolean!
    message: String
    chatMessages: [ChatMessage]
  }

  type ChatParticipant {
    id: String!
    userProfileId: String!
    name: String!
  }

  type ChatParticipantResults {
    status: Boolean!
    message: String
    chatParticipants: [ChatParticipant]
  }

  type ChatSession {
    id: String!
    status: String!
    name: String
    updated: String!
    chatParticipants: [ChatParticipant]
  }

  type ChatSessionResults {
    status: Boolean!
    message: String
    chatSession: ChatSession
  }

  type ResourceQuotaUsage {
    userProfileId: String!
    resource: String!
    day: String!
    quota: Float!
    usage: Float!
  }

  type StatusAndMessage {
    status: Boolean!
    message: String
  }

  type Techs {
    id: String!
    resource: String!
    variantName: String!
  }

  type UserPreference {
    category: String!
    key: String!
    value: String
    values: [String]
  }

  type UserProfile {
    id: String!
    userId: String
    isAdmin: Boolean!
  }

  type VerifiedAndMessage {
    verified: Boolean!
    message: String
  }

  type Query {

    # Profile
    validateProfileCompleted(
      forAction: String!,
      userProfileId: String!): StatusAndMessage!

    # Quotas
    getResourceQuotaUsage(
      userProfileId: String!,
      resource: String!,
      day: String,
      viewUserProfileId: String): ResourceQuotaUsage!

    # Tech
    getTechs(
      userProfileId: String!,
      resource: String!): [Tech]

    # Users
    isAdminUser(userProfileId: String!): StatusAndMessage!
    userById(userProfileId: String!): UserProfile
    verifySignedInUserProfileId(userProfileId: String!): Boolean

    # User preferences
    getUserPreferences(
      userProfileId: String!,
      category: String!,
      keys: [String]): [UserPreference]
  }

  type Mutation {

    # Mailing lists
    mailingListSignup(
      mailingListName: String!,
      email: String!,
      firstName: String): VerifiedAndMessage!

    # Users
    createBlankUser: UserProfile!
    createUserByEmail(email: String!): UserProfile!
    deactivateUserProfileCurrentIFile(id: String!): Boolean
    getOrCreateSignedOutUser(
      signedOutId: String,
      defaultUserPreferences: String): UserProfile!
    getOrCreateUserByEmail(
      email: String!,
      defaultUserPreferences: String): UserProfile!

    # User preferences
    upsertUserPreference(
      userProfileId: String!,
      category: String!,
      key: String!,
      value: String,
      values: [String]): Boolean
  }

`
