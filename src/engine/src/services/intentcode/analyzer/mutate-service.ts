/**
 * What is wrong with a project's Intent.
 *
 * The analyzer reads the Intent and reports what it finds: the places where an
 * Intent is ambiguous, incomplete, or contradicted by the source beside it. It
 * does not change anything.
 *
 * That is a deliberate change from what this did before. The analyzer used to
 * be handed a ranked list of suggestions and apply the approved ones to the
 * Intent itself, which meant the engine was rewriting a file it had only just
 * read on the strength of a model agreeing it was wrong. Now a session reads
 * the report and decides what to do with it, with the whole project in front
 * of it — which is the only vantage from which "this Intent is ambiguous" can
 * be resolved rather than merely recorded.
 */

import { IntentError } from '@/core/errors.js'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { BuildData } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/core/ai/model.js'
import { PiService } from '@/services/ai/pi-service.js'
import { PiSkillsService } from
  '@/services/extensions/skills/pi-skills-service.js'
import { ProjectsQueryService } from '@/services/projects/query-service.js'

// Services
const piService = new PiService()
const piSkillsService = new PiSkillsService()
const projectsQueryService = new ProjectsQueryService()

// Class
export class IntentCodeAnalyzerMutateService {

  // Consts
  clName = 'IntentCodeAnalyzerMutateService'

  // Code
  async run(store: ProjectStore,
            buildData: BuildData,
            projectNode: SourceNodeRecord) {

    // Debug
    const fnName = `${this.clName}.run()`

    // Console output
    console.log(`Reading the IntentCode..`)

    // Get ProjectDetails
    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    // The Intent files, which is what is being read
    const intentCodePath = this.getIntentCodePath(projectDetails)

    if (intentCodePath == null) return

    // The skills, which are about the project rather than one file
    const skills = piSkillsService.getSkills(
      buildData.extensionsData,
      projectDetails.project.path)

    // Ask
    const { text } = await piService.request(store, {
      cwd: projectDetails.project.path,
      aiTask: IntentCodeAiTasks.compiler,
      skills,
      // The analyzer reads; it is given no way to write, so a report cannot
      // become a change by accident.
      tools: {
        toolNames: ['read', 'glob', 'grep'],
        restrict: true
      },
      prompt:
        `Read this project's IntentCode in ${intentCodePath} and the source ` +
        `it describes, and report what is wrong with it.\n` +
        `\n` +
        `Look for Intent that is ambiguous, that contradicts the source, that ` +
        `is missing something the source needs, and that two files disagree ` +
        `about. Rank what you find by how much it costs to be wrong.\n` +
        `\n` +
        `Report only. Do not change any file.\n` +
        `\n` +
        `For each finding, name the Intent file it is in, and say in one ` +
        `sentence what would resolve it.`
    })

    // Report
    console.log(``)

    if (text === ``) {
      console.log(`Nothing to report.`)
      return
    }

    console.log(text)
  }

  private getIntentCodePath(
            projectDetails: { projectIntentCodeNode: SourceNodeRecord }) {

    const jsonContent = projectDetails.projectIntentCodeNode.jsonContent

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('path' in jsonContent) ||
        typeof jsonContent.path !== 'string') {

      throw new IntentError({
        category: 'ProjectError',
        stage: `${this.clName}.getIntentCodePath()`,
        message: 'the project IntentCode node has no path'
      })
    }

    return jsonContent.path
  }
}
