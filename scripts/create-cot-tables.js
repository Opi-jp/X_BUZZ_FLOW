const { PrismaClient } = require('../app/generated/prisma')

const prisma = new PrismaClient()

async function createCotTables() {
  console.log('Creating CoT tables...')
  
  try {
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_drafts')
    `
    
    console.log('Existing tables:', tables)
    
    if (tables.length === 0) {
      console.log('Creating enums and tables...')
      
      // Create enums
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
            CREATE TYPE session_status AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phase_step') THEN
            CREATE TYPE phase_step AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_status') THEN
            CREATE TYPE draft_status AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'CANCELLED');
          END IF;
        END $$;
      `
      
      // Create cot_sessions table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS cot_sessions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          session_type TEXT NOT NULL,
          config JSONB NOT NULL,
          status session_status DEFAULT 'PENDING',
          current_phase INTEGER DEFAULT 1,
          current_step phase_step DEFAULT 'THINK',
          phases JSONB,
          retry_count INTEGER DEFAULT 0,
          last_error TEXT,
          next_retry_at TIMESTAMP(3),
          should_complete_by TIMESTAMP(3),
          is_timed_out BOOLEAN DEFAULT false,
          total_tokens INTEGER DEFAULT 0,
          total_duration INTEGER DEFAULT 0,
          created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP(3)
        )
      `
      
      // Create cot_drafts table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS cot_drafts (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          session_id TEXT NOT NULL,
          concept_number INTEGER NOT NULL,
          title TEXT NOT NULL,
          hook TEXT NOT NULL,
          angle TEXT NOT NULL,
          structure JSONB NOT NULL,
          visual TEXT,
          timing TEXT NOT NULL,
          hashtags TEXT[] NOT NULL,
          opportunity TEXT NOT NULL,
          platform TEXT NOT NULL,
          format TEXT NOT NULL,
          expected_reaction TEXT NOT NULL,
          status draft_status DEFAULT 'DRAFT',
          edited_content TEXT,
          scheduled_at TIMESTAMP(3),
          posted_at TIMESTAMP(3),
          post_id TEXT,
          created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES cot_sessions(id) ON DELETE CASCADE
        )
      `
      
      console.log('Tables created successfully!')
    } else {
      console.log('Tables already exist')
    }
    
  } catch (error) {
    console.error('Error creating tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createCotTables()