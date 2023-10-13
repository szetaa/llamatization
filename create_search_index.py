import glob
import os
import yaml
import json

search_fields = {"name": "", "description": "", "keywords": []}
result = {}

for filepath in glob.iglob("prompts/**", recursive=True):
    if os.path.isfile(filepath):
        with open(filepath, "r") as f:
            try:
                content = yaml.safe_load(f)
            except yaml.YAMLError as e:
                print(f"Error parsing {filepath}: {e}")
                continue

            available_languages = set()

            # Collect all available languages from the search fields
            for field in search_fields.keys():
                if isinstance(content.get(field, {}), dict):
                    available_languages.update(content.get(field, {}).keys())
                else:
                    available_languages.add("en")

            for lang in available_languages:
                if lang not in result:
                    result[lang] = {}

                combined_field = " ".join(
                    [
                        str(content.get(field, {}).get(lang, ""))
                        if isinstance(content.get(field, {}), dict)
                        else str(content.get(field, ""))
                        for field in search_fields.keys()
                    ]
                )
                _key = filepath.replace(".yml", "")
                result[lang][_key] = {
                    field: content.get(field, {}).get(lang, search_fields[field])
                    if isinstance(content.get(field, {}), dict)
                    else content.get(field, search_fields[field])
                    for field in search_fields.keys()
                }
                result[lang][_key].update(
                    {
                        "prompt_key": _key,
                        "file_path": f"../{filepath}",
                        "combined_search_field": combined_field,
                    }
                )

# for lang, lang_result in result.items():
#     with open(f"./app/search_index_{lang}.json", "w") as f:
#         json.dump(lang_result, f)

final_result = {}

for lang, lang_result in result.items():
    for prompt_key, prompt_value in lang_result.items():
        if prompt_key not in final_result:
            final_result[prompt_key] = {}
        final_result[prompt_key][lang] = prompt_value
        final_result[prompt_key]["file_path"] = prompt_value.get(
            "file_path", ""
        )  # Copy file_path to root

with open("./app/search_index.json", "w") as f:
    json.dump(final_result, f, indent=4)
