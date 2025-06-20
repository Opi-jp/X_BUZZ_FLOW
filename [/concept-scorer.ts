/**
 * Advanced concept scoring and filtering system
 */

interface ConceptScore {
  conceptId: string
  totalScore: number
  breakdown: {
    angleScore: number
    hookScore: number
    timingScore: number
    platformScore: number
    uniquenessScore: number
  }
  recommendation: string
}

interface ScoringContext {
  platform: string
  style: string
  theme: string
  currentTime?: Date
}

/**
 * Scores a concept based on multiple factors
 */
export function scoreConceptAdvanced(
  concept: any,
  context: ScoringContext,
  allConcepts: any[]
): ConceptScore {
  const breakdown = {
    angleScore: scoreAngleEffectiveness(concept, context),
    hookScore: scoreHookEffectiveness(concept, context),
    timingScore: scoreTimingRelevance(concept, context),
    platformScore: scorePlatformFit(concept, context),
    uniquenessScore: scoreUniqueness(concept, allConcepts)
  }
  
  // Weighted average
  const weights = {
    angleScore: 0.3,
    hookScore: 0.25,
    timingScore: 0.15,
    platformScore: 0.2,
    uniquenessScore: 0.1
  }
  
  const totalScore = Object.entries(breakdown).reduce(
    (sum, [key, score]) => sum + score * weights[key as keyof typeof weights],
    0
  )
  
  const recommendation = getRecommendation(totalScore, breakdown)
  
  return {
    conceptId: concept.conceptId,
    totalScore: Math.round(totalScore),
    breakdown,
    recommendation
  }
}

/**
 * Scores angle effectiveness
 */
function scoreAngleEffectiveness(concept: any, context: ScoringContext): number {
  let score = 70
  const angles = concept.angleCombination || [concept.angle]
  
  // Theme-angle alignment
  if (context.theme.includes('AI') || context.theme.includes('テクノロジー')) {
    if (angles.includes('未来予測') || angles.includes('専門家分析')) {
      score += 15
    }
  }
  
  if (context.theme.includes('ビジネス') || context.theme.includes('働き方')) {
    if (angles.includes('ケーススタディ') || angles.includes('データ駆動')) {
      score += 12
    }
  }
  
  // Multi-angle synergy bonus
  if (angles.length > 1) {
    score += 5
    if (hasGoodSynergy(angles)) {
      score += 10
    }
  }
  
  return Math.min(score, 100)
}

/**
 * Scores hook effectiveness
 */
function scoreHookEffectiveness(concept: any, context: ScoringContext): number {
  let score = 75
  const hooks = concept.hookCombination || [concept.hookType]
  
  // Platform-specific hook preferences
  if (context.platform === 'Twitter') {
    if (hooks.includes('問い・未完性') || hooks.includes('意外性')) {
      score += 10
    }
  } else if (context.platform === 'LinkedIn') {
    if (hooks.includes('数字・ロジック') || hooks.includes('自己投影')) {
      score += 10
    }
  }
  
  // Style alignment
  if (context.style === '洞察的' && hooks.includes('意外性')) {
    score += 5
  }
  if (context.style === '教育的' && hooks.includes('数字・ロジック')) {
    score += 5
  }
  
  return Math.min(score, 100)
}

/**
 * Scores timing relevance
 */
function scoreTimingRelevance(concept: any, context: ScoringContext): number {
  let score = 80
  const now = context.currentTime || new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  
  // Timing suggestions in concept
  if (concept.timing) {
    if (concept.timing.includes('朝') && hour >= 6 && hour <= 9) {
      score += 10
    }
    if (concept.timing.includes('昼') && hour >= 11 && hour <= 13) {
      score += 10
    }
    if (concept.timing.includes('夕方') && hour >= 17 && hour <= 19) {
      score += 10
    }
    if (concept.timing.includes('週末') && (dayOfWeek === 0 || dayOfWeek === 6)) {
      score += 5
    }
  }
  
  return Math.min(score, 100)
}

/**
 * Scores platform fit
 */
function scorePlatformFit(concept: any, context: ScoringContext): number {
  let score = 80
  
  if (context.platform === 'Twitter') {
    if (concept.format === 'thread') score += 10
    if (concept.format === 'single' && concept.structure?.mainContent?.includes('簡潔')) score += 5
  } else if (context.platform === 'LinkedIn') {
    if (concept.format === 'carousel') score += 10
    if (concept.angles?.includes('専門家分析')) score += 5
  } else if (context.platform === 'Instagram') {
    if (concept.format === 'carousel') score += 15
    if (concept.visual && concept.visual.includes('ビジュアル')) score += 5
  }
  
  return Math.min(score, 100)
}

/**
 * Scores uniqueness compared to other concepts
 */
function scoreUniqueness(concept: any, allConcepts: any[]): number {
  let score = 90
  const angles = concept.angleCombination || [concept.angle]
  
  // Check for similar angle combinations
  allConcepts.forEach(other => {
    if (other.conceptId === concept.conceptId) return
    
    const otherAngles = other.angleCombination || [other.angle]
    const overlap = angles.filter(a => otherAngles.includes(a)).length
    
    if (overlap === angles.length && angles.length === otherAngles.length) {
      score -= 20 // Identical combination
    } else if (overlap > 0) {
      score -= overlap * 5 // Partial overlap
    }
  })
  
  return Math.max(score, 50)
}

/**
 * Checks if angles have good synergy
 */
function hasGoodSynergy(angles: string[]): boolean {
  const goodCombos = [
    ['個人体験談', 'データ駆動'],
    ['専門家分析', '舞台裏暴露'],
    ['神話破壊', 'データ駆動'],
    ['ケーススタディ', '未来予測'],
    ['問題提起型', '歴史的比較']
  ]
  
  return goodCombos.some(combo => 
    combo.every(angle => angles.includes(angle))
  )
}

/**
 * Generates recommendation based on scores
 */
function getRecommendation(totalScore: number, breakdown: any): string {
  if (totalScore >= 90) {
    return '最優先で投稿すべき'
  } else if (totalScore >= 80) {
    return '高い効果が期待できる'
  } else if (totalScore >= 70) {
    return '良好な選択肢'
  } else if (totalScore >= 60) {
    return '改善の余地あり'
  } else {
    return '再検討を推奨'
  }
}

/**
 * Filters and ranks concepts
 */
export function filterAndRankConcepts(
  concepts: any[],
  context: ScoringContext,
  options: {
    minScore?: number
    maxConcepts?: number
    diversityBonus?: boolean
  } = {}
): any[] {
  const { minScore = 70, maxConcepts = 10, diversityBonus = true } = options
  
  // Score all concepts
  const scoredConcepts = concepts.map(concept => ({
    ...concept,
    scoring: scoreConceptAdvanced(concept, context, concepts)
  }))
  
  // Filter by minimum score
  let filtered = scoredConcepts.filter(c => c.scoring.totalScore >= minScore)
  
  // Apply diversity bonus if enabled
  if (diversityBonus) {
    filtered = applyDiversityBonus(filtered)
  }
  
  // Sort by total score
  filtered.sort((a, b) => b.scoring.totalScore - a.scoring.totalScore)
  
  // Limit to max concepts
  return filtered.slice(0, maxConcepts)
}

/**
 * Applies diversity bonus to encourage variety
 */
function applyDiversityBonus(concepts: any[]): any[] {
  const angleUsage = new Map<string, number>()
  
  return concepts.map(concept => {
    const angles = concept.angleCombination || [concept.angle]
    let diversityBonus = 0
    
    angles.forEach(angle => {
      const usage = angleUsage.get(angle) || 0
      if (usage === 0) {
        diversityBonus += 5 // First use of angle
      } else if (usage === 1) {
        diversityBonus += 2 // Second use
      }
      angleUsage.set(angle, usage + 1)
    })
    
    return {
      ...concept,
      scoring: {
        ...concept.scoring,
        totalScore: Math.min(concept.scoring.totalScore + diversityBonus, 100)
      }
    }
  })
}