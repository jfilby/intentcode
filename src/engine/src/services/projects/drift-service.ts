/**
 * Drift between what a project intends and what it has.
 *
 * A session writes the source itself, with its own tools, and the graph is
 * left describing what was there before. That makes the graph a record rather
 * than an oracle, and the gap between the two is worth naming: an Intent that
 * has changed since the source beside it was written, or a source file that
 * has been edited on disk without the engine knowing.
 *
 * Neither is repaired here. The engine reports what has drifted and stops; what
 * to do about it is the session's decision, and a service that quietly rewrote
 * a file would be making that decision on its behalf.
 */

import { blake3 } from '@noble/hashes/blake3'
import fs from 'fs'
import { join } from 'node:path'
import type { ProjectStore } from '@/core/store.js'
import type { SourceNodeRecord } from '@/core/records.js'
import { IntentError } from '@/core/errors.js'
import { walkDir } from '@/core/walk-dir.js'
import { BuildData } from '@/types/build-types.js'
import { ServerOnlyTypes } from '@/types/server-only-types.js'
import { IntentCodeFilenameService } from '../utils/filename-service.js'
import { ProjectsQueryService } from './query-service.js'
import { SourceRecordService } from './source-record-service.js'

/** What the engine found out about one file. */
export interface DriftFinding {

  /** The Intent file, relative to the project's IntentCode directory. */
  intentRelativePath: string

  /** The source file the Intent names, relative to the project root. */
  sourceRelativePath: string

  /** Why it drifted. */
  kind: DriftKinds

  /** What is wrong, in a form a person can read. */
  detail: string
}

export enum DriftKinds {

  /** The source is not on disk, or the engine has never recorded it. */
  missingSource = 'missing source',

  /** The Intent has changed since the source was written. */
  staleSource = 'stale source',

  /** The source on disk has changed since the engine recorded it. */
  editedSource = 'edited source'
}

// Services
const filenameService = new IntentCodeFilenameService()
const projectsQueryService = new ProjectsQueryService()
const sourceRecordService = new SourceRecordService()

// Class
export class DriftService {

  // Consts
  clName = 'DriftService'

  /**
   * Every Intent file in the project whose source is missing, stale, or has
   * been edited behind the engine's back.
   *
   * The Intent files are read from disk rather than from the graph: the graph
   * records what the engine last saw, and the question here is what the
   * project holds now.
   */
  async getDrift(
          store: ProjectStore,
          buildData: BuildData,
          projectNode: SourceNodeRecord): Promise<DriftFinding[]> {

    const projectDetails =
      projectsQueryService.getProjectDetailsByProjectId(
        projectNode.projectId,
        buildData.projects)

    const sourceRoot =
      this.getPath(projectDetails.projectSourceNode.jsonContent)

    if (sourceRoot == null) {
      throw new IntentError({
        category: 'ProjectError',
        stage: `${this.clName}.getDrift()`,
        message: 'the project source node has no path',
        detail: 'the project is not set up, so there is nothing to ' +
                'compare its Intent against'
      })
    }

    const intentCodePath =
      this.getPath(projectDetails.projectIntentCodeNode.jsonContent)

    if (intentCodePath == null) {
      throw new IntentError({
        category: 'ProjectError',
        stage: `${this.clName}.getDrift()`,
        message: 'the project IntentCode node has no path'
      })
    }

    // What the engine recorded of each source file, keyed by its path
    const records = await sourceRecordService.getRecords(store, projectNode)

    // The Intent files, which are what should exist
    const intentFilenames: string[] = []

    await walkDir(
      intentCodePath,
      intentFilenames,
      { recursive: true, fileExts: [ServerOnlyTypes.dotMdFileExt] })

    const findings: DriftFinding[] = []

    for (const intentFilename of intentFilenames) {

      const intentRelativePath =
        intentFilename.slice(intentCodePath.length + 1)

      // An Intent file named for no target extension is not asking for source
      if (filenameService.getTargetFileExt(intentRelativePath) == null) {
        continue
      }

      // The source this Intent names: the same path without the .md
      const sourceRelativePath =
        intentRelativePath.slice(
          0,
          intentRelativePath.length - ServerOnlyTypes.dotMdFileExt.length)

      const finding = this.getFinding(
        store,
        records[sourceRelativePath],
        intentFilename,
        intentRelativePath,
        sourceRelativePath,
        join(sourceRoot, sourceRelativePath))

      if (finding != null) findings.push(finding)
    }

    // Return
    return findings
  }

  /**
   * One Intent file's finding, or null when it is in step with its source.
   * A file the engine has never recorded is reported as missing rather than
   * passing: a record is the only thing that says the two were ever in step.
   */
  private getFinding(
            store: ProjectStore,
            record: { intentContentHash: string, contentHash: string } | undefined,
            intentFilename: string,
            intentRelativePath: string,
            sourceRelativePath: string,
            sourceFullPath: string): DriftFinding | null {

    // Never written, as far as the engine knows
    if (record == null) {

      return {
        intentRelativePath,
        sourceRelativePath,
        kind: DriftKinds.missingSource,
        detail: `the engine has no record of a source at ` +
                `${sourceFullPath}`
      }
    }

    // The Intent has moved on since the source was written
    const intentHash = this.hashContent(
      fs.readFileSync(intentFilename, { encoding: 'utf8' }))

    if (record.intentContentHash !== intentHash) {

      return {
        intentRelativePath,
        sourceRelativePath,
        kind: DriftKinds.staleSource,
        detail: `the Intent changed after the source was last written`
      }
    }

    // The file on disk has moved on since the engine recorded it
    const onDisk = this.readSource(sourceFullPath)

    if (onDisk == null) {

      return {
        intentRelativePath,
        sourceRelativePath,
        kind: DriftKinds.missingSource,
        detail: `no source at ${sourceFullPath}`
      }
    }

    if (record.contentHash !== this.hashContent(onDisk)) {

      return {
        intentRelativePath,
        sourceRelativePath,
        kind: DriftKinds.editedSource,
        detail: `the source was edited since the engine recorded it`
      }
    }

    // In step
    return null
  }

  private readSource(sourceFullPath: string): string | null {

    try {
      return fs.readFileSync(sourceFullPath, { encoding: 'utf8' })
    } catch {
      return null
    }
  }

  /** The hash the engine records content under, so the two are comparable. */
  private hashContent(content: string) {
    return blake3(JSON.stringify(content)).toString()
  }

  private getPath(jsonContent: unknown): string | undefined {

    if (jsonContent == null ||
        typeof jsonContent !== 'object' ||
        !('path' in jsonContent) ||
        typeof jsonContent.path !== 'string') {

      return undefined
    }

    return jsonContent.path
  }
}
