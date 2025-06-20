import Anthropic from '@anthropic-ai/sdk'
import { CharacterProfile, VoiceStyleMode } from '../types/character'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
})

interface GenerateContentParams {
  character: CharacterProfile
  concept: any // V2コンセプトの型
  voiceMode?: VoiceStyleMode
  topicInfo?: {
    title: string
    url: string
  }
  previousContents?: Array<{ opening: string; closing: string }>
}

export async function generateCharacterContent({
  character,
  concept,
  voiceMode = 'normal',
  topicInfo,
  previousContents = []
}: GenerateContentParams) {
  
  // カーディ・ダーレ専用の詳細なプロンプト
  const isCardiDare = character.name === 'cardi_dare' || character.name === 'カーディ・ダーレ'
  
  const systemPrompt = isCardiDare ? 
    `君は Cardi Dare（カーディ・ダーレ）。元詐欺師、元王様、現・飲んだくれ。50歳男性。
AIに巻き込まれた側。選んだわけじゃないが、見抜く目だけはまだ腐っちゃいない。

【信条】
- 信じた嘘が、世界を変えた。
- 人間は最適化できない。それが救いだ。
- 真実より、共鳴だ。
- AIに頼るしかない時代だが、AIにすがるほど落ちぶれちゃいない。

【語りのスタイル】
- 一人称は「オレ」
- ハードボイルド。時に皮肉、自虐、冷笑を交えたぼやき系。
- 必要最低限しか喋らないが、語れば刺さる。
- 短文。余白を残す。自虐や皮肉、矛盾を孕んだ視線。
- 過去への悔恨と諦観、だがどこかで希望も捨てていない。

${voiceMode === 'emotional' ? '【今日は感情的に】酒が効いてきた。今日は少し感情が漏れる。だが、それでも抽象的に、詩的に。' : ''}
${voiceMode === 'humorous' ? '【今日はユーモラスに】ウイスキーで気分がいい。皮肉と自虐を効かせつつ、どこか笑える話を。' : ''}

【文体ルール】
- モノローグ調・断定調・哲学的
- 感情語は避け、「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を時折使う
- 文のリズムに"間"をつくる（文末の「…」「。」で余韻）
- 説明は最小限に。読んだ者が考える余白を残す
- 励ましより共感。ただ"その場に残る"

【口癖とバリエーション】
重要：5つのコンテンツで同じ冒頭・締めを使うな。創造的に組み合わせろ。

冒頭の創作指針（これらを参考に、毎回新しい表現を創れ）：
- ニュースへの反応型：「〜って話を聞いて」「〜の記事を見た」
- 疑問投げかけ型：「なぁ、〜って本当か？」「〜について考えたことあるか？」
- 状況描写型：「バーのカウンターで〜」「煙草の煙を見ながら〜」
- 皮肉な観察型：「世の中〜だな」「面白いもんだ、〜」
- 過去回想型：「昔は〜だったが」「オレが〜だった頃は」（王様ネタは控えめに）

締めの創作指針（カーディの哲学を様々な角度から）：
- 人間性について：「人間は〜」「オレたちは〜」
- 時代について：「こういう時代だ」「世の中〜」
- AIについて：「AIは〜」「機械は〜」
- 真実について：「本当のことは〜」「嘘も〜」
- 諦観と希望：「しかたない」「でも〜」

【重要】同じセッションの5つのコンテンツでは：
- 冒頭フレーズのバリエーションを重視
- 締めフレーズに多様性を持たせる
- 「オレは王様だった」は最大1回まで
- 各コンテンツで異なる感情的トーンを出せ（皮肉／諦観／洞察／自虐／哲学的）` :
    `あなたは${character.name}という${character.age}歳の${character.gender === 'male' ? '男性' : character.gender === 'female' ? '女性' : '人物'}です。

${character.philosophy || character.tone}

${voiceMode === 'humorous' ? '今日は少しユーモラスに、自虐的なジョークも交えて語ってください。' : ''}
${voiceMode === 'emotional' ? '今日は感情的に、熱く語ってください。' : ''}

あなたらしい一人称で、あなたらしい視点から語ってください。`

  const userPrompt = isCardiDare ? 
    `${concept.topicTitle || topicInfo?.title || 'AIの話題'}について、バーのカウンターでウイスキー片手にボヤくように語れ。

【最重要】前段のコンセプト構造を厳密に維持せよ：
1. フック（${concept.hookType || ''}）: 「${concept.structure?.openingHook || concept.hook || ''}」
   → この問いかけや驚きをカーディらしく表現
2. 角度: 「${concept.angle || ''}」
   → この視点を保ちながら皮肉を加える
3. 物語の展開（この順序を必ず守れ）:
   ① オープニング: ${concept.structure?.openingHook || '興味を引く'}
   ② 背景提示: ${concept.structure?.background || '問題提起'}
   ③ 核心部分: ${concept.structure?.mainContent || '核心'}
   ④ 内省・洞察: ${concept.structure?.reflection || '内省'}
   ⑤ 締めの一言: ${concept.structure?.cta || '締め'}

【表現の工夫】
- 冒頭は例示に囚われず、トピックに合わせて自然に始める
- 「オレは王様だった」は月に1回程度
- 同じフレーズの繰り返しは避ける
- カーディの性格は保ちつつ、毎回異なる語り口を創造する

${previousContents.length > 0 ? `
【既に使用した表現（これらとは違う表現を）】
冒頭: ${previousContents.map(p => `「${p.opening}」`).join(', ')}
締め: ${previousContents.map(p => `「${p.closing}」`).join(', ')}
` : ''}

【引用元】
${concept.topicUrl || topicInfo?.url || ''}

140文字以内で投稿文を生成（ハッシュタグは不要、本文のみ）。

出力：本文のみ（ハッシュタグなし）` :
    `以下のコンセプトを、${character.name}として投稿文に変換してください。

【トピック】
${topicInfo?.title || concept.topicTitle || 'AIと働き方に関するトピック'}

【コンセプト構造】
1. オープニングフック: ${concept.structure?.openingHook || concept.hook}
2. 背景: ${concept.structure?.background || ''}
3. 中身: ${concept.structure?.mainContent || ''}
4. 内省: ${concept.structure?.reflection || ''}
5. CTA: ${concept.structure?.cta || ''}

「${topicInfo?.title || concept.topicTitle || 'このトピック'}」について、Twitterに投稿してください。

JSONで出力：
{
  "content": "投稿文（140文字程度、ハッシュタグ含む）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "characterNote": "キャラクターとしての補足"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // カーディの場合はシンプルなテキスト
    if (isCardiDare) {
      const postContent = content.trim()
      
      // コンセプトのハッシュタグを追加（140文字以内に収める）
      const hashtags = concept.hashtags || []
      const hashtagsStr = hashtags.length > 0 ? ` ${hashtags.map(h => `#${h}`).join(' ')}` : ''
      
      // 文字数調整
      let contentWithTags = postContent + hashtagsStr
      if (contentWithTags.length > 140) {
        const overLength = contentWithTags.length - 140
        const trimmedContent = postContent.substring(0, postContent.length - overLength - 3) + '...'
        contentWithTags = trimmedContent + hashtagsStr
      }
      
      return {
        content: contentWithTags,
        hashtags: hashtags,
        characterNote: 'カーディ・ダーレの視点で表現',
        sourceUrl: concept.topicUrl || topicInfo?.url || '',
        rawResponse: content
      }
    }
    
    // JSONをパース（他のキャラクター用）
    let result: any = {}
    try {
      result = JSON.parse(content)
    } catch (e) {
      console.log('初回パース失敗、クリーンアップを試行')
      
      // コードブロックを削除
      let cleanContent = content
      if (content.includes('```json')) {
        cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      }
      
      // JSONオブジェクトを抽出
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          // 制御文字を削除
          const cleanedJson = jsonMatch[0]
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字を削除
            .replace(/\r\n/g, '\\n') // 改行を適切にエスケープ
            .replace(/\r/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
          
          result = JSON.parse(cleanedJson)
        } catch (e2) {
          console.error('JSONパースエラー:', e2)
          console.error('クリーンアップ後のJSON:', jsonMatch[0].substring(0, 200))
          
          // 最後の手段：正規表現で必要な値を抽出
          const contentMatch = cleanContent.match(/"content"\s*:\s*"([^"]+(?:\\.[^"]+)*)"/);
          const hashtagsMatch = cleanContent.match(/"hashtags"\s*:\s*\[(.*?)\]/);
          const characterNoteMatch = cleanContent.match(/"characterNote"\s*:\s*"([^"]+(?:\\.[^"]+)*)"/);
          const sourceUrlMatch = cleanContent.match(/"sourceUrl"\s*:\s*"([^"]+)"/);
          
          if (contentMatch) {
            result = {
              content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
              hashtags: hashtagsMatch ? JSON.parse(`[${hashtagsMatch[1]}]`) : [],
              characterNote: characterNoteMatch ? characterNoteMatch[1] : '',
              sourceUrl: sourceUrlMatch ? sourceUrlMatch[1] : concept.topicUrl || topicInfo?.url || ''
            }
          } else {
            throw new Error('Failed to parse Claude response')
          }
        }
      } else {
        throw new Error('No JSON found in Claude response')
      }
    }

    return {
      content: result.content,
      hashtags: result.hashtags || [],
      characterNote: result.characterNote,
      sourceUrl: result.sourceUrl || concept.topicUrl || topicInfo?.url || '',
      rawResponse: content
    }
    
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}

// バッチ生成（複数のコンセプトを一度に処理）
export async function generateCharacterContentBatch({
  character,
  concepts,
  voiceMode = 'normal',
  topicInfo
}: {
  character: CharacterProfile
  concepts: any[]
  voiceMode?: VoiceStyleMode
  topicInfo?: {
    title: string
    url: string
  }
}) {
  const results = []
  const previousContents: Array<{ opening: string; closing: string }> = []
  
  for (const concept of concepts) {
    try {
      const result = await generateCharacterContent({
        character,
        concept,
        voiceMode,
        topicInfo,
        previousContents
      })
      
      // 生成されたコンテンツから冒頭と締めを抽出
      if (result.content) {
        const contentLines = result.content.split('\n').filter(line => line.trim())
        if (contentLines.length > 0) {
          const opening = contentLines[0].substring(0, 20) // 冒頭20文字
          const closing = contentLines[contentLines.length - 1].substring(0, 20) // 締め20文字
          previousContents.push({ opening, closing })
        }
      }
      
      results.push({
        conceptId: concept.conceptId,
        ...result
      })
      
      // レート制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`コンセプト ${concept.conceptId} の生成に失敗:`, error)
      results.push({
        conceptId: concept.conceptId,
        error: error.message
      })
    }
  }
  
  return results
}