const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createBuzzPresets() {
  console.log('=== バズツイート収集プリセット作成 ===\n');
  
  const presets = [
    // AI/LLM関連（メインターゲット）
    {
      name: 'AI・生成AI トレンド',
      description: '生成AI、ChatGPT、Claude等の最新トレンド',
      query: '(生成AI OR ChatGPT OR Claude OR Gemini OR GPT-4 OR "o3" OR AGI) (使い方 OR 活用 OR 方法 OR 効率 OR 変革 OR 衝撃 OR すごい OR やばい) -is:retweet -filter:links',
      keywords: ['生成AI', 'ChatGPT', 'Claude', 'Gemini', 'GPT-4', 'LLM', 'プロンプト', 'AGI'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_trend'
    },
    {
      name: 'AIツール活用術',
      description: 'AI活用の具体的な事例・ノウハウ',
      query: '((ChatGPT OR Claude OR Gemini) (使い方 OR 活用法 OR 便利 OR 効率化 OR 時短)) (仕事 OR 業務 OR 作業) -is:retweet -"使ってみた" -"試してみた"',
      keywords: ['使い方', '活用', '効率化', '自動化', 'プロンプトエンジニアリング', '業務改善'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_usage'
    },
    {
      name: 'AI×クリエイティブ',
      description: 'AIとクリエイティブ業界の融合',
      query: '(AI クリエイティブ OR 生成AI デザイン OR AI 映像) -is:retweet',
      keywords: ['クリエイティブ', 'デザイン', '映像', 'アート', 'Midjourney', 'Stable Diffusion'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_creative'
    },
    
    // 働き方・生産性の変化（AIに間接的に関連）
    {
      name: '業務効率化・自動化',
      description: '具体的な業務効率化や自動化の事例（AI言及なしでも可）',
      query: '((効率化 OR 自動化 OR 時短) (業務 OR 仕事 OR 作業)) (時間 (削減 OR 短縮 OR 半分 OR "1/3" OR "1/10")) -is:retweet',
      keywords: ['効率化', '自動化', '時短', '業務改善', '生産性', 'DX'],
      minLikes: 400,
      minRetweets: 80,
      category: 'productivity'
    },
    {
      name: 'プログラミング・開発効率化',
      description: 'Copilot、Cursor等の開発支援ツールの活用',
      query: '((GitHub Copilot OR Cursor OR v0 OR Bolt) (使って OR 効率 OR 爆速 OR 時短)) OR (コード (自動生成 OR AI)) -is:retweet',
      keywords: ['Copilot', 'Cursor', 'v0', 'Bolt', 'コード生成', '開発効率化'],
      minLikes: 300,
      minRetweets: 50,
      category: 'dev_productivity'
    },
    {
      name: 'ノーコード・ローコード革命',
      description: 'プログラミング不要でのツール作成',
      query: '((ノーコード OR ローコード OR "No Code" OR "Low Code") (作った OR 構築 OR 開発)) OR (Bubble OR Zapier OR Make) (自動化 OR 効率化) -is:retweet',
      keywords: ['ノーコード', 'ローコード', 'Bubble', 'Zapier', 'Make', '自動化'],
      minLikes: 300,
      minRetweets: 50,
      category: 'nocode'
    },
    {
      name: '働き方の未来・キャリア論',
      description: 'AI時代のキャリア、スキルシフト',
      query: '((これから OR 今後 OR 未来) (必要 OR 重要 OR 求められる) (スキル OR 能力 OR 人材)) OR ((なくなる OR 消える OR 不要になる) (仕事 OR 職業)) -is:retweet',
      keywords: ['未来のスキル', 'キャリアシフト', '求められる人材', 'スキルアップ', '学び直し'],
      minLikes: 500,
      minRetweets: 100,
      category: 'future_skills'
    },
    {
      name: 'リモートワーク・新しい働き方',
      description: 'リモートワークやハイブリッドワークの実践',
      query: '((リモートワーク OR テレワーク OR 在宅勤務) (効率 OR 生産性 OR メリット OR コツ)) OR ((週3 OR 週4) (出社 OR リモート)) -is:retweet',
      keywords: ['リモートワーク', 'テレワーク', 'ハイブリッドワーク', '働き方改革', 'ワークライフバランス'],
      minLikes: 400,
      minRetweets: 80,
      category: 'remote_work'
    },
    {
      name: '個人事業・独立の加速',
      description: 'AIツールを活用した個人事業の成功事例',
      query: '((一人で OR 個人で OR ひとりで) (起業 OR 独立 OR 開業)) (売上 OR 収益 OR 月商) (万円 OR 百万) -is:retweet',
      keywords: ['一人起業', '個人事業', 'スモールビジネス', 'マイクロ起業', 'ソロプレナー'],
      minLikes: 600,
      minRetweets: 100,
      category: 'solo_business'
    },
    {
      name: 'ツール活用で変わる仕事術',
      description: 'NotionやSlack等のツールで変わる仕事のやり方',
      query: '((Notion OR Slack OR Figma OR Miro) (使い方 OR 活用 OR 便利)) (チーム OR 組織 OR 業務) -is:retweet',
      keywords: ['Notion', 'Slack', 'Figma', 'Miro', 'ツール活用', 'デジタルワークスペース'],
      minLikes: 300,
      minRetweets: 50,
      category: 'tool_adoption'
    },
    {
      name: '次世代ワークスタイル',
      description: '新しい働き方の実践例（AI言及なしでも可）',
      query: '((4日勤務 OR "週休3日" OR ワーケーション) (導入 OR 実践 OR 成功)) OR ((副業 OR 複業) (収入 OR 売上) (倍 OR 増)) -is:retweet',
      keywords: ['週休3日', '4日勤務', 'ワーケーション', '副業', '複業', 'パラレルキャリア'],
      minLikes: 400,
      minRetweets: 80,
      category: 'new_workstyle'
    },
    {
      name: 'AIがもたらす職業変化',
      description: '具体的な職業や業界の変化事例',
      query: '((弁護士 OR 会計士 OR デザイナー OR ライター OR エンジニア) (AI OR 自動化) (変化 OR 影響 OR 将来)) OR ((この仕事 OR この職業) (なくなる OR 変わる)) -is:retweet',
      keywords: ['職業の未来', '仕事の変化', 'AI代替', '専門職', 'キャリアチェンジ'],
      minLikes: 500,
      minRetweets: 100,
      category: 'job_transformation'
    },
    {
      name: '生産性革命の実例',
      description: '劇的な生産性向上の具体例',
      query: '((作業時間 OR 業務時間) ("1/10" OR "1/5" OR "10分の1" OR "5分の1" OR "90%削減" OR "80%削減")) OR ((1時間 OR 2時間 OR 3時間) (で完了 OR で終わる OR で終了)) -is:retweet',
      keywords: ['時間削減', '効率アップ', '生産性向上', '時短術', '爆速'],
      minLikes: 600,
      minRetweets: 120,
      category: 'productivity_revolution'
    },
    {
      name: 'AIネイティブ世代',
      description: 'AIを当たり前に使う新世代の動向',
      query: '((Z世代 OR 若手 OR 新入社員 OR 大学生) (ChatGPT OR AI OR 生成AI) (使いこなす OR 活用 OR 当たり前)) OR ((AIネイティブ OR デジタルネイティブ) (世代 OR 若者)) -is:retweet',
      keywords: ['Z世代', 'AIネイティブ', '新世代', 'デジタルネイティブ', '若手人材'],
      minLikes: 400,
      minRetweets: 80,
      category: 'ai_native_generation'
    },
    {
      name: '異常値系バズ投稿',
      description: '具体的数値で驚きを与える投稿',
      query: '((月収 OR 年収 OR 売上) (万円 OR 億)) OR ("1日" ("3時間" OR "10分" OR "5分")) OR (フォロワー (万人 OR 千人)) -is:retweet -懸賞 -プレゼント',
      keywords: ['月収', '年収', '売上', 'フォロワー', '万円', '億円', '時短', '効率'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'anomaly'
    },
    
    {
      name: 'スキルの市場価値',
      description: '今求められるスキルと報酬の実態',
      query: '((このスキル OR この能力) (年収 OR 月収 OR 時給) (万円 OR 千円)) OR ((需要 OR ニーズ) (高い OR 増えている) (スキル OR 技術)) -is:retweet',
      keywords: ['市場価値', 'スキル', '年収アップ', '需要', '希少性', 'レアスキル'],
      minLikes: 500,
      minRetweets: 100,
      category: 'skill_market_value'
    },
    {
      name: 'ワンオペ起業・スモールチーム',
      description: '少人数で大きな成果を出す事例',
      query: '((一人で OR 少人数で OR 3人で OR 5人で) (売上 OR 年商) (億 OR 千万)) OR ((ワンオペ OR スモールチーム) (起業 OR 経営)) -is:retweet',
      keywords: ['ワンオペ', 'スモールチーム', '少数精鋭', '一人社長', 'マイクロカンパニー'],
      minLikes: 600,
      minRetweets: 120,
      category: 'small_team_success'
    },
    {
      name: 'AIツール実践レポート',
      description: '実際にAIツールを使った成果報告',
      query: '((使ってみた OR 試してみた) (結果 OR 成果 OR 効果)) (ChatGPT OR Claude OR Gemini OR Copilot OR Midjourney) -is:retweet -PR -広告',
      keywords: ['実践', '検証', '結果', '成果', 'ビフォーアフター', '使用レポート'],
      minLikes: 400,
      minRetweets: 80,
      category: 'ai_practice_report'
    },
    
    // エンゲージメント獲得用
    {
      name: '議論誘発型投稿',
      description: '賛否両論を呼ぶ働き方・キャリア論',
      query: '((正社員 OR 会社員) (やめて OR 卒業 OR 脱サラ) (正解 OR 後悔)) OR ((これからは OR もう) (必要ない OR オワコン OR 古い)) -is:retweet',
      keywords: ['議論', '賛否両論', '価値観', 'キャリア論', '働き方論', '人生観'],
      minLikes: 800,
      minRetweets: 150,
      category: 'controversial'
    },
    {
      name: '自分語り誘発投稿',
      description: '学歴・職歴・資産など議論を呼ぶテーマ',
      query: '((学歴 OR 年収 OR 転職 OR 起業) (思う OR 感じる OR 大事 OR 必要 OR 不要)) OR ("会社員" vs "フリーランス") OR ("安定" (幻想 OR 嘘)) -is:retweet',
      keywords: ['学歴', '年収', '転職', '起業', '独立', 'フリーランス', '価値観'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'self_story'
    },
    {
      name: 'X運用ノウハウ',
      description: 'X(Twitter)の運用術、バズり方',
      query: '((X運用 OR Twitter運用) (方法 OR コツ OR 伸ばす)) OR (バズ (った OR る方法)) OR (インプレッション (増やす OR 伸ばす)) OR (フォロワー (増やす OR 獲得)) -is:retweet -フォロー&RT',
      keywords: ['X運用', 'Twitter運用', 'バズ', 'インプレッション', 'フォロワー', '拡散'],
      minLikes: 500,
      minRetweets: 100,
      category: 'x_operation'
    }
  ];
  
  try {
    // 既存のプリセットを削除
    await prisma.collectionPreset.deleteMany({});
    console.log('既存のプリセットを削除しました。\n');
    
    // 新しいプリセットを作成
    for (const preset of presets) {
      const created = await prisma.collectionPreset.create({
        data: preset
      });
      console.log(`✅ 作成: ${created.name}`);
      console.log(`   カテゴリ: ${created.category}`);
      console.log(`   最小いいね: ${created.minLikes}`);
      console.log(`   最小RT: ${created.minRetweets}\n`);
    }
    
    console.log(`\n合計 ${presets.length} 個のプリセットを作成しました。`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBuzzPresets();