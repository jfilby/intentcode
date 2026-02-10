const fs = require('fs')
import YAML from 'yaml'
import { blake3 } from '@noble/hashes/blake3'
import { PrismaClient } from '@prisma/client'
import { CustomError } from '@/serene-core-server/types/errors'
import { WalkDirService } from '@/serene-core-server/services/files/walk-dir-service'
import { BaseDataTypes } from '@/types/base-data-types'
import { SourceNodeModel } from '@/models/source-graph/source-node-model'
import { SourceNodeTypes } from '@/types/source-graph-types'

// Models
const sourceNodeModel = new SourceNodeModel()

// Services
const walkDirService = new WalkDirService()

// Class
export class LoadExternalSkillsService {

  // Consts
  clName = 'LoadExternalSkillsService'

  // Code
  async loadFromPath(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: any,
          loadPath: string) {

    // Debug
    const fnName = `${this.clName}.loadFromPath()`

    // console.log(`${fnName}: loadPath: ${loadPath}`)

    // Validate
    if (instanceId == null) {
      throw new CustomError(`${fnName}: instanceId == null`)
    }

    if (loadPath == null) {
      throw new CustomError(`${fnName}: loadPath == null`)
    }

    // Walk dir for md files
    var mdFiles: string[] = []

    await walkDirService.walkDir(
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
              prisma,
              instanceId,
              extensionNode,
              mdFile)
    }
  }

  async loadSkillMdFile(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: any,
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
            prisma,
            instanceId,
            extensionNode,
            frontMatter,
            markdown)
  }

  async saveSkill(
          prisma: PrismaClient,
          instanceId: string,
          extensionNode: any,
          frontMatter: any,
          markdown: string) {

    // Debug
    const fnName = `${this.clName}.saveSkill()`

    // Validate
    if (frontMatter == null) {
      throw new CustomError(`${fnName}: frontMatter == null`)
    }

    if (frontMatter.name == null) {
      console.error(`name field is missing from YAML front-matter`)
    }

    // Get contentHash
    var markdownHash: string | null = null

    if (markdown != null) {

      // Blake3 hash
      markdownHash = blake3(markdown).toString()
    }

    // Get jsonContentHash
    var frontMatterHash: string | null = null

    if (frontMatter != null) {

      // Blake3 hash
      frontMatterHash = blake3(JSON.stringify(frontMatter)).toString()
    }

    // Upsert skill node
    const skillNode = await
            sourceNodeModel.upsert(
              prisma,
              undefined,         // id
              extensionNode.id,  // parentId
              instanceId,
              BaseDataTypes.activeStatus,
              SourceNodeTypes.skillType,
              frontMatter.name,  // name
              markdown,          // contentHash
              markdownHash,      // contentHash
              frontMatter,       // jsonContent
              frontMatterHash,   // jsonContentHash
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
