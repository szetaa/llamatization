# Llamatization (L11n)

Llamatization, or l11n, is a framework created to adapt LLM prompts for various LLM types. Drawing inspiration from localization (l10n) and internationalization (i18n) principles, l11n addresses the dual challenge of localizing prompts to individual LLMs and internationalizing them to support multiple languages.

## TLDR;

I just want to explore prompts. Where can I find the search index and online geneartor?

Here: https://szetaa.github.io/llamatization/app/index.html

## Why?

Language models are not only sensitive to the [prompt syntax](https://github.com/szetaa/llamatization/blob/main/config.yml#L30), but also to the instruction itself. 

For example, it may be enough for one model to ask for a specific response format (e.g, JSON), while another model expects one or a few examples.

Llamatization handles both. You can in one prompt definition start with what works for your first model (tag it with [all](https://github.com/szetaa/llamatization/blob/main/prompts/example.yml#L9)), and when a new model requires a more verbose instruction, you can extend the existing prompt only by a new variant of the affected field, without creating a copy of the full prompt. 

On top of this, it is possible to create mutlilingual prompts, which extend to a different language only by changing a parameter.

## How prompts are stored

Prompts are stored as YAML files. 

Example:

https://github.com/szetaa/llamatization/tree/main/prompts

Adding a new promtp file will re-render the search index.

## How to search?

https://szetaa.github.io/llamatization/app/index.html

## What's next?

Make this the new default prompt-generator for the [herding-llamas](https://github.com/szetaa/herding_llamas) project.