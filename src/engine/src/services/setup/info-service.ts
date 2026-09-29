import { sqlLiteFile } from '../../db.js'
import { AiModelService } from '@/services/ai/ai-model-service.js'
import { IntentCodeAiTasks } from '@/types/server-only-types.js'

// Services
const aiModelService = new AiModelService()

export class InfoService {

  // Consts
  clName = 'InfoService'

  // Code
  async info() {

    console.log(``)
    console.log(`# Info`)
    console.log(``)

    if (sqlLiteFile != null) {

      console.log(`SQLite file: ${sqlLiteFile}`)
    } else {
      console.log(`Non-SQLite DB`)
    }

    // The AI model, per AI task
    for (const aiTask of Object.values(IntentCodeAiTasks)) {

      let modelId: string

      try {
        modelId = aiModelService.getModelId(aiTask)
      } catch {
        modelId = `(not set: set INTENTCODE_AI_MODEL in .env)`
      }

      console.log(`AI model for ${aiTask}: ${modelId}`)
    }
  }
}
