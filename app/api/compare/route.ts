import { NextRequest, NextResponse } from 'next/server';
import { ComparisonApiResponse, AnalysisRequest } from '@/lib/types';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { devConfig, prodConfig }: AnalysisRequest = await request.json();

    // Validate input
    if (!devConfig || !prodConfig) {
      return NextResponse.json<ComparisonApiResponse>({
        success: false,
        error: 'Both development and production configuration files are required'
      }, { status: 400 });
    }

    // Forward request to Python backend
    const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        devConfig,
        prodConfig
      })
    });

    if (!pythonResponse.ok) {
      throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
    }

    const pythonData = await pythonResponse.json();
    
    // Return the response from Python backend
    return NextResponse.json<ComparisonApiResponse>(pythonData);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json<ComparisonApiResponse>({
      success: false,
      error: `Analysis failed: ${error.message || 'Unknown error occurred'}`
    }, { status: 500 });
  }