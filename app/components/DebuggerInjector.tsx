'use client'

import { useEffect } from 'react'

export default function DebuggerInjector() {
  useEffect(() => {
    // 開発環境またはVercelプレビュー環境でのみ動作
    if (process.env.NODE_ENV === 'production' && !window.location.hostname.includes('vercel.app')) {
      return
    }

    // デバッガーサーバーのURL（ローカル開発時は localhost、Vercel では環境変数から）
    const debuggerUrl = process.env.NEXT_PUBLIC_DEBUGGER_URL || 'http://localhost:3333'
    const vscodeMonitorUrl = 'http://localhost:3334'
    const unifiedDebuggerUrl = 'http://localhost:3335'
    
    // エラーハンドラーを設定
    const errorHandler = (event: ErrorEvent) => {
      const errorData = {
        error: event.message,
        stack: event.error?.stack,
        url: location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        additional: {
          colno: event.colno,
          lineno: event.lineno,
          filename: event.filename
        }
      }
      
      // デバッガーダッシュボードに送信
      fetch(`${debuggerUrl}/api/debug/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {})
      
      // ローカル環境では追加のデバッガーにも送信
      if (window.location.hostname === 'localhost') {
        // VSCodeモニター
        fetch(`${vscodeMonitorUrl}/api/debug/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(() => {})
        
        // 統合デバッガー
        fetch(`${unifiedDebuggerUrl}/api/debug/error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(() => {})
      }
    }

    // 未処理のPromiseエラーもキャッチ
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      fetch(`${debuggerUrl}/api/debug/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack || String(event.reason),
          url: location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      }).catch(() => {})
    }

    // React エラーバウンダリーの外側のエラーもキャッチ
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', unhandledRejectionHandler)

    // 接続成功をコンソールに表示
    console.log(`🤖 AI Debugger connected to ${debuggerUrl}`)
    if (window.location.hostname === 'localhost') {
      console.log(`🎯 VSCode Monitor connected to ${vscodeMonitorUrl}`)
    }
    
    // デバッガーの存在を確認
    fetch(`${debuggerUrl}/api/debug/errors`)
      .then(() => console.log('✅ Debugger server is running'))
      .catch(() => console.warn('⚠️ Debugger server not found. Run: node scripts/dev-tools/frontend-debugger-ai.js'))

    return () => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler)
    }
  }, [])

  return null
}