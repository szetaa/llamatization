# app.py
from fastapi import FastAPI, APIRouter, Query, Request, HTTPException
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import json
from llamatization import Llamatization, PromptInput
import yaml
import sys
import os

current_directory = os.path.dirname(__file__)
sys.path.append(current_directory)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize APIRouter and include it into FastAPI instance
router = APIRouter()


@router.post("/generate_prompt/")
async def generate_prompt(prompt_input: PromptInput):
    return Llamatization.generate_prompt(prompt_input, search_index, config)


app.include_router(router, prefix="/api/v1")


# Expose config
@app.get("/config.yml")
def get_conf():
    return FileResponse("../config.yml", headers={"Content-Type": "application/x-yaml"})


@app.get("/")
def read_root():
    return RedirectResponse(url="/index.html")


with open("../app/search_index.json", "r") as f:
    search_index = json.load(f)

with open("../config.yml", "r") as f:
    config = yaml.safe_load(f)

# Serve prompts
app.mount("/prompts/", StaticFiles(directory="../prompts"), name="prompts")


# Serve static files
app.mount("/", StaticFiles(directory="../app"), name="static")
