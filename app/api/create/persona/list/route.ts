import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const characters = await prisma.character_profiles.findMany({
      orderBy: { name: 'asc' }
    })

    // データ形式を調整
    const formattedCharacters = characters.map(char => ({
      id: char.id,
      name: char.name,
      voiceStyle: char.voice_style || char.tone,
      isActive: true
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

    const character = await prisma.character_profiles.create({
      data: {
        id: `char_${Date.now()}`,
        name,
        display_name: name,
        age,
        gender,
        occupation: 'AI Character',
        catchphrase,
        personality: philosophy || '',
        speaking_style: tone,
        expertise: topics || '',
        backstory: 'AI generated character',
        philosophy,
        tone,
        voice_style: voiceStyle || {},
        emoji_style: '😊'
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