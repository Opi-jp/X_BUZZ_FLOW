# Kaito API Search Test Results

## Test Date: 2025/06/11

### Overview
This document shows the actual results from testing 5 different presets with the Kaito API. These results demonstrate what kind of content would be collected using our smart presets.

### Test Results Summary

#### 1. AI活用の具体的成果 (AI Results)
**Query**: `(ChatGPT OR Claude) AND (作った OR 作成 OR 構築 OR 開発 OR 書いた) AND (時間 OR 効率 OR 成果) -is:retweet lang:ja`
**Min Likes**: 1000 | **Min RT**: 200

**Top Results**:
- @nagi__blog: ChatGPTしか使っていない人は時代遅れです... (20,289 likes, 1,679 RTs)
- @itnavi2022: ChatGPTの使い方を完全に間違えている... (5,625 likes, 1,139 RTs)
- @ctgptlb: GPTの秘書化に成功... (3,436 likes, 424 RTs)

#### 2. エンジニアのAI活用 (Developer AI)
**Query**: `(Copilot OR Cursor OR ChatGPT) AND (コード OR プログラミング OR 開発) AND (効率 OR 時短 OR 便利) -is:retweet lang:ja`
**Min Likes**: 500 | **Min RT**: 100

**Top Results**:
- @nagi__blog: ChatGPTしか使っていない人は時代遅れです... (20,289 likes, 1,679 RTs)
- @ochyai: Claude 3を使いまくってみて，コードレビューが秀逸... (2,922 likes, 357 RTs)
- @igz0: AI搭載エディタの「Cursor」でコード支援... (2,261 likes, 297 RTs)

#### 3. ビジネスでのAI実践 (Business AI)
**Query**: `(ChatGPT OR AI) AND (売上 OR 業務 OR 経営 OR マーケティング) AND (改善 OR 向上 OR 効率) -is:retweet -懸賞 lang:ja`
**Min Likes**: 800 | **Min RT**: 150

**Top Results**:
- @kosuke_agos: Googleが異次元すぎる... (9,117 likes, 1,232 RTs)
- @SuguruKun_ai: Googleが無料公開した「Gemini活用ガイド」が有益すぎた... (5,899 likes, 549 RTs)
- @igz0: 隙間時間に窓際社員がAIで業務効率化ツールを作る... (32,887 likes, 4,796 RTs)

#### 4. クリエイティブAI活用 (Creative AI)
**Query**: `(Midjourney OR "Stable Diffusion" OR DALL-E OR Runway) AND (作品 OR デザイン OR 映像 OR 制作) -is:retweet lang:ja`
**Min Likes**: 1000 | **Min RT**: 200

**Top Results**:
- @satori_sz9: 宝石の虫が超綺麗。Midjourney v7 + MagnificAI + Runway Gen4... (6,939 likes, 862 RTs)
- @Kohaku_NFT: もう、AIでCM制作は余裕やん... (5,137 likes, 558 RTs)
- @shota7180: Stable Diffusionを活用し実写のハリーポッターをアニメ風に変換... (4,949 likes, 1,430 RTs)

#### 5. プロンプト実践テクニック (Prompt Engineering)
**Query**: `(プロンプト OR prompt) AND (テクニック OR 方法 OR コツ) AND (ChatGPT OR Claude) -is:retweet lang:ja`
**Min Likes**: 800 | **Min RT**: 150

**Top Results**:
- @rootport: プロンプトに「水平思考で」と加えるだけで... (2,363 likes, 345 RTs)
- @shota7180: デジタル庁が「ChatGPTを業務に組み込むための手引き」を公開... (2,303 likes, 380 RTs)
- @takechi0209: ChatGPTをうまく使う方法の一つに... (2,404 likes, 396 RTs)

### Key Findings

1. **High Engagement Content**: The presets successfully find high-engagement tweets with thousands of likes and hundreds of retweets.

2. **Practical Examples**: The queries capture real-world usage examples, tutorials, and case studies of AI tools.

3. **Diverse Topics**: From business efficiency to creative applications, the presets cover a wide range of AI usage scenarios.

4. **Japanese Content**: All results are in Japanese as specified, targeting the Japanese AI community.

5. **Quality Filter**: The minimum likes/RT requirements effectively filter out low-quality content.

### API Notes

- The Kaito API (via Apify) returns mock data when results are limited, which needs to be filtered out
- Response time is typically 10-30 seconds per query
- The API successfully handles complex boolean queries with Japanese text

### Recommendations

1. These presets are ready for production use and will collect high-quality, engaging content
2. Consider adjusting minimum engagement thresholds based on collection frequency
3. The queries effectively capture current AI trends and practical applications
4. Regular monitoring of results will help refine queries over time