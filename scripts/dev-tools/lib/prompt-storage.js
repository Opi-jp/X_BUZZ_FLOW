/**
 * プロンプト履歴管理
 * 
 * プロンプトのバージョン管理、テスト結果の保存、履歴の検索を提供
 */

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

class PromptStorage {
  constructor() {
    this.storageDir = path.join(process.cwd(), '.prompt-editor')
    this.historyFile = path.join(this.storageDir, 'history.json')
    this.versionsDir = path.join(this.storageDir, 'versions')
    this.resultsDir = path.join(this.storageDir, 'test-results')
  }

  /**
   * ストレージの初期化
   */
  async init() {
    // ディレクトリ作成
    await fs.mkdir(this.storageDir, { recursive: true })
    await fs.mkdir(this.versionsDir, { recursive: true })
    await fs.mkdir(this.resultsDir, { recursive: true })
    
    // 履歴ファイルの初期化
    try {
      await fs.access(this.historyFile)
    } catch {
      await fs.writeFile(this.historyFile, JSON.stringify({
        versions: [],
        lastUpdated: new Date().toISOString()
      }, null, 2))
    }
  }

  /**
   * プロンプトバージョンの保存
   */
  async saveVersion(promptFile, content, changeReason, scores = null) {
    await this.init()
    
    const versionId = this.generateVersionId()
    const timestamp = new Date()
    
    const version = {
      id: versionId,
      promptFile,
      timestamp: timestamp.toISOString(),
      author: process.env.USER || 'unknown',
      changeReason,
      contentHash: this.hashContent(content),
      scores,
      testResults: []
    }
    
    // コンテンツをファイルに保存
    const versionFile = path.join(this.versionsDir, `${versionId}.txt`)
    await fs.writeFile(versionFile, content)
    
    // メタデータをファイルに保存
    const metaFile = path.join(this.versionsDir, `${versionId}.json`)
    await fs.writeFile(metaFile, JSON.stringify(version, null, 2))
    
    // 履歴に追加
    const history = await this.loadHistory()
    history.versions.push(version)
    history.lastUpdated = timestamp.toISOString()
    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2))
    
    return versionId
  }

  /**
   * テスト結果の保存
   */
  async saveTestResult(versionId, testResult) {
    await this.init()
    
    const resultId = this.generateVersionId()
    const resultFile = path.join(this.resultsDir, `${resultId}.json`)
    
    const result = {
      id: resultId,
      versionId,
      timestamp: new Date().toISOString(),
      ...testResult
    }
    
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2))
    
    // 履歴のテスト結果に追加
    const history = await this.loadHistory()
    const version = history.versions.find(v => v.id === versionId)
    if (version) {
      version.testResults.push(resultId)
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2))
    }
    
    return resultId
  }

  /**
   * バージョンの取得
   */
  async getVersion(versionId) {
    const versionFile = path.join(this.versionsDir, `${versionId}.txt`)
    const metaFile = path.join(this.versionsDir, `${versionId}.json`)
    
    const content = await fs.readFile(versionFile, 'utf-8')
    const metadata = JSON.parse(await fs.readFile(metaFile, 'utf-8'))
    
    return {
      ...metadata,
      content
    }
  }

  /**
   * 最新バージョンの取得
   */
  async getLatestVersion(promptFile) {
    const history = await this.loadHistory()
    const versions = history.versions
      .filter(v => v.promptFile === promptFile)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    if (versions.length === 0) return null
    
    return await this.getVersion(versions[0].id)
  }

  /**
   * バージョン間の比較
   */
  async compareVersions(versionId1, versionId2) {
    const v1 = await this.getVersion(versionId1)
    const v2 = await this.getVersion(versionId2)
    
    return {
      version1: {
        id: v1.id,
        timestamp: v1.timestamp,
        changeReason: v1.changeReason
      },
      version2: {
        id: v2.id,
        timestamp: v2.timestamp,
        changeReason: v2.changeReason
      },
      contentDiff: this.generateDiff(v1.content, v2.content),
      scoresDiff: this.compareScores(v1.scores, v2.scores)
    }
  }

  /**
   * 履歴の検索
   */
  async searchHistory(query) {
    const history = await this.loadHistory()
    
    return history.versions.filter(v => {
      if (query.promptFile && v.promptFile !== query.promptFile) return false
      if (query.author && v.author !== query.author) return false
      if (query.fromDate && new Date(v.timestamp) < new Date(query.fromDate)) return false
      if (query.toDate && new Date(v.timestamp) > new Date(query.toDate)) return false
      if (query.minScore && v.scores?.overall < query.minScore) return false
      
      return true
    })
  }

  /**
   * 統計情報の取得
   */
  async getStats() {
    const history = await this.loadHistory()
    const now = new Date()
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    
    const recentVersions = history.versions.filter(
      v => new Date(v.timestamp) > oneWeekAgo
    )
    
    const stats = {
      totalVersions: history.versions.length,
      recentVersions: recentVersions.length,
      averageScore: this.calculateAverageScore(history.versions),
      mostEditedPrompt: this.findMostEdited(history.versions),
      scoreImprovement: this.calculateScoreImprovement(history.versions)
    }
    
    return stats
  }

  // ヘルパーメソッド
  
  async loadHistory() {
    try {
      const content = await fs.readFile(this.historyFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return { versions: [], lastUpdated: null }
    }
  }

  generateVersionId() {
    return `v${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
  }

  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  generateDiff(content1, content2) {
    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')
    const diff = []
    
    // 簡易的な差分表示
    const maxLines = Math.max(lines1.length, lines2.length)
    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] !== lines2[i]) {
        if (lines1[i] !== undefined) {
          diff.push({ line: i + 1, type: 'removed', content: lines1[i] })
        }
        if (lines2[i] !== undefined) {
          diff.push({ line: i + 1, type: 'added', content: lines2[i] })
        }
      }
    }
    
    return diff
  }

  compareScores(scores1, scores2) {
    if (!scores1 || !scores2) return null
    
    return {
      creativity: scores2.creativity - scores1.creativity,
      specificity: scores2.specificity - scores1.specificity,
      coherence: scores2.coherence - scores1.coherence,
      overall: scores2.overall - scores1.overall
    }
  }

  calculateAverageScore(versions) {
    const withScores = versions.filter(v => v.scores)
    if (withScores.length === 0) return 0
    
    const sum = withScores.reduce((acc, v) => acc + v.scores.overall, 0)
    return Math.round(sum / withScores.length)
  }

  findMostEdited(versions) {
    const counts = {}
    versions.forEach(v => {
      counts[v.promptFile] = (counts[v.promptFile] || 0) + 1
    })
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0] ? { file: sorted[0][0], count: sorted[0][1] } : null
  }

  calculateScoreImprovement(versions) {
    const byFile = {}
    
    versions.forEach(v => {
      if (!v.scores) return
      
      if (!byFile[v.promptFile]) {
        byFile[v.promptFile] = []
      }
      byFile[v.promptFile].push({
        timestamp: v.timestamp,
        score: v.scores.overall
      })
    })
    
    const improvements = {}
    Object.entries(byFile).forEach(([file, scores]) => {
      if (scores.length < 2) return
      
      scores.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      const first = scores[0].score
      const last = scores[scores.length - 1].score
      improvements[file] = last - first
    })
    
    return improvements
  }
}

module.exports = PromptStorage