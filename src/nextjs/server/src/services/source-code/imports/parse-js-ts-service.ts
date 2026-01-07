import ts from 'typescript'
import fs from 'node:fs'

export type ImportInfo = {
  specifier: string
  kind: 'import' | 'dynamic-import' | 'require'
  line: number
  character: number
}

export class ParseJsTsImportsService {

  parseImports(filePath: string): ImportInfo[] {

    const sourceText = fs.readFileSync(filePath, 'utf8')

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.ts') || filePath.endsWith('.tsx')
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS
    )

    const imports: ImportInfo[] = []

    function visit(node: ts.Node) {
      /** import ... from 'x' */
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier.getText(sourceFile).slice(1, -1)
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(node.getStart())

        imports.push({
          specifier,
          kind: 'import',
          line: line + 1,
          character: character + 1
        })
      }

      /** import('x') */
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(node.getStart())

        imports.push({
          specifier,
          kind: 'dynamic-import',
          line: line + 1,
          character: character + 1
        })
      }

      /** require('x') */
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text
        const { line, character } =
          sourceFile.getLineAndCharacterOfPosition(node.getStart())

        imports.push({
          specifier,
          kind: 'require',
          line: line + 1,
          character: character + 1
        })
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    return imports
  }
}
