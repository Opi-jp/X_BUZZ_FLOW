import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（簡易的にAPIキーで保護）
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.CLAUDE_API_KEY?.slice(-10)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Prismaを使ってテーブルの存在を確認
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('gpt_analyses', 'content_drafts', 'prompt_templates')
    ` as Array<{ table_name: string }>

    const existingTables = tables.map(t => t.table_name)

    // 各テーブルを作成
    const results: any = {}

    if (!existingTables.includes('gpt_analyses')) {
      await prisma.$executeRaw`
        CREATE TABLE gpt_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_type VARCHAR(255) NOT NULL,
          prompt TEXT NOT NULL,
          response JSONB NOT NULL DEFAULT '{}',
          tokens INTEGER,
          duration INTEGER,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `
      await prisma.$executeRaw`CREATE INDEX idx_gpt_analyses_type ON gpt_analyses(analysis_type)`
      await prisma.$executeRaw`CREATE INDEX idx_gpt_analyses_created ON gpt_analyses(created_at)`
      results.gpt_analyses = 'created'
    } else {
      results.gpt_analyses = 'already exists'
    }

    if (!existingTables.includes('content_drafts')) {
      await prisma.$executeRaw`
        CREATE TABLE content_drafts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          analysis_id UUID NOT NULL,
          concept_type VARCHAR(255) NOT NULL,
          category VARCHAR(255) NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          edited_content TEXT,
          explanation TEXT,
          buzz_factors JSONB DEFAULT '[]',
          target_audience TEXT,
          estimated_engagement JSONB DEFAULT '{}',
          hashtags JSONB DEFAULT '[]',
          visual_guide TEXT,
          platform VARCHAR(50) DEFAULT 'Twitter',
          format VARCHAR(50) DEFAULT 'single',
          status VARCHAR(50) DEFAULT 'draft',
          editor_notes TEXT,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (analysis_id) REFERENCES gpt_analyses(id) ON DELETE CASCADE
        )
      `
      await prisma.$executeRaw`CREATE INDEX idx_content_drafts_analysis ON content_drafts(analysis_id)`
      await prisma.$executeRaw`CREATE INDEX idx_content_drafts_status ON content_drafts(analysis_id, status)`
      await prisma.$executeRaw`CREATE INDEX idx_content_drafts_type ON content_drafts(concept_type, category)`
      results.content_drafts = 'created'
    } else {
      results.content_drafts = 'already exists'
    }

    if (!existingTables.includes('prompt_templates')) {
      await prisma.$executeRaw`
        CREATE TABLE prompt_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          template TEXT NOT NULL,
          variables JSONB NOT NULL DEFAULT '[]',
          is_active BOOLEAN DEFAULT true,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `
      await prisma.$executeRaw`CREATE INDEX idx_prompt_templates_type ON prompt_templates(type, is_active)`
      results.prompt_templates = 'created'
    } else {
      results.prompt_templates = 'already exists'
    }

    // 更新日時の自動更新トリガーを作成
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // 各テーブルにトリガーを作成
    const triggerTables = ['gpt_analyses', 'content_drafts', 'prompt_templates']
    for (const table of triggerTables) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `)
      } catch (e) {
        // トリガーが既に存在する場合はスキップ
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}