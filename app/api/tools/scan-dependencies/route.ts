import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    // APIスキャナーを実行してJSON形式で結果を取得
    const { stdout, stderr } = await execAsync('node scripts/dev-tools/api-dependency-scanner.js --json')
    
    if (stderr) {
      console.error('Scanner stderr:', stderr)
    }
    
    // JSON出力部分を抽出
    const jsonMatch = stdout.match(/📄 JSON形式の依存関係:\s*(\{[\s\S]*\})/m)
    if (!jsonMatch) {
      throw new Error('Failed to parse scanner output')
    }
    
    const dependencies = JSON.parse(jsonMatch[1])
    
    return NextResponse.json(dependencies)
  } catch (error) {
    console.error('Failed to scan dependencies:', error)
    return NextResponse.json(
      { error: 'Failed to scan dependencies' },
      { status: 500 }
    )
  }
}