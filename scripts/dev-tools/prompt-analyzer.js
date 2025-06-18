#!/usr/bin/env node

/**
 * プロンプト分析ツール
 * 
 * Chain of Thoughtプロンプトの品質を分析し、改善提案を行う
 * 
 * 使い方:
 * - node scripts/dev-tools/prompt-analyzer.js <file>     # 単一ファイル分析
 * - node scripts/dev-tools/prompt-analyzer.js --all      # 全プロンプト分析
 * - node scripts/dev-tools/prompt-analyzer.js --watch    # リアルタイム監視
 */

const fs = require('fs').promises
const path = require('path')

class PromptAnalyzer {
  constructor() {
    this.promptsDir = path.join(process.cwd(), 'lib', 'prompts')
    
    // Chain of Thoughtアンチパターン
    this.antiPatterns = {
      // ガイドセクションでの変数使用
      guideVariables: [
        {
          pattern: /[A-D]：[^\n]+\${[^}]+}/g,
          message: 'ガイドセクション内で変数を使用。「視点」が「検索条件」になってしまう',
          severity: 'high',
          category: 'ガイド変数',
          check: (match, fullContent) => {
            // 最初のコンテキスト設定は除外
            const contextSetupPattern = /【\${[^}]+}】について【\${[^}]+}】において【\${[^}]+}】/
            return !contextSetupPattern.test(match)
          }
        },
        {
          pattern: /[\-・]\s*[^\n]*\${theme_part[12]}/g,
          message: '分割されたテーマ変数の使用。theme変数は分割すべきでない',
          severity: 'critical',
          category: 'テーマ分割'
        },
        {
          pattern: /([^\n]+(?:探す|検索|収集)[^\n]+)\${[^}]+}/g,
          message: '「探す」「検索」と変数の組み合わせ。具体的な検索条件になってしまう',
          severity: 'high',
          category: '検索条件化'
        }
      ],
      // 創造性を制限するパターン
      creativity: [
        {
          pattern: /以下から(1つ|一つ)選んで/g,
          message: '選択を固定化している。「参考に」「組み合わせて」を推奨',
          severity: 'high',
          category: '創造性制限'
        },
        {
          pattern: /必ず.*してください/g,
          message: '強制的な指示。LLMの創造性を制限する可能性',
          severity: 'medium',
          category: '創造性制限'
        },
        {
          pattern: /テンプレート(に従って|通りに)/g,
          message: 'テンプレート化はChain of Thoughtの本質に反する',
          severity: 'high',
          category: '創造性制限'
        }
      ],
      
      // 曖昧な表現
      ambiguity: [
        {
          pattern: /方向性/g,
          message: '「方向性」は曖昧。具体的な指示に変更を推奨',
          severity: 'medium',
          category: '曖昧表現'
        },
        {
          pattern: /主な/g,
          message: '「主な」は曖昧。「具体的な」「詳細な」を推奨',
          severity: 'low',
          category: '曖昧表現'
        },
        {
          pattern: /適切な/g,
          message: '「適切な」は主観的。具体的な基準を示すべき',
          severity: 'low',
          category: '曖昧表現'
        }
      ],
      
      // 誤解を生むパターン
      misleading: [
        {
          pattern: /\/\/.*$/gm,
          message: 'コメントアウトもLLMは指示として解釈する',
          severity: 'high',
          category: '誤解パターン'
        },
        {
          pattern: /\/\*[\s\S]*?\*\//g,
          message: 'ブロックコメントもLLMは指示として解釈する',
          severity: 'high',
          category: '誤解パターン'
        },
        {
          pattern: /例：.*$/gm,
          message: '具体例はLLMが制約として解釈する可能性',
          severity: 'medium',
          category: '誤解パターン'
        }
      ],
      
      // フィールド名の問題
      fieldNames: [
        {
          pattern: /"(main|content|data|info|item|value)":/g,
          message: '曖昧なフィールド名。より具体的な名前を推奨',
          severity: 'medium',
          category: 'フィールド名'
        },
        {
          pattern: /"[a-z]{1,4}":/g,
          message: '短すぎるフィールド名。LLMが意図を理解しにくい',
          severity: 'low',
          category: 'フィールド名'
        }
      ]
    }
    
    // 良いパターン
    this.goodPatterns = {
      creativity: [
        { pattern: /参考に/g, score: 5, reason: 'LLMに選択の自由を与える' },
        { pattern: /組み合わせ/g, score: 5, reason: '創造的な組み合わせを促す' },
        { pattern: /なぜ.*か/g, score: 10, reason: '理由の説明を氚める' },
        { pattern: /どのような/g, score: 5, reason: '開かれた質問' },
        { pattern: /視点で/g, score: 5, reason: '多角的な視点を促す' },
        { pattern: /【\${[^}]+}】について【\${[^}]+}】において/g, score: 10, reason: '適切なコンテキスト設定' }
      ],
      specificity: [
        { pattern: /具体的/g, score: 10, reason: '明確な指示' },
        { pattern: /詳細/g, score: 5, reason: '詳しい情報を求める' },
        { pattern: /ステップ/g, score: 5, reason: '段階的な思考を促す' }
      ],
      structure: [
        { pattern: /\${[^}]+}/g, score: 5, reason: '変数展開の使用' },
        { pattern: /```json/g, score: 10, reason: '構造化された出力' }
      ]
    }
  }

  /**
   * ファイルを分析
   */
  async analyzeFile(filename) {
    const filepath = filename.startsWith('/') ? filename : path.join(this.promptsDir, filename)
    
    try {
      const content = await fs.readFile(filepath, 'utf-8')
      const analysis = await this.analyze(content, filename)
      
      this.displayResults(analysis)
      
      return analysis
    } catch (error) {
      console.error(`❌ ファイルを読み込めません: ${filename}`)
      return null
    }
  }

  /**
   * 全プロンプトを分析
   */
  async analyzeAll() {
    const results = []
    const providers = ['perplexity', 'gpt', 'claude']
    
    for (const provider of providers) {
      const providerDir = path.join(this.promptsDir, provider)
      
      try {
        const files = await fs.readdir(providerDir)
        
        for (const file of files) {
          if (file.endsWith('.txt')) {
            const filepath = path.join(providerDir, file)
            const content = await fs.readFile(filepath, 'utf-8')
            const analysis = await this.analyze(content, `${provider}/${file}`)
            results.push(analysis)
          }
        }
      } catch (error) {
        // ディレクトリがない場合は無視
      }
    }
    
    this.displaySummary(results)
    return results
  }

  /**
   * プロンプトを分析
   */
  async analyze(content, filename) {
    const result = {
      filename,
      scores: {
        creativity: 50,    // 基準値50点
        specificity: 50,
        structure: 50,
        overall: 50
      },
      issues: [],
      warnings: [],
      suggestions: [],
      stats: {
        lines: content.split('\n').length,
        characters: content.length,
        variables: 0,
        jsonBlocks: 0
      }
    }

    // アンチパターンチェック
    for (const [category, patterns] of Object.entries(this.antiPatterns)) {
      for (const { pattern, message, severity, category: cat, check } of patterns) {
        const matches = [...content.matchAll(pattern)]
        const validMatches = check ? matches.filter(m => check(m[0], content)) : matches
        
        if (validMatches.length > 0) {
          const issue = {
            category: cat,
            severity,
            message,
            count: validMatches.length,
            examples: validMatches.slice(0, 2).map(m => m[0])
          }
          
          if (severity === 'critical') {
            result.issues.push(issue)
            result.scores.creativity -= 20
          } else if (severity === 'high') {
            result.issues.push(issue)
            result.scores.creativity -= 15
          } else {
            result.warnings.push(issue)
            result.scores.creativity -= 5
          }
        }
      }
    }

    // 良いパターンチェック
    for (const [category, patterns] of Object.entries(this.goodPatterns)) {
      for (const { pattern, score, reason } of patterns) {
        const matches = content.match(pattern)
        if (matches) {
          result.scores[category] = Math.min(100, result.scores[category] + score * matches.length)
          result.suggestions.push({
            category,
            pattern: pattern.source,
            reason,
            count: matches.length
          })
        }
      }
    }

    // 統計情報
    result.stats.variables = (content.match(/\${[^}]+}/g) || []).length
    result.stats.jsonBlocks = (content.match(/```json/g) || []).length

    // JSON内の具体例チェック
    const jsonMatches = content.matchAll(/```json([\s\S]*?)```/g)
    for (const match of jsonMatches) {
      const jsonContent = match[1]
      
      // 具体的な値が含まれているかチェック
      if (jsonContent.match(/"[^"]+"\s*:\s*"[^"\s]+"/)) {
        result.warnings.push({
          category: 'JSON例示',
          severity: 'medium',
          message: 'JSON例に具体的な値が含まれている。LLMが制約として解釈する可能性',
          count: 1
        })
        result.scores.creativity -= 10
      }
    }

    // 総合スコア計算
    result.scores.overall = Math.round(
      (result.scores.creativity + result.scores.specificity + result.scores.structure) / 3
    )

    // 改善提案の生成
    this.generateSuggestions(result)

    return result
  }

  /**
   * 改善提案を生成
   */
  generateSuggestions(result) {
    // 創造性が低い場合
    if (result.scores.creativity < 60) {
      result.suggestions.push({
        type: 'improvement',
        priority: 'high',
        message: '創造性を高めるため、「参考に」「組み合わせて」などの表現を使用してください'
      })
    }

    // 曖昧表現が多い場合
    const ambiguityCount = result.warnings.filter(w => w.category === '曖昧表現').length
    if (ambiguityCount > 2) {
      result.suggestions.push({
        type: 'improvement',
        priority: 'medium',
        message: '曖昧な表現を具体的な指示に置き換えてください'
      })
    }

    // 変数が使われていない場合
    if (result.stats.variables === 0) {
      result.suggestions.push({
        type: 'improvement',
        priority: 'low',
        message: '変数展開（${variable}）を使用して、動的なプロンプトにすることを推奨'
      })
    }

    // ガイドセクションでの変数使用
    const guideVarIssues = result.issues.filter(i => i.category === 'ガイド変数' || i.category === 'テーマ分割')
    if (guideVarIssues.length > 0) {
      result.suggestions.push({
        type: 'improvement',
        priority: 'critical',
        message: 'ガイドセクションから変数を除去し、「視点」として表現してください。変数は最初のコンテキスト設定部分のみで使用。'
      })
    }
  }

  /**
   * 結果を表示
   */
  displayResults(analysis) {
    console.log('\n' + '='.repeat(80))
    console.log(`📄 ${analysis.filename}`)
    console.log('='.repeat(80))

    // スコア表示
    console.log('\n📊 スコア:')
    console.log(`  創造性:   ${this.getScoreBar(analysis.scores.creativity)}`)
    console.log(`  具体性:   ${this.getScoreBar(analysis.scores.specificity)}`)
    console.log(`  構造:     ${this.getScoreBar(analysis.scores.structure)}`)
    console.log(`  総合:     ${this.getScoreBar(analysis.scores.overall)}`)

    // 統計情報
    console.log('\n📈 統計:')
    console.log(`  行数: ${analysis.stats.lines} | 文字数: ${analysis.stats.characters}`)
    console.log(`  変数: ${analysis.stats.variables} | JSONブロック: ${analysis.stats.jsonBlocks}`)

    // 重大な問題
    if (analysis.issues.length > 0) {
      console.log('\n❌ 重大な問題:')
      for (const issue of analysis.issues) {
        console.log(`  [${issue.category}] ${issue.message}`)
        if (issue.examples) {
          console.log(`    例: "${issue.examples[0]}"`)
        }
      }
    }

    // 警告
    if (analysis.warnings.length > 0) {
      console.log('\n⚠️  警告:')
      for (const warning of analysis.warnings.slice(0, 5)) {
        console.log(`  [${warning.category}] ${warning.message}`)
      }
      if (analysis.warnings.length > 5) {
        console.log(`  ... 他 ${analysis.warnings.length - 5} 件`)
      }
    }

    // 改善提案
    const improvements = analysis.suggestions.filter(s => s.type === 'improvement')
    if (improvements.length > 0) {
      console.log('\n💡 改善提案:')
      for (const suggestion of improvements) {
        console.log(`  [${suggestion.priority}] ${suggestion.message}`)
      }
    }

    // 良い点
    const goodPoints = analysis.suggestions.filter(s => s.reason)
    if (goodPoints.length > 0) {
      console.log('\n✅ 良い点:')
      for (const point of goodPoints.slice(0, 3)) {
        console.log(`  ${point.reason} (${point.count}回使用)`)
      }
    }
  }

  /**
   * サマリーを表示
   */
  displaySummary(results) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 全体サマリー')
    console.log('='.repeat(80))

    // プロバイダー別の平均スコア
    const providers = {}
    for (const result of results) {
      const provider = result.filename.split('/')[0]
      if (!providers[provider]) {
        providers[provider] = { count: 0, totalScore: 0 }
      }
      providers[provider].count++
      providers[provider].totalScore += result.scores.overall
    }

    console.log('\n📈 プロバイダー別平均スコア:')
    for (const [provider, data] of Object.entries(providers)) {
      const avg = Math.round(data.totalScore / data.count)
      console.log(`  ${provider}: ${this.getScoreBar(avg)}`)
    }

    // 共通の問題点
    const allIssues = results.flatMap(r => r.issues)
    const issueCategories = {}
    for (const issue of allIssues) {
      issueCategories[issue.category] = (issueCategories[issue.category] || 0) + 1
    }

    if (Object.keys(issueCategories).length > 0) {
      console.log('\n❌ 共通の問題点:')
      for (const [category, count] of Object.entries(issueCategories)) {
        console.log(`  ${category}: ${count}件`)
      }
    }

    // 全体的な推奨事項
    const avgOverall = Math.round(
      results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length
    )

    console.log('\n💡 全体的な推奨事項:')
    if (avgOverall < 60) {
      console.log('  1. Chain of Thought原則の理解を深める')
      console.log('  2. 曖昧な表現を具体的に置き換える')
      console.log('  3. LLMの創造性を活かす表現を使用')
    } else if (avgOverall < 80) {
      console.log('  1. 細かい改善点に対応')
      console.log('  2. A/Bテストで効果を検証')
      console.log('  3. 成功パターンを他のプロンプトに展開')
    } else {
      console.log('  ✨ 優れたプロンプト品質です！')
      console.log('  継続的な改善とテストを推奨')
    }
  }

  getScoreBar(score) {
    const filled = Math.round(score / 10)
    const empty = 10 - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    const color = score >= 80 ? '\x1b[32m' : score >= 60 ? '\x1b[33m' : '\x1b[31m'
    return `${color}${bar}\x1b[0m ${score}/100`
  }
}

// メイン実行
async function main() {
  const [,, ...args] = process.argv
  const analyzer = new PromptAnalyzer()

  if (args.length === 0) {
    console.log(`
🔍 プロンプト分析ツール

使い方:
  node scripts/dev-tools/prompt-analyzer.js <file>     # 単一ファイル分析
  node scripts/dev-tools/prompt-analyzer.js --all      # 全プロンプト分析
  node scripts/dev-tools/prompt-analyzer.js --watch    # リアルタイム監視（未実装）

例:
  node scripts/dev-tools/prompt-analyzer.js perplexity/collect-topics.txt
  node scripts/dev-tools/prompt-analyzer.js --all

Chain of Thought原則に基づいた分析を行います。
    `)
    return
  }

  if (args[0] === '--all') {
    await analyzer.analyzeAll()
  } else if (args[0] === '--watch') {
    console.log('⚠️  リアルタイム監視機能は開発中です')
  } else {
    await analyzer.analyzeFile(args[0])
  }
}

main().catch(console.error)