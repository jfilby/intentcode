import { BuildFromFile } from '@/types/build-types.js'
import { ExtensionsData } from '@/types/source-graph-types.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'
import { ExtensionQueryService } from '@/services/extensions/extension/query-service.js'
import { ProjectRegistryService } from '@/services/projects/project-registry.js'

// Services
const extensionQueryService = new ExtensionQueryService()
const projectRegistryService = new ProjectRegistryService()

// Class
export class TechStackPromptService {

  // Consts
  clName = 'TechStackPromptService'

  // Code
  async getPrompt(
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
          `You need to identify the best matching IntentCode extensions in ` +
          `the System project, as well as any dependencies for the source ` +
          `package manager, as required by the spec.\n` +
          `\n` +
          `Use the least complex extension(s) for the requirements.\n` +
          `\n` +
          `If an extension is already listed as installed for the User ` +
          `project then there needs to be a good reason not to list it.\n` +
          `\n` +
          `Any element in the tech stack that isn't supported by an ` +
          `extension or dependency needs to be included in the errors.\n` +
          `\n` +
          `Don't raise errors based on unspecified dependencies that aren't ` +
          `required.\n` +
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
    const systemProject = projectRegistryService.getSystemProject()
    const systemStore = projectRegistryService.getStore(systemProject)

    const systemExtensionsPrompting = await
            extensionQueryService.getAsPrompting(
              systemStore,
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
              systemStore,
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

    // Return
    return prompt
  }
}
