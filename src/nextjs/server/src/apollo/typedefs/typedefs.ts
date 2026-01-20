export const typeDefs = `#graphql

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
    name: String
  }

  type ChatParticipantResults {
    status: Boolean!
    message: String
    chatParticipants: [ChatParticipant]
  }

  type ChatSession {
    id: String!
    status: String!
    updated: String!
    chatParticipants: [ChatParticipant]
  }

  type ChatSessionResults {
    status: Boolean!
    message: String
    chatSession: ChatSession

    chatSpeakPreference: Boolean
  }

  type Comment {
    id: String!
    url: String!
    text: String!
  }

  type ExistsResults {
    status: Boolean!
    message: String
    exists: Boolean
  }

  type Instance {
    id: String!
    userProfile: UserProfile!
    parentId: String
    instanceType: String
    projectType: String
    status: String!
    name: String!

    parent: Instance
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

  type User {
    id: String!
    name: String
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
    user: User
    isAdmin: Boolean!
  }

  # IntentCode (types)
  # ---

  type ServerStartData {
    status: Boolean!
    message: String
    instance: Instance
    chatSession: ChatSession
  }

  # Queries
  # ---

  type Query {

    # Serene Core
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

    # IntentCode
    # ---

    # Instances
    filterInstances(
      instanceType: String,
      projectType: String,
      parentId: String,
      status: String,
      userProfileId: String!): [Instance]

    filterProjectInstances(
      parentId: String,
      userProfileId: String!
      instanceType: String,
      projectType: String,
      status: String): [Instance]

    instanceById(
      id: String!,
      userProfileId: String!,
      includeParent: Boolean,
      includeInstanceRefs: Boolean,
      includeStats: Boolean): Instance
  }

  type Mutation {

    # Serene Core
    # ---

    # Analysis
    upsertAnalysis(
      id: String,
      userProfileId: String!,
      generationsConfigId: String!,
      type: String!,
      status: String!,
      instrumentType: String!
      defaultMinScore: Float!,
      name: String!,
      description: String!,
      prompt: String!): StatusAndMessage!

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

    # IntentCode
    # ---

    # Start
    loadServerStartData(
      userProfileId: String!,
      instanceId: String,
      loadChatSession: Boolean,
      chatSessionId: String,
      chatSettingsName: String): ServerStartData!

    # Sign-ups
    signUpForWaitlist(email: String!): StatusAndMessage!
  }
`
