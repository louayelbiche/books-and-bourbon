import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const secret = body.secret

    const expectedSecret = process.env.REVALIDATION_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const paths = body.paths as string[] | undefined

    if (paths && paths.length > 0) {
      for (const path of paths) {
        revalidatePath(path)
      }
    } else {
      // Revalidate all main pages by default
      revalidatePath('/')
      revalidatePath('/events')
      revalidatePath('/about')
      revalidatePath('/contact')
    }

    return NextResponse.json({ revalidated: true })
  } catch {
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
