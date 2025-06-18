#!/bin/bash

# Twitter認証問題デバッグツール
# よくある認証失敗原因を自動診断・修復

set -e

PROJECT_ROOT="/Users/yukio/X_BUZZ_FLOW"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo "🐦 Twitter認証デバッグツール"

# 環境変数チェック
check_twitter_env() {
    echo "📋 Twitter環境変数チェック..."
    
    local required_vars=(
        "TWITTER_CLIENT_ID"
        "TWITTER_CLIENT_SECRET"
        "TWITTER_API_KEY"
        "TWITTER_API_SECRET"
        "TWITTER_ACCESS_TOKEN"
        "TWITTER_ACCESS_TOKEN_SECRET"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "❌ 不足している環境変数:"
        printf '  %s\n' "${missing_vars[@]}"
        return 1
    fi
    
    echo "✅ Twitter環境変数は設定済み"
}

# データベーススキーマチェック
check_user_table_schema() {
    echo "🗃️ usersテーブルスキーマチェック..."
    
    cd "$PROJECT_ROOT"
    
    # usersテーブルの存在確認
    local table_exists=$(node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function checkTable() {
        try {
            await prisma.user.findFirst();
            console.log('exists');
        } catch (error) {
            if (error.message.includes('does not exist')) {
                console.log('missing');
            } else {
                console.log('error');
            }
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    checkTable();
    " 2>/dev/null)
    
    case "$table_exists" in
        "exists")
            echo "✅ usersテーブル存在確認"
            ;;
        "missing")
            echo "❌ usersテーブルが存在しません"
            echo "マイグレーション実行が必要です"
            return 1
            ;;
        "error")
            echo "⚠️ usersテーブルのスキーマに問題があります"
            check_created_at_column
            ;;
    esac
}

# createdAtカラム特別チェック
check_created_at_column() {
    echo "📅 createdAt/updatedAtカラムチェック..."
    
    # データベースに直接SQLクエリでカラム確認
    node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function checkColumns() {
        try {
            // PostgreSQLのカラム情報を取得
            const result = await prisma.\$queryRaw\`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name IN ('createdAt', 'updatedAt', 'created_at', 'updated_at')
                ORDER BY column_name;
            \`;
            
            if (result.length === 0) {
                console.log('❌ createdAt/updatedAtカラムが見つかりません');
                console.log('修復が必要です');
            } else {
                console.log('✅ 日時カラム確認:');
                result.forEach(col => {
                    console.log(\`  \${col.column_name}: \${col.data_type} (\${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})\`);
                });
            }
            
        } catch (error) {
            console.log('❌ カラムチェックエラー:', error.message);
            if (error.message.includes('createdAt') && error.message.includes('does not exist')) {
                console.log('🔧 createdAtカラム不足を検出しました');
            }
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    checkColumns();
    "
}

# usersテーブル修復
fix_users_table() {
    echo "🔧 usersテーブル修復中..."
    
    cd "$PROJECT_ROOT"
    
    # createdAt/updatedAtカラムを追加
    node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function fixTable() {
        try {
            // カラム追加SQL（存在しない場合のみ）
            await prisma.\$executeRaw\`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS \"createdAt\" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS \"updatedAt\" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            \`;
            
            console.log('✅ createdAt/updatedAtカラム追加完了');
            
            // 既存レコードのNULL値を現在時刻で更新
            await prisma.\$executeRaw\`
                UPDATE users 
                SET \"createdAt\" = CURRENT_TIMESTAMP 
                WHERE \"createdAt\" IS NULL;
            \`;
            
            await prisma.\$executeRaw\`
                UPDATE users 
                SET \"updatedAt\" = CURRENT_TIMESTAMP 
                WHERE \"updatedAt\" IS NULL;
            \`;
            
            console.log('✅ 既存レコードの日時更新完了');
            
        } catch (error) {
            console.log('❌ テーブル修復エラー:', error.message);
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    fixTable();
    "
}

# Twitter API接続テスト
test_twitter_connection() {
    echo "🐦 Twitter API接続テスト..."
    
    # 環境変数読み込み
    source "$ENV_FILE" 2>/dev/null || true
    
    if [ -z "$TWITTER_API_KEY" ] || [ -z "$TWITTER_API_SECRET" ]; then
        echo "❌ Twitter API認証情報が不足しています"
        return 1
    fi
    
    # 簡単なAPI呼び出しテスト
    curl -s -X GET "https://api.twitter.com/1.1/account/verify_credentials.json" \
        -H "Authorization: OAuth oauth_consumer_key=\"$TWITTER_API_KEY\", oauth_token=\"$TWITTER_ACCESS_TOKEN\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"$(date +%s)\", oauth_nonce=\"$(openssl rand -hex 16)\", oauth_version=\"1.0\"" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Twitter API接続成功"
    else
        echo "❌ Twitter API接続失敗"
        echo "キー・シークレットを確認してください"
        return 1
    fi
}

# NextAuth設定確認
check_nextauth_config() {
    echo "🔐 NextAuth設定確認..."
    
    # コールバックURL確認
    source "$ENV_FILE" 2>/dev/null || true
    
    if [ "$NEXTAUTH_URL" != "http://localhost:3000" ]; then
        echo "⚠️ NEXTAUTH_URLが期待値と異なります"
        echo "現在: $NEXTAUTH_URL"
        echo "期待: http://localhost:3000"
        echo "Twitter Developer PortalのCallback URLと一致させてください"
    else
        echo "✅ NEXTAUTH_URL設定正常"
    fi
    
    # NextAuthシークレット確認
    if [ -z "$NEXTAUTH_SECRET" ]; then
        echo "❌ NEXTAUTH_SECRETが設定されていません"
        echo "openssl rand -base64 32 で生成してください"
        return 1
    else
        echo "✅ NEXTAUTH_SECRET設定済み"
    fi
}

# Twitter Developer Portal設定ガイド
show_twitter_portal_guide() {
    echo "📖 Twitter Developer Portal設定ガイド"
    echo ""
    echo "1. https://developer.twitter.com/en/portal/dashboard にアクセス"
    echo "2. App settings > User authentication settings"
    echo "3. 以下の設定を確認:"
    echo "   - App permissions: Read and write"
    echo "   - Type of App: Web App, Automated App or Bot"
    echo "   - Callback URI: http://localhost:3000/api/auth/callback/twitter"
    echo "   - Website URL: http://localhost:3000"
    echo ""
    echo "4. Keys and tokens > Regenerate で新しいキーを生成"
    echo "5. Consumer Keys, Authentication Tokens をコピー"
    echo "6. .env.local に設定"
    echo ""
    echo "❗️ 重要: 設定変更後は5-10分待ってからテストしてください"
}

# 完全診断実行
full_diagnosis() {
    echo "🔍 Twitter認証完全診断開始..."
    echo "=========================="
    
    local errors=0
    
    # 1. 環境変数チェック
    if ! check_twitter_env; then
        ((errors++))
    fi
    
    # 2. データベーススキーマチェック
    if ! check_user_table_schema; then
        echo "🔧 usersテーブル修復を試行..."
        fix_users_table
        if ! check_user_table_schema; then
            ((errors++))
        fi
    fi
    
    # 3. NextAuth設定チェック
    if ! check_nextauth_config; then
        ((errors++))
    fi
    
    # 4. Twitter API接続テスト
    if ! test_twitter_connection; then
        ((errors++))
    fi
    
    echo "=========================="
    if [ $errors -eq 0 ]; then
        echo "🎉 全ての診断項目をクリアしました"
        echo "Twitter認証が正常に動作するはずです"
    else
        echo "❌ $errors 個の問題が見つかりました"
        echo "上記の問題を修正してから再度テストしてください"
        echo ""
        show_twitter_portal_guide
    fi
}

# メイン実行
case "${1:-full}" in
    "env")
        check_twitter_env
        ;;
    "db")
        check_user_table_schema
        ;;
    "fix-db")
        fix_users_table
        ;;
    "api")
        test_twitter_connection
        ;;
    "nextauth")
        check_nextauth_config
        ;;
    "guide")
        show_twitter_portal_guide
        ;;
    "full"|*)
        full_diagnosis
        ;;
esac