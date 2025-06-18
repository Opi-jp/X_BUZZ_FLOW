import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const characters = await prisma.characterProfile.findMany({
      where: { isDefault: true },
      orderBy: { name: 'asc' }
    })

    // データ形式を調整
    const formattedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      voiceStyle: char.voiceStyle || char.tone,
      isActive: char.isActive || false
    }))

    return NextResponse.json({
      success: true,
      characters: formattedCharacters
    })
  } catch (error) {
    console.error('Error fetching characters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      age,
      gender,
      tone,
      catchphrase,
      philosophy,
      voiceStyle,
      topics,
      visual,
      userId
    } = body

    const character = await prisma.characterProfile.create({
      data: {
        name,
        age,
        gender,
        tone,
        catchphrase,
        philosophy,
        voiceStyle,
        topics,
        visual: visual || {},
        userId,
        isDefault: false
      }
    })

    return NextResponse.json({
      success: true,
      character
    })
  } catch (error) {
    console.error('Error creating character:', error)
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    )
  }
}