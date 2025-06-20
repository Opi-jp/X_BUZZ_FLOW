import { NextResponse } from 'next/server'

// 様々なインポート方法を試す
let results: any = {
  imports: {},
  tests: {}
}

// Test 1: @/lib/prisma-client
try {
  const { prisma: prisma1 } = await import('@/lib/prisma-client')
  results.imports.prismaClient = {
    success: true,
    type: typeof prisma1,
    hasViralSession: !!prisma1?.viralSession
  }
  
  if (prisma1?.viralSession) {
    const count = await prisma1.viralSession.count()
    results.tests.prismaClient = { count }
  }
} catch (e: any) {
  results.imports.prismaClient = { success: false, error: e.message }
}

// Test 2: @/lib/prisma
try {
  const { prisma: prisma2 } = await import('@/lib/prisma')
  results.imports.libPrisma = {
    success: true,
    type: typeof prisma2,
    hasViralSession: !!prisma2?.viralSession
  }
  
  if (prisma2?.viralSession) {
    const count = await prisma2.viralSession.count()
    results.tests.libPrisma = { count }
  }
} catch (e: any) {
  results.imports.libPrisma = { success: false, error: e.message }
}

// Test 3: Direct @prisma/client
try {
  const { PrismaClient } = await import('@prisma/client')
  const prisma3 = new PrismaClient()
  results.imports.directPrisma = {
    success: true,
    hasViralSession: !!prisma3.viralSession
  }
  
  const count = await prisma3.viralSession.count()
  results.tests.directPrisma = { count }
  await prisma3.$disconnect()
} catch (e: any) {
  results.imports.directPrisma = { success: false, error: e.message }
}

// Test 4: Generated prisma
try {
  const { PrismaClient } = await import('@/lib/generated/prisma')
  const prisma4 = new PrismaClient()
  results.imports.generatedPrisma = {
    success: true,
    hasViralSession: !!prisma4.viralSession
  }
  
  const count = await prisma4.viralSession.count()
  results.tests.generatedPrisma = { count }
  await prisma4.$disconnect()
} catch (e: any) {
  results.imports.generatedPrisma = { success: false, error: e.message }
}

// Environment info
results.environment = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: !!process.env.DATABASE_URL,
  DIRECT_URL: !!process.env.DIRECT_URL,
  cwd: process.cwd()
}

export async function GET() {
  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}