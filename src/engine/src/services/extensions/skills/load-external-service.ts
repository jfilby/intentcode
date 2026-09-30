import fs from 'fs'
import YAML from 'yaml'
import { blake3 } from '@noble/hashes/blake3'
import { IntentError } from '@/core/errors.js'
import type { SourceNodeRecord } from '@/core/records.js'
import type { ProjectStore } from '@/core/store.js'
import { walkDir } from '@/core/walk-dir.js'
import { BaseDataTypes } from '@/types/base-data-types.js'
import { SourceNodeModel } from '@/models/source-graph/source-node-model.js'
import { SourceNodeTypes } from '@/types/source-graph-types.js'

// Types

/**
 * The YAML front-matter at the top of a skill's markdown: the `name` the skill
 * node is keyed by, plus whatever else the skill declares. The file is read
 * off disk, so only the fields read here are named and anything else it holds
 * is carried through to the node's jsonContent as-is.
 */
type SkillFrontMatter = {
  name?: string
  [key: string]: unknown
}

// Models
const sourceNodeModel = new SourceNodeModel()

// Class
export class LoadExternalSkillsService {

  // Consts
  clName = 'LoadExternalSkillsService'

  // Code
  async loadFromPath(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadFromPath()`

    // console.log(`${fnName}: loadPath: ${loadPath}`)

    // Validate
    if (projectId == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'projectId == null'
      })
    }

    if (loadPath == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'loadPath == null'
      })
    }

    // Walk dir for md files
    const mdFiles: string[] = []

    await walkDir(
            loadPath,
            mdFiles,
            {
              recursive: true,
              fileExts: ['.md']
            })

    // Debug
    // console.log(`${fnName}: mdFiles: ` + JSON.stringify(mdFiles))

    // Load each file
    for (const mdFile of mdFiles) {

      await this.loadSkillMdFile(
              store,
              projectId,
              extensionNode,
              mdFile)
    }
  }

  async loadSkillMdFile(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          fullPath: string) {

    // Output
    console.log(`loading: ${fullPath}..`)

    // Read the file
    const skillMdContents = fs.readFileSync(fullPath, 'utf-8')

    // Split out the YAML front-matter and the remaining markdown
    const { yaml, markdown } = this.splitFrontMatter(skillMdContents)

    // Validate
    if (yaml == null) {
      console.error(`Error: YAML not found`)
      return
    }

    if (markdown == null) {
      console.error(`Error: markdown not found`)
      return
    }

    // Process the YAML front-matter
    const frontMatter = YAML.parse(yaml)

    // Save the skill
    await this.saveSkill(
            store,
            projectId,
            extensionNode,
            frontMatter,
            markdown,
            fullPath)
  }

  async saveSkill(
          store: ProjectStore,
          projectId: string,
          extensionNode: SourceNodeRecord,
          frontMatter: SkillFrontMatter | null,
          markdown: string,
          fullPath: string) {

    // Debug
    const fnName = `${this.clName}.saveSkill()`

    // Validate
    if (frontMatter == null) {
      throw new IntentError({
        category: 'ValidationError',
        stage: fnName,
        message: 'frontMatter == null'
      })
    }

    if (frontMatter.name == null) {
      console.error(`name field is missing from YAML front-matter`)
    }

    // Get contentHash
    let markdownHash: string | null = null

    if (markdown != null) {

      // Blake3 hash
      markdownHash = blake3(markdown).toString()
    }

    // The path the skill was loaded from, kept so a session can be handed the
    // skill as a file rather than as text. The engine is what decides which
    // skills apply; the session is only told where to read the ones that do.
    const jsonContent = {
      ...frontMatter,
      filePath: fullPath
    }

    const jsonContentHash = blake3(JSON.stringify(jsonContent)).toString()

    // Upsert skill node
    await
            sourceNodeModel.upsert(
              store,
              undefined,         // id
              extensionNode.id,  // parentId
              projectId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.skillType,
              frontMatter.name,  // name
              markdown,          // content
              markdownHash,      // contentHash
              jsonContent,       // jsonContent
              jsonContentHash,   // jsonContentHash
              new Date())        // contentUpdated
  }

  splitFrontMatter(contents: string) {

    // Match YAML front-matter at the very start
    const match = contents.match(/^---\n([\s\S]*?)\n---\n?/)

    if (!match) {
      // No front-matter found
      return { yaml: null, markdown: contents }
    }

    const yaml = match[1] // The YAML part
    const markdown = contents.slice(match[0].length)

    return { yaml, markdown }
  }
}
