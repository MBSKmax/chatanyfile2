import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()
    let content = ''

    if (fileName.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buffer)
      content = data.text

    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const mammoth = require('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      content = result.value

    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const XLSX = require('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets: string[] = []
      workbook.SheetNames.forEach((name: string) => {
        const sheet = workbook.Sheets[name]
        sheets.push(`=== ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`)
      })
      content = sheets.join('\n\n')

    } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      const JSZip = require('jszip')
      const zip = await JSZip.loadAsync(buffer)
      const texts: string[] = []
      const slideFiles = Object.keys(zip.files)
        .filter((n: string) => n.match(/ppt\/slides\/slide\d+\.xml/))
        .sort()
      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async('string')
        const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
        const text = matches
          .map((m: string) => m.replace(/<[^>]+>/g, '').trim())
          .filter((t: string) => t.length > 0)
          .join(' ')
        if (text.trim()) texts.push(`Slide: ${text}`)
      }
      content = texts.join('\n\n')

    } else if (
      fileName.endsWith('.txt') ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.md')
    ) {
      content = buffer.toString('utf-8')

    } else {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
    }

    if (content.length > 50000) {
      content = content.slice(0, 50000) + '\n\n[File truncated...]'
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'No text found' }, { status: 400 })
    }

    return NextResponse.json({ content, fileName: file.name })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}