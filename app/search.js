// search.js
import { initializeSearch, performSearch } from './searchModule.js';

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const keywordFilter = document.getElementById("keywordFilter")

    searchInput.addEventListener("keyup", function () {
        performSearch();
    });

    keywordFilter.addEventListener("change", () => {
        performSearch();
    });

    initializeSearch();
});


