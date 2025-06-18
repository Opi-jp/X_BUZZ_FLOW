#!/bin/bash

# データベース接続・認証問題管理ツール
# 頻繁なDB認証失敗を解決する

set -e

PROJECT_ROOT="/Users/yukio/X_BUZZ_FLOW"
ENV_FILE="$PROJECT_ROOT/.env.local"

echo "🔧 DB接続診断・修復ツール"

# 環境変数チェック
check_env_vars() {
    echo "📋 環境変数チェック..."
    
    local missing_vars=()
    
    if [ ! -f "$ENV_FILE" ]; then
        echo "❌ .env.localファイルが見つかりません"
        return 1
    fi
    
    # 必須変数チェック
    local required_vars=(
        "DATABASE_URL"
        "DIRECT_URL"
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo "❌ 不足している環境変数:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    fi
    
    echo "✅ 必須環境変数は設定済み"
}

# データベース接続テスト
test_db_connection() {
    echo "🔌 データベース接続テスト..."
    
    cd "$PROJECT_ROOT"
    
    # Prisma接続テスト
    if npx prisma db pull --schema=./prisma/schema.prisma > /dev/null 2>&1; then
        echo "✅ データベース接続成功"
        return 0
    else
        echo "❌ データベース接続失敗"
        return 1
    fi
}

# Prismaクライアント再生成
regenerate_prisma() {
    echo "🔄 Prismaクライアント再生成..."
    
    cd "$PROJECT_ROOT"
    
    # 既存のPrismaクライアントを削除
    rm -rf lib/generated/prisma
    rm -rf node_modules/.prisma
    
    # 新しいクライアント生成
    npx prisma generate
    
    echo "✅ Prismaクライアント再生成完了"
}

# 環境変数修復
fix_env_variables() {
    echo "🛠️ 環境変数修復..."
    
    # バックアップ作成
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # 基本的な環境変数を確認・修正
    if ! grep -q "^NEXTAUTH_URL=" "$ENV_FILE"; then
        echo "NEXTAUTH_URL=http://localhost:3000" >> "$ENV_FILE"
        echo "追加: NEXTAUTH_URL"
    fi
    
    if ! grep -q "^NODE_ENV=" "$ENV_FILE"; then
        echo "NODE_ENV=development" >> "$ENV_FILE"
        echo "追加: NODE_ENV"
    fi
    
    echo "✅ 環境変数修復完了"
}

# データベーススキーマ検証
verify_schema() {
    echo "📊 データベーススキーマ検証..."
    
    cd "$PROJECT_ROOT"
    
    # スキーマの整合性チェック
    if npx prisma db push --accept-data-loss > /dev/null 2>&1; then
        echo "✅ スキーマ同期成功"
    else
        echo "⚠️ スキーマ同期に問題があります"
        echo "手動でprisma db pushを実行してください"
    fi
}

# メイン実行
main() {
    echo "開始時刻: $(date)"
    echo "=========================="
    
    # ステップ1: 環境変数チェック
    if ! check_env_vars; then
        echo "環境変数を修正してから再実行してください"
        exit 1
    fi
    
    # ステップ2: 接続テスト
    if ! test_db_connection; then
        echo "🔧 接続問題を修復中..."
        
        # 修復試行
        fix_env_variables
        regenerate_prisma
        
        # 再テスト
        if test_db_connection; then
            echo "✅ 修復成功"
        else
            echo "❌ 修復失敗 - 手動確認が必要"
            exit 1
        fi
    fi
    
    # ステップ3: スキーマ検証
    verify_schema
    
    echo "=========================="
    echo "🎉 DB接続診断完了"
    echo "終了時刻: $(date)"
}

# コマンドライン引数処理
case "${1:-main}" in
    "check")
        check_env_vars && test_db_connection
        ;;
    "fix")
        fix_env_variables
        regenerate_prisma
        ;;
    "regenerate")
        regenerate_prisma
        ;;
    "verify")
        verify_schema
        ;;
    "main"|*)
        main
        ;;
esac