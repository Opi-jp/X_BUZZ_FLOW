/**
 * プロンプト影響範囲分析
 * 
 * プロンプトファイルがどこで使用されているかを分析し、
 * 変更による影響範囲を特定する
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')
const { PrismaClient } = require('../../../lib/generated/prisma')

class PromptImpactAnalyzer {
  constructor() {
    this.projectRoot = process.cwd()
    this.promptsDir = path.join(this.projectRoot, 'lib', 'prompts')
    this.searchPatterns = [
      'app/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'api/**/*.{ts,tsx,js,jsx}',
      'scripts/**/*.{js,ts}'
    ]
    this.prisma = null
  }

  /**
   * プロンプトファイルの使用箇所を検索
   */
  async findUsages(promptFile) {
    const usages = []
    
    // プロンプトファイル名のバリエーションを作成
    const filename = path.basename(promptFile, '.txt')
    const searchTerms = [
      filename,
      filename.replace(/-/g, '_'),
      filename.replace(/_/g, '-'),
      `prompts/${promptFile}`,
      `prompts/${path.dirname(promptFile)}/${path.basename(promptFile)}`
    ]
    
    // 各パターンでファイルを検索
    for (const pattern of this.searchPatterns) {
      const files = await glob(pattern, { 
        cwd: this.projectRoot,
        ignore: ['node_modules/**', '.next/**', 'dist/**']
      })
      
      for (const file of files) {
        const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8')
        
        for (const term of searchTerms) {
          if (content.includes(term)) {
            const usage = await this.analyzeUsage(file, content, term)
            if (usage) {
              usages.push(usage)
            }
          }
        }
      }
    }
    
    return this.deduplicateUsages(usages)
  }

  /**
   * 使用箇所の詳細を分析
   */
  async analyzeUsage(file, content, searchTerm) {
    const lines = content.split('\n')
    const usageLines = []
    
    lines.forEach((line, index) => {
      if (line.includes(searchTerm)) {
        usageLines.push({
          lineNumber: index + 1,
          line: line.trim(),
          context: this.getContext(lines, index)
        })
      }
    })
    
    if (usageLines.length === 0) return null
    
    return {
      file,
      component: this.extractComponentName(file, content),
      usageType: this.detectUsageType(content, searchTerm),
      usages: usageLines,
      apiEndpoint: this.extractApiEndpoint(file, content)
    }
  }

  /**
   * コンポーネント名を抽出
   */
  extractComponentName(file, content) {
    // React コンポーネントの場合
    const componentMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+|function\s+|const\s+)(\w+)/)
    if (componentMatch) {
      return componentMatch[1]
    }
    
    // APIルートの場合
    if (file.includes('/api/')) {
      return `API: ${file.replace(/.*\/api\//, '/api/')}`
    }
    
    return path.basename(file, path.extname(file))
  }

  /**
   * 使用タイプを検出
   */
  detectUsageType(content, searchTerm) {
    const line = content.split('\n').find(l => l.includes(searchTerm))
    
    if (line.includes('import') || line.includes('require')) {
      return 'import'
    } else if (line.includes('readFile') || line.includes('fs.')) {
      return 'file-read'
    } else if (line.includes('prompt') || line.includes('template')) {
      return 'template'
    } else {
      return 'reference'
    }
  }

  /**
   * APIエンドポイントを抽出
   */
  extractApiEndpoint(file, content) {
    if (!file.includes('/api/')) return null
    
    // Next.js API route pattern
    const endpoint = file
      .replace(/.*\/api\//, '/api/')
      .replace(/\.(ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1')
    
    return endpoint
  }

  /**
   * コンテキストを取得
   */
  getContext(lines, index, contextSize = 2) {
    const start = Math.max(0, index - contextSize)
    const end = Math.min(lines.length, index + contextSize + 1)
    
    return lines.slice(start, end).map((line, i) => ({
      lineNumber: start + i + 1,
      line: line.trim(),
      isTarget: start + i === index
    }))
  }

  /**
   * 重複を削除
   */
  deduplicateUsages(usages) {
    const seen = new Set()
    return usages.filter(usage => {
      const key = `${usage.file}:${usage.component}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * 影響範囲レポートを生成
   */
  async generateImpactReport(promptFile) {
    const usages = await this.findUsages(promptFile)
    const dbImpact = await this.analyzeDbImpact(promptFile)
    
    const report = {
      promptFile,
      totalUsages: usages.length,
      affectedComponents: [],
      affectedAPIs: [],
      affectedDB: dbImpact,
      summary: {
        components: 0,
        apis: 0,
        scripts: 0,
        dbTables: dbImpact.tables.length,
        dbFields: dbImpact.fields.length
      }
    }
    
    for (const usage of usages) {
      if (usage.apiEndpoint) {
        report.affectedAPIs.push({
          endpoint: usage.apiEndpoint,
          file: usage.file,
          usageType: usage.usageType
        })
        report.summary.apis++
      } else if (usage.file.includes('/app/')) {
        report.affectedComponents.push({
          component: usage.component,
          file: usage.file,
          usageType: usage.usageType
        })
        report.summary.components++
      } else {
        report.summary.scripts++
      }
    }
    
    return report
  }

  /**
   * 依存関係グラフを生成
   */
  async generateDependencyGraph() {
    const promptFiles = await this.getAllPromptFiles()
    const graph = {}
    
    for (const promptFile of promptFiles) {
      const relativePath = path.relative(this.promptsDir, promptFile)
      const usages = await this.findUsages(relativePath)
      
      graph[relativePath] = {
        usedBy: usages.map(u => ({
          file: u.file,
          component: u.component,
          type: u.usageType
        }))
      }
    }
    
    return graph
  }

  /**
   * すべてのプロンプトファイルを取得
   */
  async getAllPromptFiles() {
    const files = await glob('**/*.txt', {
      cwd: this.promptsDir,
      absolute: true
    })
    
    return files
  }

  /**
   * DB影響を分析
   */
  async analyzeDbImpact(promptFile) {
    const impact = {
      tables: [],
      fields: [],
      warnings: [],
      codeUsage: []  // コードでの使用状況
    }
    
    // プロンプトタイプに基づいてDB影響を判定
    const filename = path.basename(promptFile, '.txt')
    
    // Perplexity（collect-topics）の場合
    if (filename.includes('collect-topics')) {
      impact.tables.push('ViralSession', 'SessionActivityLog')
      impact.fields.push(
        'ViralSession.topics',  // JSON型でトピック情報を格納
        'ViralSession.status',
        'SessionActivityLog.details'
      )
      impact.warnings.push('topicsはJSON型 - トピック情報（TOPIC, title, source, url, date, summary, keyPoints, perplexityAnalysis）を含む')
      impact.warnings.push('summaryは350-450文字、perplexityAnalysisは150-250文字の制限あり')
      
      // コードでの使用状況を追加
      impact.codeUsage.push({
        location: '/api/generation/content/sessions/[id]/collect-topics/route.ts',
        usage: 'topicsフィールドにトピック配列として保存'
      })
    }
    
    // GPT（generate-concepts）の場合
    else if (filename.includes('generate-concepts')) {
      impact.tables.push('ViralSession', 'ViralDraftV2')
      impact.fields.push(
        'ViralSession.concepts',  // JSON型でコンセプト情報を格納
        'ViralDraftV2.conceptId',
        'ViralDraftV2.title',
        'ViralDraftV2.hashtags',
        'ViralDraftV2.visualNote'
      )
      impact.warnings.push('conceptsはJSON型 - コンセプト配列（conceptId, conceptTitle, format, hookType, angle, structure等）を含む')
      impact.warnings.push('hookCombination、angleCombinationは配列型')
      impact.warnings.push('viralScoreは0-100の整数')
      
      impact.codeUsage.push({
        location: '/api/generation/content/sessions/[id]/generate-concepts/route.ts',
        usage: 'conceptsフィールドにコンセプト配列として保存'
      })
      impact.codeUsage.push({
        location: '/lib/prompt-executor.ts',
        usage: 'GPT-4oを使用してコンセプト生成'
      })
    }
    
    // Claude（generate-contents）の場合
    else if (filename.includes('cardi-dare') || filename.includes('character')) {
      impact.tables.push('ViralSession', 'ViralDraftV2')
      impact.fields.push(
        'ViralSession.contents',  // JSON型で生成コンテンツを格納
        'ViralSession.characterProfileId',
        'ViralSession.voiceStyleMode',
        'ViralDraftV2.content',
        'ViralDraftV2.format'
      )
      impact.warnings.push('contentsはJSON型 - 生成されたコンテンツ（単独投稿またはthread形式）を格納')
      impact.warnings.push('スレッド形式の場合、post1-post5のJSON構造')
      impact.warnings.push('各投稿は130-140文字の制限')
      
      impact.codeUsage.push({
        location: '/api/generation/content/sessions/[id]/generate-contents/route.ts',
        usage: 'contentsフィールドに最終コンテンツとして保存'
      })
      impact.codeUsage.push({
        location: '/lib/character-content-generator-v2.ts',
        usage: 'Claude-4 (Sonnet)を使用してキャラクター投稿生成'
      })
      impact.codeUsage.push({
        location: '/api/generation/content/drafts/route.ts',
        usage: 'ViralDraftV2テーブルに下書きとして保存'
      })
    }
    
    // Prismaスキーマとの整合性チェック
    try {
      const schemaPath = path.join(this.projectRoot, 'prisma', 'schema.prisma')
      const schema = await fs.readFile(schemaPath, 'utf-8')
      
      // 影響を受けるテーブルがスキーマに存在するかチェック
      for (const table of impact.tables) {
        if (!schema.includes(`model ${table}`)) {
          impact.warnings.push(`⚠️ テーブル '${table}' がPrismaスキーマに存在しない可能性`)
        }
      }
    } catch (error) {
      impact.warnings.push('Prismaスキーマの確認ができませんでした')
    }
    
    return impact
  }

  /**
   * 変更の影響度を評価
   */
  evaluateImpactSeverity(report) {
    const { totalUsages, summary } = report
    
    // DB影響がある場合は自動的に高リスク
    if (summary.dbTables > 0) {
      return {
        level: 'high',
        emoji: '🔴',
        message: `影響範囲: 大（DB影響あり - ${summary.dbTables}テーブル, ${summary.dbFields}フィールド）`
      }
    } else if (totalUsages === 0) {
      return {
        level: 'none',
        emoji: '✅',
        message: '使用箇所なし'
      }
    } else if (summary.apis === 0 && totalUsages < 3) {
      return {
        level: 'low',
        emoji: '🟢',
        message: '影響範囲: 小'
      }
    } else if (summary.apis < 3 && totalUsages < 10) {
      return {
        level: 'medium',
        emoji: '🟡',
        message: '影響範囲: 中'
      }
    } else {
      return {
        level: 'high',
        emoji: '🔴',
        message: '影響範囲: 大（要注意）'
      }
    }
  }

  /**
   * DBデータとの互換性チェック
   */
  async checkDataCompatibility(promptFile) {
    if (!this.prisma) {
      this.prisma = new PrismaClient()
    }

    const compatibility = {
      compatible: true,
      issues: [],
      existingDataSamples: {},
      recommendations: []
    }

    try {
      const filename = path.basename(promptFile, '.txt')

      // Perplexity（collect-topics）の場合
      if (filename.includes('collect-topics')) {
        // 既存のViralSessionデータをチェック
        const sessions = await this.prisma.viralSession.findMany({
          where: {
            topics: { not: null }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })

        if (sessions.length > 0) {
          compatibility.existingDataSamples.viralSessions = sessions.map(s => ({
            id: s.id,
            topics: s.topics
          }))

          // topicsの構造をチェック
          for (const session of sessions) {
            const topics = session.topics
            if (topics && Array.isArray(topics)) {
              const topic = topics[0]
              if (topic) {
                // 必須フィールドのチェック
                const requiredFields = ['TOPIC', 'title', 'source', 'url', 'date', 'summary', 'keyPoints', 'perplexityAnalysis']
                const missingFields = requiredFields.filter(field => !topic[field])
                
                if (missingFields.length > 0) {
                  compatibility.issues.push({
                    type: 'missing_fields',
                    message: `既存データに不足フィールド: ${missingFields.join(', ')}`,
                    sessionId: session.id
                  })
                }

                // 文字数チェック
                if (topic.summary && (topic.summary.length < 350 || topic.summary.length > 450)) {
                  compatibility.issues.push({
                    type: 'length_constraint',
                    message: `summaryの文字数が制約外: ${topic.summary.length}文字（要350-450文字）`,
                    sessionId: session.id
                  })
                }

                if (topic.perplexityAnalysis && (topic.perplexityAnalysis.length < 150 || topic.perplexityAnalysis.length > 250)) {
                  compatibility.issues.push({
                    type: 'length_constraint',
                    message: `perplexityAnalysisの文字数が制約外: ${topic.perplexityAnalysis.length}文字（要150-250文字）`,
                    sessionId: session.id
                  })
                }
              }
            }
          }
        }
      }

      // GPT（generate-concepts）の場合
      else if (filename.includes('generate-concepts')) {
        const sessions = await this.prisma.viralSession.findMany({
          where: {
            concepts: { not: null }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })

        if (sessions.length > 0) {
          compatibility.existingDataSamples.conceptSessions = sessions.map(s => ({
            id: s.id,
            concepts: s.concepts
          }))

          // conceptsの構造をチェック
          for (const session of sessions) {
            const concepts = session.concepts
            if (concepts && Array.isArray(concepts)) {
              const concept = concepts[0]
              if (concept) {
                // 必須フィールドのチェック
                const requiredFields = ['conceptId', 'conceptTitle', 'format', 'hookType', 'angle', 'structure']
                const missingFields = requiredFields.filter(field => !concept[field])
                
                if (missingFields.length > 0) {
                  compatibility.issues.push({
                    type: 'missing_fields',
                    message: `既存データに不足フィールド: ${missingFields.join(', ')}`,
                    sessionId: session.id
                  })
                }

                // viralScoreの範囲チェック
                if (concept.viralScore !== undefined && (concept.viralScore < 0 || concept.viralScore > 100)) {
                  compatibility.issues.push({
                    type: 'value_constraint',
                    message: `viralScoreが範囲外: ${concept.viralScore}（要0-100）`,
                    sessionId: session.id
                  })
                }

                // structureの必須フィールドチェック
                if (concept.structure) {
                  const structureFields = ['openingHook', 'background', 'mainContent', 'reflection', 'cta']
                  const missingStructureFields = structureFields.filter(field => !concept.structure[field])
                  
                  if (missingStructureFields.length > 0) {
                    compatibility.issues.push({
                      type: 'missing_structure_fields',
                      message: `structureに不足フィールド: ${missingStructureFields.join(', ')}`,
                      sessionId: session.id
                    })
                  }
                }
              }
            }
          }
        }

        // ViralDraftV2テーブルもチェック
        const drafts = await this.prisma.viralDraftV2.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        })

        if (drafts.length > 0) {
          compatibility.existingDataSamples.drafts = drafts.map(d => ({
            id: d.id,
            conceptId: d.conceptId,
            title: d.title,
            hashtags: d.hashtags
          }))
        }
      }

      // Claude（generate-contents）の場合
      else if (filename.includes('cardi-dare') || filename.includes('character')) {
        const sessions = await this.prisma.viralSession.findMany({
          where: {
            contents: { not: null }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })

        if (sessions.length > 0) {
          compatibility.existingDataSamples.contentSessions = sessions.map(s => ({
            id: s.id,
            contents: s.contents,
            characterProfileId: s.characterProfileId
          }))

          // contentsの構造をチェック
          for (const session of sessions) {
            const data = session.contents
            if (data && data.generateContents) {
              const content = data.generateContents

              // スレッド形式の場合
              if (content.post1) {
                const posts = ['post1', 'post2', 'post3', 'post4', 'post5']
                for (const postKey of posts) {
                  if (content[postKey]) {
                    const length = content[postKey].length
                    if (length < 130 || length > 140) {
                      compatibility.issues.push({
                        type: 'length_constraint',
                        message: `${postKey}の文字数が制約外: ${length}文字（要130-140文字）`,
                        sessionId: session.id
                      })
                    }
                  } else {
                    compatibility.issues.push({
                      type: 'missing_post',
                      message: `スレッド形式で${postKey}が不足`,
                      sessionId: session.id
                    })
                  }
                }
              }
              // 単独投稿の場合
              else if (content.content) {
                const length = content.content.length
                if (length > 140) {
                  compatibility.issues.push({
                    type: 'length_constraint',
                    message: `単独投稿の文字数が制約外: ${length}文字（最大140文字）`,
                    sessionId: session.id
                  })
                }
              }
            }
          }
        }
      }

      // 互換性の判定
      if (compatibility.issues.length > 0) {
        compatibility.compatible = false
        
        // 推奨事項を生成
        const issueTypes = [...new Set(compatibility.issues.map(i => i.type))]
        
        if (issueTypes.includes('missing_fields')) {
          compatibility.recommendations.push('プロンプトに必須フィールドの生成指示を追加してください')
        }
        if (issueTypes.includes('length_constraint')) {
          compatibility.recommendations.push('文字数制限の指示を確認・調整してください')
        }
        if (issueTypes.includes('value_constraint')) {
          compatibility.recommendations.push('数値の範囲制限を明確に指示してください')
        }
        if (issueTypes.includes('missing_structure_fields')) {
          compatibility.recommendations.push('構造体の全フィールドを生成するよう指示を明確化してください')
        }
      }

    } catch (error) {
      compatibility.issues.push({
        type: 'error',
        message: `互換性チェックエラー: ${error.message}`
      })
      compatibility.compatible = false
    }

    return compatibility
  }

  /**
   * フィールド名の揺れや重複をチェック
   */
  async checkFieldConsistency(promptFile) {
    const consistency = {
      duplicates: [],
      variations: [],
      inconsistencies: [],
      recommendations: []
    }

    try {
      const filename = path.basename(promptFile, '.txt')
      
      // 既存データから全フィールド名を収集
      const fieldNames = new Set()
      const fieldUsage = new Map() // フィールド名 -> 使用箇所のマップ

      if (filename.includes('collect-topics')) {
        const sessions = await this.prisma.viralSession.findMany({
          where: { topics: { not: null } },
          take: 20
        })

        sessions.forEach(session => {
          if (session.topics && Array.isArray(session.topics)) {
            session.topics.forEach(topic => {
              Object.keys(topic).forEach(key => {
                fieldNames.add(key)
                if (!fieldUsage.has(key)) {
                  fieldUsage.set(key, [])
                }
                fieldUsage.get(key).push({ sessionId: session.id, phase: 'phase1' })
              })
            })
          }
        })
      } else if (filename.includes('generate-concepts')) {
        const sessions = await this.prisma.viralSession.findMany({
          where: { concepts: { not: null } },
          take: 20
        })

        sessions.forEach(session => {
          if (session.concepts && Array.isArray(session.concepts)) {
            session.concepts.forEach(concept => {
              Object.keys(concept).forEach(key => {
                fieldNames.add(key)
                if (!fieldUsage.has(key)) {
                  fieldUsage.set(key, [])
                }
                fieldUsage.get(key).push({ sessionId: session.id, phase: 'concepts' })
              })

              // structureの中のフィールドも収集
              if (concept.structure) {
                Object.keys(concept.structure).forEach(key => {
                  const fullKey = `structure.${key}`
                  fieldNames.add(fullKey)
                  if (!fieldUsage.has(fullKey)) {
                    fieldUsage.set(fullKey, [])
                  }
                  fieldUsage.get(fullKey).push({ sessionId: session.id, phase: 'concepts' })
                })
              }
            })
          }
        })
      }

      // フィールド名の揺れをチェック
      const fieldArray = Array.from(fieldNames)
      for (let i = 0; i < fieldArray.length; i++) {
        for (let j = i + 1; j < fieldArray.length; j++) {
          const field1 = fieldArray[i]
          const field2 = fieldArray[j]

          // 大文字小文字の違い
          if (field1.toLowerCase() === field2.toLowerCase() && field1 !== field2) {
            consistency.variations.push({
              type: 'case_variation',
              fields: [field1, field2],
              message: `大文字小文字の揺れ: ${field1} vs ${field2}`
            })
          }

          // アンダースコアとキャメルケースの違い
          const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '')
          const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

          if (camelToSnake(field1) === camelToSnake(field2) && field1 !== field2) {
            consistency.variations.push({
              type: 'naming_convention',
              fields: [field1, field2],
              message: `命名規則の揺れ: ${field1} vs ${field2}`
            })
          }

          // 類似フィールド名（編集距離）
          const levenshtein = this.calculateLevenshtein(field1, field2)
          if (levenshtein <= 2 && field1 !== field2) {
            consistency.variations.push({
              type: 'similar_names',
              fields: [field1, field2],
              message: `類似フィールド名: ${field1} vs ${field2}`,
              distance: levenshtein
            })
          }
        }
      }

      // 期待されるフィールドと実際のフィールドの比較
      const expectedFields = this.getExpectedFields(filename)
      const actualFields = Array.from(fieldNames)

      // 不足フィールド
      const missingFields = expectedFields.filter(f => !actualFields.includes(f))
      if (missingFields.length > 0) {
        consistency.inconsistencies.push({
          type: 'missing_expected_fields',
          fields: missingFields,
          message: `期待されるフィールドが不足: ${missingFields.join(', ')}`
        })
      }

      // 予期しないフィールド
      const unexpectedFields = actualFields.filter(f => !expectedFields.includes(f))
      if (unexpectedFields.length > 0) {
        consistency.inconsistencies.push({
          type: 'unexpected_fields',
          fields: unexpectedFields,
          message: `予期しないフィールド: ${unexpectedFields.join(', ')}`
        })
      }

      // 推奨事項の生成
      if (consistency.variations.length > 0) {
        consistency.recommendations.push('フィールド名の命名規則を統一してください（camelCase or snake_case）')
      }

      if (consistency.inconsistencies.find(i => i.type === 'missing_expected_fields')) {
        consistency.recommendations.push('プロンプトに必須フィールドの生成を明示的に指示してください')
      }

      if (consistency.variations.find(v => v.type === 'similar_names')) {
        consistency.recommendations.push('類似したフィールド名は統合または明確に区別してください')
      }

    } catch (error) {
      consistency.inconsistencies.push({
        type: 'error',
        message: `整合性チェックエラー: ${error.message}`
      })
    }

    return consistency
  }

  /**
   * 期待されるフィールドを定義
   */
  getExpectedFields(filename) {
    if (filename.includes('collect-topics')) {
      return [
        'TOPIC', 'title', 'source', 'url', 'date', 
        'summary', 'keyPoints', 'perplexityAnalysis',
        'additionalSources'
      ]
    } else if (filename.includes('generate-concepts')) {
      return [
        'conceptId', 'conceptTitle', 'format', 'hookType', 
        'hookCombination', 'angle', 'angleCombination',
        'angleRationale', 'viralScore', 'viralFactors',
        'structure.openingHook', 'structure.background',
        'structure.mainContent', 'structure.reflection',
        'structure.cta', 'visual', 'timing', 'hashtags'
      ]
    } else if (filename.includes('character')) {
      return ['content', 'format', 'post1', 'post2', 'post3', 'post4', 'post5']
    }
    return []
  }

  /**
   * レーベンシュタイン距離を計算
   */
  calculateLevenshtein(str1, str2) {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  /**
   * データマイグレーションスクリプトを生成
   */
  generateMigrationScript(promptFile, compatibility, consistency) {
    const migrations = []
    const filename = path.basename(promptFile, '.txt')

    // 文字数制限のマイグレーション
    const lengthIssues = compatibility.issues.filter(i => i.type === 'length_constraint')
    if (lengthIssues.length > 0) {
      if (filename.includes('collect-topics')) {
        migrations.push({
          name: 'fix-topic-length-constraints',
          functionName: 'migrateTopicLengths',
          description: 'Perplexityトピックの文字数制限を修正',
          script: `
// Perplexityトピックの文字数制限修正
async function migrateTopicLengths() {
  const sessions = await prisma.viralSession.findMany({
    where: { topics: { not: null } }
  })
  
  for (const session of sessions) {
    if (session.topics && Array.isArray(session.topics)) {
      let updated = false
      const updatedTopics = session.topics.map(topic => {
        const newTopic = { ...topic }
        
        // summaryの調整（350-450文字）
        if (topic.summary) {
          if (topic.summary.length < 350) {
            newTopic.summary = topic.summary + '。' + '詳細情報は元記事を参照。'.repeat(Math.ceil((350 - topic.summary.length) / 15))
            updated = true
          } else if (topic.summary.length > 450) {
            newTopic.summary = topic.summary.substring(0, 447) + '...'
            updated = true
          }
        }
        
        // perplexityAnalysisの調整（150-250文字）
        if (topic.perplexityAnalysis) {
          if (topic.perplexityAnalysis.length < 150) {
            newTopic.perplexityAnalysis = topic.perplexityAnalysis + ' この話題は今後も注目を集めそうだ。'
            updated = true
          } else if (topic.perplexityAnalysis.length > 250) {
            newTopic.perplexityAnalysis = topic.perplexityAnalysis.substring(0, 247) + '...'
            updated = true
          }
        }
        
        return newTopic
      })
      
      if (updated) {
        await prisma.viralSession.update({
          where: { id: session.id },
          data: {
            topics: updatedTopics
          }
        })
        console.log(\`Updated session \${session.id}\`)
      }
    }
  }
}`
        })
      }

      if (filename.includes('character')) {
        migrations.push({
          name: 'fix-thread-post-lengths',
          functionName: 'migrateThreadPostLengths',
          description: 'スレッド投稿の文字数制限を修正',
          script: `
// スレッド投稿の文字数制限修正（130-140文字）
async function migrateThreadPostLengths() {
  const sessions = await prisma.viralSession.findMany({
    where: { contents: { not: null } }
  })
  
  for (const session of sessions) {
    if (session.contents) {
      let updated = false
      let updatedContents = session.contents
      
      // contentsがオブジェクトの場合（generateContents形式）
      if (session.contents.generateContents) {
        const content = session.contents.generateContents
        const updatedContent = { ...content }
        
        // スレッド形式の場合
        if (content.post1) {
          const posts = ['post1', 'post2', 'post3', 'post4', 'post5']
          
          posts.forEach(postKey => {
            if (content[postKey]) {
              const length = content[postKey].length
              if (length < 130) {
                // 短すぎる場合は句読点や感嘆符を追加
                updatedContent[postKey] = content[postKey] + '！'
                updated = true
              } else if (length > 140) {
                // 長すぎる場合は省略
                updatedContent[postKey] = content[postKey].substring(0, 137) + '...'
                updated = true
              }
            }
          })
          
          if (updated) {
            updatedContents = {
              ...session.contents,
              generateContents: updatedContent
            }
          }
        }
        // 単独投稿の場合
        else if (content.content && content.content.length > 140) {
          updatedContent.content = content.content.substring(0, 137) + '...'
          updatedContents = {
            ...session.contents,
            generateContents: updatedContent
          }
          updated = true
        }
      }
      
      if (updated) {
        await prisma.viralSession.update({
          where: { id: session.id },
          data: {
            contents: updatedContents
          }
        })
        console.log(\`Updated session \${session.id}\`)
      }
    }
  }
}`
        })
      }
    }

    // 不足フィールドのマイグレーション
    const missingFieldIssues = compatibility.issues.filter(i => i.type === 'missing_fields')
    if (missingFieldIssues.length > 0) {
      migrations.push({
        name: 'add-missing-fields',
        functionName: 'addMissingFields',
        description: '不足フィールドを追加',
        script: `
// 不足フィールドの追加
async function addMissingFields() {
  const sessions = await prisma.viralSession.findMany({
    where: { 
      OR: [
        { topics: { not: null } },
        { concepts: { not: null } },
        { contents: { not: null } }
      ]
    }
  })
  
  for (const session of sessions) {
    let updated = false
    const updates = {}
    
    // Phase1の不足フィールド補完
    if (session.topics && Array.isArray(session.topics)) {
      updates.topics = session.topics.map(topic => ({
        ...topic,
        TOPIC: topic.TOPIC || topic.title || 'トピック',
        additionalSources: topic.additionalSources || []
      }))
      updated = true
    }
    
    // Phase2の不足フィールド補完
    if (session.concepts && Array.isArray(session.concepts)) {
      updates.concepts = session.concepts.map(concept => ({
        ...concept,
        // 必須フィールドの補完
        conceptId: concept.conceptId || \`concept_\${Math.random().toString(36).substr(2, 9)}\`,
        conceptTitle: concept.conceptTitle || concept.topicTitle || 'コンセプトタイトル',
        format: concept.format || 'single',
        hookType: concept.hookType || '意外性',
        hookCombination: concept.hookCombination || ['意外性'],
        angle: concept.angle || 'データ駆動型',
        angleCombination: concept.angleCombination || ['データ駆動型'],
        angleRationale: concept.angleRationale || '効果的な角度です',
        viralScore: concept.viralScore ?? 75,
        viralFactors: concept.viralFactors || ['話題性', '共感性'],
        visual: concept.visual || 'インフォグラフィック',
        timing: concept.timing || '平日夜（21時〜23時）',
        hashtags: concept.hashtags || []
      }))
      updated = true
    }
    
    if (updated) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updates
      })
      console.log(\`Added missing fields to session \${session.id}\`)
    }
  }
}`
      })
    }

    // フィールド名の統一マイグレーション
    if (consistency.variations.length > 0) {
      const fieldMappings = this.generateFieldMappings(consistency.variations)
      
      migrations.push({
        name: 'unify-field-names',
        functionName: 'unifyFieldNames',
        description: 'フィールド名を統一',
        script: `
// フィールド名の統一
async function unifyFieldNames() {
  const fieldMappings = ${JSON.stringify(fieldMappings, null, 2)}
  
  const sessions = await prisma.viralSession.findMany()
  
  for (const session of sessions) {
    let updated = false
    const updates = {}
    
    // 各フェーズのデータをチェック
    ['topics', 'concepts', 'contents'].forEach(phase => {
      if (session[phase]) {
        const updatedPhase = JSON.parse(JSON.stringify(session[phase]))
        
        // フィールド名を置換
        function replaceFields(obj) {
          if (Array.isArray(obj)) {
            return obj.map(item => replaceFields(item))
          }
          if (obj && typeof obj === 'object') {
            const newObj = {}
            for (const [key, value] of Object.entries(obj)) {
              const newKey = fieldMappings[key] || key
              newObj[newKey] = replaceFields(value)
            }
            return newObj
          }
          return obj
        }
        
        const newPhaseData = replaceFields(updatedPhase)
        if (JSON.stringify(newPhaseData) !== JSON.stringify(session[phase])) {
          updates[phase] = newPhaseData
          updated = true
        }
      }
    })
    
    if (updated) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updates
      })
      console.log(\`Unified field names in session \${session.id}\`)
    }
  }
}`
      })
    }

    // 予期しないフィールドを削除するマイグレーション
    const unexpectedFieldIssues = consistency.inconsistencies.filter(i => i.type === 'unexpected_fields')
    if (unexpectedFieldIssues.length > 0) {
      const unexpectedFields = unexpectedFieldIssues.flatMap(issue => issue.fields)
      
      migrations.push({
        name: 'cleanup-unexpected-fields',
        functionName: 'cleanupUnexpectedFields',
        description: '予期しないフィールドを削除',
        script: `
// 予期しないフィールドのクリーンアップ
async function cleanupUnexpectedFields() {
  const sessions = await prisma.viralSession.findMany({
    where: { 
      OR: [
        { topics: { not: null } },
        { concepts: { not: null } },
        { contents: { not: null } }
      ]
    }
  })
  
  const unexpectedFields = ${JSON.stringify(unexpectedFields, null, 2)}
  const expectedFieldsByPhase = {
    topics: [
      'TOPIC', 'title', 'source', 'url', 'date', 
      'summary', 'keyPoints', 'perplexityAnalysis',
      'additionalSources'
    ],
    concepts: [
      'conceptId', 'conceptTitle', 'format', 'hookType', 
      'hookCombination', 'angle', 'angleCombination',
      'angleRationale', 'viralScore', 'viralFactors',
      'structure', 'visual', 'timing', 'hashtags'
    ],
    contents: [
      'content', 'format', 'post1', 'post2', 'post3', 
      'post4', 'post5', 'generateContents'
    ]
  }
  
  // structure内の期待されるフィールド
  const expectedStructureFields = [
    'openingHook', 'background', 'mainContent', 
    'reflection', 'cta'
  ]
  
  for (const session of sessions) {
    let updated = false
    const updates = {}
    
    // 各フェーズのデータをチェック
    const phases = ['topics', 'concepts', 'contents']
    for (const phase of phases) {
      if (session[phase]) {
        const expectedFields = expectedFieldsByPhase[phase]
        
        // クリーンアップ関数
        function cleanupFields(obj, isStructure = false) {
          if (Array.isArray(obj)) {
            return obj.map(item => cleanupFields(item, false))
          }
          if (obj && typeof obj === 'object') {
            const newObj = {}
            const fieldsToCheck = isStructure ? expectedStructureFields : expectedFields
            
            for (const [key, value] of Object.entries(obj)) {
              // 特別なケース: structureフィールドは保持し、その中身をクリーンアップ
              if (key === 'structure' && phase === 'concepts') {
                newObj[key] = cleanupFields(value, true)
              }
              // 特別なケース: generateContentsフィールドは保持
              else if (key === 'generateContents' && phase === 'contents') {
                newObj[key] = value
              }
              // 期待されるフィールドのみ保持
              else if (fieldsToCheck.includes(key)) {
                newObj[key] = value
              }
              // structure.field形式のチェック（ドット記法）
              else if (!isStructure && key.startsWith('structure.')) {
                // structure.fieldはトップレベルでは削除
                console.log(\`  Removing unexpected field: \${key} from \${phase}\`)
              } else {
                // 予期しないフィールドは削除
                console.log(\`  Removing unexpected field: \${key} from \${phase}\`)
              }
            }
            return newObj
          }
          return obj
        }
        
        const cleanedPhase = cleanupFields(session[phase])
        if (JSON.stringify(cleanedPhase) !== JSON.stringify(session[phase])) {
          updates[phase] = cleanedPhase
          updated = true
        }
      }
    }
    
    if (updated) {
      await prisma.viralSession.update({
        where: { id: session.id },
        data: updates
      })
      console.log(\`Cleaned up unexpected fields in session \${session.id}\`)
    }
  }
  
  console.log('\\nCleanup complete!')
  console.log('Removed fields:', unexpectedFields)
}`
      })
    }

    return migrations
  }

  /**
   * フィールド名のマッピングを生成
   */
  generateFieldMappings(variations) {
    const mappings = {}
    
    variations.forEach(variation => {
      if (variation.type === 'case_variation') {
        // キャメルケースを優先
        const [field1, field2] = variation.fields
        const camelCase = field1.match(/[A-Z]/) ? field1 : field2
        const other = field1 === camelCase ? field2 : field1
        mappings[other] = camelCase
      } else if (variation.type === 'naming_convention') {
        // キャメルケースを優先
        const [field1, field2] = variation.fields
        const camelCase = field1.match(/[A-Z]/) ? field1 : field2
        const other = field1 === camelCase ? field2 : field1
        mappings[other] = camelCase
      }
    })
    
    return mappings
  }

  /**
   * Prisma接続をクリーンアップ
   */
  async cleanup() {
    if (this.prisma) {
      await this.prisma.$disconnect()
    }
  }
}

module.exports = PromptImpactAnalyzer