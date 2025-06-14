import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1日10ツイート自動生成システム
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date = new Date().toISOString().split('T')[0] } = body

    // 投稿スケジュール（1日10回）
    const tweetSchedule = [
      { time: '07:00', type: 'morning_insight', theme: '朝の気づき・洞察' },
      { time: '08:30', type: 'rp_comment', theme: 'バズツイートへのRP' },
      { time: '10:00', type: 'experience_tip', theme: '23年の経験からのTips' },
      { time: '11:30', type: 'rp_comment', theme: 'AIニュースへのRP' },
      { time: '13:00', type: 'contrarian_view', theme: '逆張り視点' },
      { time: '15:00', type: 'rp_comment', theme: '働き方系ツイートへのRP' },
      { time: '17:00', type: 'future_prediction', theme: '未来予測・業界洞察' },
      { time: '19:00', type: 'rp_comment', theme: '夕方のバズツイートRP' },
      { time: '21:00', type: 'deep_insight', theme: '深い洞察・問題提起' },
      { time: '22:30', type: 'tomorrow_prep', theme: '明日への準備・まとめ' }
    ]

    const generatedTweets = []

    // 各時間帯の投稿を生成
    for (const schedule of tweetSchedule) {
      let content = ''
      
      if (schedule.type === 'rp_comment') {
        // RP投稿の生成
        const rpContent = await generateRPTweet(schedule.theme)
        content = rpContent
      } else {
        // オリジナル投稿の生成
        content = await generateOriginalTweet(schedule.type, schedule.theme)
      }

      // スケジュール投稿として保存
      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          content,
          scheduledTime: new Date(`${date}T${schedule.time}:00.000+09:00`),
          status: 'DRAFT',
          postType: schedule.type === 'rp_comment' ? 'QUOTE' : 'NEW',
          aiGenerated: true,
          aiPrompt: `${schedule.theme} - 自動生成`
        }
      })

      generatedTweets.push({
        id: scheduledPost.id,
        time: schedule.time,
        type: schedule.type,
        theme: schedule.theme,
        content: content.substring(0, 100) + '...',
        fullContent: content
      })
    }

    return NextResponse.json({
      success: true,
      message: `${date}の10ツイートを自動生成しました`,
      tweets: generatedTweets,
      summary: {
        totalGenerated: generatedTweets.length,
        originalTweets: generatedTweets.filter(t => t.type !== 'rp_comment').length,
        rpTweets: generatedTweets.filter(t => t.type === 'rp_comment').length,
        date
      }
    })

  } catch (error) {
    console.error('Daily tweets generation error:', error)
    return NextResponse.json(
      { error: '自動生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// オリジナル投稿の生成
async function generateOriginalTweet(type: string, theme: string): Promise<string> {
  const templates: Record<string, string[]> = {
    morning_insight: [
      "朝の気づき：23年のクリエイティブ業界で学んだことは「{insight}」。AI時代でも変わらない本質がある。\n\n{detail}\n\n#朝の気づき #クリエイティブ #AI時代",
      "50代の朝。今日も若者とは違う視点で世界を見てみよう。\n\n{observation}\n\n経験の蓄積って、こういう時に活きるんだよね。"
    ],
    
    contrarian_view: [
      "みんなが「{trend}」って言ってるけど、23年の経験から言うと逆かもしれない。\n\n{reasoning}\n\n逆張りこそ、新しい発見の源泉。",
      "流行に乗るのは簡単。でも50代の役割は「本当にそうか？」と問い続けること。\n\n{question}\n\n#逆張り思考 #50代の視点"
    ],
    
    experience_tip: [
      "【50代からのAI活用術】\n\n{tip_title}\n\n{tip_detail}\n\n若者にはない「経験×AI」の組み合わせが、実は最強かもしれない。",
      "23年間で培った{skill}の経験が、AI時代で意外に活きる理由：\n\n{reasons}\n\nアナログ知識こそ、デジタル時代の武器。"
    ],
    
    future_prediction: [
      "10年後の{industry}業界を予想してみる。\n\n{prediction}\n\n50代だからこそ見える長期トレンド。過去のパターンから未来を読む。",
      "1990年代の{past_experience}と今の{current_trend}、パターンが似てる。\n\n{analysis}\n\n歴史は繰り返すのか、それとも...？"
    ],
    
    deep_insight: [
      "夜に考える深い話。\n\n{deep_question}\n\n{analysis}\n\n50代の夜は、こんな思考に耽る。答えは出ないけど、考え続けることに意味がある。",
      "AI時代の本質的な問題：\n\n{problem}\n\n{perspective}\n\n23年の業界経験から見えてくる、若者には気づけない盲点。"
    ],
    
    tomorrow_prep: [
      "今日も一日お疲れさま。\n\n明日は{tomorrow_focus}に注目してみよう。\n\n{prep_thoughts}\n\n50代の明日への準備は、若者とは少し違う。"
    ]
  }

  const typeTemplates = templates[type] || templates.morning_insight
  const template = typeTemplates[Math.floor(Math.random() * typeTemplates.length)]

  // テンプレートに具体的な内容を挿入
  const content = await fillTemplate(template, type)
  
  return content
}

// RP投稿の生成
async function generateRPTweet(theme: string): Promise<string> {
  // 最新のバズツイートを取得
  const recentPosts = await prisma.buzzPost.findMany({
    where: {
      postedAt: {
        gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6時間以内
      },
      likesCount: { gte: 1000 }
    },
    orderBy: { likesCount: 'desc' },
    take: 10
  })

  if (recentPosts.length === 0) {
    return generateOriginalTweet('experience_tip', 'フォールバック投稿')
  }

  const targetPost = recentPosts[Math.floor(Math.random() * Math.min(3, recentPosts.length))]

  // あなたの視点でRPコメントを生成
  const rpTemplates = [
    "これ、23年のクリエイティブ業界での経験と重なる。\n\n{personal_insight}\n\n50代だからこそ見える視点かもしれない。",
    "若者の視点は新鮮だけど、長期的に見ると{long_term_view}。\n\n{experience_based_comment}\n\n世代を超えた対話って大切。",
    "1990年代にも似たような{comparison}があった。\n\n{historical_perspective}\n\n技術は変わっても、人間の本質は案外変わらない。",
    "この視点に、映像制作での{technique_parallel}を重ねてみると面白い。\n\n{creative_insight}\n\nクリエイティブの発想法は業界を超えて活きる。"
  ]

  const template = rpTemplates[Math.floor(Math.random() * rpTemplates.length)]
  
  // 元投稿の内容を分析してRPコメントを作成
  const rpContent = await generateRPComment(targetPost.content, template)
  
  return `${rpContent}\n\n(元ツイート: @${targetPost.authorUsername})`
}

// テンプレートに具体的な内容を挿入
async function fillTemplate(template: string, type: string): Promise<string> {
  const fillData: Record<string, string[]> = {
    insight: [
      "クライアントの本当のニーズは言葉にならない",
      "技術より人間関係が成功を左右する",
      "完璧な企画より実行力のある8割案"
    ],
    detail: [
      "AIに指示を出すときも同じ。表面的な要求の奥にある真意を読み取る力が重要。",
      "どんなに優秀なAIツールも、使う人間の関係性で結果が変わる。",
      "GPTに完璧なプロンプトを求めるより、8割の精度で素早く試行錯誤する方が成果に繋がる。"
    ],
    trend: [
      "AI効率化",
      "Z世代の働き方",
      "リモートワーク最適化"
    ],
    reasoning: [
      "効率化を求めすぎると、創造性が失われる。回り道にこそ新しいアイデアが潜んでる。",
      "若い人の発想は素晴らしいが、継続性や持続可能性の視点が抜けがち。",
      "完全リモートより、たまに会う方が深い議論ができる。物理的な偶然性が創造を生む。"
    ]
  }

  let result = template
  
  // プレースホルダーを実際の内容に置換
  const keys = Object.keys(fillData)
  for (const key of keys) {
    const pattern = new RegExp(`{${key}}`, 'g')
    if (result.includes(`{${key}}`)) {
      const randomValue = fillData[key][Math.floor(Math.random() * fillData[key].length)]
      result = result.replace(pattern, randomValue)
    }
  }

  // 残りのプレースホルダーを汎用的な内容で置換
  result = result.replace(/{[^}]+}/g, (match) => {
    const genericFills = [
      "業界の本質的な変化",
      "長期的な視点の重要性",
      "経験と新技術の融合",
      "創造性とテクノロジーのバランス"
    ]
    return genericFills[Math.floor(Math.random() * genericFills.length)]
  })

  return result
}

// RPコメントの生成
async function generateRPComment(originalContent: string, template: string): Promise<string> {
  // 元投稿の内容を分析して関連するコメントを生成
  const keywords = extractKeywords(originalContent)
  
  const commentData = {
    personal_insight: "映像制作での類似体験がこれを裏付けてくれる",
    long_term_view: "10年後を見据えると別の答えが見えてくる",
    experience_based_comment: "23年の業界経験からすると、もう一つの見方がある",
    comparison: "技術変革",
    historical_perspective: "あの時も同じような議論があったが、結果は予想と違った",
    technique_parallel: "ビジュアルストーリーテリング",
    creative_insight: "異なる視点を重ねることで、新しい可能性が見えてくる"
  }

  let result = template
  for (const [key, value] of Object.entries(commentData)) {
    result = result.replace(`{${key}}`, value)
  }

  return result
}

// キーワード抽出（簡易版）
function extractKeywords(text: string): string[] {
  const words = text.split(/[\s\u3000\u3001\u3002\uff0c\uff0e]+/)
  return words.filter(word => word.length > 2).slice(0, 5)
}