import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// JSONフィールドから特定のデータを抽出
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      type, // 'topics', 'concepts' など
      filters = {},
      extract = [] // 抽出したいフィールド
    } = body

    let results: any[] = []

    switch (type) {
      case 'topics':
        // セッションからトピックを抽出
        const sessionsWithTopics = await prisma.viralSession.findMany({
          where: {
            topics: { not: null },
            ...filters
          },
          select: {
            id: true,
            theme: true,
            createdAt: true,
            topics: true
          }
        })

        sessionsWithTopics.forEach(session => {
          const topics = (session.topics as any).parsed || []
          topics.forEach((topic: any) => {
            const extracted: any = {
              sessionId: session.id,
              sessionTheme: session.theme,
              sessionDate: session.createdAt
            }
            
            // 指定されたフィールドを抽出
            if (extract.length > 0) {
              extract.forEach((field: string) => {
                extracted[field] = topic[field]
              })
            } else {
              // 全フィールドを含める
              Object.assign(extracted, topic)
            }
            
            results.push(extracted)
          })
        })
        break

      case 'concepts':
        // セッションからコンセプトを抽出
        const sessionsWithConcepts = await prisma.viralSession.findMany({
          where: {
            concepts: { not: null },
            ...filters
          },
          select: {
            id: true,
            theme: true,
            createdAt: true,
            concepts: true
          }
        })

        sessionsWithConcepts.forEach(session => {
          const concepts = session.concepts as any[]
          concepts.forEach((concept: any) => {
            const extracted: any = {
              sessionId: session.id,
              sessionTheme: session.theme,
              sessionDate: session.createdAt
            }
            
            if (extract.length > 0) {
              extract.forEach((field: string) => {
                // ネストされたフィールドも対応
                if (field.includes('.')) {
                  const [parent, child] = field.split('.')
                  extracted[`${parent}_${child}`] = concept[parent]?.[child]
                } else {
                  extracted[field] = concept[field]
                }
              })
            } else {
              Object.assign(extracted, concept)
            }
            
            results.push(extracted)
          })
        })
        break

      case 'sources':
        // トピックから全てのソースURLを抽出
        const sessionsWithSources = await prisma.viralSession.findMany({
          where: {
            topics: { not: null },
            ...filters
          },
          select: {
            id: true,
            theme: true,
            topics: true
          }
        })

        sessionsWithSources.forEach(session => {
          const topics = (session.topics as any).parsed || []
          topics.forEach((topic: any) => {
            // メインURL
            if (topic.url) {
              results.push({
                sessionId: session.id,
                theme: session.theme,
                type: 'main',
                url: topic.url,
                title: topic.TOPIC,
                date: topic.date
              })
            }
            
            // 追加ソース
            if (topic.additionalSources) {
              topic.additionalSources.forEach((source: any) => {
                results.push({
                  sessionId: session.id,
                  theme: session.theme,
                  type: 'additional',
                  url: source.url,
                  title: source.title,
                  date: source.date
                })
              })
            }
          })
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: topics, concepts, or sources' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      type,
      count: results.length,
      data: results
    })

  } catch (error) {
    console.error('[DB Extract] Error:', error)
    return NextResponse.json(
      { error: 'Extract failed', details: error.message },
      { status: 500 }
    )
  }
}

// 使用例
export async function GET() {
  return NextResponse.json({
    usage: 'POST /api/viral/v2/db/extract',
    examples: [
      {
        description: '全てのトピックのURLとタイトルを抽出',
        body: {
          type: 'topics',
          extract: ['url', 'TOPIC', 'date']
        }
      },
      {
        description: '特定テーマのコンセプトからフックを抽出',
        body: {
          type: 'concepts',
          filters: { theme: 'AIと働き方' },
          extract: ['structure.openingHook', 'angle', 'format']
        }
      },
      {
        description: '過去7日間の全ソースURL',
        body: {
          type: 'sources',
          filters: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      }
    ]
  })
}