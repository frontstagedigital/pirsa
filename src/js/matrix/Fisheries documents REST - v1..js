// Server-Side JavaScript for Squiz Matrix REST Resource - SARDI Search
// Optimized and Modularized Version for SARDI Collection
//
// PROGRAM FLOW:
// 1. Initialize and validate API data from Funnelback REST response
// 2. Check if results exist, handle zero-results case
// 3. Process raw API data into structured search data object
// 4. Calculate layout configuration (2-col vs 3-col based on related items)
// 5. Generate HTML sections modularly: tabs → filters → main content → related items
// 6. Use buffer-based HTML generation for performance optimization
// 7. Preserve exact encoding patterns required by Funnelback V16
// 8. Handle errors gracefully at section level to prevent total page failure

print('<!--<span class="fburl">' + _REST.request.urls + '</span>-->');

try {
    // =================================================================
    // INITIALIZATION AND VALIDATION
    // =================================================================
    var apiData = initializeApiData();
    if (!validateApiResponse(apiData)) {
        print('<div class="error">Invalid API response structure</div>');
    } else {
        var totalMatching = getTotalMatching(apiData);
        if (totalMatching === 0) {
            var searchQuery = '%globals_get_query%';
            var spellSuggestion = getSpellSuggestion(apiData);
            var spellCheckHTML = getSpellCheckHTML(spellSuggestion, searchQuery);
            
            var noResultsMessage = searchQuery.length > 0
                ? `Sorry, no results found for search query <strong><em>${searchQuery}</em></strong>`
                : 'Type a keyword or phrase in the search box above to discover what you\'re looking for.';
            
            print(`<div class="search-results">
            <div class="nsw-wysiwyg-content nsw-m-top-md">
                <p>${noResultsMessage}</p>
                ${spellCheckHTML}
                <p>
                    <strong>Didn't find what you were looking for?</strong>
                    <ul>
                        <li>Try using different or fewer keywords</li>
                        <li>Check your spelling</li>
                        <li>Try broader or general search terms</li>
                    </ul>
                    <p><a href="%globals_asset_url%" class="nsw-button nsw-button--dark">Try again?</a></p>
                </p>
            </div>
            </div>`);
        } else {
            var searchData = processSearchData(apiData);
            print(generateSearchResults(searchData, apiData));
        }
    }
} catch (error) {
    print('Debug error: ' + error.message);
    print('<div class="error">Search results temporarily unavailable. Please try again later.</div>');
}

// =================================================================
// INITIALIZATION FUNCTIONS
// =================================================================

/**
 * Initializes API data from Funnelback REST response
 * Purpose: Extract and parse JSON data from _REST object, handling both string and object formats
 * Returns: Parsed API data object or null if invalid
 */
function initializeApiData() {
    var apiData = null;
    if (_REST && _REST.response && _REST.response.body) {
        if (typeof _REST.response.body === 'string') {
            apiData = JSON.parse(_REST.response.body);
        } else {
            apiData = _REST.response.body;
        }
    }
    return apiData;
}

// Get spell check suggestion from API response
function getSpellSuggestion(apiData) {
    if (!apiData || !apiData.response || !apiData.response.resultPacket || !apiData.response.resultPacket.spell) {
        return null;
    }
    return apiData.response.resultPacket.spell.text || null;
}

// Generate spell check suggestion HTML
function getSpellCheckHTML(spellSuggestion, currentQuery) {
    if (!spellSuggestion) return '';
    
    var currentUrl = '%globals_asset_url%';
    var spellUrl = currentUrl + '?query=' + encodeURIComponent(spellSuggestion);
    
    return '<p>Did you mean <a href="' + spellUrl + '">' + spellSuggestion + '</a></p>';
}

/**
 * Validates API response structure for required fields
 * Purpose: Ensure API response contains minimum required data structure before processing
 * Returns: Boolean indicating if response is valid for processing
 */
function validateApiResponse(apiData) {
    return apiData && apiData.response && apiData.response.resultPacket;
}

/**
 * Extracts total matching results count from API response
 * Purpose: Get the total number of search results for display and pagination calculations
 * Returns: Integer count of total matching results, defaults to 0 if not found
 */
function getTotalMatching(apiData) {
    return (apiData.response.resultPacket.resultsSummary && 
            apiData.response.resultPacket.resultsSummary.totalMatching) ? 
            apiData.response.resultPacket.resultsSummary.totalMatching : 0;
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

/**
 * Safe object property navigation with fallback
 * Purpose: Traverse nested object properties without throwing errors if path doesn't exist
 * Returns: Property value if found, defaultValue if path is invalid
 */
function safeGet(obj, path, defaultValue) {
    return path.split('.').reduce(function(current, key) {
        return (current && current[key] !== undefined) ? current[key] : defaultValue;
    }, obj);
}

/**
 * Encodes query parameters with Funnelback-specific format
 * Purpose: Apply custom encoding where spaces become + instead of %20 for URL compatibility
 * Returns: Encoded parameter string with proper formatting
 */
function encodeQueryParam(param) {
    return encodeURIComponent(param).replace(/%20/g, '+');
}

/**
 * Creates optimized HTML buffer for efficient string concatenation
 * Purpose: Replace slow string concatenation with array-based buffer for better performance
 * Returns: Object with add() method for appending and toString() for final output
 */
function createHtmlBuffer() {
    var buffer = [];
    return {
        add: function(html) { buffer.push(html); },
        toString: function() { return buffer.join(''); }
    };
}

// =================================================================
// DATA PROCESSING FUNCTIONS
// =================================================================

/**
 * Extracts URL parameters from Squiz Matrix globals
 * Purpose: Parse query string and organize parameters into structured object for easy access
 * Returns: Object containing query, sort, filters, and pagination parameters
 */
function extractUrlParameters() {
    var queryString = '%globals_server_query_string%';
    var params = {
        query: '%globals_get_query%' || '',
        sort: '%globals_get_sort%' || 'default',
        filters: {},
        start_rank: parseInt('%globals_get_start_rank%') || 1
    };

    if (queryString) {
        var pairs = queryString.split('&');
        pairs.forEach(function(pair) {
            var parts = pair.split('=');
            if (parts.length === 2) {
                var key = decodeURIComponent(parts[0]);
                var value = decodeURIComponent(parts[1].replace(/\+/g, ' '));
                if (key.startsWith('f.')) {
                    params.filters[key] = value;
                }
            }
        });
    }
    return params;
}

/**
 * Extracts related search terms from contextual navigation data
 * Purpose: Get suggested related search queries from Funnelback's contextual navigation clusters
 * Returns: Array of related search term strings, limited to 5 items
 */
function extractRelatedSearchTerms(apiData) {
    var relatedTerms = [];
    var contextualNav = safeGet(apiData, 'response.resultPacket.contextualNavigation', null);
    
    if (contextualNav && contextualNav.categories && contextualNav.categories.length > 0) {
        var topicCategory = contextualNav.categories[0];
        if (topicCategory.clusters && Array.isArray(topicCategory.clusters)) {
            topicCategory.clusters.forEach(function(cluster) {
                if (cluster.query) {
                    relatedTerms.push(cluster.query);
                }
            });
        }
    }
    return relatedTerms.slice(0, 5);
}

/**
 * Processes and structures raw API facet data into usable format
 * Purpose: Transform Funnelback facet response into organized data structure with proper parameter mapping
 * Returns: Array of processed facet objects with labels, values, and query parameters
 */
function extractFacetData(data) {
    var facetOutput = [];
    var profiles = safeGet(data, 'question.collection.profiles', {});
    var facetDefs = getFacetDefinitions(profiles);
    
    if (!facetDefs) return facetOutput;
    
    var facetMap = buildFacetMap(facetDefs);
    var responseFacets = safeGet(data, 'response.facets', []);
    
    responseFacets.forEach(function(facet) {
        var processedFacet = processFacet(facet, facetMap, data);
        if (processedFacet) {
            facetOutput.push(processedFacet);
        }
    });
    
    return facetOutput;
}

/**
 * Extracts facet definitions from API response profiles
 * Purpose: Find and return the facet configuration definitions from nested profile data
 * Returns: Array of facet definitions or null if not found
 */
function getFacetDefinitions(profiles) {
    for (var profileName in profiles) {
        var profileData = profiles[profileName];
        var facetDefinitions = safeGet(profileData, 'facetedNavConfConfig.facetDefinitions', null);
        if (facetDefinitions && Array.isArray(facetDefinitions)) {
            return facetDefinitions;
        }
    }
    return null;
}

function buildFacetMap(facetDefs) {
    var facetMap = {};
    facetDefs.forEach(function(facetDef) {
        var categories = facetDef.categoryDefinitions;
        if (!Array.isArray(categories)) return;

        categories.forEach(function(category) {
            var facetName = category.facetName;
            var dataValue = category.data;
            var queryStringParamName = category.queryStringParamName;

            if (facetName && queryStringParamName) {
                if (!facetMap[facetName]) {
                    facetMap[facetName] = {};
                }
                if (dataValue) {
                    facetMap[facetName][dataValue] = queryStringParamName;
                }
            }
        });
    });
    return facetMap;
}

function processFacet(facet, facetMap, data) {
    var facetName = facet.name;
    var allValues = facet.allValues;

    if (!facetName || !Array.isArray(allValues)) return null;

    var fallbackQSP = getFallbackQueryStringParam(facetMap, facetName);
    if (!fallbackQSP) return null;

    var labelsMap = buildLabelsMap(allValues, facetName, facetMap, fallbackQSP, data);
    
    if (Object.keys(labelsMap).length > 0) {
        return {
            name: facetName,
            labels: labelsMap,
            allValues: allValues,
            selected: facet.selected || false
        };
    }
    return null;
}

function getFallbackQueryStringParam(facetMap, facetName) {
    if (facetMap[facetName]) {
        var dataKeys = Object.keys(facetMap[facetName]);
        if (dataKeys.length > 0) {
            return facetMap[facetName][dataKeys[0]];
        }
    }
    return null;
}

function buildLabelsMap(allValues, facetName, facetMap, fallbackQSP, data) {
    var labelsMap = {};
    
    allValues.forEach(function(value) {
        var label = value.label;
        if (!label) return;

        var labelEncoded = encodeFacetLabel(label, facetName, data);
        var specificQSP = facetMap[facetName] && facetMap[facetName][label];
        var qspToUse = specificQSP || fallbackQSP;
        var encodedParam = qspToUse.replace(/ /g, '+').replace(/\|/g, '%7C');

        labelsMap[label] = {
            queryParam: encodedParam + '=' + labelEncoded,
            count: value.count || 0,
            selected: value.selected || false,
            toggleUrl: value.toggleUrl || ''
        };
    });
    
    return labelsMap;
}

function encodeFacetLabel(label, facetName, data) {
    if (facetName === 'Time period') {
        var dateCounts = safeGet(data, 'response.resultPacket.dateCounts', {});
        var dateKey = 'd:' + label;
        if (dateCounts[dateKey] && dateCounts[dateKey].queryTerm) {
            return dateCounts[dateKey].queryTerm + ' :: ' + label;
        } else {
            return 'd=' + label + ' :: ' + label;
        }
    } else {
        return encodeURIComponent(label).replace(/%20/g, '+');
    }
}

/**
 * Processes complete search data from API response into structured format
 * Purpose: Combine URL parameters with API data to create unified search data object
 * Returns: Structured object containing facets, pagination, totals, sort, and query info
 */
function processSearchData(apiData) {
    var urlParams = extractUrlParameters();
    return {
        facets: extractFacetData(apiData),
        pagination: {
            currStart: safeGet(apiData, 'response.resultPacket.resultsSummary.currStart', 1),
            currEnd: safeGet(apiData, 'response.resultPacket.resultsSummary.currEnd', 10),
            nextStart: safeGet(apiData, 'response.resultPacket.resultsSummary.nextStart', null),
            totalMatching: safeGet(apiData, 'response.resultPacket.resultsSummary.totalMatching', 0)
        },
        totalResults: safeGet(apiData, 'response.resultPacket.resultsSummary.totalMatching', 0),
        currentSort: urlParams.sort || 'default',
        currentQuery: urlParams.query || ''
    };
}

/**
 * Calculates layout configuration based on related items availability
 * Purpose: Determine if 2-column or 3-column layout should be used and prepare related terms
 * Returns: Object with layout class, related items availability, and terms array
 */
function calculateLayoutConfig(searchData, apiData) {
    var currentQuery = searchData.currentQuery;
    var currentTab = getCurrentTab(searchData);
    var relatedTerms = extractRelatedSearchTerms(apiData);
    
    var hasRelatedItems = currentQuery && currentQuery !== '!null' && 
                         currentTab !== 'research' && currentTab !== 'sardi-research-profiles' &&
                         relatedTerms.length > 0;
    
    return {
        hasRelatedItems: hasRelatedItems,
        relatedTerms: relatedTerms,
        layoutClass: hasRelatedItems ? 'nsw-layout--3-col' : 'nsw-layout--2-col'
    };
}

function getCurrentTab(searchData) {
    var currentTab = null;
    searchData.facets.forEach(function(facet) {
        if (facet.name === 'Tabs' && facet.selectedValues && facet.selectedValues.length > 0) {
            currentTab = facet.selectedValues[0].data;
        }
    });
    return currentTab;
}

// =================================================================
// HTML GENERATION FUNCTIONS
// =================================================================

/**
 * Main HTML generation orchestrator function
 * Purpose: Coordinate generation of all page sections and return complete HTML output
 * Returns: Complete HTML string for the search results page
 */
function generateSearchResults(searchData, apiData) {
    var layoutConfig = calculateLayoutConfig(searchData, apiData);
    var html = createHtmlBuffer();
    
    try {
        html.add('<div class="search-results">');
        html.add(generateTabsSection(searchData));
        html.add('<div class="nsw-layout ' + layoutConfig.layoutClass + '">');
        html.add(generateFiltersSection(searchData));
        html.add(generateMainContentSection(searchData, apiData));
        html.add(generateRelatedItemsSection(layoutConfig));
        html.add('</div></div>');
        
        return html.toString();
    } catch (error) {
        return '<div class="error">Error generating search results</div>';
    }
}

/**
 * Generates the tab navigation section
 * Purpose: Create tab interface showing different content types with result counts
 * Returns: HTML string for the tabs section
 */
function generateTabsSection(searchData) {
    var tabsFacet = searchData.facets.find(function(f) { return f.name === 'Tabs'; });
    if (!tabsFacet) return '';
    
    var html = createHtmlBuffer();
    html.add('<div class="nsw-tabs">');
    html.add('<ul class="nsw-tabs__list" id="search-tabs">');
    
    for (var label in tabsFacet.labels) {
        var labelData = tabsFacet.labels[label];
        
        // Hide tabs with zero count
        if (labelData.count === 0) continue;
        
        var isActive = labelData.selected ? ' class="active"' : '';
        var tabKey = labelData.queryParam.split('=')[0].replace('%7C', '|');

        html.add('<li>');
        html.add('<a href="?' + labelData.queryParam + '"' + isActive + ' data-tab-key="' + tabKey + '" data-tab-value="' + label + '">');
        html.add(label);
        html.add('<span class="nsw-status-label nsw-status-label--results">' + labelData.count + '</span>');
        html.add('</a>');
        html.add('</li>');
    }
    
    html.add('</ul></div><div class="nsw-tabs__content"></div>');
    return html.toString();
}

function generateFiltersSection(searchData) {
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-layout__sidebar">');
    html.add('<div id="component_%asset_assetid%">');
    html.add('<div class="nsw-filters nsw-filters--down js-filters ready">');
    html.add('<input type="hidden" name="sort" value="' + searchData.currentSort + '">');
    
    html.add(generateFiltersControls());
    html.add(generateFiltersWrapper(searchData));
    
    html.add('</div></div></div>');
    return html.toString();
}

function generateFiltersControls() {
    return '<div class="nsw-filters__controls js-filters__count">' +
           '<button type="button">' +
           '<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">tune</span>' +
           '<span>Filters</span>' +
           '<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_down</span>' +
           '</button>' +
           '</div>';
}

function generateFiltersWrapper(searchData) {
    var html = createHtmlBuffer();
    var hasSelectedFilters = false;
    
    html.add('<div class="nsw-filters__wrapper">');
    html.add('<div class="nsw-filters__title">Filters</div>');
    html.add('<div class="nsw-filters__list">');
    
    searchData.facets.forEach(function(facet) {
        if (facet.name === 'Tabs') return;
        
        var facetHtml = generateFacetItem(facet);
        html.add(facetHtml.html);
        if (facetHtml.hasSelected) hasSelectedFilters = true;
    });
    
    html.add('</div>');
    html.add(generateFiltersActions(hasSelectedFilters));
    html.add('</div>');
    
    return html.toString();
}

function generateFacetItem(facet) {
    var html = createHtmlBuffer();
    var hasSelected = false;
    var facetId = 'collapsed-' + Math.random().toString(36).substr(2, 9);
    
    // Sort Time period facet
    if (facet.name === 'Time period') {
        facet = sortTimePeriodFacet(facet);
    }
    
    html.add('<div class="nsw-filters__item js-filters-item">');
    html.add('<button class="nsw-filters__item-button js-filters-item-button" type="button" aria-expanded="false" aria-controls="' + facetId + '" data-label="' + facet.name + '">');
    html.add('<span class="nsw-filters__item-name">' + facet.name + '</span>');
    html.add('<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_down</span>');
    html.add('</button>');
    
    html.add('<div class="nsw-filters__item-content" id="' + facetId + '" hidden="">');
    html.add('<fieldset class="nsw-form__fieldset">');
    html.add('<legend class="nsw-form__legend sr-only">' + facet.name + '</legend>');
    
    var checkboxesResult = generateFacetCheckboxes(facet);
    html.add(checkboxesResult.html);
    if (checkboxesResult.hasSelected) hasSelected = true;
    
    html.add('</fieldset></div></div>');
    
    return { html: html.toString(), hasSelected: hasSelected };
}

function sortTimePeriodFacet(facet) {
    var sortedLabels = Object.keys(facet.labels).sort(function(a, b) {
        if (a.startsWith('Past') && !b.startsWith('Past')) return -1;
        if (!a.startsWith('Past') && b.startsWith('Past')) return 1;
        if (!isNaN(a) && !isNaN(b)) return parseInt(b) - parseInt(a);
        return a.localeCompare(b);
    });
    
    var reorderedLabels = {};
    sortedLabels.forEach(function(key) {
        reorderedLabels[key] = facet.labels[key];
    });
    facet.labels = reorderedLabels;
    
    return facet;
}

function generateFacetCheckboxes(facet) {
    var html = createHtmlBuffer();
    var hasSelected = false;
    
    if (facet.allValues && facet.labels) {
        for (var i = 0; i < facet.allValues.length; i++) {
            var value = facet.allValues[i];
            var labelData = facet.labels[value.label];
            if (!labelData) continue;
            
            var elementHtml = generateFacetElement(facet, value, labelData);
            html.add(elementHtml);
            
            if (value.selected) hasSelected = true;
        }
    } else {
        // Fallback iteration
        for (var label in facet.labels) {
            var labelData = facet.labels[label];
            var elementHtml = generateFacetElement(facet, label, labelData);
            html.add(elementHtml);
            
            if (labelData.selected) hasSelected = true;
        }
    }
    
    return { html: html.toString(), hasSelected: hasSelected };
}

/**
 * Generates appropriate form element based on facet display type
 * Purpose: Render correct UI element (checkbox, radio) based on guessedDisplayType, fallback to checkbox for drill-down
 * Returns: HTML string for the appropriate form element
 */
function generateFacetElement(facet, item, labelData) {
    var displayType = facet.guessedDisplayType || 'CHECKBOX';
    
    switch(displayType) {
        case 'RADIO_BUTTON':
            return generateRadioButton(facet, item, labelData);
        case 'SINGLE_DRILL_DOWN':
        case 'CHECKBOX':
        case 'UNKNOWN':
        default:
            return generateCheckboxElement(facet, item, labelData);
    }
}

/**
 * Generates checkbox input element for facet filters
 * Purpose: Create checkbox markup for multi-select facet filtering
 * Returns: HTML string for checkbox input with label
 */

function generateCheckboxElement(facet, item, labelData) {
    // Handle both value object (from API array) and label string (from object iteration)
    var label = typeof item === 'string' ? item : item.label;
    var count = typeof item === 'string' ? labelData.count : item.count;
    var selected = typeof item === 'string' ? labelData.selected : item.selected;
    
    // Capitalize based on facet type
    var displayLabel;
    if (facet.name === 'Research author') {
        displayLabel = label.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    } else {
        displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    }
    
    var fieldId = 'filters-' + facet.name.replace(/\s+/g, '-').toLowerCase() + '-' + label.replace(/[\s\W]+/g, '-').toLowerCase();
    var paramName = labelData.queryParam.split('=')[0].replace(/\+/g, ' ').replace(/%7C/g, '|');
    var checkboxValue = (facet.name === 'Time period') ? labelData.queryParam.split('=').slice(1).join('=') : label;
    var checkedAttr = selected ? ' checked' : '';
    
    // Format count display - only show if count exists and is not null
    var countDisplay = (count !== null && count !== undefined) ? ' (' + count + ')' : '';
    
    return '<input class="nsw-form__checkbox-input js-filters-item-checkbox" type="checkbox" ' +
           'name="' + decodeURIComponent(paramName) + '" value="' + checkboxValue + '" ' +
           'id="' + fieldId + '" form="global-search"' + checkedAttr + '>' +
           '<label class="nsw-form__checkbox-label" for="' + fieldId + '">' +
           displayLabel + countDisplay +
           '</label>';
}

/**
 * Generates radio button input element for single-select facet filtering
 * Purpose: Create radio button markup for single-select facet filtering
 * Returns: HTML string for radio input with label
 */

function generateRadioButton(facet, item, labelData) {
    // Handle both value object (from API array) and label string (from object iteration)
    var label = typeof item === 'string' ? item : item.label;
    var count = typeof item === 'string' ? labelData.count : item.count;
    var selected = typeof item === 'string' ? labelData.selected : item.selected;
    
    var displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    var fieldId = 'filters-' + facet.name.replace(/\s+/g, '-').toLowerCase() + '-' + label.replace(/[\s\W]+/g, '-').toLowerCase();
    var paramName = labelData.queryParam.split('=')[0].replace(/\+/g, ' ').replace(/%7C/g, '|');
    var radioValue = (facet.name === 'Time period') ? labelData.queryParam.split('=').slice(1).join('=') : label;
    var checkedAttr = selected ? ' checked' : '';
    var radioName = 'radio-' + facet.name.replace(/\s+/g, '-').toLowerCase();
    
    // Format count display - only show if count exists and is not null
    var countDisplay = (count !== null && count !== undefined) ? ' (' + count + ')' : '';
    
    return '<input class="nsw-form__radio-input js-filters-item-radio" type="radio" ' +
           'name="' + radioName + '" value="' + radioValue + '" ' +
           'data-param-name="' + decodeURIComponent(paramName) + '" ' +
           'id="' + fieldId + '" form="global-search"' + checkedAttr + '>' +
           '<label class="nsw-form__radio-label" for="' + fieldId + '">' +
           displayLabel + countDisplay +
           '</label>';
}

function generateFiltersActions(hasSelectedFilters) {
    var disabledAttr = hasSelectedFilters ? '' : ' disabled';
    
    return '<div class="nsw-filters__accept">' +
           '<button type="submit" class="nsw-button nsw-button--dark nsw-button--full-width" form="global-search"' + disabledAttr + '>' +
           'Apply filters' +
           '</button>' +
           '</div>' +
           '<div class="nsw-filters__cancel">' +
           '<a href="%globals_asset_url%">Clear all filters</a>' +
           '</div>';
}

function generateMainContentSection(searchData, apiData) {
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-layout__main">');
    html.add(generateResultsBar(searchData));
    html.add(generateSelectedFacetsList(searchData));
    html.add(generateResultsList(apiData));
    html.add(generatePagination(apiData));
    html.add('</div>');
    
    return html.toString();
}

function generateResultsBar(searchData) {
    return '<div class="nsw-results-bar nsw-m-top-0">' +
           '<div class="nsw-results-bar__info">' +
           'Showing results ' + searchData.pagination.currStart + ' - ' + searchData.pagination.currEnd + ' of ' + searchData.totalResults + ' results' +
           '</div>' +
           '<div class="nsw-results-bar__sorting">' +
           '<div id="js-results-bar-sort" class="nsw-display-flex nsw-align-items-center" method="GET" action="%asset_url%">' +
           '<label class="nsw-form__label" for="sort">Sort by:</label>' +
           '<select class="nsw-form__select" name="sort" id="sort" form="global-search" onchange="this.form.submit()">' +
           '<option value="default"' + (searchData.currentSort === 'default' ? ' selected="selected"' : '') + '>Relevance</option>' +
           '<option value="date"' + (searchData.currentSort === 'date' ? ' selected="selected"' : '') + '>Most recent</option>' +
           '</select>' +
           '<button type="submit" class="nsw-button nsw-button--dark nsw-m-left-xs sr-only">Submit</button>' +
           '</div>' +
           '</div>' +
           '</div>';
}

/**
 * Generates a list of links for removing selected facet filters
 * Appears directly after the nsw-results-bar
 * Markup:
 * <div class="nsw-list nsw-list--8">
 *   <a href="TOGGLE_URL" class="nsw-button nsw-button--dark-outline-solid">
 *     <span>Display label</span>
 *     <span class="material-icons nsw-material-icons" focusable="false" aria-hidden="true">clear</span>
 *   </a>
 * </div>
 */
function generateSelectedFacetsList(searchData) {
    var html = createHtmlBuffer();
    var selectedItems = [];

    if (!searchData || !searchData.facets || !Array.isArray(searchData.facets)) {
        return '';
    }

    // Collect selected facet values (except Tabs)
    searchData.facets.forEach(function (facet) {
        if (!facet || facet.name === 'Tabs') return;

        // Preferred: use allValues with selected flag
        if (facet.allValues && Array.isArray(facet.allValues) && facet.labels) {
            facet.allValues.forEach(function (value) {
                if (!value || !value.selected) return;

                var label = value.label;
                if (!label || !facet.labels[label]) return;

                var labelData = facet.labels[label];
                if (!labelData.toggleUrl) return;

                // Same "displayLabel" treatment as checkboxes
                var displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

                selectedItems.push({
                    label: label,
                    displayLabel: displayLabel,
                    url: labelData.toggleUrl
                });
            });
        } else if (facet.labels) {
            // Fallback: look at labels map
            for (var label in facet.labels) {
                if (!Object.prototype.hasOwnProperty.call(facet.labels, label)) continue;

                var labelData = facet.labels[label];
                if (!labelData || !labelData.selected || !labelData.toggleUrl) continue;

                var displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

                selectedItems.push({
                    label: label,
                    displayLabel: displayLabel,
                    url: labelData.toggleUrl
                });
            }
        }
    });

    // No selected facets - nothing to render
    if (selectedItems.length === 0) {
        return '';
    }

    // Container as requested
    html.add('<div class="nsw-list nsw-list--8 nsw-m-bottom-sm"><span class="sr-only">Refined by:</span>');

    selectedItems.forEach(function (item) {
        html.add(
            '<a href="' + item.url + '" class="nsw-button nsw-button--dark-outline-solid">' +
                '<span>' + item.displayLabel + '</span>' +
                '<span class="material-icons nsw-material-icons" focusable="false" aria-hidden="true">clear</span>' +
            '</a>'
        );
    });

    html.add('</div>');

    return html.toString();
}

function generateResultsList(apiData) {
    var html = createHtmlBuffer();
    var results = safeGet(apiData, 'response.resultPacket.results', []);
    
    html.add('<div class="nsw-search-results">');
    
    results.forEach(function(result) {
        html.add(generateResultItem(result));
    });
    
    html.add('</div>');
    return html.toString();
}

function generateResultItem(result) {
    var contentType = analyzeContentType(result);
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-list-item">');
    html.add(generateResultMeta(contentType, result));
    html.add(generateResultContent(contentType, result));
    html.add('</div>'); // Close nsw-list-item
    
    return html.toString();
}

function analyzeContentType(result) {
    var collection = result.collection || '';
    var pageType = 'page'
    pageType = safeGet(result, 'listMetadata.documentType.0', '');
    var fileType = safeGet(result, 'fileType', '').toLowerCase();

    return {
        // isProfile: collection === 'pirsa~ds-sardi-research-profiles',
        // isProject: collection === 'pirsa~ds-sardi-research-projects',
        // isReport: collection === 'pirsa~ds-sardi-reports',
        // isWebsite: collection === 'pirsa~ds-sardi-website',
        // isResearch: pageType === 'research',
        // isPage: pageType === 'page'
        pageType: pageType,
        isPDF: fileType === 'pdf'
    };
}

function generateResultMeta(contentType, result) {
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-list-item__meta">');
    
    // if (contentType.isProfile) {
    //     html.add('<div class="nsw-list-item__label">People</div>');
    // } else if (contentType.isProject) {
    //     html.add('<div class="nsw-list-item__label">Project</div>');
    // } else if (contentType.isReport) {
    //     html.add('<div class="nsw-list-item__label">Report</div>');
        
    //     html.add('<div class="nsw-list-item__info-container nsw-display-flex nsw-p-top-xs nsw-justify-content-between">');
    //     html.add('<div class="nsw-list-item__info nsw-list-item__info--report">');
        
    //     // var publicationYear = safeGet(result, 'listMetadata.publicationYear.0', '');
    //     // if (publicationYear) html.add('<span>' + publicationYear + ' </span>');
            
    //     if (result.fileSize) {
    //         var sizeInMB = (result.fileSize / (1024 * 1024)).toFixed(2);
    //         html.add('<span style="font-weight:700;"> PDF (' + sizeInMB + ' MB)</span>');
    //     }
    //     html.add('</div>');
    //     html.add('</div>');
        
        


    // } else if (contentType.isResearch) {
    //     html.add('<div class="nsw-list-item__label">research</div>');
    // } else if (contentType.isPage) {
    //     html.add('<div class="nsw-list-item__label">page</div>');
    // } else {
    //     html.add('<div class="nsw-list-item__label">Page</div>');
    // }
    if (contentType.isPDF) {
        html.add('<div class="nsw-list-item__label">'+contentType.pageType+'</div>');
        
        html.add('<div class="nsw-list-item__info-container nsw-display-flex nsw-p-top-xs nsw-justify-content-between">');
        html.add('<div class="nsw-list-item__info nsw-list-item__info--report">');
        
        // var publicationYear = safeGet(result, 'listMetadata.publicationYear.0', '');
        // if (publicationYear) html.add('<span>' + publicationYear + ' </span>');
            
        if (result.fileSize) {
            var sizeInMB = (result.fileSize / (1024 * 1024)).toFixed(2);
            html.add('<span style="font-weight:700;"> PDF (' + sizeInMB + ' MB)</span>');
        }
        html.add('</div>');
        html.add('</div>');
    } else if (contentType.pageType) {
        html.add('<div class="nsw-list-item__label">'+contentType.pageType+'</div>');
    } else {
        html.add('<div class="nsw-list-item__label">Page</div>');
    }
    

    html.add('</div>');
    return html.toString();
}

function generateResultContent(contentType, result) {
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-list-item__content__wrapper">');
    html.add('<div class="nsw-list-item__content">');
    html.add(generateResultTitle(contentType, result));
    html.add(generateResultSummary(contentType, result));
    html.add('</div>');
    html.add(generateResultImage(contentType, result));
    html.add('</div>');
    
    return html.toString();
}

function generateResultTitle(contentType, result) {
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-list-item__title">');

    // if (contentType.isProfile) {
    //     var profileName = result.title || 'Untitled';
    //     html.add('<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' + profileName + '</a>');
    // } else if (contentType.isReport) {
    //     var fileTitle = safeGet(result, 'listMetadata.fileTitle.0', result.title || 'Untitled');
    //     if (fileTitle) {
    //         html.add('<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' + fileTitle + '</a>');
    //     }
    if (contentType.isPDF) {
        var fileTitle = safeGet(result, 'listMetadata.fileTitle.0', result.title || 'Untitled');
        if (fileTitle) {
            html.add('<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' + fileTitle + '</a>');
        }
    } else {
        html.add('<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">');
        html.add(result.title || 'Untitled');
        
        // if (contentType.isReport) {
        //     html.add(' <span class="material-icons nsw-material-icons notranslate" title="pdf file">picture_as_pdf</span>');
        //     if (result.fileSize) {
        //         var sizeInMB = (result.fileSize / (1024 * 1024)).toFixed(2);
        //         html.add('<span>(PDF, ' + sizeInMB + ' MB)</span>');
        //     }
        // }
        html.add('</a>');
    }
    
    html.add('</div>');
    return html.toString();
}

function generateResultSummary(contentType, result) {
    // if (contentType.isProfile) {
    //     return generateProfileSummary(result);
    // } else if (contentType.isReport) {
    //     var parts = [];
    //     var shortDescription = safeGet(result, 'listMetadata.shortDescription.0', '');
    //     if (shortDescription) {
    //         parts.push('<div class="nsw-list-item__copy">' + shortDescription + '...</div>');
    //     }
        
    //     var additionalAuthors = safeGet(result, 'listMetadata.additionalAuthors.0', '');
    //     var publicationYear = safeGet(result, 'listMetadata.publicationYear.0', '');
        
    //     if (additionalAuthors || publicationYear) {
    //         var line = '<div class="nsw-list-item__copy">';
            
    //         if (additionalAuthors) {
    //             line += '<span class="meta-authors"><span style="font-weight:700;">Authors: </span>' + additionalAuthors + '</span>';
    //          }
             
    //         if (publicationYear) {
    //             line += (additionalAuthors ? '<span aria-hidden="true">&emsp;</span>' : '') + '<span class="meta-year"><span style="font-weight:700;">Year:&nbsp;</span>' + publicationYear + '</span>';
    //         }
    //         line += '</div>';
    //         parts.push(line);
    //     }
    //     // if (additionalAuthors) {
    //     //     parts.push('<div class="nsw-list-item__copy"><span style="font-weight:700;">Authors: </span>' + additionalAuthors + '</div>');
    //     // }
    //     return parts.join('');
    if (contentType.isPDF) {
        var parts = [];
        var shortDescription = safeGet(result, 'listMetadata.shortDescription.0', '');
        if (shortDescription) {
            parts.push('<div class="nsw-list-item__copy">' + shortDescription + '...</div>');
        }
        
        var additionalAuthors = safeGet(result, 'listMetadata.additionalAuthors.0', '');
        var publicationYear = safeGet(result, 'listMetadata.publicationYear.0', '');
        
        if (additionalAuthors || publicationYear) {
            var line = '<div class="nsw-list-item__copy">';
            
            if (additionalAuthors) {
                line += '<span class="meta-authors"><span style="font-weight:700;">Authors: </span>' + additionalAuthors + '</span>';
             }
             
            if (publicationYear) {
                line += (additionalAuthors ? '<span aria-hidden="true">&emsp;</span>' : '') + '<span class="meta-year"><span style="font-weight:700;">Year:&nbsp;</span>' + publicationYear + '</span>';
            }
            line += '</div>';
            parts.push(line);
        }
        // if (additionalAuthors) {
        //     parts.push('<div class="nsw-list-item__copy"><span style="font-weight:700;">Authors: </span>' + additionalAuthors + '</div>');
        // }
        return parts.join('');
    } else {
        var summary = safeGet(result, 'listMetadata.summary.0', '') || result.summary || '';
        if (summary) {
            return '<div class="nsw-list-item__copy">' + summary + '</div>';
        }
    }
    return '';
}

function generateProfileSummary(result) {
    var html = createHtmlBuffer();
    var profileTitle = safeGet(result, 'listMetadata.profileTitle.0', '');
    var profileEmail = safeGet(result, 'listMetadata.profileEmail.0', '');
    var profilePhone = safeGet(result, 'listMetadata.profilePhone.0', '');
    
    html.add('<div class="nsw-list-item__copy">');
    
    if (profileTitle) html.add(profileTitle + '<br>');
    if (profileEmail) html.add('<a href="mailto:' + profileEmail + '">' + profileEmail + '</a><br>');
    if (profilePhone) html.add('<a href="tel:' + profilePhone + '">' + profilePhone + '</a>');
    
    html.add('</div>');
    return html.toString();
}

function generateResultImage(contentType, result) {
    // if (contentType.isProfile && safeGet(result, 'listMetadata.profileImage.0')) {
    //     return '<div class="nsw-list-item__image nsw-list-item__image--avatar">' +
    //            '<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' +
    //            '<img src="' + result.listMetadata.profileImage[0] + '" alt="' + (result.title || '') + '">' +
    //            '</a>' +
    //            '</div>';
    // } else if ((contentType.isProject || contentType.isReport) && safeGet(result, 'listMetadata.image.0')) {
    //     return '<div class="nsw-list-item__image">' +
    //            '<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' +
    //            '<img src="' + result.listMetadata.image[0] + '" alt="' + (result.title || '') + '">' +
    //            '</a>' +
    //            '</div>';
    // }
    if ((contentType.isPDF) && safeGet(result, 'listMetadata.image.0')) {
        return '<div class="nsw-list-item__image">' +
               '<a href="' + (result.clickTrackingUrl || result.liveUrl || '') + '">' +
               '<img src="' + result.listMetadata.image[0] + '" alt="' + (result.title || '') + '">' +
               '</a>' +
               '</div>';
    }
    return '';
}

function generatePagination(apiData) {
    var resultsSummary = safeGet(apiData, 'response.resultPacket.resultsSummary', {});
    if (resultsSummary.totalMatching <= 10) return '';
    
    var html = createHtmlBuffer();
    var currentPage = Math.floor(((resultsSummary.currStart || 1) - 1) / 10) + 1;
    var totalPages = Math.ceil((resultsSummary.totalMatching || 0) / 10);
    
    html.add('<div id="component_479711">');
    html.add('<div class="nsw-block pirsa-pagination">');
    html.add('<nav class="nsw-pagination" aria-label="Pagination">');
    html.add('<ul><ul class="pagination-list">');
    
    // Generate page links
    for (var i = 1; i <= Math.min(7, totalPages); i++) {
        var startRank = (i - 1) * 10 + 1;
        var isActive = i === currentPage ? ' class="active"' : '';
        var currentParams = '%globals_server_query_string%';
        // Remove any existing start_rank parameter
        var cleanParams = currentParams.replace(/&?start_rank=\d+/g, '').replace(/^&/, '');
        var newUrl = cleanParams ? cleanParams + '&start_rank=' + startRank : 'start_rank=' + startRank;
        
        html.add('<li>');
        html.add('<a href="?' + newUrl + '"' + isActive + '>');
        html.add('<span class="sr-only">Page </span>' + i);
        html.add('</a>');
        html.add('</li>');
    }
    
    // Next button
    if (resultsSummary.nextStart) {
        html.add('<li>');
        var currentParams = '%globals_server_query_string%';
        var cleanParams = currentParams.replace(/&?start_rank=\d+/g, '').replace(/^&/, '');
        var nextUrl = cleanParams ? cleanParams + '&start_rank=' + resultsSummary.nextStart : 'start_rank=' + resultsSummary.nextStart;
        html.add('<a class="nsw-icon-button" href="?' + nextUrl + '">');
        html.add('<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_right</span>');
        html.add('<span class="sr-only">Next</span>');
        html.add('</a>');
        html.add('</li>');
    }
    
    html.add('</ul></ul>');
    html.add('</nav>');
    html.add('</div>');
    html.add('</div>');
    
    return html.toString();
}

function generateRelatedItemsSection(layoutConfig) {
    if (!layoutConfig.hasRelatedItems) return '';
    
    var html = createHtmlBuffer();
    
    html.add('<div class="nsw-layout__sidebar nsw-layout__sidebar--right">');
    html.add('<div class="nsw-content-block pirsa-content-block">');
    html.add('<div class="nsw-content-block__content">');
    html.add('<div class="nsw-content-block__title">Related search items</div>');
    html.add('<ul class="nsw-content-block__list">');
    
    layoutConfig.relatedTerms.forEach(function(term) {
        html.add('<li><a href="?query=' + encodeURIComponent(term) + '">' + term + '</a></li>');
    });
    
    html.add('</ul>');
    html.add('</div>');
    html.add('</div>');
    html.add('</div>');
    
    return html.toString();
}