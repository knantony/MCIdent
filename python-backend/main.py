import json
import os
import yaml
import logging
from typing import List, Dict, Any, Union
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Suppress Google AI warnings
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="google")

# Set environment variables to suppress gRPC/ALTS warnings
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GLOG_minloglevel'] = '3'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['ABSL_LOG_LEVEL'] = '3'

import google.generativeai as genai

# Configure logging
logging.getLogger("google.generativeai").setLevel(logging.ERROR)
logging.getLogger("google").setLevel(logging.ERROR)
logging.getLogger("grpc").setLevel(logging.ERROR)

# Initialize FastAPI app
app = FastAPI(title="Config Compare AI Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # More restrictive for security
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

# Pydantic models
class ComparisonRequest(BaseModel):
    devConfig: str
    prodConfig: str

class ComparisonResult(BaseModel):
    key: str
    devValue: str
    prodValue: str
    observation: str
    suggestion: str
    risk: str  # "Low", "Medium", "High"

class ComparisonResponse(BaseModel):
    success: bool
    data: List[ComparisonResult] = []  # Changed from 'results' to 'data' to match frontend
    error: str = ""
    healthScore: Dict[str, Any] = {}

def parse_config(config_str: str) -> Dict[str, Any]:
    """Parse configuration string (JSON or YAML)"""
    try:
        # Try JSON first
        return json.loads(config_str)
    except json.JSONDecodeError:
        try:
            # Try YAML if JSON fails
            return yaml.safe_load(config_str)
        except yaml.YAMLError:
            raise ValueError("Invalid configuration format. Must be JSON or YAML.")

def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """Flatten nested dictionary with dot notation"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def calculate_health_score(results: List[ComparisonResult]) -> Dict[str, Any]:
    """Calculate configuration health metrics"""
    if not results:
        return {
            "score": 100,
            "highRisk": 0,
            "mediumRisk": 0,
            "lowRisk": 0
        }
    
    high_risk = sum(1 for r in results if r.risk == "High")
    medium_risk = sum(1 for r in results if r.risk == "Medium")
    low_risk = sum(1 for r in results if r.risk == "Low")
    
    # Calculate score: start at 100, deduct points based on risk
    score = 100
    score -= (high_risk * 25)    # High risk: -25 points each
    score -= (medium_risk * 10)  # Medium risk: -10 points each
    score -= (low_risk * 5)      # Low risk: -5 points each
    score = max(0, score)        # Don't go below 0
    
    return {
        "score": score,
        "highRisk": high_risk,
        "mediumRisk": medium_risk,
        "lowRisk": low_risk
    }

async def analyze_with_ai(dev_config: str, prod_config: str) -> List[ComparisonResult]:
    """Use Gemini AI to analyze configuration differences"""
    prompt = f"""You are an expert DevOps and Site Reliability Engineer with deep knowledge of secure and scalable system architecture.

You will be given two configuration files, one for a 'dev' environment and one for a 'prod' environment. Analyze them to find meaningful differences.

Identify discrepancies, including missing keys, different values, and semantically different endpoints (e.g., sandbox vs. live URLs). For each discrepancy, provide a concise observation of its impact, a suggested fix, and a risk level ('Low', 'Medium', or 'High').

Your final output must be a single, minified JSON array of objects, with no additional text or explanations. Each object in the array must strictly follow this schema:
{{
  "key": string,
  "devValue": string, 
  "prodValue": string,
  "observation": string,
  "suggestion": string,
  "risk": "Low" | "Medium" | "High"
}}

Development Configuration:
{dev_config}

Production Configuration:
{prod_config}

Analyze these configurations and return only the JSON array:"""

    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate response
        response = model.generate_content(prompt)
        
        # Parse the AI response
        ai_text = response.text.strip()
        
        # Clean up the response (remove any markdown formatting)
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:]
        if ai_text.endswith("```"):
            ai_text = ai_text[:-3]
        ai_text = ai_text.strip()
        
        # Parse JSON response
        results_data = json.loads(ai_text)
        
        # Convert to Pydantic models
        results = [ComparisonResult(**item) for item in results_data]
        
        return results
        
    except Exception as e:
        print(f"AI Analysis Error: {str(e)}")
        # Fallback to basic comparison if AI fails
        return perform_basic_comparison(dev_config, prod_config)

def perform_basic_comparison(dev_config: str, prod_config: str) -> List[ComparisonResult]:
    """Basic comparison fallback when AI is unavailable"""
    try:
        dev_dict = parse_config(dev_config)
        prod_dict = parse_config(prod_config)
        
        dev_flat = flatten_dict(dev_dict)
        prod_flat = flatten_dict(prod_dict)
        
        results = []
        all_keys = set(dev_flat.keys()) | set(prod_flat.keys())
        
        for key in all_keys:
            dev_val = dev_flat.get(key, "MISSING")
            prod_val = prod_flat.get(key, "MISSING")
            
            if dev_val != prod_val:
                # Determine risk level based on key patterns
                risk = "Medium"
                if any(keyword in key.lower() for keyword in ["password", "secret", "key", "token"]):
                    risk = "High"
                elif any(keyword in key.lower() for keyword in ["debug", "log", "test"]):
                    risk = "Low"
                
                results.append(ComparisonResult(
                    key=key,
                    devValue=str(dev_val),
                    prodValue=str(prod_val),
                    observation=f"Configuration mismatch in {key}",
                    suggestion=f"Review and align {key} values between environments",
                    risk=risk
                ))
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Configuration parsing error: {str(e)}")

@app.post("/compare", response_model=ComparisonResponse)
async def compare_configs(request: ComparisonRequest):
    """Compare development and production configurations"""
    try:
        # Validate inputs
        if not request.devConfig.strip() or not request.prodConfig.strip():
            raise HTTPException(
                status_code=400, 
                detail="Both development and production configurations are required"
            )
        
        # Analyze configurations with AI
        if os.getenv("GEMINI_API_KEY"):
            results = await analyze_with_ai(request.devConfig, request.prodConfig)
        else:
            results = perform_basic_comparison(request.devConfig, request.prodConfig)
        
        # Calculate health score
        health_score = calculate_health_score(results)
        
        return ComparisonResponse(
            success=True,
            data=results,  # Changed from 'results' to 'data'
            healthScore=health_score
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return ComparisonResponse(
            success=False,
            error=f"Analysis failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "Config Compare AI Backend Running",
        "version": "1.0.0",
        "ai_enabled": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "ai_configured": bool(os.getenv("GEMINI_API_KEY")),
        "supported_formats": ["JSON", "YAML"]
    }
