import type { ProjectStore } from '@/core/store.js'

// Class
export class HousekeepingDeleteService {

  // Consts
  clName = 'HousekeepingDeleteService'

  // Code

  // A chat session and everything under it is disposable, so a session old
  // enough to be forgotten is deleted whole: its messages, its participants,
  // then the session itself.
  async deleteOldRecords(store: ProjectStore) {

    // Debug
    const fnName = `${this.clName}.deleteOldRecords()`

    // The cutoff
    const chatSessionsDaysAgo = 30

    const chatSessionsCutoff =
      Date.now() - chatSessionsDaysAgo * 24 * 60 * 60 * 1000

    // The old sessions
    const chatSessions = await store.chatSessions.findMany()

    for (const chatSession of chatSessions) {

      if (new Date(chatSession.created).getTime() >= chatSessionsCutoff) {

        continue
      }

      // The messages of the session
      await store.chatMessages.deleteMany({
        where: {
          chatSessionId: chatSession.id
        }
      })

      // The participants of the session
      await store.chatParticipants.deleteMany({
        where: {
          chatSessionId: chatSession.id
        }
      })

      // The session itself
      await store.chatSessions.deleteMany({
        where: {
          id: chatSession.id
        }
      })
    }
  }
}
