export const typeDefs = `#graphql

  # Serene AI Types
  # ----

  type StatusAndMessage {
    status: Boolean!
    message: String
  }

  type Workbook {
    id: String!
    status: String!
  }

  type WorkbookResults {
    status: Boolean!
    message: String
    workbook: Workbook
  }

  # Serene Core (types)
  # ---

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

  type ExistsResults {
    status: Boolean!
    message: String
    exists: Boolean
  }

  type StatusAndMessage {
    status: Boolean!
    message: String
  }

  type StatusAndMessageAndId {
    status: Boolean!
    message: String
    id: String
  }

  type Tip {
    id: String!
    name: String!
    tags: [String]
  }

  type TipsResults {
    status: Boolean!
    message: String
    tips: [Tip]
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

  # Queries
  # ---

  type Query {

    # Serene Core
    # ---

    # Profile
    validateProfileCompleted(
      forAction: String!,
      userProfileId: String!): StatusAndMessage!

    # Tips
    getTipsByUserProfileIdAndTags(
      userProfileId: String!,
      tags: [String]): TipsResults!

    tipGotItExists(
      name: String!,
      userProfileId: String!): ExistsResults!

    # Users
    isAdminUser(userProfileId: String!): StatusAndMessage!
    userById(userProfileId: String!): UserProfile
    verifySignedInUserProfileId(userProfileId: String!): Boolean

    # User preferences
    getUserPreferences(
      userProfileId: String!,
      category: String!,
      keys: [String]): [UserPreference]

    # Serene AI
    # ---

    # Chats
    getChatMessages(
      chatSessionId: String,
      userProfileId: String!,
      lastMessageId: String): ChatMessageResults!

    getChatParticipants(
      chatSessionId: String,
      userProfileId: String!): ChatParticipantResults!

    getChatSession(
      chatSessionId: String,
      userProfileId: String!): ChatSessionResults!

    getChatSessions(
      status: String,
      userProfileId: String!): [ChatSession]
  }

  type Mutation {

    # Serene Core
    # ---
  
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
  
    # Tips
    deleteTipGotIt(
      name: String,
      userProfileId: String!): StatusAndMessage!

    upsertTipGotIt(
      name: String!,
      userProfileId: String!): StatusAndMessage!

    # User preferences
    upsertUserPreference(
      userProfileId: String!,
      category: String!,
      key: String!,
      value: String,
      values: [String]): Boolean

    # Serene AI
    # ---

    # Admin
    runSetup(userProfileId: String!): StatusAndMessage!

    # Chats
    getOrCreateChatSession(
      chatSessionId: String,
      prompt: String,
      userProfileId: String!): ChatSessionResults!
  }
`

export { typeDefs as default }
