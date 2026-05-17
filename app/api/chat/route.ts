import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { message, fileContent, history } = await req.json()

    if (!message || !fileContent) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const historyText = history
      .slice(-6)
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      )
      .join('\n')

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant analyzing a document.
FILE CONTENTS:
---
${fileContent}
---
Answer based only on the file. Match user language (Urdu or English).`
        },
        {
          role: 'user',
          content: `${historyText}\n\nUser: ${message}`
        }
      ],
      max_tokens: 1024,
    })

    const reply = completion.choices[0]?.message?.content || 'No response'
    return NextResponse.json({ reply })

  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}