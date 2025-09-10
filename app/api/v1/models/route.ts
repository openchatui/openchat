import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Temporarily remove authentication to debug
    // const session = await auth()
    // const userId = session?.user?.id
    // if (!userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const models = await db.model.findMany({
      where: {
        // userId: userId, // Temporarily remove user filter
        // isActive: true, // Remove active filter - let frontend handle visibility
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    console.log('API returning models:', models.length, models.slice(0, 3))

    return NextResponse.json({
      models: models,
      count: models.length,
    })
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch models' }, { status: 500 })
  }
}