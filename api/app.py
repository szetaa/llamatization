from fastapi import FastAPI, Query, Request, HTTPException
from pydantic import BaseModel
from jinja2 import Template, Environment, FileSystemLoader
import yaml
import json

import pprint

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

with open("../app/search_index.json", "r") as f:
    search_index = json.load(f)

with open("../config.yml", "r") as f:
    config = yaml.safe_load(f)


class PromptInput(BaseModel):
    prompt_key: str
    model: str
    language: str
    variables: dict


@app.post("/generate_prompt_debug/")
async def generate_prompt(request: Request):
    payload = await request.json()


@app.post("/generate_prompt/")
async def generate_prompt(prompt_input: PromptInput):
    input_dict = dict(prompt_input)
    prompt_file = search_index[input_dict["prompt_key"]]["file_path"]
    with open(prompt_file, "r") as pf:
        prompt_yaml = yaml.safe_load(pf)

    prompt_templates = prompt_yaml.get("prompt_template")
    if not prompt_templates:
        specific_template = None
    else:
        specific_template = next(
            (
                template
                for template in prompt_templates
                if prompt_input.model in template["tags"]
            ),
            None,
        )

    config_templates = config.get("templates")
    if not config_templates:
        generic_template = None
    else:
        generic_template = next(
            (
                template
                for template in config_templates
                if prompt_input.model in template["models"]
            ),
            None,
        )

    if specific_template:
        selected_template = specific_template["value"]
    elif generic_template:
        selected_template = generic_template["value"]
    else:
        detail_msg = f"No prompt found for model: {prompt_input.model}"
        print(detail_msg)
        raise HTTPException(status_code=400, detail=detail_msg)

    data = {}

    for key, value_list in prompt_yaml["variables"].items():
        found = False
        fallback = None

        for item in value_list:
            if prompt_input.language in item["tags"]:
                if prompt_input.model in item["tags"]:
                    data[key] = item["value"]
                    found = True
                    break
                elif "all" in item["tags"]:
                    fallback = item["value"]

        if not found and fallback is not None:
            data[key] = fallback

    for key, value in prompt_input.variables.items():
        data[key] = value

    def recursive_render(template_str, context):
        template = Template(template_str)
        last_render = template_str
        while True:
            rendered = template.render(context)
            if rendered == last_render:
                break
            last_render = rendered
            template = Template(rendered)
        return rendered

    rendered_prompt = recursive_render(selected_template, data)

    return {"rendered_prompt": rendered_prompt}
