#!/bin/bash

echo "🔧 Vercel環境変数の設定を開始します..."

# .env.localから環境変数を読み込む
if [ -f .env.local ]; then
    echo "📄 .env.localファイルを読み込み中..."
    
    # DIRECT_URLを設定
    DIRECT_URL=$(grep "^DIRECT_URL=" .env.local | cut -d '=' -f2-)
    
    if [ -n "$DIRECT_URL" ]; then
        echo "🔑 DIRECT_URLを設定中..."
        vercel env add DIRECT_URL production <<< "$DIRECT_URL"
        echo "✅ DIRECT_URLを設定しました"
    else
        echo "⚠️  DIRECT_URLが.env.localに見つかりません"
    fi
    
    # 他の重要な環境変数も確認
    echo ""
    echo "📊 現在のVercel環境変数を確認:"
    vercel env ls production
    
else
    echo "❌ .env.localファイルが見つかりません"
    exit 1
fi

echo ""
echo "✅ 環境変数の設定が完了しました"
echo "💡 ヒント: 新しい環境変数を反映するには、Vercelを再デプロイしてください"
echo "   実行: git commit --allow-empty -m 'chore: trigger deployment' && git push"