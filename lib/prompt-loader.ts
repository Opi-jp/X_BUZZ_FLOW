import fs from 'fs'
import path from 'path'

export interface PromptVariables {
  [key: string]: string | number | boolean | undefined
}

/**
 * プロンプトテンプレートを読み込んで変数を展開する
 * @param promptPath - プロンプトファイルのパス（lib/prompts/からの相対パス）
 * @param variables - テンプレート内の変数を置換するための値
 * @returns 変数が展開されたプロンプト文字列
 */
export function loadPrompt(promptPath: string, variables: PromptVariables = {}): string {
  try {
    // プロンプトファイルの絶対パスを構築
    const absolutePath = path.join(process.cwd(), 'lib', 'prompts', promptPath)
    
    // ファイルを読み込む
    let prompt = fs.readFileSync(absolutePath, 'utf-8')
    
    // 変数を展開する
    Object.entries(variables).forEach(([key, value]) => {
      // ${key} 形式の変数を置換
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      prompt = prompt.replace(regex, String(value ?? ''))
    })
    
    return prompt.trim()
  } catch (error) {
    console.error(`Failed to load prompt from ${promptPath}:`, error)
    throw new Error(`Prompt loading failed: ${promptPath}`)
  }
}

/**
 * プロンプトのメタデータを取得する
 * @param promptPath - プロンプトファイルのパス
 * @returns プロンプトの統計情報
 */
export function getPromptMetadata(promptPath: string) {
  const prompt = loadPrompt(promptPath)
  const variables = Array.from(prompt.matchAll(/\$\{(\w+)\}/g)).map(match => match[1])
  const uniqueVariables = [...new Set(variables)]
  
  return {
    length: prompt.length,
    lines: prompt.split('\n').length,
    variables: uniqueVariables,
    variableCount: uniqueVariables.length
  }
}

/**
 * 複数のプロンプトセクションを結合する
 * @param sections - プロンプトセクションの配列
 * @param separator - セクション間の区切り文字（デフォルト: "\n\n"）
 * @returns 結合されたプロンプト
 */
export function combinePromptSections(sections: string[], separator: string = '\n\n'): string {
  return sections.filter(section => section.trim()).join(separator)
}

/**
 * 開発環境でのプロンプトのホットリロード対応
 * ファイルシステムの変更を検知して最新のプロンプトを返す
 */
export class PromptLoader {
  private cache: Map<string, { content: string; timestamp: number }> = new Map()
  private cacheDuration: number = 5000 // 5秒間キャッシュ

  constructor(cacheDuration?: number) {
    if (cacheDuration !== undefined) {
      this.cacheDuration = cacheDuration
    }
  }

  load(promptPath: string, variables: PromptVariables = {}): string {
    const now = Date.now()
    const cached = this.cache.get(promptPath)
    
    // キャッシュが有効な場合はそれを使用
    if (cached && (now - cached.timestamp) < this.cacheDuration) {
      return this.expandVariables(cached.content, variables)
    }
    
    // 新しくロード
    const content = loadPrompt(promptPath)
    this.cache.set(promptPath, { content, timestamp: now })
    
    return this.expandVariables(content, variables)
  }

  private expandVariables(template: string, variables: PromptVariables): string {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      result = result.replace(regex, String(value ?? ''))
    })
    return result
  }

  clearCache(): void {
    this.cache.clear()
  }
}

// デフォルトのローダーインスタンス
export const promptLoader = new PromptLoader()