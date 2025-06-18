/**
 * Helper functions for enhanced concept generation
 */

/**
 * Ensures balanced distribution of formats across concepts
 */
export function getBalancedFormats(count: number = 8): string[] {
  const formats = ['single', 'thread', 'carousel']
  const result: string[] = []
  
  // First, ensure each format appears at least twice
  formats.forEach(format => {
    result.push(format)
    result.push(format)
  })
  
  // Fill remaining slots with balanced distribution
  while (result.length < count) {
    result.push(formats[result.length % formats.length])
  }
  
  // Shuffle to avoid predictable patterns
  return result.sort(() => Math.random() - 0.5)
}

/**
 * Scores angle combinations based on effectiveness
 */
export function scoreAngleCombination(
  angles: string[],
  platform: string,
  style: string
): { score: number; factors: string[] } {
  let score = 70 // Base score
  const factors: string[] = []
  
  // Platform-specific scoring
  if (platform === 'Twitter') {
    if (angles.includes('問題提起型') || angles.includes('反対派視点')) {
      score += 10
      factors.push('議論を呼ぶ')
    }
    if (angles.includes('データ駆動') && angles.includes('神話破壊')) {
      score += 8
      factors.push('ファクトチェック需要')
    }
  } else if (platform === 'LinkedIn') {
    if (angles.includes('専門家分析') || angles.includes('ケーススタディ')) {
      score += 12
      factors.push('プロフェッショナル向け')
    }
  }
  
  // Style-specific scoring
  if (style === '洞察的' && angles.includes('未来予測')) {
    score += 5
    factors.push('先見性')
  }
  if (style === '教育的' && angles.includes('教育的解説')) {
    score += 5
    factors.push('学習価値')
  }
  
  // Combination synergies
  if (angles.includes('個人体験談') && angles.includes('データ駆動')) {
    score += 7
    factors.push('信頼性と共感')
  }
  if (angles.includes('舞台裏暴露') && angles.includes('専門家分析')) {
    score += 8
    factors.push('独占情報')
  }
  
  // Cap score at 95
  score = Math.min(score, 95)
  
  return { score, factors }
}

/**
 * Generates diverse angle combinations
 */
export function generateAngleCombinations(availableAngles: string[], count: number = 8): string[][] {
  const combinations: string[][] = []
  const usedCombinations = new Set<string>()
  
  // Single angles for variety
  for (let i = 0; i < Math.floor(count / 3); i++) {
    combinations.push([availableAngles[i % availableAngles.length]])
  }
  
  // Two-angle combinations
  for (let i = 0; i < Math.floor(count / 3); i++) {
    let combo: string[]
    do {
      const angle1 = availableAngles[Math.floor(Math.random() * availableAngles.length)]
      const angle2 = availableAngles[Math.floor(Math.random() * availableAngles.length)]
      if (angle1 !== angle2) {
        combo = [angle1, angle2].sort()
        if (!usedCombinations.has(combo.join('+'))) {
          usedCombinations.add(combo.join('+'))
          combinations.push(combo)
          break
        }
      }
    } while (true)
  }
  
  // Three-angle combinations for remaining slots
  while (combinations.length < count) {
    let combo: string[]
    do {
      const angle1 = availableAngles[Math.floor(Math.random() * availableAngles.length)]
      const angle2 = availableAngles[Math.floor(Math.random() * availableAngles.length)]
      const angle3 = availableAngles[Math.floor(Math.random() * availableAngles.length)]
      if (angle1 !== angle2 && angle2 !== angle3 && angle1 !== angle3) {
        combo = [angle1, angle2, angle3].sort()
        if (!usedCombinations.has(combo.join('+'))) {
          usedCombinations.add(combo.join('+'))
          combinations.push(combo)
          break
        }
      }
    } while (true)
  }
  
  return combinations
}

/**
 * Hook combination suggestions based on angle
 */
export function suggestHookCombination(angles: string[]): string[] {
  const hookMap: Record<string, string[]> = {
    '反対派視点': ['意外性', '問い・未完性'],
    '専門家分析': ['数字・ロジック', '意外性'],
    '個人体験談': ['自己投影', '緊急性'],
    '教育的解説': ['数字・ロジック', '自己投影'],
    '未来予測': ['緊急性', '問い・未完性'],
    '舞台裏暴露': ['意外性', '緊急性'],
    '歴史的比較': ['意外性', '数字・ロジック'],
    '神話破壊': ['意外性', '問い・未完性'],
    'ケーススタディ': ['数字・ロジック', '自己投影'],
    'データ駆動': ['数字・ロジック', '意外性'],
    '問題提起型': ['問い・未完性', '緊急性'],
    'ライフハック': ['自己投影', '緊急性']
  }
  
  const hooks = new Set<string>()
  angles.forEach(angle => {
    const suggested = hookMap[angle] || []
    suggested.forEach(hook => hooks.add(hook))
  })
  
  return Array.from(hooks).slice(0, 2) // Return max 2 hooks
}