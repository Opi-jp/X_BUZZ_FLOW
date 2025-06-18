#!/bin/bash

# Perplexity重複クエリ問題解決ツール
# 途中から再開可能なテスト体制を構築

set -e

PROJECT_ROOT="/Users/yukio/X_BUZZ_FLOW"

echo "💰 Perplexity コスト最適化ツール"

# 既存セッションからデータ抽出
extract_session_data() {
    local session_id="$1"
    
    if [ -z "$session_id" ]; then
        echo "使用法: extract_session_data <session_id>"
        return 1
    fi
    
    echo "📤 セッション $session_id からデータ抽出中..."
    
    # Node.jsスクリプトでセッションデータを抽出
    node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function extractData() {
        try {
            const session = await prisma.cotSession.findUnique({
                where: { id: '$session_id' },
                include: {
                    phases: true
                }
            });
            
            if (!session) {
                console.log('❌ セッションが見つかりません');
                return;
            }
            
            // Phase 1のExecute結果を抽出
            const phase1 = session.phases.find(p => p.phase === 1 && p.step === 'EXECUTE');
            if (phase1 && phase1.executeResult) {
                const result = JSON.parse(phase1.executeResult);
                if (result.savedPerplexityResponses) {
                    console.log('💾 Phase 1 Perplexityデータ保存済み');
                    console.log('検索クエリ数:', result.savedPerplexityResponses.length);
                }
            }
            
            // Phase 2のIntegrate結果を抽出
            const phase2 = session.phases.find(p => p.phase === 2 && p.step === 'INTEGRATE');
            if (phase2 && phase2.integrateResult) {
                console.log('💾 Phase 2 統合データ保存済み');
            }
            
            // Phase 3のIntegrate結果を抽出
            const phase3 = session.phases.find(p => p.phase === 3 && p.step === 'INTEGRATE');
            if (phase3 && phase3.integrateResult) {
                console.log('💾 Phase 3 コンセプトデータ保存済み');
            }
            
            console.log('✅ データ抽出完了');
            
        } catch (error) {
            console.error('❌ エラー:', error.message);
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    extractData();
    "
}

# 途中から再開可能なテスト実行
resume_from_phase() {
    local session_id="$1"
    local phase="$2"
    
    if [ -z "$session_id" ] || [ -z "$phase" ]; then
        echo "使用法: resume_from_phase <session_id> <phase_number>"
        return 1
    fi
    
    echo "🔄 Phase $phase から再開..."
    
    case "$phase" in
        "2")
            echo "Phase 2 (機会評価) から再開"
            curl -X POST "http://localhost:3000/api/viral/cot-session/$session_id/phase2" \
                -H "Content-Type: application/json"
            ;;
        "3")
            echo "Phase 3 (コンセプト生成) から再開"
            curl -X POST "http://localhost:3000/api/viral/cot-session/$session_id/phase3" \
                -H "Content-Type: application/json"
            ;;
        "4")
            echo "Phase 4 (コンテンツ生成) から再開"
            curl -X POST "http://localhost:3000/api/viral/cot-session/$session_id/phase4" \
                -H "Content-Type: application/json"
            ;;
        "5")
            echo "Phase 5 (戦略策定) から再開"
            curl -X POST "http://localhost:3000/api/viral/cot-session/$session_id/phase5" \
                -H "Content-Type: application/json"
            ;;
        *)
            echo "❌ 無効なフェーズ番号: $phase"
            return 1
            ;;
    esac
}

# 成功したセッション一覧表示
list_successful_sessions() {
    echo "✅ 成功したセッション一覧..."
    
    node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function listSessions() {
        try {
            const sessions = await prisma.cotSession.findMany({
                where: {
                    status: {
                        in: ['COMPLETED', 'INTEGRATING']
                    }
                },
                include: {
                    phases: {
                        select: {
                            phase: true,
                            step: true,
                            status: true
                        }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                },
                take: 10
            });
            
            console.log('最近の成功セッション:');
            sessions.forEach(session => {
                const completedPhases = session.phases.filter(p => p.status === 'COMPLETED');
                console.log(\`\${session.id} | \${session.expertise} | Phase \${Math.max(...completedPhases.map(p => p.phase))}/5 完了\`);
            });
            
        } catch (error) {
            console.error('❌ エラー:', error.message);
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    listSessions();
    "
}

# 重複クエリ検出
detect_duplicate_queries() {
    echo "🔍 重複Perplexityクエリ検出..."
    
    node -e "
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    async function detectDuplicates() {
        try {
            const phases = await prisma.cotPhase.findMany({
                where: {
                    phase: 1,
                    step: 'EXECUTE',
                    executeResult: {
                        not: null
                    }
                },
                select: {
                    sessionId: true,
                    executeResult: true,
                    createdAt: true
                }
            });
            
            const queryMap = new Map();
            let duplicateCount = 0;
            
            phases.forEach(phase => {
                try {
                    const result = JSON.parse(phase.executeResult);
                    if (result.savedPerplexityResponses) {
                        result.savedPerplexityResponses.forEach(response => {
                            const query = response.query || response.question;
                            if (query) {
                                if (queryMap.has(query)) {
                                    duplicateCount++;
                                    console.log(\`🔄 重複クエリ: \${query.substring(0, 50)}...\`);
                                } else {
                                    queryMap.set(query, phase.sessionId);
                                }
                            }
                        });
                    }
                } catch (e) {
                    // JSON パースエラーをスキップ
                }
            });
            
            console.log(\`\n📊 統計:`);
            console.log(\`ユニーククエリ数: \${queryMap.size}\`);
            console.log(\`重複クエリ数: \${duplicateCount}\`);
            console.log(\`コスト削減可能性: \${Math.round(duplicateCount / (queryMap.size + duplicateCount) * 100)}%\`);
            
        } catch (error) {
            console.error('❌ エラー:', error.message);
        } finally {
            await prisma.\$disconnect();
        }
    }
    
    detectDuplicates();
    "
}

# コスト最適化レポート
generate_cost_report() {
    echo "📊 コスト最適化レポート生成..."
    
    local report_file="$PROJECT_ROOT/logs/perplexity-cost-report-$(date +%Y%m%d_%H%M%S).md"
    
    {
        echo "# Perplexity API コスト最適化レポート"
        echo "生成日時: $(date)"
        echo ""
        
        echo "## 重複クエリ分析"
        detect_duplicate_queries
        
        echo ""
        echo "## 成功セッション"
        list_successful_sessions
        
        echo ""
        echo "## 推奨アクション"
        echo "1. 重複クエリを避けるためのキャッシュ機能実装"
        echo "2. 失敗時の部分再開機能強化"
        echo "3. クエリ実行前の重複チェック実装"
        
    } > "$report_file"
    
    echo "✅ レポート保存: $report_file"
}

# メイン実行
main() {
    case "${1:-help}" in
        "extract")
            extract_session_data "$2"
            ;;
        "resume")
            resume_from_phase "$2" "$3"
            ;;
        "list")
            list_successful_sessions
            ;;
        "duplicates")
            detect_duplicate_queries
            ;;
        "report")
            generate_cost_report
            ;;
        "help"|*)
            echo "使用法:"
            echo "  $0 extract <session_id>     - セッションデータ抽出"
            echo "  $0 resume <session_id> <phase> - 指定フェーズから再開"
            echo "  $0 list                     - 成功セッション一覧"
            echo "  $0 duplicates               - 重複クエリ検出"
            echo "  $0 report                   - コスト最適化レポート生成"
            ;;
    esac
}

main "$@"