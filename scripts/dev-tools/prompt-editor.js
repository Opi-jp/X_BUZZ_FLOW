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

class PromptEditor {
  constructor() {
    this.promptsDir = path.join(process.cwd(), 'lib', 'prompts')
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
        const files = await fs.readdir(providerDir)
        console.log(`\n${this.getProviderEmoji(provider)} ${provider.toUpperCase()}:`)
        
        for (const file of files) {
          if (file.endsWith('.txt')) {
            const stats = await fs.stat(path.join(providerDir, file))
            const content = await fs.readFile(path.join(providerDir, file), 'utf-8')
            const lines = content.split('\n').length
            
            console.log(`  - ${file}`)
            console.log(`    サイズ: ${this.formatBytes(stats.size)} | 行数: ${lines}`)
            console.log(`    更新: ${stats.mtime.toLocaleString('ja-JP')}`)
          }
        }
      } catch (error) {
        console.log(`  (ディレクトリなし)`)
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
      console.log('5. キャンセル')
      
      const choice = await this.prompt('\n選択 (1-5): ')
      
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
        default:
          console.log('キャンセルしました')
      }
    } catch (error) {
      console.log(`❌ ファイルが見つかりません: ${filename}`)
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
        
      default:
        console.log(`
🎯 プロンプトエディター

使い方:
  node scripts/dev-tools/prompt-editor.js <command> [args]

コマンド:
  list                プロンプト一覧を表示
  edit <file>        プロンプトを編集
  test <file>        プロンプトをテスト実行
  analyze            全プロンプトを分析
  compare            バージョン比較（開発中）

例:
  node scripts/dev-tools/prompt-editor.js list
  node scripts/dev-tools/prompt-editor.js edit perplexity/collect-topics.txt
  node scripts/dev-tools/prompt-editor.js test gpt/generate-concepts.txt
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