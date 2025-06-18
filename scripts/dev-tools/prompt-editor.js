#!/usr/bin/env node

/**
 * プロンプトエディター
 * 
 * Chain of Thoughtプロンプトの編集、テスト、分析を行うツール
 * 
 * 使い方:
 * - node scripts/dev-tools/prompt-editor.js list        # プロンプト一覧
 * - node scripts/dev-tools/prompt-editor.js edit <file> # プロンプト編集
 * - node scripts/dev-tools/prompt-editor.js test <file> # プロンプトテスト
 * - node scripts/dev-tools/prompt-editor.js analyze     # プロンプト分析
 * - node scripts/dev-tools/prompt-editor.js compare     # バージョン比較
 */

const fs = require('fs').promises
const path = require('path')
const readline = require('readline')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const PromptStorage = require('./lib/prompt-storage')
const PromptImpactAnalyzer = require('./lib/prompt-impact-analyzer')

class PromptEditor {
  constructor() {
    this.promptsDir = path.join(process.cwd(), 'lib', 'prompts')
    this.storage = new PromptStorage()
    this.impactAnalyzer = new PromptImpactAnalyzer()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }

  /**
   * プロンプト一覧表示
   */
  async list() {
    console.log('📝 利用可能なプロンプト:\n')
    
    const providers = ['perplexity', 'gpt', 'claude']
    
    for (const provider of providers) {
      const providerDir = path.join(this.promptsDir, provider)
      
      try {
        console.log(`\n${this.getProviderEmoji(provider)} ${provider.toUpperCase()}:`)
        await this.listFilesRecursive(providerDir, providerDir, '  ')
      } catch (error) {
        console.log(`  (ディレクトリなし)`)
      }
    }
  }

  /**
   * ディレクトリ内のファイルを再帰的に表示
   */
  async listFilesRecursive(dir, baseDir, indent = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // サブディレクトリの場合
        console.log(`${indent}📁 ${entry.name}/`)
        await this.listFilesRecursive(fullPath, baseDir, indent + '  ')
      } else if (entry.name.endsWith('.txt')) {
        // テキストファイルの場合
        const stats = await fs.stat(fullPath)
        const content = await fs.readFile(fullPath, 'utf-8')
        const lines = content.split('\n').length
        const relativePath = path.relative(baseDir, fullPath)
        
        console.log(`${indent}- ${relativePath}`)
        console.log(`${indent}  サイズ: ${this.formatBytes(stats.size)} | 行数: ${lines}`)
        console.log(`${indent}  更新: ${stats.mtime.toLocaleString('ja-JP')}`)
      }
    }
  }

  /**
   * プロンプト編集
   */
  async edit(filename) {
    if (!filename) {
      console.log('❌ ファイル名を指定してください')
      console.log('例: prompt-editor.js edit perplexity/collect-topics.txt')
      return
    }

    const filepath = path.join(this.promptsDir, filename)
    
    try {
      // 現在のプロンプトを表示
      const content = await fs.readFile(filepath, 'utf-8')
      
      // プロンプトタイプの判定とデフォルト値表示
      const promptType = this.detectPromptType(filename)
      this.showDefaultValues(promptType, filename)
      
      console.log('\n📄 現在のプロンプト:')
      console.log('─'.repeat(80))
      console.log(content)
      console.log('─'.repeat(80))
      
      // サンプル展開を表示
      await this.showSampleExpansion(content, promptType, filename)
      
      // 編集オプション
      console.log('\n編集オプション:')
      console.log('1. エディターで開く (VSCode)')
      console.log('2. インライン編集')
      console.log('3. 分析してから編集')
      console.log('4. プレビュー（完全な展開を確認）')
      console.log('5. 影響範囲を確認')
      console.log('6. DB互換性チェック')
      console.log('7. キャンセル')
      
      const choice = await this.prompt('\n選択 (1-7): ')
      
      switch (choice) {
        case '1':
          await this.openInEditor(filepath)
          break
        case '2':
          await this.inlineEdit(filepath, content)
          break
        case '3':
          await this.analyzeBeforeEdit(filepath, content)
          break
        case '4':
          await this.previewExpanded(content, promptType, filename)
          break
        case '5':
          await this.showImpactAnalysis(filename)
          await this.edit(filename) // 編集画面に戻る
          break
        case '6':
          await this.showDataCompatibility(filename)
          await this.edit(filename) // 編集画面に戻る
          break
        default:
          console.log('キャンセルしました')
      }
    } catch (error) {
      console.log(`❌ エラー: ${error.message}`)
      console.log(`  ファイルパス: ${filepath}`)
    }
  }

  /**
   * プロンプトテスト
   */
  async test(filename) {
    if (!filename) {
      console.log('❌ ファイル名を指定してください')
      return
    }

    const filepath = path.join(this.promptsDir, filename)
    this.currentPromptFile = filename  // 現在のファイルを記録
    
    try {
      const content = await fs.readFile(filepath, 'utf-8')
      
      console.log('\n🧪 プロンプトテスト設定\n')
      
      // プロンプトタイプの判定
      const promptType = this.detectPromptType(filename)
      console.log(`プロンプトタイプ: ${promptType}`)
      
      // デフォルト値を表示
      this.showDefaultValues(promptType, filename)
      
      // テスト用変数の入力
      const variables = await this.collectTestVariables(promptType)
      
      // プロンプトの変数展開
      const expandedPrompt = this.expandVariables(content, variables)
      
      console.log('\n📤 展開後のプロンプト（完全版）:')
      console.log('─'.repeat(80))
      console.log(expandedPrompt)
      console.log('─'.repeat(80))
      
      // 実行確認
      const confirm = await this.prompt('\nこのプロンプトでテストを実行しますか？ (y/N): ')
      
      if (confirm.toLowerCase() === 'y') {
        await this.executeTest(promptType, expandedPrompt, variables)
      }
    } catch (error) {
      console.log(`❌ エラー: ${error.message}`)
    }
  }

  /**
   * プロンプト分析
   */
  async analyze() {
    console.log('\n🔍 全プロンプトの分析\n')
    
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
            const analysis = await this.analyzePrompt(content, `${provider}/${file}`)
            results.push(analysis)
          }
        }
      } catch (error) {
        // ディレクトリがない場合は無視
      }
    }
    
    // 結果表示
    this.displayAnalysisResults(results)
  }

  /**
   * プロンプト比較
   */
  async compare() {
    console.log('\n🔄 プロンプトバージョン比較\n')
    
    // 実装予定
    console.log('⚠️  この機能は開発中です')
  }

  // ヘルパーメソッド

  async analyzePrompt(content, filename) {
    const analysis = {
      filename,
      scores: {
        creativity: 0,
        specificity: 0,
        coherence: 0,
        overall: 0
      },
      issues: [],
      warnings: []
    }

    // 危険ワードチェック
    const dangerousWords = {
      '方向性': '曖昧な表現。具体的な指示に変更を推奨',
      '主な': '曖昧な表現。「具体的な」「詳細な」を推奨',
      '選択してください': '固定化表現。「参考に」「組み合わせて」を推奨',
      'mainContent': '曖昧なフィールド名。specificContentなどを推奨',
      '//': 'コメントアウトはLLMが指示として解釈する可能性',
      '/*': 'コメントアウトはLLMが指示として解釈する可能性'
    }

    for (const [word, warning] of Object.entries(dangerousWords)) {
      if (content.includes(word)) {
        analysis.warnings.push(`⚠️  "${word}": ${warning}`)
        analysis.scores.specificity -= 10
      }
    }

    // 良いパターンチェック
    const goodPatterns = {
      '参考に': 5,
      '組み合わせ': 5,
      'なぜ': 10,
      '理由': 10,
      '具体的': 10,
      '詳細': 5
    }

    for (const [pattern, score] of Object.entries(goodPatterns)) {
      if (content.includes(pattern)) {
        analysis.scores.creativity += score
      }
    }

    // Chain of Thought原則チェック
    if (content.includes('以下から1つ選んで')) {
      analysis.issues.push('❌ 選択を固定化している')
      analysis.scores.creativity -= 20
    }

    if (!content.includes('${') || !content.includes('}')) {
      analysis.warnings.push('⚠️  変数展開が使用されていない')
    }

    // JSON出力チェック
    if (content.includes('```json')) {
      analysis.scores.coherence += 20
      
      // JSON内の例示チェック
      const jsonMatch = content.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1].includes('"')) {
        const jsonContent = jsonMatch[1];
        if (jsonContent.match(/"[^"]+"\s*:\s*"[^"]+"/)) {
          analysis.warnings.push('⚠️  JSON例に具体的な値が含まれている（LLMが制約として解釈する可能性）')
          analysis.scores.creativity -= 10
        }
      }
    }

    // スコア計算
    analysis.scores.creativity = Math.max(0, Math.min(100, analysis.scores.creativity + 50))
    analysis.scores.specificity = Math.max(0, Math.min(100, analysis.scores.specificity + 70))
    analysis.scores.coherence = Math.max(0, Math.min(100, analysis.scores.coherence + 60))
    analysis.scores.overall = Math.round(
      (analysis.scores.creativity + analysis.scores.specificity + analysis.scores.coherence) / 3
    )

    return analysis
  }

  displayAnalysisResults(results) {
    console.log('📊 分析結果:\n')
    
    for (const result of results) {
      console.log(`\n${result.filename}`)
      console.log('─'.repeat(50))
      
      // スコア表示
      console.log('スコア:')
      console.log(`  創造性: ${this.getScoreBar(result.scores.creativity)}`)
      console.log(`  具体性: ${this.getScoreBar(result.scores.specificity)}`)
      console.log(`  一貫性: ${this.getScoreBar(result.scores.coherence)}`)
      console.log(`  総合:   ${this.getScoreBar(result.scores.overall)}`)
      
      // 問題点
      if (result.issues.length > 0) {
        console.log('\n問題点:')
        result.issues.forEach(issue => console.log(`  ${issue}`))
      }
      
      // 警告
      if (result.warnings.length > 0) {
        console.log('\n警告:')
        result.warnings.forEach(warning => console.log(`  ${warning}`))
      }
    }
    
    // サマリー
    const avgScore = Math.round(
      results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length
    )
    
    console.log('\n' + '='.repeat(50))
    console.log(`📈 全体平均スコア: ${avgScore}/100`)
    
    if (avgScore < 60) {
      console.log('💡 改善が必要です。主な改善ポイント:')
      console.log('  - 曖昧な表現を具体的に')
      console.log('  - 創造性を促す表現を追加')
      console.log('  - JSON例示を最小限に')
    } else if (avgScore < 80) {
      console.log('👍 良好ですが、さらなる改善の余地があります')
    } else {
      console.log('🎉 素晴らしいプロンプト品質です！')
    }
  }

  async inlineEdit(filepath, content) {
    console.log('\n✏️  インライン編集モード')
    console.log('各行を編集できます。空行でスキップ、"done"で完了\n')
    
    const lines = content.split('\n')
    const newLines = []
    
    for (let i = 0; i < lines.length; i++) {
      console.log(`\n行 ${i + 1}: ${lines[i]}`)
      const newLine = await this.prompt('新しい行 (Enterでスキップ): ')
      
      if (newLine.toLowerCase() === 'done') {
        newLines.push(...lines.slice(i))
        break
      }
      
      newLines.push(newLine || lines[i])
    }
    
    const newContent = newLines.join('\n')
    
    // 差分表示
    console.log('\n📝 変更内容:')
    // 簡易的な差分表示（実際にはdiffライブラリを使うべき）
    console.log('(差分表示は省略)')
    
    const save = await this.prompt('\n保存しますか？ (y/N): ')
    if (save.toLowerCase() === 'y') {
      await fs.writeFile(filepath, newContent, 'utf-8')
      console.log('✅ 保存しました')
    }
  }

  async analyzeBeforeEdit(filepath, content) {
    const analysis = await this.analyzePrompt(content, filepath)
    
    console.log('\n📊 プロンプト分析結果:')
    console.log('─'.repeat(50))
    console.log(`創造性: ${this.getScoreBar(analysis.scores.creativity)}`)
    console.log(`具体性: ${this.getScoreBar(analysis.scores.specificity)}`)
    console.log(`一貫性: ${this.getScoreBar(analysis.scores.coherence)}`)
    console.log(`総合:   ${this.getScoreBar(analysis.scores.overall)}`)
    
    if (analysis.warnings.length > 0) {
      console.log('\n⚠️  警告:')
      analysis.warnings.forEach(w => console.log(`  ${w}`))
    }
    
    const proceed = await this.prompt('\n分析結果を確認しました。編集を続けますか？ (y/N): ')
    if (proceed.toLowerCase() === 'y') {
      await this.openInEditor(filepath)
    }
  }

  async openInEditor(filepath) {
    try {
      await execAsync(`code "${filepath}"`)
      console.log('✅ VSCodeで開きました')
      
      // ファイル監視
      console.log('\n👀 ファイルの変更を監視中... (Ctrl+Cで終了)')
      
      const watcher = fs.watch(filepath)
      watcher.on('change', async () => {
        console.log('\n📝 ファイルが変更されました')
        const content = await fs.readFile(filepath, 'utf-8')
        const analysis = await this.analyzePrompt(content, filepath)
        
        console.log(`総合スコア: ${analysis.scores.overall}/100`)
        if (analysis.warnings.length > 0) {
          console.log('⚠️  新しい警告:')
          analysis.warnings.slice(0, 3).forEach(w => console.log(`  ${w}`))
        }
      })
    } catch (error) {
      console.log('❌ エディターを開けませんでした')
    }
  }

  detectPromptType(filename) {
    if (filename.includes('perplexity')) return 'collect-topics'
    if (filename.includes('gpt')) return 'generate-concepts'
    if (filename.includes('claude')) return 'generate-contents'
    return 'unknown'
  }

  showDefaultValues(promptType, filename) {
    console.log('\n📋 実際に使用される変数の例:')
    console.log('─'.repeat(50))
    
    switch (promptType) {
      case 'collect-topics':
        console.log('${theme}: AIと働き方')
        console.log('${platform}: Twitter')
        console.log('${style}: エンターテイメント')
        break
        
      case 'generate-concepts':
        console.log('${platform}: Twitter')
        console.log('${style}: エンターテイメント')
        console.log('${topic.TOPIC}: AIツールで仕事効率が10倍に')
        console.log('${topic.perplexityAnalysis}: このトピックは多くの人の関心を引く')
        console.log('${topic.url}: https://example.com/article')
        console.log('${topicIndex}: 0')
        break
        
      case 'generate-contents':
        if (filename.includes('cardi-dare')) {
          console.log('${philosophy}: AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから')
          console.log('${topicTitle}: AIが変える未来の働き方')
          console.log('${openingHook}: 実は誰も気づいていないAIの本当の影響')
          if (filename.includes('thread')) {
            console.log('${background}: 多くの人がAIを恐れているが...')
            console.log('${mainContent}: 具体的な事例を3つ紹介しよう')
            console.log('${reflection}: 結局、人間らしさとは何か')
            console.log('${cta}: あなたの意見を聞かせてください')
          }
        } else {
          console.log('${characterName}: カーディ・ダーレ')
          console.log('${characterAge}: 53')
          console.log('${characterGender}: 男性')
          console.log('${characterPhilosophy}: AIにしかたなく巻き込まれたけど...')
          console.log('${voiceModeInstruction}: （通常は空、humorous/emotionalモード時に追加）')
          console.log('${topicTitle}: AIが変える未来の働き方')
          console.log('${conceptStructure}: {JSON形式のコンセプト全体}')
        }
        break
    }
    
    console.log('─'.repeat(50))
  }

  async collectTestVariables(promptType) {
    const MockDataManager = require('./mock-data-manager')
    const mockManager = new MockDataManager()
    
    // モックデータを使うか確認
    const useMock = await this.prompt('\nモックデータを使用しますか？ (Y/n): ')
    
    if (useMock.toLowerCase() !== 'n') {
      // モックデータを選択
      const mockData = await this.selectAndLoadMockData(promptType, mockManager)
      if (mockData) {
        mockManager.close()
        return mockData
      }
    }
    
    mockManager.close()
    
    // カスタム入力
    const variables = {}
    
    console.log('\nテスト用の変数を入力してください:')
    
    switch (promptType) {
      case 'collect-topics':
        variables.theme = await this.prompt('テーマ (例: AIと働き方): ') || 'AIと働き方'
        variables.platform = await this.prompt('プラットフォーム (例: Twitter): ') || 'Twitter'
        variables.style = await this.prompt('スタイル (例: エンターテイメント): ') || 'エンターテイメント'
        break
        
      case 'generate-concepts':
        variables.platform = await this.prompt('プラットフォーム (例: Twitter): ') || 'Twitter'
        variables.style = await this.prompt('スタイル (例: エンターテイメント): ') || 'エンターテイメント'
        // トピックは仮のものを使用
        variables.topic = {
          TOPIC: 'AIツールで仕事効率が10倍に',
          perplexityAnalysis: 'このトピックは多くの人の関心を引く'
        }
        break
        
      default:
        console.log('⚠️  カスタム変数を入力してください')
    }
    
    return variables
  }
  
  async selectAndLoadMockData(promptType, mockManager) {
    let provider = 'gpt'
    let mockData = null
    
    switch (promptType) {
      case 'collect-topics':
        provider = 'perplexity'
        const topicMock = await mockManager.selectMockData(provider)
        if (topicMock) {
          return {
            theme: 'AIと働き方',
            platform: 'Twitter', 
            style: 'エンターテイメント'
          }
        }
        break
        
      case 'generate-concepts':
        provider = 'gpt'
        const conceptMock = await mockManager.selectMockData(provider)
        if (conceptMock) {
          // Perplexityのモックも必要
          const topicMock = await mockManager.getMockData('perplexity')
          return {
            platform: 'Twitter',
            style: 'エンターテイメント',
            topic: topicMock || {
              TOPIC: conceptMock.conceptTitle || 'AIツールで仕事効率が10倍に',
              perplexityAnalysis: topicMock?.perplexityAnalysis || 'このトピックは多くの人の関心を引く',
              url: topicMock?.url || 'https://example.com/article'
            },
            topicIndex: 0
          }
        }
        break
        
      case 'generate-contents':
        provider = 'claude'
        const charMock = await mockManager.selectMockData(provider)
        if (charMock && charMock.characters) {
          const character = charMock.characters.default
          const conceptMock = await mockManager.getMockData('gpt')
          
          return {
            characterName: character.name,
            characterAge: character.age,
            characterGender: character.gender === 'male' ? '男性' : '女性',
            characterPhilosophy: character.philosophy,
            voiceModeInstruction: character.voiceMode === 'humorous' ? 
              '今日は少しユーモラスに、自虐的なジョークも交えて語ってください。' : '',
            topicTitle: conceptMock?.conceptTitle || 'AIが変える未来の働き方',
            conceptStructure: JSON.stringify(conceptMock?.structure || {
              openingHook: "AIに関する意外な事実",
              background: "現在の状況",
              mainContent: "具体的な内容",
              reflection: "振り返り",
              cta: "行動喚起"
            }, null, 2)
          }
        }
        break
    }
    
    return null
  }

  expandVariables(content, variables) {
    let expanded = content
    
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'object') {
        // オブジェクトの場合は各プロパティを展開
        for (const [subKey, subValue] of Object.entries(value)) {
          const pattern = new RegExp(`\\$\\{${key}\\.${subKey}\\}`, 'g')
          expanded = expanded.replace(pattern, subValue)
        }
      } else {
        const pattern = new RegExp(`\\$\\{${key}\\}`, 'g')
        expanded = expanded.replace(pattern, value)
      }
    }
    
    return expanded
  }

  async executeTest(promptType, prompt, variables) {
    console.log('\n🚀 テスト実行中...\n')
    
    const PromptTestExecutor = require('./prompt-test-executor')
    const executor = new PromptTestExecutor()
    
    // プロバイダーとシステムプロンプトの決定
    let provider = 'gpt'
    let systemPrompt = ''
    
    switch (promptType) {
      case 'collect-topics':
        provider = 'perplexity'
        systemPrompt = 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        break
        
      case 'generate-concepts':
        provider = 'gpt'
        systemPrompt = 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        break
        
      case 'generate-contents':
        provider = 'claude'
        systemPrompt = 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        break
    }
    
    try {
      const result = await executor.execute(provider, prompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 4000,
        jsonMode: promptType !== 'generate-contents'
      })
      
      executor.displayResult(result)
      
      if (result.success) {
        const save = await this.prompt('\n結果を保存しますか？ (y/N): ')
        if (save.toLowerCase() === 'y') {
          const filename = `${promptType}-${provider}`
          await executor.saveResult(result, filename)
        }
        
        // テスト結果を履歴に記録
        const promptFile = this.currentPromptFile || 'unknown'
        const analysis = await this.analyzePrompt(prompt, promptFile)
        
        // バージョンを保存（既存バージョンがなければ新規作成）
        let versionId = this.currentVersionId
        if (!versionId) {
          versionId = await this.storage.saveVersion(
            promptFile,
            prompt,
            'テスト実行',
            analysis.scores
          )
        }
        
        // テスト結果を保存
        await this.storage.saveTestResult(versionId, {
          provider,
          systemPrompt,
          variables,
          output: result.data,
          success: result.success,
          executionTime: result.executionTime || 0,
          model: result.model || 'unknown'
        })
        
        // モックとして保存するか確認
        const saveMock = await this.prompt('この結果をモックデータとして保存しますか？ (y/N): ')
        if (saveMock.toLowerCase() === 'y') {
          await this.saveAsMockData(promptType, result, provider)
        }
      }
    } catch (error) {
      console.log(`❌ テスト実行エラー: ${error.message}`)
    }
  }

  async showSampleExpansion(content, promptType, filename) {
    console.log('\n🔍 サンプル展開（最初の300文字）:')
    console.log('─'.repeat(80))
    
    // サンプル変数を取得
    const sampleVars = this.getSampleVariables(promptType, filename)
    const expanded = this.expandVariables(content, sampleVars)
    
    console.log(expanded.substring(0, 300) + '...')
    console.log('─'.repeat(80))
  }
  
  async previewExpanded(content, promptType, filename) {
    console.log('\n🔍 完全な展開プレビュー')
    
    const useDefault = await this.prompt('デフォルト値を使用しますか？ (Y/n): ')
    
    let variables
    if (useDefault.toLowerCase() === 'n') {
      variables = await this.collectTestVariables(promptType)
    } else {
      variables = this.getSampleVariables(promptType, filename)
    }
    
    const expanded = this.expandVariables(content, variables)
    
    console.log('\n📤 展開後のプロンプト:')
    console.log('═'.repeat(80))
    console.log(expanded)
    console.log('═'.repeat(80))
    
    await this.prompt('\nEnterキーで編集画面に戻る...')
    await this.edit(filename)
  }
  
  getSampleVariables(promptType, filename) {
    switch (promptType) {
      case 'collect-topics':
        return {
          theme: 'AIと働き方',
          platform: 'Twitter',
          style: 'エンターテイメント'
        }
        
      case 'generate-concepts':
        return {
          platform: 'Twitter',
          style: 'エンターテイメント',
          topicIndex: 0,
          topicTitle: 'AIツールで仕事効率が10倍に',
          topicSource: 'TechCrunch Japan',
          topicDate: '2025-06-18',
          topicUrl: 'https://example.com/article',
          topicSummary: 'OpenAIの最新ツールが発表され、多くの企業で導入が始まっている。特に文書作成や分析業務において、従来の10倍の効率化が実現されているという。大手コンサルティング会社の調査によると、導入企業の80%が業務時間を大幅に削減できたと回答。一方で、AIに依存しすぎることへの懸念も広がっている。',
          topicKeyPoints: '1. OpenAIの新ツールが業務効率を10倍に向上\n2. 導入企業の80%が時間削減を実感\n3. 文書作成と分析業務で特に効果的\n4. AI依存への懸念も同時に広がる\n5. 今後さらに多くの企業が導入予定',
          topicAnalysis: 'このトピックは「AIで仕事が奪われる」という恐怖と「効率化で楽になる」という期待の両面を持つため、強い感情的反応を引き起こす。特に30-40代のビジネスパーソンにとって切実な話題であり、自分ごととして捉えやすい。',
          topic: {
            TOPIC: 'AIツールで仕事効率が10倍に',
            perplexityAnalysis: 'このトピックは多くの人の関心を引く',
            url: 'https://example.com/article'
          }
        }
        
      case 'generate-contents':
        if (filename.includes('cardi-dare')) {
          const base = {
            philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
            topicTitle: 'AIが変える未来の働き方',
            openingHook: '実は誰も気づいていないAIの本当の影響'
          }
          
          if (filename.includes('thread')) {
            return {
              ...base,
              background: '多くの人がAIを恐れているが...',
              mainContent: '具体的な事例を3つ紹介しよう',
              reflection: '結局、人間らしさとは何か',
              cta: 'あなたの意見を聞かせてください'
            }
          }
          return base
        } else {
          return {
            characterName: 'カーディ・ダーレ',
            characterAge: '53',
            characterGender: '男性',
            characterPhilosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
            voiceModeInstruction: '',
            topicTitle: 'AIが変える未来の働き方',
            conceptStructure: JSON.stringify({
              hookType: "意外性",
              angle: "データと洞察",
              structure: {
                openingHook: "実は誰も気づいていないAIの本当の影響",
                background: "多くの人がAIを恐れているが",
                mainContent: "具体的な事例を3つ紹介",
                reflection: "結局、人間らしさとは",
                cta: "あなたの意見を聞かせて"
              }
            }, null, 2)
          }
        }
        
      default:
        return {}
    }
  }

  getScoreBar(score) {
    const filled = Math.round(score / 10)
    const empty = 10 - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    const color = score >= 80 ? '\x1b[32m' : score >= 60 ? '\x1b[33m' : '\x1b[31m'
    return `${color}${bar}\x1b[0m ${score}/100`
  }

  getProviderEmoji(provider) {
    const emojis = {
      perplexity: '🔍',
      gpt: '🤖',
      claude: '🧠'
    }
    return emojis[provider] || '📝'
  }

  async saveAsMockData(promptType, result, provider) {
    const MockDataManager = require('./mock-data-manager')
    const mockManager = new MockDataManager()
    
    const name = await this.prompt('モック名 (例: 成功例_AIと働き方): ')
    
    if (name) {
      try {
        // レスポンスからデータを抽出
        let dataToSave = result.content
        
        // JSON形式の場合はパース
        try {
          dataToSave = JSON.parse(result.content)
        } catch {
          // JSONでない場合はそのまま
        }
        
        await mockManager.saveMockData(provider, name, dataToSave)
      } catch (error) {
        console.log(`❌ モック保存エラー: ${error.message}`)
      }
    }
    
    mockManager.close()
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  prompt(question) {
    return new Promise(resolve => {
      this.rl.question(question, resolve)
    })
  }

  /**
   * 編集履歴を表示
   */
  async showHistory(promptFile = null) {
    console.log('📚 編集履歴\n')
    
    try {
      await this.storage.init()
      
      const query = promptFile ? { promptFile } : {}
      const versions = await this.storage.searchHistory(query)
      
      if (versions.length === 0) {
        console.log('履歴がありません')
        return
      }
      
      // ファイル別にグループ化
      const byFile = {}
      versions.forEach(v => {
        if (!byFile[v.promptFile]) byFile[v.promptFile] = []
        byFile[v.promptFile].push(v)
      })
      
      for (const [file, fileVersions] of Object.entries(byFile)) {
        console.log(`\n📄 ${file}`)
        console.log('─'.repeat(60))
        
        fileVersions
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 10)
          .forEach(v => {
            const date = new Date(v.timestamp).toLocaleString('ja-JP')
            const score = v.scores ? `スコア: ${v.scores.overall}` : 'スコアなし'
            console.log(`  ${v.id} - ${date} - ${score}`)
            console.log(`    理由: ${v.changeReason}`)
            if (v.testResults.length > 0) {
              console.log(`    テスト: ${v.testResults.length}回実行`)
            }
          })
      }
    } catch (error) {
      console.log(`❌ 履歴表示エラー: ${error.message}`)
    }
  }

  /**
   * 過去バージョンに戻す
   */
  async rollback(promptFile, versionId) {
    if (!promptFile || !versionId) {
      console.log('❌ ファイル名とバージョンIDを指定してください')
      console.log('例: rollback gpt/generate-concepts.txt v1234567890_abcd')
      return
    }
    
    try {
      const version = await this.storage.getVersion(versionId)
      const filepath = path.join(this.promptsDir, promptFile)
      
      console.log(`\n📝 ロールバック確認`)
      console.log(`ファイル: ${promptFile}`)
      console.log(`バージョン: ${version.id}`)
      console.log(`作成日時: ${new Date(version.timestamp).toLocaleString('ja-JP')}`)
      console.log(`変更理由: ${version.changeReason}`)
      
      const confirm = await this.prompt('\n本当にロールバックしますか？ (y/n): ')
      
      if (confirm.toLowerCase() === 'y') {
        // 現在のバージョンを保存
        const currentContent = await fs.readFile(filepath, 'utf-8')
        await this.storage.saveVersion(
          promptFile,
          currentContent,
          `ロールバック前のバックアップ (${versionId}へロールバック)`,
          null
        )
        
        // ロールバック実行
        await fs.writeFile(filepath, version.content)
        
        console.log('✅ ロールバックが完了しました')
        
        // 新しいバージョンとして記録
        await this.storage.saveVersion(
          promptFile,
          version.content,
          `バージョン ${versionId} へロールバック`,
          version.scores
        )
      } else {
        console.log('キャンセルしました')
      }
    } catch (error) {
      console.log(`❌ ロールバックエラー: ${error.message}`)
    }
  }

  /**
   * 影響範囲分析を表示
   */
  async showImpactAnalysis(filename) {
    console.log('\n🔍 影響範囲分析中...\n')
    
    try {
      const report = await this.impactAnalyzer.generateImpactReport(filename)
      const severity = this.impactAnalyzer.evaluateImpactSeverity(report)
      
      console.log(`${severity.emoji} ${severity.message}`)
      console.log('─'.repeat(80))
      
      // DB影響
      if (report.affectedDB.tables.length > 0) {
        console.log('\n🗄️  データベース影響:')
        console.log(`影響を受けるテーブル: ${report.affectedDB.tables.join(', ')}`)
        console.log('\n影響を受けるフィールド:')
        report.affectedDB.fields.forEach(field => {
          console.log(`  - ${field}`)
        })
        
        if (report.affectedDB.warnings.length > 0) {
          console.log('\n⚠️  DB関連の注意事項:')
          report.affectedDB.warnings.forEach(warning => {
            console.log(`  - ${warning}`)
          })
        }
        
        if (report.affectedDB.codeUsage.length > 0) {
          console.log('\n🔧 コードでの使用状況:')
          report.affectedDB.codeUsage.forEach(usage => {
            console.log(`  - ${usage.location}`)
            console.log(`    → ${usage.usage}`)
          })
        }
      }
      
      // API影響
      if (report.affectedAPIs.length > 0) {
        console.log('\n🌐 影響を受けるAPI:')
        report.affectedAPIs.forEach(api => {
          console.log(`  - ${api.endpoint} (${api.file})`)
        })
      }
      
      // コンポーネント影響
      if (report.affectedComponents.length > 0) {
        console.log('\n🧩 影響を受けるコンポーネント:')
        report.affectedComponents.forEach(comp => {
          console.log(`  - ${comp.component} (${comp.file})`)
        })
      }
      
      // サマリー
      console.log('\n📊 サマリー:')
      console.log(`  - コンポーネント: ${report.summary.components}個`)
      console.log(`  - API: ${report.summary.apis}個`)
      console.log(`  - スクリプト: ${report.summary.scripts}個`)
      console.log(`  - DBテーブル: ${report.summary.dbTables}個`)
      console.log(`  - DBフィールド: ${report.summary.dbFields}個`)
      
      console.log('─'.repeat(80))
      
      // 推奨事項
      if (severity.level === 'high') {
        console.log('\n💡 推奨事項:')
        console.log('  1. 変更前に影響を受けるコンポーネントのテストを確認')
        console.log('  2. DBスキーマの変更が必要な場合はマイグレーションを準備')
        console.log('  3. APIの出力形式が変わる場合はフロントエンドも同時に修正')
        console.log('  4. 段階的なデプロイを検討')
      }
      
    } catch (error) {
      console.log(`❌ 影響範囲分析エラー: ${error.message}`)
    }
    
    await this.prompt('\nEnterキーで編集画面に戻る...')
  }

  /**
   * データ互換性チェックを表示
   */
  async showDataCompatibility(filename) {
    console.log('\n🔍 データ互換性チェック中...\n')
    
    try {
      // 互換性チェック
      const compatibility = await this.impactAnalyzer.checkDataCompatibility(filename)
      
      // フィールド整合性チェック
      const consistency = await this.impactAnalyzer.checkFieldConsistency(filename)
      
      // 結果表示
      console.log(compatibility.compatible ? '✅ 互換性: OK' : '❌ 互換性: 問題あり')
      console.log('─'.repeat(80))
      
      // 互換性問題
      if (compatibility.issues.length > 0) {
        console.log('\n⚠️  互換性の問題:')
        const groupedIssues = {}
        compatibility.issues.forEach(issue => {
          if (!groupedIssues[issue.type]) {
            groupedIssues[issue.type] = []
          }
          groupedIssues[issue.type].push(issue)
        })
        
        Object.entries(groupedIssues).forEach(([type, issues]) => {
          console.log(`\n  ${this.getIssueTypeLabel(type)}:`)
          issues.slice(0, 5).forEach(issue => {
            console.log(`    - ${issue.message}`)
          })
          if (issues.length > 5) {
            console.log(`    ... 他 ${issues.length - 5} 件`)
          }
        })
      }
      
      // フィールド整合性問題
      if (consistency.variations.length > 0 || consistency.inconsistencies.length > 0) {
        console.log('\n🔄 フィールド整合性の問題:')
        
        if (consistency.variations.length > 0) {
          console.log('\n  フィールド名の揺れ:')
          consistency.variations.slice(0, 5).forEach(v => {
            console.log(`    - ${v.message}`)
          })
        }
        
        if (consistency.inconsistencies.length > 0) {
          console.log('\n  フィールドの不整合:')
          consistency.inconsistencies.forEach(i => {
            console.log(`    - ${i.message}`)
          })
        }
      }
      
      // 推奨事項
      const allRecommendations = [
        ...compatibility.recommendations,
        ...consistency.recommendations
      ]
      
      if (allRecommendations.length > 0) {
        console.log('\n💡 推奨事項:')
        const uniqueRecommendations = [...new Set(allRecommendations)]
        uniqueRecommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`)
        })
      }
      
      // 既存データサンプル
      if (Object.keys(compatibility.existingDataSamples).length > 0) {
        console.log('\n📊 既存データのサンプル:')
        Object.entries(compatibility.existingDataSamples).forEach(([key, samples]) => {
          console.log(`  ${key}: ${samples.length}件`)
        })
      }
      
      console.log('─'.repeat(80))
      
      // マイグレーション生成の提案
      if (!compatibility.compatible || consistency.variations.length > 0) {
        const generate = await this.prompt('\nマイグレーションスクリプトを生成しますか？ (y/N): ')
        if (generate.toLowerCase() === 'y') {
          await this.generateMigrationScripts(filename, compatibility, consistency)
        }
      }
      
    } catch (error) {
      console.log(`❌ 互換性チェックエラー: ${error.message}`)
    } finally {
      // Prisma接続をクリーンアップ
      await this.impactAnalyzer.cleanup()
    }
    
    await this.prompt('\nEnterキーで編集画面に戻る...')
  }

  /**
   * マイグレーションスクリプトを生成
   */
  async generateMigrationScripts(filename, compatibility, consistency) {
    console.log('\n📝 マイグレーションスクリプト生成中...\n')
    
    const migrations = this.impactAnalyzer.generateMigrationScript(filename, compatibility, consistency)
    
    if (migrations.length === 0) {
      console.log('生成するマイグレーションはありません。')
      return
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const baseDir = path.join(process.cwd(), 'scripts', 'migrations', timestamp)
    
    await fs.mkdir(baseDir, { recursive: true })
    
    console.log(`マイグレーションスクリプトを生成しました:`)
    console.log(`📁 ${baseDir}\n`)
    
    for (const migration of migrations) {
      const filename = `${migration.name}.js`
      const filepath = path.join(baseDir, filename)
      
      const fullScript = `#!/usr/bin/env node

/**
 * ${migration.description}
 * 
 * 生成日時: ${new Date().toISOString()}
 * プロンプトファイル: ${filename}
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const prisma = new PrismaClient()

${migration.script}

// メイン実行
async function main() {
  console.log('🚀 マイグレーション開始: ${migration.description}')
  
  try {
    await ${migration.name.replace(/-/g, '_')}()
    console.log('✅ マイグレーション完了')
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
`
      
      await fs.writeFile(filepath, fullScript)
      await fs.chmod(filepath, '755')
      
      console.log(`  ✅ ${filename}`)
      console.log(`     ${migration.description}`)
    }
    
    console.log('\n実行方法:')
    migrations.forEach(migration => {
      console.log(`  node scripts/migrations/${timestamp}/${migration.name}.js`)
    })
    
    console.log('\n⚠️  実行前に必ずバックアップを取ってください！')
  }

  /**
   * 問題タイプのラベルを取得
   */
  getIssueTypeLabel(type) {
    const labels = {
      'missing_fields': '不足フィールド',
      'length_constraint': '文字数制限違反',
      'value_constraint': '値の範囲違反',
      'missing_structure_fields': '構造体の不足フィールド',
      'missing_post': 'スレッド投稿の不足',
      'error': 'エラー'
    }
    return labels[type] || type
  }

  /**
   * 統計情報を表示
   */
  async showStats() {
    console.log('📊 プロンプトエディター統計\n')
    
    try {
      await this.storage.init()
      const stats = await this.storage.getStats()
      
      console.log(`総バージョン数: ${stats.totalVersions}`)
      console.log(`過去7日間の編集: ${stats.recentVersions}回`)
      console.log(`平均スコア: ${stats.averageScore}/100`)
      
      if (stats.mostEditedPrompt) {
        console.log(`\n最も編集されたプロンプト:`)
        console.log(`  ${stats.mostEditedPrompt.file} (${stats.mostEditedPrompt.count}回)`)
      }
      
      if (Object.keys(stats.scoreImprovement).length > 0) {
        console.log(`\nスコア改善:`)
        Object.entries(stats.scoreImprovement).forEach(([file, improvement]) => {
          const sign = improvement > 0 ? '+' : ''
          const emoji = improvement > 0 ? '📈' : improvement < 0 ? '📉' : '➡️'
          console.log(`  ${emoji} ${file}: ${sign}${improvement}`)
        })
      }
      
      // ディスク使用量
      const storageDir = path.join(process.cwd(), '.prompt-editor')
      try {
        const { stdout } = await execAsync(`du -sh "${storageDir}" 2>/dev/null || echo "0"`)
        const size = stdout.trim().split('\t')[0]
        console.log(`\nストレージ使用量: ${size}`)
      } catch {
        // エラーは無視
      }
      
    } catch (error) {
      console.log(`❌ 統計表示エラー: ${error.message}`)
    }
  }

  close() {
    this.rl.close()
  }
}

// メイン実行
async function main() {
  const [,, command, ...args] = process.argv
  const editor = new PromptEditor()
  
  try {
    switch (command) {
      case 'list':
        await editor.list()
        break
        
      case 'edit':
        await editor.edit(args[0])
        break
        
      case 'test':
        await editor.test(args[0])
        break
        
      case 'analyze':
        await editor.analyze()
        break
        
      case 'compare':
        await editor.compare()
        break
        
      case 'history':
        await editor.showHistory(args[0])
        break
        
      case 'rollback':
        await editor.rollback(args[0], args[1])
        break
        
      case 'stats':
        await editor.showStats()
        break
        
      case 'impact':
        if (!args[0]) {
          console.log('❌ ファイル名を指定してください')
          break
        }
        await editor.showImpactAnalysis(args[0])
        break
        
      case 'compat':
      case 'compatibility':
        if (!args[0]) {
          console.log('❌ ファイル名を指定してください')
          break
        }
        await editor.showDataCompatibility(args[0])
        break
        
      case 'preview':
        if (!args[0]) {
          console.log('❌ ファイル名を指定してください')
          break
        }
        const previewFilepath = path.join(editor.promptsDir, args[0])
        try {
          const previewContent = await fs.readFile(previewFilepath, 'utf-8')
          const previewType = editor.detectPromptType(args[0])
          const previewVars = editor.getSampleVariables(previewType, args[0])
          const previewExpanded = editor.expandVariables(previewContent, previewVars)
          console.log('\n📤 プロンプトプレビュー（デフォルト値で展開）:')
          console.log('═'.repeat(80))
          console.log(previewExpanded)
          console.log('═'.repeat(80))
        } catch (error) {
          console.log(`❌ プレビューエラー: ${error.message}`)
        }
        break
        
      default:
        console.log(`
🎯 プロンプトエディター

使い方:
  node scripts/dev-tools/prompt-editor.js <command> [args]

コマンド:
  list                プロンプト一覧を表示
  edit <file>        プロンプトを編集
  test <file>        プロンプトをテスト実行
  preview <file>     プロンプトをプレビュー（変数展開確認）
  impact <file>      プロンプトの影響範囲を分析
  compat <file>      DB互換性チェック＆マイグレーション生成
  analyze            全プロンプトを分析
  compare            バージョン比較
  history [file]     編集履歴を表示
  rollback <file> <version>  過去バージョンに戻す
  stats              統計情報を表示

例:
  node scripts/dev-tools/prompt-editor.js list
  node scripts/dev-tools/prompt-editor.js edit perplexity/collect-topics.txt
  node scripts/dev-tools/prompt-editor.js test gpt/generate-concepts.txt
  node scripts/dev-tools/prompt-editor.js impact gpt/generate-concepts.txt
  node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt
  node scripts/dev-tools/prompt-editor.js analyze

💡 ヒント:
  - 編集前に analyze で問題点を確認
  - test で実際の出力を確認
  - Chain of Thought原則に従った設計を心がける
        `)
    }
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    process.exit(1)
  } finally {
    editor.close()
  }
}

// 環境変数読み込み
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

main()