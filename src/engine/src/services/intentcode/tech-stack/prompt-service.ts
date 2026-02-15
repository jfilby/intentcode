import { PrismaClient, SourceNode } from '@prisma/client'
import { BuildFromFile } from '@/types/build-types'
import { ExtensionsData } from '@/types/source-graph-types'
import { ServerOnlyTypes } from '@/types/server-only-types'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service'
import { ProjectsQueryService } from '@/services/projects/query-service'

// Services
const extensionQueryService = new ExtensionQueryService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class TechStackPromptService {

  // Consts
  clName = 'TechStackPromptService'

  // Code
  async getPrompt(
          prisma: PrismaClient,
          projectNode: SourceNode,
          extensionsData: ExtensionsData,
          buildFromFile: BuildFromFile) {

    // Debug
    const fnName = `${this.clName}.getPrompt()`

    // Start the prompt
    var prompt = 
          `## Instructions\n` +
          `\n` +
          `Convert the Tech stack spec (natural language) into json guided ` +
          `by the example output.\n` +
          `\n` +
          `You need to identify the best matching extensions in the System ` +
          `project, as well as any dependencies as required by the spec.\n` +
          `\n` +
          `If an extension is already listed as installed for the User ` +
          `project then there needs to be a good reason not to list it.\n` +
          `\n` +
          `Any element in the tech stack that isn't supported by an ` +
          `extension or dependency needs to be included in the errors.\n` +
          `\n` +
          `## Fields\n` +
          `\n` +
          ServerOnlyTypes.messagesPrompting +
          `\n` +
          `- Use a valid semver for minVersion, but prefer to specfiy the ` +
          `  highest major version only, e.g. "^5".\n` +
          `- Specify the latest version you know if no specific version is ` +
          `  specified.\n` +
          `- Don't add the packageManager to the deps.\n` +
          `\n` +
          `## Example JSON output\n` +
          `\n` +
          `{\n` +
          `  "warnings": [],\n` +
          `  "errors": [\n` +
          `    {\n` +
          `      "line": 5,\n` +
          `      "from": 6,\n` +
          `      "to": 7,\n` +
          `      "text": "No extension for <tech> available."\n` +
          `    }\n` +
          `  ],\n` +
          `  "extensions": {\n` +
          `    "<id>": "<minVersionNo>",\n` +
          `  },\n` +
          `  "source": {\n` +
          `    "deps": {\n` +
          `      "<name>": "<minVersion>"\n` +
          `    }\n` +
          `  }\n` +
          `}\n` +
          `\n`

    // Add the tech stack spec
    prompt +=
      `## Tech stack spec\n` +
      `\n` +
      '```md\n' +
      buildFromFile.content +
      `\n` +
      '```'

    // System (available extensions)
    const systemProject = await
            projectsQueryService.getProject(
              prisma,
              null,  // parentId
              ServerOnlyTypes.systemProjectName)

    const systemExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              prisma,
              systemProject.id)

    if (systemExtensionsPrompting != null) {

      prompt +=
        `## System extensions\n` +
        `\n` +
        `These extensions are those that are available to be installed in ` +
        `the user project.\n` +
        `\n` +
        systemExtensionsPrompting
    }

    // Add installed extensions
    const projectExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              prisma,
              systemProject.id)

    if (projectExtensionsPrompting != null) {

      prompt +=
        `## User project extensions\n` +
        `\n` +
        `These extensions are those that are already installed for this ` +
        `project.\n` +
        `\n` +
        projectExtensionsPrompting
    }

    // Debug
    // console.log(`${fnName}: prompt: ${prompt}`)
    // throw new CustomError(`${fnName}: TEST STOP`)

    // Return
    return prompt
  }
}
