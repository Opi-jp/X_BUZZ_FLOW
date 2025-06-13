#!/bin/bash

# シンプルなAPIテストスクリプト
# 使い方: ./test-api-simple.sh SESSION_TOKEN

SESSION_TOKEN=$1

if [ -z "$SESSION_TOKEN" ]; then
  echo "使い方: ./test-api-simple.sh SESSION_TOKEN"
  echo ""
  echo "SESSION_TOKEN の取得方法:"
  echo "1. http://localhost:3000/viral/gpt でログイン（またはhttp://localhost:3000/auth/signin）"
  echo "2. 開発者ツール > Application > Cookies"
  echo "3. 'next-auth.session-token' の値をコピー"
  exit 1
fi

# 投稿内容
CONTENT="まあ、AIエージェントってもはや未来じゃないんだよね。私たちの生活をどう変えてくれるのかなぁ、ちょっと気になるわ。🤔"
HASHTAGS='["#AI", "#働き方改革"]'

echo "📝 下書きを作成中..."

# 下書きを作成
RESPONSE=$(curl -s -X POST http://localhost:3000/api/viral/drafts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d "{
    \"content\": \"$CONTENT\",
    \"hashtags\": $HASHTAGS,
    \"metadata\": {
      \"source\": \"api-test\",
      \"tone\": \"sarcastic-but-kind\"
    }
  }")

echo "レスポンス: $RESPONSE"

# IDを抽出
DRAFT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DRAFT_ID" ]; then
  echo "❌ 下書きの作成に失敗しました"
  echo "レスポンス: $RESPONSE"
  exit 1
fi

echo "✅ 下書き作成成功！ ID: $DRAFT_ID"
echo ""
echo "🚀 投稿しますか？ (y/n)"
read -r CONFIRM

if [ "$CONFIRM" = "y" ]; then
  echo "📤 投稿中..."
  
  POST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/viral/post-draft \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
    -d "{
      \"draftId\": \"$DRAFT_ID\"
    }")
  
  echo "投稿レスポンス: $POST_RESPONSE"
  
  # URLを抽出
  TWEET_URL=$(echo $POST_RESPONSE | grep -o '"url":"[^"]*' | cut -d'"' -f4)
  
  if [ ! -z "$TWEET_URL" ]; then
    echo ""
    echo "✅ 投稿成功！"
    echo "🔗 URL: $TWEET_URL"
    echo ""
    echo "ブラウザで開きますか？ (y/n)"
    read -r OPEN
    
    if [ "$OPEN" = "y" ]; then
      open "$TWEET_URL"
    fi
  else
    echo "❌ 投稿に失敗しました"
    echo "レスポンス: $POST_RESPONSE"
  fi
else
  echo "投稿をキャンセルしました"
  echo "下書きID: $DRAFT_ID"
  echo "編集URL: http://localhost:3000/viral/drafts/$DRAFT_ID"
fi