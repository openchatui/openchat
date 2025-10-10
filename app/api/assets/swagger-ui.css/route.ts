import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const projectRoot = process.cwd()
    const candidatePaths = [
      path.join(projectRoot, 'node_modules', 'swagger-ui', 'dist', 'swagger-ui.css'),
      path.join(projectRoot, 'node_modules', 'swagger-ui-react', 'swagger-ui.css'),
    ]

    let cssContent: string | null = null
    for (const candidate of candidatePaths) {
      try {
        cssContent = await fs.readFile(candidate, 'utf8')
        break
      } catch {
        // try next
      }
    }

    if (!cssContent) {
      return new NextResponse('/* swagger-ui.css not found */', {
        status: 404,
        headers: { 'Content-Type': 'text/css' },
      })
    }

    // Remove sourceMappingURL comment to avoid 404s in dev/prod
    const sanitized = cssContent.replace(/\/\*#\s*sourceMappingURL=[^*]*\*\//g, '')

    return new NextResponse(sanitized, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        // Long cache; file content only changes when dependencies change
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    return new NextResponse('/* failed to load swagger-ui.css */', {
      status: 500,
      headers: { 'Content-Type': 'text/css' },
    })
  }
}


