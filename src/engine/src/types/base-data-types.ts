export class BaseDataTypes {

  // Statuses
  static activeStatus = 'A'
  static deletePendingStatus = 'P'
  static failedStatus = 'F'
  static newStatus = 'N'
  static inactiveStatus = 'I'

  static statusMap = {
    [this.activeStatus]: 'Active',
    [this.deletePendingStatus]: 'Delete pending'
  }

  static statusArray = [
    {
      value: this.activeStatus,
      name: 'Active'
    },
    {
      value: this.deletePendingStatus,
      name: 'Delete pending'
    }
  ]

  // Agents
  static batchAgentRefId = 'Batch'
  static batchAgentName = 'Batch'
  static batchAgentRole = 'Batch processing'

  static coderAgentRefId = 'Coder'
  static coderAgentName = 'Coder'
  static coderAgentRole = 'Talk to users'

  static agents = [
    {
      agentRefId: this.batchAgentRefId,
      agentName: this.batchAgentName,
      agentRole: this.batchAgentRole
    },
    {
      agentRefId: this.coderAgentRefId,
      agentName: this.coderAgentName,
      agentRole: this.coderAgentRole
    }
  ]

  // Chat settings
  static defaultChatSettingsName = 'default'
  static coderChatSettingsName = 'coder'

  static chatSettingsNames = [
    this.defaultChatSettingsName,
    this.coderChatSettingsName
  ]

  static chatSettings = [
    {
      name: this.defaultChatSettingsName,
      agentUniqueRef: this.batchAgentRefId,
      isJsonMode: true
    },
    {
      name: this.coderChatSettingsName,
      agentUniqueRef: this.coderAgentRefId,
      isJsonMode: true
    }
  ]
}
