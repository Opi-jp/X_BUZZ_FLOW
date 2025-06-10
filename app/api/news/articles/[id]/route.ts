import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE: 記事を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // カスケード削除が設定されているので、関連する分析結果も自動的に削除される
    await prisma.newsArticle.delete({
      where: { id }
    })

    return NextResponse.json({ 
      success: true,
      message: '記事を削除しました' 
    })
  } catch (error) {
    console.error('Error deleting article:', error)
    
    // 記事が見つからない場合
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: '記事の削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET: 記事の詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const article = await prisma.newsArticle.findUnique({
      where: { id },
      include: {
        source: true,
        analysis: true,
      }
    })

    if (!article) {
      return NextResponse.json(
        { error: '記事が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: '記事の取得に失敗しました' },
      { status: 500 }
    )
  }
}