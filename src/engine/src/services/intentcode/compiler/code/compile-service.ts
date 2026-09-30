/**
 * Compiling one Intent file.
 *
 * A file is compiled by handing a session the Intent and letting it write the
 * source with its own tools, rather than by asking a model to return the
 * source as text and writing it here. The difference is what the session can
 * see and do while it works: it reads the rest of the project, it edits a file
 * that already exists instead of replacing it, and what it produces is a file
 * on disk rather than a string that has to be trusted to be a file.
 *
 * What the engine still owns is the graph. Once the session has worked, the
 * file is read back and recorded against the Intent that asked for it, so the
 * two can be compared later.
 */

import { hashContent } from '@/core/content-hash.js'
import { join } from 'node:path'
import chalk from 'chalk'
import fs from 'fs'
import type { ProjectStore } from '@/core/store.js'
import { BuildData, BuildFromFile } from '@/types/build-types.js'
import { IntentCodeAiTasks } from '@/core/ai/model.js'
import { Emoticons, ProjectDetails } from '@/types/server-only-types.js'
import { SourceCodePathGraphMutateService } from
  '@/services/graphs/source-code/path-graph-mutate-service.js'
import { PiService } from '@/services/ai/pi-service.js'
import { PiSkillsService } from
  '@/services/extensions/skills/pi-skills-service.js'
import { SourceRecordService } from
  '@/services/projects/source-record-service.js'
import { IntentCodeFilenameService } from
  '@/services/utils/filename-service.js'

// Services
const piService = new PiService()
const sourceRecordService = new SourceRecordService()
const filenameService = new IntentCodeFilenameService()
const piSkillsService = new PiSkillsService()
const sourceCodePathGraphMutateService =
  new SourceCodePathGraphMutateService()

// Class
export class CompilerService {

  // Consts
  clName = 'CompilerService'

  /**
   * The tools a compile worker is given. It reads the project to understand
   * what it is joining, and writes the one file it was asked for; it is not
   * given a shell, because nothing about compiling a file needs one.
   */
  compileToolNames = ['read', 'write', 'edit']

  /**
   * Compile one Intent file, and record what came of it.
   */
  async run(
            store: ProjectStore,
            buildData: BuildData,
            projectDetails: ProjectDetails,
            buildFromFile: BuildFromFile) {

    // The source this Intent names
    const targetFullPath = await
      this.getTargetFullPath(projectDetails, buildFromFile)

    buildFromFile.targetFullPath = targetFullPath

    // A source that is already what this Intent describes, and was written by
    // the engine rather than by hand since, has nothing to be recompiled from.
    // A session is the expensive part of a build, so it is only worth running
    // where a file could come out different.
    const upToDate = await sourceRecordService.isUpToDate(
      store,
      projectDetails.projectNode,
      filenameService.getSourceRelativePath(buildFromFile.relativePath),
      buildFromFile.content,
      this.readSource(targetFullPath))

    if (upToDate) {

      console.log(`${chalk.bold.yellow(Emoticons.tick)} ` +
                  `${buildFromFile.relativePath}: already up to date`)

      return
    }

    // The skills that apply to this kind of file
    const skills = piSkillsService.getSkills(
      buildData.extensionsData,
      projectDetails.project.path,
      buildFromFile.targetFileExt)

    // What the worker is asked. The prompt is kept on the generation record
    // as well as being sent, so a build can say which model wrote this file
    // from what.
    const prompt = this.getPrompt(buildFromFile, targetFullPath)

    // Run the worker
    const { modelId } = await piService.request(store, {
      cwd: projectDetails.project.path,
      aiTask: IntentCodeAiTasks.compiler,
      tools: {
        toolNames: this.compileToolNames,
        restrict: true
      },
      skills,
      prompt
    })

    // The session wrote a file, so the graph is told what is now on disk. A
    // worker that wrote nothing leaves the previous source alone rather than
    // recording an empty one.
    const written = this.readSource(targetFullPath)

    if (written == null) {

      console.log(`${chalk.bold.red(Emoticons.cross)} ` +
                  `${buildFromFile.relativePath}: nothing was written`)

      return
    }

    await sourceCodePathGraphMutateService.upsertSourceCodePathAsGraph(
      store,
      projectDetails.projectSourceNode,
      targetFullPath,
      written,
      { modelId, prompt })

    // What a later build compares this file against. It is kept on the
    // project rather than the build, because a build's own source subtree is
    // aged out before anything can compare against it.
    await sourceRecordService.setRecord(
      store,
      projectDetails.projectNode,
      filenameService.getSourceRelativePath(buildFromFile.relativePath),
      {
        intentContentHash: hashContent(buildFromFile.content),
        contentHash: hashContent(written)
      })

    console.log(`${chalk.bold.green(Emoticons.tick)} ` +
                `${buildFromFile.relativePath}: compiled OK`)
  }

  /**
   * What the worker is asked to do. The Intent is the whole specification;
   * everything else it needs it can read.
   */
  private getPrompt(
            buildFromFile: BuildFromFile,
            targetFullPath: string) {

    return (
      `Write the ${buildFromFile.targetFileExt} source that the Intent file ` +
      `${buildFromFile.filename} describes.\n` +
      `\n` +
      `## The Intent\n` +
      `\n` +
      buildFromFile.content +
      `\n\n` +
      `## What to do\n` +
      `\n` +
      `- Write the source to ${targetFullPath}, creating it and any ` +
      `  directories it needs.\n` +
      `- The file is the deliverable: use your tools to write it rather than ` +
      `  returning the source as text.\n` +
      `- Read the rest of the project where the Intent depends on something ` +
      `  it does not define, so the source you write fits what is there.\n` +
      `- Follow the skills you have been given for this kind of file.\n` +
      `- Do not edit the Intent file, and do not edit any other file.\n`)
  }

  /**
   * The source path an Intent names: the Intent's own path with the `.md`
   * taken off, against the project's source root.
   */
  private async getTargetFullPath(
            projectDetails: ProjectDetails,
            buildFromFile: BuildFromFile) {

    const sourceRoot =
      this.getSourcePath(projectDetails.projectSourceNode.jsonContent)

    return join(
      sourceRoot,
      filenameService.getSourceRelativePath(buildFromFile.relativePath))
  }

  private readSource(targetFullPath: string): string | null {

    try {
      return fs.readFileSync(targetFullPath, { encoding: 'utf8' })
    } catch {
      return null
    }
  }


  private getSourcePath(jsonContent: unknown): string {

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('path' in jsonContent) ||
        typeof jsonContent.path !== 'string') {

      throw new Error(
        'the project source node has no path; the project is not set up')
    }

    return jsonContent.path
  }
}
