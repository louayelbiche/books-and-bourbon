import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cmsUrl = process.env.CMS_API_URL;
    const cmsKey = process.env.CMS_API_KEY;

    if (!cmsUrl || !cmsKey) {
      console.error('Missing CMS_API_URL or CMS_API_KEY env vars');
      return NextResponse.json(
        { error: 'Newsletter service is not configured.' },
        { status: 503 }
      );
    }

    const response = await fetch(`${cmsUrl}/api/cms/v1/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cmsKey,
      },
      body: JSON.stringify({
        email: body.email,
        source: body.source || 'footer',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to subscribe.' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
