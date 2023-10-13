// app.js
import './generate.js';


import SearchModule from './searchModule.js';
import DynamicPromptGenerator from './generate.js'; // Assuming you have this class in a separate file

document.addEventListener("DOMContentLoaded", async function () {
    // Initialize search
    const searchModule = new SearchModule();

    window.updateKeywordFilter = function (keyword) {
        const keywordFilterElement = document.getElementById("keywordFilter");
        keywordFilterElement.value = keyword;
        searchModule.performSearch();
    };
    await searchModule.initializeSearch();

    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("keyup", function () {
        searchModule.performSearch();
    });

    // Initialize other modules or classes
    // ...
});

window.switchToGenerateTab = async function (filePath) {
    // Switch to the "Generate" tab
    document.querySelector('a[data-toggle="tab"][href="#generate"]').click();

    // Initialize the DynamicPromptGenerator class and generate the prompt
    const generator = new DynamicPromptGenerator();
    await generator.generatePrompt(filePath);
};









