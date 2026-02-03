import { NextResponse } from 'next/server'

// Google Sheets API configuration
// To use this, you need to:
// 1. Create a Google Cloud project and enable Google Sheets API
// 2. Create a service account and download the credentials JSON
// 3. Share your Google Sheet with the service account email
// 4. Set up environment variables:
//    - GOOGLE_SHEETS_ID: Your spreadsheet ID
//    - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
//    - GOOGLE_PRIVATE_KEY: Service account private key

interface FormData {
  name: string
  email: string
  type: 'book' | 'author' | 'general' | 'partnership'
  bookTitle?: string
  authorName?: string
  message: string
}

async function appendToGoogleSheets(data: FormData) {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID
  const SHEET_NAME = 'Submissions'

  // If no Google Sheets configured, log to console and return success
  if (!SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.log('Google Sheets not configured. Submission received:')
    console.log(JSON.stringify(data, null, 2))
    return { success: true, method: 'console' }
  }

  try {
    // Create JWT for Google Sheets API authentication
    const jwt = await createJWT()

    // Prepare row data
    const timestamp = new Date().toISOString()
    const rowData = [
      timestamp,
      data.name,
      data.email,
      data.type,
      data.bookTitle || '',
      data.authorName || '',
      data.message,
    ]

    // Append to Google Sheets
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`)
    }

    return { success: true, method: 'google-sheets' }
  } catch (error) {
    console.error('Google Sheets error:', error)
    throw error
  }
}

async function createJWT(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google service account credentials not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour expiration

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }

  // For production, use a proper JWT library
  // This is a simplified example - in production, use jose or similar
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${encodedHeader}.${encodedPayload}`)
  const signature = sign.sign(key, 'base64url')

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

export async function POST(request: Request) {
  try {
    const body: FormData = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Submit to Google Sheets (or log if not configured)
    await appendToGoogleSheets(body)

    return NextResponse.json(
      { message: 'Submission received successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    )
  }
}
