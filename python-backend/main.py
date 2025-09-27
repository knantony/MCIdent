import json
import os
import yaml
import logging
from typing import List, Dict, Any, Union, Tuple
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
    problematicValue: str  # The actual problematic value to display
    problematicEnvironment: str  # 'dev' | 'prod' | 'both'
    observation: str
    suggestion: str
    risk: str  # "Low", "Medium", "High"

class ComparisonResponse(BaseModel):
    success: bool
    data: List[ComparisonResult] = []  # Changed from 'results' to 'data' to match frontend
    error: str = ""
    healthScore: Dict[str, Any] = {}

# New models for individual file analysis
class FileAnalysisRequest(BaseModel):
    config: str
    environment: str  # 'dev' or 'prod'

class FileIssue(BaseModel):
    key: str
    value: str
    observation: str
    suggestion: str
    risk: str  # "Low", "Medium", "High"

class FileAnalysisResponse(BaseModel):
    success: bool
    environment: str
    issues: List[FileIssue] = []
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

def determine_problematic_environment(key: str, dev_val: Any, prod_val: Any) -> Tuple[str, str]:
    """
    Determine which environment has the problematic value and return (problematic_value, environment)
    """
    if dev_val is None and prod_val is not None:
        return str(prod_val), 'prod'  # Missing in dev
    if prod_val is None and dev_val is not None:
        return str(dev_val), 'dev'   # Missing in prod
    
    dev_str = str(dev_val).lower() if dev_val is not None else ""
    prod_str = str(prod_val).lower() if prod_val is not None else ""
    key_lower = key.lower()
    
    # Security-related issues: if dev has insecure values, dev is problematic
    if any(pattern in key_lower for pattern in ['password', 'secret', 'key', 'token']):
        # If dev has weak/default values, it's problematic
        if any(weak in dev_str for weak in ['test', 'default', 'demo', 'password', '123']):
            return str(dev_val), 'dev'
        return str(prod_val), 'prod'
    
    # Debug/Development settings: if enabled in prod, prod is problematic
    if 'debug' in key_lower:
        if prod_str in ['true', '1', 'yes', 'on', 'enabled']:
            return str(prod_val), 'prod'  # Debug enabled in prod is bad
        return str(dev_val), 'dev'
    
    # Host/URL patterns: dev environments typically problematic
    if any(pattern in key_lower for pattern in ['host', 'url', 'endpoint', 'server']):
        if any(dev_pattern in dev_str for dev_pattern in ['localhost', '127.0.0.1', 'dev', 'test', 'staging']):
            return str(dev_val), 'dev'
        return str(prod_val), 'prod'
    
    # SSL/Security: if prod is insecure, prod is problematic  
    if any(pattern in key_lower for pattern in ['ssl', 'tls', 'secure', 'https']):
        if prod_str in ['false', '0', 'no', 'off', 'disabled']:
            return str(prod_val), 'prod'
        return str(dev_val), 'dev'
    
    # Port patterns: non-standard ports might be problematic
    if 'port' in key_lower:
        try:
            dev_port = int(dev_str) if dev_str.isdigit() else None
            prod_port = int(prod_str) if prod_str.isdigit() else None
            
            # Standard ports (80, 443, 3000, 8000, 5000) vs non-standard
            standard_ports = [80, 443, 3000, 8000, 5000, 8080]
            
            if dev_port and dev_port not in standard_ports and prod_port in standard_ports:
                return str(dev_val), 'dev'
            if prod_port and prod_port not in standard_ports and dev_port in standard_ports:
                return str(prod_val), 'prod'
        except:
            pass
    
    # Default: if values are different, assume dev is more likely to have development-specific issues
    if dev_val != prod_val:
        # Check for development-specific patterns
        if any(dev_pattern in dev_str for dev_pattern in ['test', 'dev', 'local', 'debug', 'mock', 'fake']):
            return str(dev_val), 'dev'
        if any(prod_pattern in prod_str for prod_pattern in ['prod', 'production', 'live']):
            return str(dev_val), 'dev'  # Dev value is the issue
    
    # Fallback: return dev value as potentially problematic
    return str(dev_val), 'dev'

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
        
        # Convert to Pydantic models and add problematic environment detection
        results = []
        for item in results_data:
            # Determine problematic value and environment if not provided by AI
            if 'problematicValue' not in item or 'problematicEnvironment' not in item:
                problematic_value, problematic_env = determine_problematic_environment(
                    item['key'], 
                    item['devValue'], 
                    item['prodValue']
                )
                item['problematicValue'] = problematic_value
                item['problematicEnvironment'] = problematic_env
            
            results.append(ComparisonResult(**item))
        
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
                
                # Determine which environment has the problematic value
                problematic_value, problematic_env = determine_problematic_environment(key, dev_val, prod_val)
                
                results.append(ComparisonResult(
                    key=key,
                    devValue=str(dev_val),
                    prodValue=str(prod_val),
                    problematicValue=problematic_value,
                    problematicEnvironment=problematic_env,
                    observation=f"Configuration mismatch in {key}",
                    suggestion=f"Review and align {key} values between environments",
                    risk=risk
                ))
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Configuration parsing error: {str(e)}")

async def analyze_individual_file(config: str, environment: str) -> List[FileIssue]:
    """Analyze a single configuration file for security and best practices issues"""
    prompt = f"""You are an expert DevOps and Site Reliability Engineer with deep knowledge of secure system configuration.

You will be given a single configuration file from a {environment.upper()} environment. Analyze it thoroughly for:

1. Security vulnerabilities (exposed secrets, weak settings, insecure protocols)
2. Best practice violations (debug settings in prod, missing essential configs)
3. Performance issues (timeouts, resource limits, inefficient settings)
4. Operational concerns (logging levels, monitoring settings)

For each problematic configuration item found, provide a concise observation and actionable suggestion.

Your output must be a single, minified JSON array with no additional text. Each object must follow this schema:
{{
  "key": string,
  "value": string,
  "observation": string,
  "suggestion": string,
  "risk": "Low" | "Medium" | "High"
}}

Configuration to analyze:
{config}

Return only the JSON array:"""

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
        issues_data = json.loads(ai_text)
        
        # Convert to Pydantic models
        issues = []
        for item in issues_data:
            issues.append(FileIssue(**item))
        
        return issues
        
    except Exception as e:
        print(f"Individual File Analysis Error: {str(e)}")
        # Fallback to basic analysis if AI fails
        return perform_basic_file_analysis(config, environment)

def perform_basic_file_analysis(config: str, environment: str) -> List[FileIssue]:
    """Basic file analysis fallback when AI is unavailable"""
    try:
        config_dict = parse_config(config)
        config_flat = flatten_dict(config_dict)
        
        issues = []
        
        for key, value in config_flat.items():
            key_lower = key.lower()
            value_str = str(value).lower()
            
            # Check for security issues
            if any(pattern in key_lower for pattern in ['password', 'secret', 'key', 'token', 'api_key']):
                if value_str not in ['', 'null', 'none', '***']:
                    issues.append(FileIssue(
                        key=key,
                        value=str(value),
                        observation=f"Sensitive data exposed in configuration: {key}",
                        suggestion="Use environment variables or secure secret management",
                        risk="High"
                    ))
            
            # Check for debug settings in production
            if environment.lower() == 'prod' and 'debug' in key_lower and value_str in ['true', '1', 'on']:
                issues.append(FileIssue(
                    key=key,
                    value=str(value),
                    observation=f"Debug mode enabled in production: {key}",
                    suggestion="Disable debug mode in production environment",
                    risk="Medium"
                ))
            
            # Check for SSL/TLS issues
            if 'ssl' in key_lower or 'tls' in key_lower:
                if 'verify' in key_lower and value_str in ['false', '0', 'off']:
                    issues.append(FileIssue(
                        key=key,
                        value=str(value),
                        observation=f"SSL/TLS verification disabled: {key}",
                        suggestion="Enable SSL/TLS verification for security",
                        risk="High"
                    ))
            
            # Check for insecure protocols
            if isinstance(value, str) and any(proto in value.lower() for proto in ['http://', 'ftp://', 'telnet://']):
                issues.append(FileIssue(
                    key=key,
                    value=str(value),
                    observation=f"Insecure protocol detected in {key}",
                    suggestion="Use secure protocols (HTTPS, SFTP, SSH)",
                    risk="Medium"
                ))
        
        return issues
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File analysis error: {str(e)}")

def calculate_file_health_score(issues: List[FileIssue]) -> Dict[str, Any]:
    """Calculate individual file health metrics"""
    if not issues:
        return {
            "score": 100,
            "highRisk": 0,
            "mediumRisk": 0,
            "lowRisk": 0
        }
    
    high_risk = sum(1 for issue in issues if issue.risk == "High")
    medium_risk = sum(1 for issue in issues if issue.risk == "Medium")
    low_risk = sum(1 for issue in issues if issue.risk == "Low")
    
    # Calculate score: start at 100, deduct points based on risk
    score = 100
    score -= (high_risk * 30)    # High risk: -30 points each (more severe for individual files)
    score -= (medium_risk * 15)  # Medium risk: -15 points each
    score -= (low_risk * 5)      # Low risk: -5 points each
    score = max(0, score)        # Don't go below 0
    
    return {
        "score": score,
        "highRisk": high_risk,
        "mediumRisk": medium_risk,
        "lowRisk": low_risk
    }

@app.post("/analyze", response_model=FileAnalysisResponse)
async def analyze_individual_config(request: FileAnalysisRequest):
    """Analyze a single configuration file for issues and recommendations"""
    try:
        # Validate inputs
        if not request.config.strip():
            raise HTTPException(
                status_code=400, 
                detail="Configuration content is required"
            )
        
        if request.environment.lower() not in ['dev', 'prod']:
            raise HTTPException(
                status_code=400,
                detail="Environment must be 'dev' or 'prod'"
            )
        
        # Analyze configuration with AI
        if os.getenv("GEMINI_API_KEY"):
            issues = await analyze_individual_file(request.config, request.environment)
        else:
            issues = perform_basic_file_analysis(request.config, request.environment)
        
        # Calculate health score
        health_score = calculate_file_health_score(issues)
        
        return FileAnalysisResponse(
            success=True,
            environment=request.environment,
            issues=issues,
            healthScore=health_score
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return FileAnalysisResponse(
            success=False,
            environment=request.environment,
            error=f"Analysis failed: {str(e)}"
        )

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
