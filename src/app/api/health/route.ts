import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'books-and-bourbon',
    timestamp: new Date().toISOString(),
  })
}
