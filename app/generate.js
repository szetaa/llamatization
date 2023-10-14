export default class DynamicPromptGenerator {
    constructor() {
        // Initialize properties if needed
        this.testRender()
        this.parsedYaml = null;
        this._config = null;
    }

    async getConfig() {
        if (this._config === null) {
            this._config = await this.fetchAndParseYaml('../config.yml');
        }
        return this._config;
    }

    recursiveRender(template, data) {
        let lastRendered = template;
        let rendered;

        while (true) {
            // Dynamically escape all tags
            const escapedTemplate = lastRendered.replace(/{{([^{}]+)}}/g, "{{{$1}}}");

            // Render the template
            rendered = Mustache.render(escapedTemplate, data);

            // Dynamically unescape all tags
            rendered = rendered.replace(/{{\{([^{}]+)}}}/g, "{{$1}}");

            // Break if no more placeholders or if the rendered string hasn't changed
            if (rendered === lastRendered || !/{{([^{}]+)}}/.test(rendered)) {
                break;
            }

            lastRendered = rendered;
        }

        return rendered;
    }

    testRender() {

        const template = "Hello, {{name}}! {{placeholder}}";
        const data = { name: "John", placeholder: "Nice to meet you, {{name}}!" };

        const result = this.recursiveRender(template, data);
    }

    async initializeApp() {
        const config = await this.getConfig();
    }

    traverseObject(obj, modelSet, langSet, depth = 0) {
        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                obj[key].forEach(item => {
                    if (item.tags) {
                        item.tags.forEach(tag => {
                            if (tag.length === 2) {
                                langSet.add(tag);
                            } else {
                                modelSet.add(tag);
                            }
                        });
                    }
                });
            } else if (typeof obj[key] === 'object') {
                this.traverseObject(obj[key], modelSet, langSet, depth + 1);
            }
        }
    }

    extractTags(parsedYaml) {
        const allTags = new Set();

        // Check if parsedYaml.variables exists and is an object
        if (parsedYaml.variables && typeof parsedYaml.variables === 'object') {
            Object.values(parsedYaml.variables).forEach(variable => {
                // Check if variable is an array
                if (Array.isArray(variable)) {
                    variable.forEach(item => {
                        // Check if item.tags is an array
                        if (Array.isArray(item.tags)) {
                            item.tags.forEach(tag => allTags.add(tag));
                        }
                    });
                }
            });
        }

        // Check if parsedYaml.prompt_template exists and is an array
        if (Array.isArray(parsedYaml.prompt_template)) {
            parsedYaml.prompt_template.forEach(item => {
                // Check if item.tags is an array
                if (Array.isArray(item.tags)) {
                    item.tags.forEach(tag => allTags.add(tag));
                }
            });
        }

        const models = Array.from(allTags).filter(tag => tag.length > 2);
        const languages = Array.from(allTags).filter(tag => tag.length === 2);
        return { models, languages };
    }



    async populateDropdowns(models, languages, modelElementId, languageElementId, selectedModel, selectedLang) {
        const config = await this.getConfig();
        const modelDropdown = document.getElementById(modelElementId);
        const languageDropdown = document.getElementById(languageElementId);

        if (!modelDropdown || !languageDropdown) {
            console.log("Dropdown elements not found!");
            return;
        }

        // Clear existing options
        modelDropdown.innerHTML = "";
        languageDropdown.innerHTML = "";

        // Check if config and config.templates exist before proceeding
        if (config && Array.isArray(config.templates)) {
            config.templates.forEach(template => {
                // Check if template.models exists before proceeding
                if (Array.isArray(template.models)) {
                    template.models.forEach(model => {
                        if (!models.includes(model)) {
                            models.push(model);
                        }
                    });
                }
            });
        }

        // Check if models array exists and is not empty before proceeding
        if (Array.isArray(models) && models.length > 0) {
            models.forEach(model => {
                const option = document.createElement("option");
                option.value = model;
                option.textContent = model;
                if (model === selectedModel) option.selected = true;
                modelDropdown.appendChild(option);
            });
        }

        // Check if languages array exists and is not empty before proceeding
        if (Array.isArray(languages) && languages.length > 0) {
            languages.forEach(lang => {
                const option = document.createElement("option");
                option.value = lang;
                option.textContent = lang;
                if (lang === selectedLang) option.selected = true;
                languageDropdown.appendChild(option);
            });
        }
    }






    async loadAndRenderTemplate(fields, parsedYaml) {
        try {
            // Fetch the Mustache template
            const config = await this.getConfig();
            const response = await fetch('./search_form.mustache');
            const template = await response.text();

            // Render the template
            const rendered = Mustache.render(template, { fields, 'parsedYaml': parsedYaml, 'config': config });
            document.getElementById('dynamic-form-container').innerHTML = rendered;

        } catch (e) {
            console.error('Failed to load and render Mustache template:', e);
        }
    }

    async fetchAndParseYaml(filePath) {
        const response = await fetch(filePath);
        const yamlText = await response.text();
        return jsyaml.load(yamlText);
    }

    populateFields(parsedYaml, selectedModel, selectedLang) {
        const dynamicFieldsFromYaml = Object.keys(parsedYaml.variables);
        return dynamicFieldsFromYaml.map(name => {
            let value = 'default';
            let allValue = 'default';  // Default value for the "all" tag

            if (parsedYaml.variables[name]) {
                for (const item of parsedYaml.variables[name]) {
                    // Store the default value for the "all" tag
                    if (item.tags.includes('all')) {
                        allValue = item.value;
                    }

                    if (item.tags.includes('all') && item.tags.includes(selectedLang)) {
                        value = item.value;
                        break;  // Exit the loop once a match is found
                    }


                    // Find the value for the selected model and language
                    if (item.tags.includes(selectedModel) && item.tags.includes(selectedLang)) {
                        value = item.value;
                        break;  // Exit the loop once a match is found
                    }
                }

                // If no match was found, use the "all" default
                if (value === 'default') {
                    value = allValue;
                }
            }

            return { name, defaultValue: value };
        });
    }



    async generatePrompt(filePath, promptKey) {
        try {
            const self = this;
            this.parsedYaml = await this.fetchAndParseYaml(filePath); // Store it here
            const { models, languages } = this.extractTags(this.parsedYaml);

            // Capture current selections
            const currentModel = document.getElementById('model') ? document.getElementById('model').value : null;
            const currentLang = document.getElementById('language') ? document.getElementById('language').value : null;

            let selectedModel = currentModel || models[0] || 'defaultModel';
            let selectedLang = currentLang || 'en'; // Default to English

            //const fields = this.populateFields(this.parsedYaml, selectedModel, selectedLang);
            const fields = this.populateFields(this.parsedYaml, selectedModel, selectedLang).map(field => {
                field.isSystem = field.name.startsWith('system_');
                return field;
            });
            await this.loadAndRenderTemplate(fields, this.parsedYaml);

            // Populate dropdowns and restore selected values
            this.populateDropdowns(models, languages, "model", "language", selectedModel, selectedLang);

            this.setupEventListeners(this.parsedYaml, promptKey);
        } catch (e) {
            console.error(e);
        }
    }

    getTemplateByTags(parsedYaml, selectedModel, config) {
        //const config = this.getConfig();
        let defaultTemplate = 'default';
        let allTemplate = 'Select a target model!';
        let template = defaultTemplate;  // Initialize to default

        if (parsedYaml.prompt_template && parsedYaml.prompt_template.length > 0) {
            defaultTemplate = parsedYaml.prompt_template[0].value;

            // Find the template with the tag "all"
            for (const item of parsedYaml.prompt_template) {
                if (item.tags.includes('all')) {
                    allTemplate = item.value;
                    break;
                }
            }
        }

        // Use 'all' template as a fallback
        template = allTemplate;

        let modelFound = false;
        if (parsedYaml.prompt_template) {
            parsedYaml.prompt_template.forEach(item => {
                if (item.tags.includes(selectedModel)) {
                    template = item.value;
                    modelFound = true;
                }
            });
        }

        // If selected model is not part of parsedYaml.prompt_template, use default from config.templates
        if (!modelFound && config && config.templates) {
            for (const item of config.templates) {
                if (item.models.includes(selectedModel)) {
                    template = item.value;
                    break;
                }
            }
        }

        return template;
    }





    async setupEventListeners(parsedYaml, promptKey) {
        const self = this;
        self.prompt_key = promptKey

        async function updateFields(promptKey) {
            const selectedModel = document.getElementById('model').value;
            const selectedLang = document.getElementById('language').value || 'en';

            // Store current field values
            const currentValues = {};
            document.querySelectorAll('.updatePrompt').forEach(input => {
                currentValues[input.id] = input.value;
            });

            const fields = self.populateFields(parsedYaml, selectedModel, selectedLang).map(field => {
                field.isSystem = field.name.startsWith('system_');
                return field;
            });
            const newHtml = Mustache.render("{{#fields}}<div class='form-group {{#isSystem}}d-none{{/isSystem}}'><label for='{{name}}'>{{name}}</label><textarea class='form-control updatePrompt' id='{{name}}'>{{defaultValue}}</textarea></div>{{/fields}}", { fields });
            document.getElementById('dynamic-fields-container').innerHTML = newHtml;

            // Restore values for fields that don't start with "system_"
            document.querySelectorAll('.updatePrompt').forEach(input => {
                if (!input.id.startsWith("system_") && currentValues[input.id]) {
                    input.value = currentValues[input.id];
                }
            });

            // Re-attach event listeners to the new input fields
            const inputs = document.querySelectorAll('.updatePrompt');
            inputs.forEach(input => {
                input.removeEventListener('input', updatePromptResult);  // Remove old listeners
                input.addEventListener('input', updatePromptResult);  // Add new listeners
            });

            await updatePromptResult();  // Update the result after updating the fields
            await updateApiCall(selectedModel, selectedLang);
        }


        async function updateApiCall(selectedModel, selectedLang) {
            const config = await self.getConfig();
            let variables = {};
            document.querySelectorAll('.updatePrompt').forEach(input => {
                if (!input.id.startsWith("system_")) {
                    variables[input.id] = input.value;
                }
            });
            const variablesStr = Object.entries(variables).map(
                ([key, value]) => `"${key}": "${value.toString().substring(0, 10)}..."`
            ).join(", ");

            const apiJS = `
    const payload = {
        "prompt_key": "${self.prompt_key}",
        "language": "${selectedLang}",
        "model": "${selectedModel}",
        "variables": { ${variablesStr} } // <-- fill those dynamically
    };
    const response = await fetch("${config.API_BASE}", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log(data)
            `;

            document.getElementById("apiJS").textContent = apiJS;
            const apiPython = `
    import json
    import requests
    
    api_base = "${config.API_BASE}"
    
    payload = {
        "prompt_key": "${self.prompt_key}",
        "language": "${selectedLang}",
        "model": "${selectedModel}",
        "variables": { ${variablesStr} } # <-- fill those dynamically
    }
    response = requests.post(
        url=api_base,
        headers={"Content-Type": "application/json"},
        json=payload
    )
    data = response.json()
    print(data)
            `;

            document.getElementById("apiPython").textContent = apiPython;
        }


        async function updatePromptResult() {
            const config = await self.getConfig();
            const selectedModel = document.getElementById('model').value;
            const selectedLang = document.getElementById('language').value || 'en';

            let data = {};
            document.querySelectorAll('.updatePrompt').forEach(input => {
                data[input.id] = input.value;
            });
            const template = self.getTemplateByTags(parsedYaml, selectedModel, config);
            const rendered = self.recursiveRender(template, data);
            const element = document.getElementById('prompt_result');
            element.innerText = rendered;
        }

        // Attach event listeners
        document.getElementById('model').addEventListener('change', updateFields);
        document.getElementById('language').addEventListener('change', updateFields);

        const inputs = document.querySelectorAll('.updatePrompt');
        inputs.forEach(input => {
            input.addEventListener('input', updatePromptResult);
        });

        document.addEventListener("click", function (event) {
            if (event.target.id === "copyButton") {
                const promptResult = document.getElementById("prompt_result");
                const textToCopy = promptResult.innerText;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const alertContainer = document.getElementById("alert-container");
                    const alertMessage = `
                        <div class="alert alert-success alert-dismissible fade show" role="alert">
                            Copied to clipboard
                        </div>
                    `;
                    alertContainer.innerHTML = alertMessage;

                    // Optionally, remove the alert after a few seconds
                    setTimeout(() => {
                        alertContainer.innerHTML = '';
                    }, 1000);
                }).catch(err => {
                    console.error("Failed to copy text: ", err);
                });
            }
        });

        updatePromptResult()


    }

}

document.addEventListener('DOMContentLoaded', async () => {
    const generator = new DynamicPromptGenerator();
    await generator.initializeApp();
});



