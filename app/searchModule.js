export default class SearchModule {
    constructor() {
        this.fuse = null;
        this.data = null;
        this.flattenedData = null;
        document.getElementById("keywordFilter").addEventListener("change", () => {
            this.performSearch();
        });
        document.getElementById("groupFilter").addEventListener("change", () => {
            this.performSearch();
        });
    }

    async initializeSearch() {
        const response = await fetch('search_index.json');
        const jsonData = await response.json();
        this.data = jsonData;
        const flattenedData = [];
        this.flattenedData = flattenedData;
        for (const promptKey in this.data) {
            for (const lang in this.data[promptKey]) {
                if (lang.length === 2) {  // Only consider 2-character keys as languages
                    flattenedData.push({
                        ...this.data[promptKey][lang],
                        promptKey,
                        lang,
                        combined_search_field: `${this.data[promptKey][lang].name} ${this.data[promptKey][lang].description} ${this.data[promptKey][lang].keywords.join(' ')}`
                    });
                }
            }
        }
        const options = {
            shouldSort: true,
            threshold: 0.6,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 2,
            keys: ['combined_search_field'],
            tokenize: true,
            matchAllTokens: true,
            includeScore: true,
            useExtendedSearch: true
        };
        //this.performSearch();
        this.fuse = new Fuse(flattenedData, options);
        this.populateKeywordFilter();
        this.populateGroupFilter();
        this.performSearch();
    }

    populateKeywordFilter() {
        const keywordSet = new Set();
        for (const item of this.flattenedData) {
            if (Array.isArray(item.keywords)) {
                for (const keyword of item.keywords) {
                    keywordSet.add(keyword);
                }
            }
        }

        const keywordFilterElement = document.getElementById("keywordFilter");
        keywordFilterElement.innerHTML = '<option value="">All Keywords</option>';  // Reset the dropdown

        for (const keyword of keywordSet) {
            const optionElement = document.createElement("option");
            optionElement.value = keyword;
            optionElement.textContent = keyword;
            keywordFilterElement.appendChild(optionElement);
        }
    }

    populateGroupFilter() {
        const groupSet = new Set();
        for (const item of this.flattenedData) {
            const parts = item.prompt_key.split('/');
            const folderPath = parts.slice(0, -1).join('/');
            groupSet.add(folderPath);
        }


        const groupFilterElement = document.getElementById("groupFilter");
        groupFilterElement.innerHTML = '<option value="">All Groups</option>';  // Reset the dropdown

        for (const group of groupSet) {
            const optionElement = document.createElement("option");
            optionElement.value = group;
            optionElement.textContent = group;
            groupFilterElement.appendChild(optionElement);
        }
    }


    async performSearch() {
        const query = document.getElementById("searchInput").value.trim();
        const keywordFilter = document.getElementById("keywordFilter").value;
        const groupFilter = document.getElementById("groupFilter").value;
        const resultBody = document.getElementById("result");

        resultBody.innerHTML = '';

        let resultsToShow = [];



        if (!this.fuse) {
            return; // Fuse is not initialized, exit the function
        }

        if (query) {
            const adaptedSearchTerm = query.split(' ').filter(word => word.length > 0).map(word => `'${word}`).join(' ');
            resultsToShow = this.fuse.search(adaptedSearchTerm).map(result => ({ item: result.item }));
        } else {
            // Directly use the flattened data for empty queries
            resultsToShow = this.flattenedData.map(item => ({ item }));
        }

        if (Array.isArray(resultsToShow)) {  // Check if resultsToShow is iterable
            for (const { item } of resultsToShow) {
                const keywords = Array.isArray(item.keywords) ? item.keywords.join(', ') : item.keywords;

                // Apply keyword filter
                if (keywordFilter && (!item.keywords || !item.keywords.includes(keywordFilter))) {
                    continue;
                }

                if (groupFilter && !item.prompt_key.includes(groupFilter)) {
                    console.log("Skipping due to group filter");  // Debug log to check if the item is being skipped
                    continue;
                }


                const keywordBadges = Array.isArray(item.keywords) ?
                    item.keywords.map(k => `<span class="badge badge-primary clickable-badge" onclick="updateKeywordFilter('${k}')">${k}</span>`).join(' ') : '';

                const row = `
                <tr>
                <td><a href="#" onclick="switchToGenerateTab('${item.file_path}','${item.prompt_key}');">${item.prompt_key}</a></td>
                <td>${item.name}</td>
                <td>${item.description}</td>
                <td>${keywordBadges}</td>
                </tr>
                `;
                resultBody.innerHTML += row;
            }
        }
    }


}
