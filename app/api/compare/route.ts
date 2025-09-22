import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { ComparisonResult, ComparisonApiResponse, AnalysisRequest } from '@/lib/types';

// Initialize Gemini API - In production, use environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder-key');

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

    // Construct detailed prompt for Gemini
    const prompt = `You are an expert DevOps and Site Reliability Engineer with deep knowledge of secure and scalable system architecture.

You will be given two configuration files, one for a 'dev' environment and one for a 'prod' environment. Analyze them to find meaningful differences.

Identify discrepancies, including missing keys, different values, and semantically different endpoints (e.g., sandbox vs. live URLs). For each discrepancy, provide a concise observation of its impact, a suggested fix, and a risk level ('Low', 'Medium', or 'High').

Your final output must be a single, minified JSON array of objects, with no additional text or explanations. Each object in the array must strictly follow this schema:
{
  "key": string,
  "devValue": string, 
  "prodValue": string,
  "observation": string,
  "suggestion": string,
  "risk": "Low" | "Medium" | "High"
}

Development Configuration:
${devConfig}

Production Configuration:
${prodConfig}

Analyze these configurations and return only the JSON array:`;

    // Check if API key is available
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder-key' || process.env.GEMINI_API_KEY === 'your_actual_gemini_api_key_here') {
      
      // Provide helpful fallback with mock data and instructions
      const mockResults: ComparisonResult[] = [
        {
          key: "⚠️ API Setup Required",
          devValue: "Mock Data",
          prodValue: "Mock Data",
          observation: "You're seeing sample data because the Gemini API key is not configured. To use real AI analysis, get your free API key from Google AI Studio.",
          suggestion: "Visit https://makersuite.google.com/app/apikey to get your API key, then add it to your .env.local file as GEMINI_API_KEY=your_key_here",
          risk: "Medium"
        },
        {
          key: "debug.enabled",
          devValue: "true",
          prodValue: "true",
          observation: "(Sample) Debug mode is enabled in production, which can expose sensitive information and impact performance.",
          suggestion: "(Sample) Immediately disable debug mode in production environment for security.",
          risk: "High"
        },
        {
          key: "database.ssl",
          devValue: "false", 
          prodValue: "true",
          observation: "(Sample) SSL configuration differs between environments. Production correctly uses SSL while development does not.",
          suggestion: "(Sample) This is typically acceptable, but consider enabling SSL in development for environment parity.",
          risk: "Low"
        }
      ];

      return NextResponse.json<ComparisonApiResponse>({
        success: true,
        data: mockResults
      });
    }

    // Use actual Gemini AI - Use the current model name
    let aiOutput: string;
    try {
      console.log('Attempting to use Gemini AI with API key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('Model created successfully, sending prompt...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      aiOutput = response.text();
      
      console.log('AI response received, length:', aiOutput.length);
      console.log('Raw AI response:', aiOutput.substring(0, 500) + '...');
    } catch (aiError: any) {
      console.error('Gemini AI error:', aiError);
      
      // Provide helpful error message and fallback
      const fallbackResults: ComparisonResult[] = [{
        key: "🤖 AI Service Issue",
        devValue: "Temporary Error",
        prodValue: "Temporary Error", 
        observation: `The AI service encountered an error: ${aiError.message}. This might be due to API quota limits or model availability.`,
        suggestion: "Please try again in a few moments. If the issue persists, check your API key and quota at https://makersuite.google.com",
        risk: "Medium"
      }];
      
      return NextResponse.json<ComparisonApiResponse>({
        success: true,
        data: fallbackResults
      });
    }
    
    console.log('Raw AI response:', aiOutput);
    
    console.log('Raw AI response:', aiOutput);
    
    // Clean the response - sometimes AI adds extra text before/after JSON
    let cleanedOutput = aiOutput.trim();
    
    // Extract JSON array from the response
    const jsonMatch = cleanedOutput.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanedOutput = jsonMatch[0];
    }
    
    // Parse the AI response
    let parsedResults: ComparisonResult[];
    try {
      parsedResults = JSON.parse(cleanedOutput);
      
      // Validate the structure
      if (!Array.isArray(parsedResults)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each result has required fields
      parsedResults.forEach((result, index) => {
        const requiredFields = ['key', 'devValue', 'prodValue', 'observation', 'suggestion', 'risk'];
        for (const field of requiredFields) {
          if (!(field in result)) {
            throw new Error(`Missing field '${field}' in result ${index}`);
          }
        }
        
        // Validate risk level
        if (!['Low', 'Medium', 'High'].includes(result.risk)) {
          result.risk = 'Medium'; // Default fallback
        }
      });
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Cleaned output:', cleanedOutput);
      
      return NextResponse.json<ComparisonApiResponse>({
        success: false,
        error: 'AI returned invalid response format. Please try again.'
      }, { status: 500 });
    }
    
    // If no results found, return a message
    if (parsedResults.length === 0) {
      parsedResults = [{
        key: "overall",
        devValue: "N/A",
        prodValue: "N/A",
        observation: "No significant differences found between the configurations.",
        suggestion: "Configurations appear to be consistent. Consider reviewing for any subtle differences.",
        risk: "Low"
      }];
    }

    return NextResponse.json<ComparisonApiResponse>({
      success: true,
      data: parsedResults
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json<ComparisonApiResponse>({
      success: false,
      error: 'Analysis failed. Please try again.'
    }, { status: 500 });
  }
}