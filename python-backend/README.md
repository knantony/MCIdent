# Config Compare AI - Python Backend

## Setup

1. Install dependencies:
```bash
cd python-backend
pip install -r requirements.txt
```

2. Set up environment variables (optional):
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
```

3. Start the server:
```bash
python start.py
```

Or use uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST /compare
Compare development and production configurations.

**Request:**
```json
{
  "devConfig": "string (JSON or YAML)",
  "prodConfig": "string (JSON or YAML)"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "key": "config.key.path",
      "devValue": "dev_value",
      "prodValue": "prod_value", 
      "observation": "What the issue is",
      "suggestion": "How to fix it",
      "risk": "Low|Medium|High"
    }
  ],
  "healthScore": {
    "score": 85,
    "highRisk": 1,
    "mediumRisk": 2,
    "lowRisk": 3
  }
}
```

### GET /
Health check endpoint.

### GET /health  
Detailed health check with AI status.

## Features

- **Multi-format Support**: Handles JSON and YAML configurations
- **AI-Powered Analysis**: Uses Google Gemini for intelligent comparison
- **Fallback Mode**: Basic comparison when AI is unavailable
- **Health Scoring**: Calculates configuration health metrics
- **Risk Assessment**: Categorizes issues by risk level
- **CORS Enabled**: Ready for frontend integration

## Environment Variables

- `GEMINI_API_KEY`: Your Google AI Studio API key
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `ENV`: Environment mode (development/production)