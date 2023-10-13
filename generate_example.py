import json
import requests

BASE_URL = "http://localhost:8091"


def generate_prompt(prompt_key, language, model):
    payload = {
        "prompt_key": prompt_key,
        "language": language,
        "model": model,
        "variables": {"student": "me", "topic": "Bicycles"},
    }

    headers = {"Content-Type": "application/json"}

    response = requests.post(
        f"{BASE_URL}/generate_prompt/", headers=headers, json=payload
    )

    if response.status_code == 200:
        return json.loads(response.text)
    else:
        return None


# Example usage
result = generate_prompt("prompts_school_pathway", "en", "llama2")
if result:
    print(result)
else:
    print("Failed to generate prompt.")
