#!/usr/bin/env python3
"""
Startup script for the Config Compare AI FastAPI backend
"""
import uvicorn
import os

if __name__ == "__main__":
    # Load environment variables if .env file exists
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("python-dotenv not installed. Environment variables should be set manually.")
    
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENV", "development") == "development"
    
    print(f"🚀 Starting Config Compare AI Backend...")
    print(f"📍 Server: http://{host}:{port}")
    print(f"🤖 AI Enabled: {'Yes' if os.getenv('GEMINI_API_KEY') else 'No (using basic comparison)'}")
    print(f"🔄 Auto-reload: {'Yes' if reload else 'No'}")
    
    # Start server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )