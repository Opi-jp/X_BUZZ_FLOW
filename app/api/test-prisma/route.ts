import { NextResponse } from 'next/server'

export async function GET() {
  const results = {
    step1_static_import: null,
    step2_dynamic_import: null,
    step3_db_import: null,
    step4_direct_client: null,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_URL: !!process.env.DIRECT_URL,
    }
  }

  // Step 1: Static import from @/lib/prisma
  try {
    const { prisma } = await import('@/lib/prisma')
    results.step1_static_import = {
      success: true,
      type: typeof prisma,
      isNull: prisma === null,
      isUndefined: prisma === undefined,
      hasViralSession: !!prisma?.viralSession
    }
    
    if (prisma) {
      const count = await prisma.viralSession.count()
      results.step1_static_import.sessionCount = count
    }
  } catch (error) {
    results.step1_static_import = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Step 2: Dynamic import with full module check
  try {
    const prismaModule = await import('@/lib/prisma')
    results.step2_dynamic_import = {
      success: true,
      moduleKeys: Object.keys(prismaModule),
      hasPrisma: 'prisma' in prismaModule,
      prismaType: typeof prismaModule.prisma
    }
  } catch (error) {
    results.step2_dynamic_import = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Step 3: Import from @/lib/db
  try {
    const { prisma: dbPrisma } = await import('@/lib/db')
    results.step3_db_import = {
      success: true,
      type: typeof dbPrisma,
      hasViralSession: !!dbPrisma?.viralSession
    }
    
    if (dbPrisma) {
      const count = await dbPrisma.viralSession.count()
      results.step3_db_import.sessionCount = count
    }
  } catch (error) {
    results.step3_db_import = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // Step 4: Direct PrismaClient instantiation
  try {
    const { PrismaClient } = await import('@prisma/client')
    const directClient = new PrismaClient()
    results.step4_direct_client = {
      success: true,
      hasViralSession: !!directClient.viralSession
    }
    
    const count = await directClient.viralSession.count()
    results.step4_direct_client.sessionCount = count
    
    await directClient.$disconnect()
  } catch (error) {
    results.step4_direct_client = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  return NextResponse.json(results, { status: 200 })
}