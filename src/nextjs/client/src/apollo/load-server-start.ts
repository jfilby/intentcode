import { gql } from '@apollo/client'

export const loadServerStartDataMutation = gql`
  mutation loadServerStartData(
             $userProfileId: String!,
             $instanceId: String,
             $loadChatSession: Boolean,
             $chatSessionId: String,
             $chatSettingsName: String) {
    loadServerStartData(
      userProfileId: $userProfileId,
      instanceId: $instanceId,
      loadChatSession: $loadChatSession,
      chatSessionId: $chatSessionId,
      chatSettingsName: $chatSettingsName) {

      status
      message
      instance {
        id
        parentId
        status
        name
        parent {
          id
          parentId
          status
          name
        }
      }
      chatSession {
        id
        status
        chatParticipants {
          id
          userProfileId
        }
      }
    }
  }
`
