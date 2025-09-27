import { NextRequest, NextResponse } from 'next/server';
import { FileAnalysisRequest, FileAnalysisResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: FileAnalysisRequest = await request.json();
    
    // Validate the request
    if (!body.config || !body.environment) {
      return NextResponse.json(
        { success: false, error: 'Config and environment are required' },
        { status: 400 }
      );
    }

    if (!['dev', 'prod'].includes(body.environment)) {
      return NextResponse.json(
        { success: false, error: 'Environment must be dev or prod' },
        { status: 400 }
      );
    }

    // Forward request to Python backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { success: false, error: errorData.error || 'Analysis failed' },
        { status: response.status }
      );
    }

    const result: FileAnalysisResponse = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Analysis API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}