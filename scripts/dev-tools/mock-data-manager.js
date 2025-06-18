#!/usr/bin/env node

/**
 * モックデータ管理ツール
 * 
 * プロンプトテスト用のモックデータを管理
 */

const fs = require('fs').promises
const path = require('path')
const readline = require('readline')

class MockDataManager {
  constructor() {
    this.mockDir = path.join(process.cwd(), 'lib', 'prompts', 'mock-data')
    this.rl = null
  }
  
  createReadline() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
    }
  }

  /**
   * 初期化（ディレクトリ作成）
   */
  async init() {
    const dirs = [
      this.mockDir,
      path.join(this.mockDir, 'perplexity'),
      path.join(this.mockDir, 'gpt'),
      path.join(this.mockDir, 'claude')
    ]
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
    
    // デフォルトモックデータの作成
    await this.createDefaultMocks()
  }

  /**
   * デフォルトモックデータを作成
   */
  async createDefaultMocks() {
    // Perplexityのモックデータ
    const perplexityMock = {
      default: {
        TOPIC: "AIツールで仕事効率が10倍になった企業の衝撃事例",
        url: "https://example.com/ai-productivity-case",
        date: new Date().toISOString().split('T')[0],
        summary: "ある中小企業がAIツールを導入したところ、わずか3ヶ月で業務効率が10倍に向上。従業員の残業時間は月平均80時間から10時間に激減し、売上は150%増加した。",
        keyPoints: [
          "ChatGPTを活用した企画書作成の自動化",
          "画像生成AIによるマーケティング素材の内製化",
          "音声AIを使った議事録の自動作成",
          "従業員の創造的業務への集中",
          "顧客満足度の大幅向上"
        ],
        perplexityAnalysis: "『AI導入で人員削減』という一般的なイメージとは真逆の結果が注目を集める。具体的な数字と従業員の生の声が感情的な共感を呼ぶ。",
        additionalSources: [
          {
            url: "https://example.com/employee-interview",
            title: "『AIのおかげで本当にやりたい仕事ができるようになった』従業員インタビュー",
            date: new Date().toISOString().split('T')[0]
          }
        ]
      },
      samples: []
    }
    
    // GPTのモックデータ
    const gptMock = {
      default: {
        conceptId: "topic1_concept1",
        conceptTitle: "AIが変える意外な働き方の真実",
        format: "single",
        hookType: "意外性",
        hookCombination: ["意外性", "問い・未完性"],
        angle: "逆張りする視点",
        angleCombination: ["逆張りする視点", "舞台裏や裏話的視点"],
        angleRationale: "常識と真実のギャップが関心を引く。インパクトある事実は単独投稿で十分伝わる",
        viralScore: 85,
        viralFactors: ["感情的反応を引き起こす", "シェアしたくなる新情報"],
        structure: {
          openingHook: "『AIで仕事がなくなる』と騒ぐ人ほど、実はAIを使っていない衝撃の事実",
          background: "メディアは『AIが雇用を奪う』と煽るが、現場で起きているのは真逆の現象",
          mainContent: "実際にAIを導入した企業では、人間の仕事が『増えている』。なぜか？AIが処理した膨大なデータを『解釈』し『判断』する高度な仕事が生まれたから",
          reflection: "結局、AIは人間の仕事を奪うのではなく、仕事の質を変えているだけ",
          cta: "あなたの職場でも似たような変化はありませんか？"
        },
        visual: "インフォグラフィック（数字を強調）",
        timing: "平日夜21時（仕事終わりの振り返りタイム）",
        hashtags: ["#AI時代の働き方", "#未来の仕事", "#テクノロジーと人間"]
      },
      threadExample: {
        conceptId: "topic1_concept2",
        conceptTitle: "現場から見たAI導入の本音",
        format: "thread",
        hookType: "緊急性",
        hookCombination: ["緊急性", "自己投影"],
        angle: "当事者や専門家のリアルな声",
        angleCombination: ["リアルな声", "予測・考察型"],
        angleRationale: "現場の生の声と将来予測の組み合わせが説得力を生む。複数の視点や体験談を展開するにはスレッド形式が最適",
        viralScore: 82,
        viralFactors: ["今すぐ知るべき情報", "自分ごととして捉えられる"],
        structure: {
          openingHook: "今、あなたの会社でも起きているかもしれない『AI導入の落とし穴』",
          background: "多くの企業がAI導入に失敗している本当の理由",
          mainContent: "1. ツールだけ導入して使い方を教えない\n2. 現場の声を聞かずにトップダウンで決定\n3. 成果を急ぎすぎて長期視点が欠如",
          reflection: "成功の鍵は『人間とAIの協働』を真剣に考えること",
          cta: "あなたの会社のAI導入、うまくいってますか？"
        },
        visual: "before→afterの比較画像",
        timing: "月曜朝7時（週始めのモチベーション）",
        hashtags: ["#キャリアチェンジ", "#スキルアップ", "#働き方改革"]
      },
      samples: []
    }
    
    // Claudeのモックデータ
    const claudeMock = {
      characters: {
        default: {
          name: "カーディ・ダーレ",
          age: 53,
          gender: "male",
          philosophy: "AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから",
          tone: "皮肉屋、冷静、観察者、どこか寂しげ、時代に流されながらも抵抗はしない",
          voiceMode: "normal"
        },
        samples: [
          {
            name: "テクノ楽観主義者",
            age: 28,
            gender: "female",
            philosophy: "テクノロジーは人類の可能性を無限に広げる！毎日が新しい発見！",
            tone: "明るい、前向き、エネルギッシュ、時々ナイーブ",
            voiceMode: "humorous"
          }
        ]
      },
      topics: {
        default: {
          title: "AIが変える未来の働き方",
          url: "https://example.com/ai-future-work",
          keyInsight: "AIは仕事を奪うのではなく、仕事の質を変える"
        },
        samples: []
      }
    }
    
    // ファイルが存在しない場合のみ作成
    const files = [
      { path: path.join(this.mockDir, 'perplexity', 'topics.json'), data: perplexityMock },
      { path: path.join(this.mockDir, 'gpt', 'concepts.json'), data: gptMock },
      { path: path.join(this.mockDir, 'claude', 'characters.json'), data: claudeMock }
    ]
    
    for (const { path: filePath, data } of files) {
      try {
        await fs.access(filePath)
        // ファイルが存在する場合はスキップ
      } catch {
        // ファイルが存在しない場合は作成
        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      }
    }
  }

  /**
   * モックデータ一覧
   */
  async list() {
    console.log('\n📋 利用可能なモックデータ:\n')
    
    const providers = ['perplexity', 'gpt', 'claude']
    
    for (const provider of providers) {
      const providerDir = path.join(this.mockDir, provider)
      
      try {
        const files = await fs.readdir(providerDir)
        console.log(`\n${this.getProviderEmoji(provider)} ${provider.toUpperCase()}:`)
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(providerDir, file)
            const content = await fs.readFile(filePath, 'utf-8')
            const data = JSON.parse(content)
            
            console.log(`\n  📄 ${file}`)
            
            if (data.default) {
              console.log('    デフォルト:')
              this.displayMockSummary(data.default, provider)
            }
            
            if (data.samples && data.samples.length > 0) {
              console.log(`    サンプル: ${data.samples.length}個`)
            }
          }
        }
      } catch (error) {
        console.log(`  (データなし)`)
      }
    }
  }

  /**
   * モックデータのサマリー表示
   */
  displayMockSummary(data, provider) {
    switch (provider) {
      case 'perplexity':
        console.log(`      - トピック: ${data.TOPIC}`)
        console.log(`      - 分析: ${data.perplexityAnalysis.substring(0, 50)}...`)
        break
        
      case 'gpt':
        console.log(`      - タイトル: ${data.conceptTitle}`)
        console.log(`      - フック: ${data.hookType}`)
        console.log(`      - 形式: ${data.format}`)
        console.log(`      - スコア: ${data.viralScore}`)
        break
        
      case 'claude':
        if (data.name) {
          console.log(`      - キャラクター: ${data.name} (${data.age}歳)`)
          console.log(`      - 哲学: ${data.philosophy.substring(0, 30)}...`)
        } else if (data.title) {
          console.log(`      - トピック: ${data.title}`)
        }
        break
    }
  }

  /**
   * モックデータを取得
   */
  async getMockData(provider, type = 'default') {
    const files = {
      perplexity: 'topics.json',
      gpt: 'concepts.json',
      claude: 'characters.json'
    }
    
    const filePath = path.join(this.mockDir, provider, files[provider])
    
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      
      if (type === 'default') {
        return data.default
      } else if (type === 'all') {
        return data
      } else if (typeof type === 'number' && data.samples) {
        return data.samples[type] || data.default
      }
      
      return data.default
    } catch (error) {
      console.log(`⚠️  モックデータが見つかりません: ${provider}`)
      return null
    }
  }

  /**
   * モックデータを保存
   */
  async saveMockData(provider, name, data) {
    const files = {
      perplexity: 'topics.json',
      gpt: 'concepts.json',
      claude: 'characters.json'
    }
    
    const filePath = path.join(this.mockDir, provider, files[provider])
    
    try {
      // 既存データを読み込み
      let existingData = { default: {}, samples: [] }
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        existingData = JSON.parse(content)
      } catch {
        // ファイルが存在しない場合は新規作成
      }
      
      // 新しいデータを追加
      existingData.samples.push({
        name,
        timestamp: new Date().toISOString(),
        data
      })
      
      // 最大10個まで保持
      if (existingData.samples.length > 10) {
        existingData.samples = existingData.samples.slice(-10)
      }
      
      // 保存
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2))
      
      console.log(`✅ モックデータを保存しました: ${provider}/${name}`)
    } catch (error) {
      console.log(`❌ 保存エラー: ${error.message}`)
    }
  }

  /**
   * インタラクティブな選択
   */
  async selectMockData(provider) {
    const allData = await this.getMockData(provider, 'all')
    
    if (!allData) {
      return null
    }
    
    console.log(`\n${this.getProviderEmoji(provider)} ${provider.toUpperCase()}のモックデータ:`)
    console.log('1. デフォルト')
    
    if (allData.samples && allData.samples.length > 0) {
      allData.samples.forEach((sample, index) => {
        console.log(`${index + 2}. ${sample.name} (${new Date(sample.timestamp).toLocaleString('ja-JP')})`)
      })
    }
    
    console.log('0. カスタム入力')
    
    const choice = await this.prompt('\n選択 (0-9): ')
    const choiceNum = parseInt(choice)
    
    if (choiceNum === 0) {
      return null // カスタム入力
    } else if (choiceNum === 1) {
      return allData.default
    } else if (allData.samples && allData.samples[choiceNum - 2]) {
      return allData.samples[choiceNum - 2].data
    }
    
    return allData.default
  }

  getProviderEmoji(provider) {
    const emojis = {
      perplexity: '🔍',
      gpt: '🤖',
      claude: '🧠'
    }
    return emojis[provider] || '📝'
  }

  prompt(question) {
    this.createReadline()
    return new Promise(resolve => {
      this.rl.question(question, resolve)
    })
  }

  close() {
    if (this.rl) {
      this.rl.close()
      this.rl = null
    }
  }
}

// エクスポート
module.exports = MockDataManager

// CLI実行
if (require.main === module) {
  async function main() {
    const manager = new MockDataManager()
    const [,, command, ...args] = process.argv
    
    try {
      switch (command) {
        case 'init':
          await manager.init()
          console.log('✅ モックデータディレクトリを初期化しました')
          break
          
        case 'list':
          await manager.list()
          break
          
        case 'get':
          const [provider] = args
          if (!provider) {
            console.log('使い方: mock-data-manager.js get <provider>')
            break
          }
          const data = await manager.getMockData(provider)
          console.log(JSON.stringify(data, null, 2))
          break
          
        default:
          console.log(`
📋 モックデータ管理ツール

使い方:
  node mock-data-manager.js <command> [args]

コマンド:
  init       モックデータディレクトリを初期化
  list       利用可能なモックデータ一覧
  get        モックデータを取得

例:
  node mock-data-manager.js init
  node mock-data-manager.js list
  node mock-data-manager.js get gpt
          `)
      }
    } catch (error) {
      console.error('❌ エラー:', error.message)
    } finally {
      manager.close()
    }
  }
  
  main()
}