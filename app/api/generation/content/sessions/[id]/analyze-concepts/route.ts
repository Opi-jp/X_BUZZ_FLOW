import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { filterAndRankConcepts } from '@/lib/concept-scorer'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    // Get session with concepts
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (!session || !session.concepts) {
      return NextResponse.json(
        { error: 'Session or concepts not found' },
        { status: 404 }
      )
    }
    
    const concepts = session.concepts as any[]
    
    // Analyze and rank concepts
    const rankedConcepts = filterAndRankConcepts(
      concepts,
      {
        platform: session.platform,
        style: session.style,
        theme: session.theme
      },
      {
        minScore: 0, // Show all for analysis
        maxConcepts: concepts.length,
        diversityBonus: true
      }
    )
    
    // Group by topic
    const conceptsByTopic = rankedConcepts.reduce((acc, concept) => {
      const topicId = concept.conceptId.split('_')[0]
      if (!acc[topicId]) {
        acc[topicId] = []
      }
      acc[topicId].push(concept)
      return acc
    }, {} as Record<string, any[]>)
    
    // Calculate statistics
    const stats = {
      totalConcepts: concepts.length,
      averageScore: Math.round(
        rankedConcepts.reduce((sum, c) => sum + c.scoring.totalScore, 0) / rankedConcepts.length
      ),
      highScoringConcepts: rankedConcepts.filter(c => c.scoring.totalScore >= 85).length,
      angleDistribution: calculateAngleDistribution(rankedConcepts),
      formatDistribution: calculateFormatDistribution(rankedConcepts),
      topPerformers: rankedConcepts.slice(0, 5).map(c => ({
        conceptId: c.conceptId,
        score: c.scoring.totalScore,
        angle: c.angleCombination?.join(' + ') || c.angle,
        recommendation: c.scoring.recommendation
      }))
    }
    
    return NextResponse.json({
      session: {
        id: session.id,
        theme: session.theme,
        platform: session.platform,
        style: session.style
      },
      rankedConcepts,
      conceptsByTopic,
      stats
    })
    
  } catch (error) {
    console.error('Error analyzing concepts:', error)
    return NextResponse.json(
      { error: 'Failed to analyze concepts' },
      { status: 500 }
    )
  }
}

function calculateAngleDistribution(concepts: any[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  
  concepts.forEach(concept => {
    const angles = concept.angleCombination || [concept.angle]
    angles.forEach((angle: string) => {
      distribution[angle] = (distribution[angle] || 0) + 1
    })
  })
  
  return distribution
}

function calculateFormatDistribution(concepts: any[]): Record<string, number> {
  const distribution: Record<string, number> = {}
  
  concepts.forEach(concept => {
    distribution[concept.format] = (distribution[concept.format] || 0) + 1
  })
  
  return distribution
}