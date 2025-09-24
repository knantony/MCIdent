from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/compare")
async def compare(request: Request):
    payload = await request.json()
    # TODO: Implement your config comparison logic here
    return {"result": "AI analysis here", "input": payload}

@app.get("/")
async def root():
    return {"status": "Python backend running"}
