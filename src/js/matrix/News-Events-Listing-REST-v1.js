
//	News Events Listing REST - v1 #487108


// Server-Side JavaScript for Squiz Matrix REST Resource
// News Collection Search Implementation - pirsa~sp-news-rules-limits
//
// PURPOSE: Transform Funnelback V16 API responses into news search results
//          with dynamic filtering, sorting, and card-based display layout
//
// ARCHITECTURE:
// 1. Parse and validate API response from _REST object
// 2. Extract facet configuration and build parameter mapping
// 3. Process search data (results, pagination, filters)
// 4. Generate responsive HTML with NSW Design System classes
// 5. Handle radio buttons for single-select/radio, checkboxes for multi-select
//
// CRITICAL ENCODING REQUIREMENTS:
// - Spaces in URLs must be '+' not '%20' for Funnelback compatibility
// - Pipe characters must be '%7C' for proper parameter parsing
// - Time period filters need special format: 'd=value :: label'
//
// MAINTENANCE NOTES:
// - Facets auto-discovered from API - no code changes for new facets
// - News field paths may need updating if API schema changes
// - Visual selection states handled by client-side JS, not server-side
//
// TROUBLESHOOTING:
// - Add debug: print('<!-- DEBUG: ' + JSON.stringify(data) + ' -->');
// - Check API response structure in browser dev tools
// - Verify REST Resource URL configuration if API calls fail

print('<!--span class="fburl">' + _REST.request.urls + '</span-->');

// =================================================================
// MAIN EXECUTION BLOCK
// =================================================================
// Entry point - handles API response validation and orchestrates
// the entire search results generation process

try {
  // Initialize and validate API data from Funnelback REST response
  var apiData = initializeApiData();
  if (!validateApiResponse(apiData)) {
    print('<div class="error">Invalid API response structure</div>');
  } else {
    var totalMatching = getTotalMatching(apiData);
    if (totalMatching === 0) {
      // Display user-friendly message for zero results
      print('<div class="nsw-search-results"><div class="nsw-list-item"><div class="nsw-list-item__content">No news articles found matching your search criteria. Try adjusting your filters or search terms.</div></div></div>');
    } else {
      // Process data and generate complete search results page
      var searchData = processSearchData(apiData);
      print(generateNewsSearchResults(searchData, apiData));
    }
  }
} catch (error) {
  // Error handling with debug information
  print('Debug error: ' + error.message);
  print('<div class="error">News search results temporarily unavailable. Please try again later.</div>');
}

// =================================================================
// INITIALIZATION AND VALIDATION FUNCTIONS
// =================================================================
// These functions handle the initial setup and validation of API data

/**
 * Initialize API data from Funnelback REST response
 * Handles both string and object response formats
 * @returns {Object|null} Parsed API data or null if invalid
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

/**
 * Validate API response structure for required fields
 * Ensures response contains minimum data needed for processing
 * @param {Object} apiData - Parsed API response
 * @returns {boolean} True if response is valid for processing
 */
function validateApiResponse(apiData) {
  return apiData && apiData.response && (apiData.response.resultPacket || apiData.response.facets);
}

/**
 * Extract total matching results count from API response
 * Used for pagination calculations and result display
 * @param {Object} apiData - Parsed API response
 * @returns {number} Total number of matching results
 */
function getTotalMatching(apiData) {
  return (apiData.response.resultPacket.resultsSummary &&
    apiData.response.resultPacket.resultsSummary.totalMatching) ?
    apiData.response.resultPacket.resultsSummary.totalMatching : 0;
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================
// Helper functions for safe data access, encoding, and HTML generation

/**
 * Safe object property navigation with fallback values
 * Prevents null reference errors when accessing nested properties
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot-separated property path (e.g., 'response.results.0')
 * @param {*} defaultValue - Value to return if path is invalid
 * @returns {*} Property value or defaultValue if path doesn't exist
 */
function safeGet(obj, path, defaultValue) {
  return path.split('.').reduce(function (current, key) {
    return (current && current[key] !== undefined) ? current[key] : defaultValue;
  }, obj);
}

/**
 * Encode query parameters with Funnelback-specific format
 * CRITICAL: Spaces must be '+' not '%20' for Funnelback compatibility
 * @param {string} param - Parameter value to encode
 * @returns {string} Properly encoded parameter
 */
function encodeQueryParam(param) {
  return encodeURIComponent(param).replace(/%20/g, '+');
}

/**
 * Create optimized HTML buffer for efficient string concatenation
 * Replaces slow string concatenation with array-based buffer
 * @returns {Object} Buffer object with add() and toString() methods
 */
function createHtmlBuffer() {
  var buffer = [];
  return {
    add: function (html) { buffer.push(html); },
    toString: function () { return buffer.join(''); }
  };
}

// =================================================================
// URL PARAMETER EXTRACTION
// =================================================================
// Extract and organize URL parameters from Squiz Matrix globals

/**
 * Extract URL parameters from Squiz Matrix globals
 * Parses query string and organizes parameters for easy access
 * @returns {Object} Structured object with query, sort, filters, and pagination
 */
function extractUrlParameters() {
  var queryString = '%globals_server_query_string%';
  var params = {
    query: '%globals_get_query%' || '',
    sort: '%globals_get_sort%' || 'date',
    filters: {},
    start_rank: parseInt('%globals_get_start_rank%') || 1
  };

  // Parse filter parameters from query string
  if (queryString) {
    var pairs = queryString.split('&');
    pairs.forEach(function (pair) {
      var parts = pair.split('=');
      if (parts.length === 2) {
        var key = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts[1].replace(/\+/g, ' '));
        if (key.startsWith('f.')) {
          // Store multiple formats for matching
          params.filters[key] = value;
          params.filters[parts[0]] = value; // Store encoded version too
          params.filters[key.replace(/ /g, '+').replace(/\|/g, '%7C')] = value; // Funnelback format
        }
      }
    });
  }
  return params;
}

// =================================================================
// FACET DATA PROCESSING
// =================================================================
// Extract and transform facet information from API response into usable format
// This section handles the complex mapping between Funnelback facet configuration
// and the form parameters needed for filtering

/**
 * Main facet data extraction function
 * Processes API response to extract facet configuration and values
 * @param {Object} data - Complete API response object
 * @returns {Array} Array of processed facet objects ready for HTML generation
 */
function extractFacetData(data) {
  var facetOutput = [];

  // Extract facet definitions from API configuration
  var profiles = safeGet(data, 'question.collection.profiles', {});
  var facetDefs = getFacetDefinitions(profiles);

  if (!facetDefs) return facetOutput;

  // Build mapping between facet data and query parameters
  var facetMap = buildFacetMap(facetDefs);
  var responseFacets = safeGet(data, 'response.facets', []);

  // Process each facet from the API response
  responseFacets.forEach(function (facet) {
    var processedFacet = processFacet(facet, facetMap, data);
    if (processedFacet) {
      facetOutput.push(processedFacet);
    }
  });

  return facetOutput;
}

/**
 * Find facet definitions in API response profiles
 * Searches through all profiles to find facet configuration
 * @param {Object} profiles - Profiles object from API response
 * @returns {Array|null} Facet definitions array or null if not found
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
  facetDefs.forEach(function (facetDef) {
    var categories = facetDef.categoryDefinitions;
    if (!Array.isArray(categories)) return;

    categories.forEach(function (category) {
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
      selected: facet.selected || false,
      guessedDisplayType: facet.guessedDisplayType || 'CHECKBOX'
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

  allValues.forEach(function (value) {
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
  if (facetName === 'Date Range') {
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
    currentSort: urlParams.sort || 'date',
    currentQuery: urlParams.query || ''
  };
}

function generateNewsSearchResults(searchData, apiData) {
  var html = createHtmlBuffer();

  try {
    html.add('<div class="results-listing">');
    html.add('<div class="nsw-layout nsw-layout--2-col">');
    html.add(generateFiltersSection(searchData));
    html.add(generateMainContentSection(searchData, apiData));
    html.add('</div></div>');

    return html.toString();
  } catch (error) {
    return '<div class="error">Error generating news search results</div>';
  }
}

// =================================================================
// HTML GENERATION - FILTER SIDEBAR
// =================================================================
// Generate dynamic filter sidebar with radio buttons and checkboxes
// Radio buttons for single-select facets, checkboxes for multi-select

/**
 * Generate complete filters section (sidebar)
 * Creates responsive sidebar with dynamic filter controls
 * @param {Object} searchData - Processed search data object
 * @returns {string} Complete sidebar HTML
 */
function generateFiltersSection(searchData) {
  var html = createHtmlBuffer();

  html.add('<div class="nsw-layout__sidebar">');
  html.add('<div class="nsw-filters nsw-filters--down js-filters ready">');
  html.add('<input type="hidden" name="sort" value="' + searchData.currentSort + '">');

  html.add(generateFiltersControls(searchData));
  html.add(generateFiltersWrapper(searchData));

  html.add('</div></div>');
  return html.toString();
}

function generateFiltersControls(searchData) {
  var activeFiltersCount = countActiveFilters(searchData.facets);
  var filtersText = activeFiltersCount > 0 ? 'Filters (' + activeFiltersCount + ')' : 'Filters';

  return '<div class="nsw-filters__controls js-filters__count">' +
    '<button type="button">' +
    '<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">tune</span>' +
    '<span>' + filtersText + '</span>' +
    '<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_down</span>' +
    '</button>' +
    '</div>';
}

function countActiveFilters(facets) {
  var count = 0;
  facets.forEach(function (facet) {
    if (facet.allValues && Array.isArray(facet.allValues)) {
      facet.allValues.forEach(function (value) {
        if (value.selected) count++;
      });
    }
  });
  return count;
}

function generateFiltersWrapper(searchData) {
  var html = createHtmlBuffer();
  var hasSelectedFilters = false;

  html.add('<div class="nsw-filters__wrapper">');
  html.add('<div class="nsw-filters__title">Filters</div>');
  html.add('<div class="nsw-filters__list">');

  searchData.facets.forEach(function (facet) {
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
  var isExpanded = false;

  if (facet.name === 'Date Range') {
    facet = sortDateRangeFacet(facet);
  }

  // Check if facet has any valid items to display
  var hasValidItems = false;
  if (facet.allValues && facet.labels) {
    for (var i = 0; i < facet.allValues.length; i++) {
      var value = facet.allValues[i];
      var labelData = facet.labels[value.label];
      if (labelData && value.count !== 0) {
        hasValidItems = true;
        break;
      }
    }
  }

  // Don't render facet if no valid items
  if (!hasValidItems) {
    return { html: '', hasSelected: false };
  }

  if (facet.allValues && Array.isArray(facet.allValues)) {
    facet.allValues.forEach(function (value) {
      if (value.selected) {
        hasSelected = true;
        isExpanded = true;
      }
    });
  }

  var buttonClass = 'nsw-filters__item-button js-filters-item-button' + (isExpanded ? ' active' : '');
  var contentHidden = isExpanded ? '' : ' hidden=""';
  var ariaExpanded = isExpanded ? 'true' : 'false';

  html.add('<div class="nsw-filters__item js-filters-item">');
  html.add('<button class="' + buttonClass + '" type="button" aria-expanded="' + ariaExpanded + '" aria-controls="' + facetId + '" data-label="' + facet.name + '">');
  html.add('<span class="nsw-filters__item-name">' + facet.name + '</span>');
  html.add('<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_down</span>');
  html.add('</button>');

  html.add('<div class="nsw-filters__item-content" id="' + facetId + '"' + contentHidden + '>');
  html.add('<fieldset class="nsw-form__fieldset">');
  html.add('<legend class="nsw-form__legend sr-only">' + facet.name + '</legend>');

  var checkboxesResult = generateFacetCheckboxes(facet);
  html.add(checkboxesResult.html);

  html.add('</fieldset></div></div>');

  return { html: html.toString(), hasSelected: hasSelected };
}

function sortDateRangeFacet(facet) {
  var sortedLabels = Object.keys(facet.labels).sort(function (a, b) {
    if (a.startsWith('Coming') && !b.startsWith('Coming')) return -1;
    if (!a.startsWith('Coming') && b.startsWith('Coming')) return 1;
    if (a.startsWith('Past') && !b.startsWith('Past')) return -1;
    if (!a.startsWith('Past') && b.startsWith('Past')) return 1;
    if (!isNaN(a) && !isNaN(b)) return parseInt(b) - parseInt(a);
    return a.localeCompare(b);
  });

  var reorderedLabels = {};
  sortedLabels.forEach(function (key) {
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

      if (value.count === 0) continue;

      var elementHtml = generateFacetElement(facet, value, labelData);
      html.add(elementHtml);

      if (value.selected) hasSelected = true;
    }
  }

  return { html: html.toString(), hasSelected: hasSelected };
}

// =================================================================
// HTML GENERATION - FORM ELEMENTS
// =================================================================
// Generate individual form elements (radio buttons, checkboxes)
// Handles proper encoding and UI element type selection

/**
 * Generate appropriate form element based on facet display type
 * Routes to radio button or checkbox based on guessedDisplayType from API
 * @param {Object} facet - Facet object with display type information
 * @param {Object} item - Individual facet value item
 * @param {Object} labelData - Label data with query parameters
 * @returns {string} HTML for appropriate form element
 */
function generateFacetElement(facet, item, labelData) {
  var displayType = facet.guessedDisplayType || 'CHECKBOX';

  switch (displayType) {
    case 'RADIO_BUTTON':
      return generateRadioButton(facet, item, labelData);
    case 'SINGLE_DRILL_DOWN':
    case 'CHECKBOX':
    case 'UNKNOWN':
    default:
      return generateCheckboxElement(facet, item, labelData);
  }
}

function generateRadioButton(facet, item, labelData) {
  var label = typeof item === 'string' ? item : item.label;
  var count = typeof item === 'string' ? labelData.count : item.count;
  var selected = typeof item === 'string' ? labelData.selected : item.selected;

  // Check URL parameters for selected state - handle multiple encoding formats
  var urlParams = extractUrlParameters();
  var paramName = labelData.queryParam.split('=')[0];
  var decodedParamName = decodeURIComponent(paramName);

  // Check various parameter name formats
  var isSelectedInUrl = false;
  Object.keys(urlParams.filters).forEach(function (key) {
    var decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
    if ((key === paramName || decodedKey === decodedParamName || key === decodedParamName) &&
      urlParams.filters[key] === label) {
      isSelectedInUrl = true;
    }
  });

  var displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  var countDisplay = (count !== null && count !== undefined) ? ' (' + count + ')' : '';
  var fieldId = 'filters-' + facet.name.replace(/\s+/g, '-').toLowerCase() + '-' + label.replace(/[\s\W]+/g, '-').toLowerCase();

  // Extract value portion after first = sign
  var equalIndex = labelData.queryParam.indexOf('=');
  var encodedValue = labelData.queryParam.substring(equalIndex + 1);
  var radioValue = decodeURIComponent(encodedValue).replace(/\+/g, ' ');

  var checkedAttr = (selected || isSelectedInUrl) ? ' checked=""' : '';
  var radioName = decodedParamName;

  return '<input class="nsw-form__radio-input js-filters-item-checkbox" type="radio" ' +
    'name="' + radioName + '" value="' + radioValue + '" ' +
    'id="' + fieldId + '" form="global-search"' + checkedAttr + ' ' +
    'data-filter-key="' + facet.name + '|' + label + '" ' +
    'data-param-name="' + radioName + '" ' +
    'data-count-placeholder="count-' + facet.name + '-' + label + '"> ' +
    '<label class="nsw-form__radio-label" for="' + fieldId + '"> ' +
    displayLabel + countDisplay +
    '</label>';
}

function generateCheckboxElement(facet, item, labelData) {
  var label = typeof item === 'string' ? item : item.label;
  var count = typeof item === 'string' ? labelData.count : item.count;
  var selected = typeof item === 'string' ? labelData.selected : item.selected;

  // Check URL parameters for selected state
  var urlParams = extractUrlParameters();
  var paramName = labelData.queryParam.split('=')[0];
  var decodedParamName = decodeURIComponent(paramName);
  var isSelectedInUrl = false;
  Object.keys(urlParams.filters).forEach(function (key) {
    var decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
    if ((key === paramName || decodedKey === decodedParamName || key === decodedParamName) &&
      urlParams.filters[key] === label) {
      isSelectedInUrl = true;
    }
  });

  var displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  var countDisplay = (count !== null && count !== undefined) ? ' (' + count + ')' : '';
  var fieldId = 'filters-' + facet.name.replace(/\s+/g, '-').toLowerCase() + '-' + label.replace(/[\s\W]+/g, '-').toLowerCase();

  // Extract value portion after first = sign
  var equalIndex = labelData.queryParam.indexOf('=');
  var encodedValue = labelData.queryParam.substring(equalIndex + 1);
  var checkboxValue = decodeURIComponent(encodedValue).replace(/\+/g, ' ');

  var checkedAttr = (selected || isSelectedInUrl) ? ' checked=""' : '';

  return '<input class="nsw-form__checkbox-input js-filters-item-checkbox" type="checkbox" ' +
    'name="' + decodedParamName + '" value="' + checkboxValue + '" ' +
    'id="' + fieldId + '" form="global-search"' + checkedAttr + '>' +
    '<label class="nsw-form__checkbox-label" for="' + fieldId + '">' +
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
    '<a href="?">Clear all filters</a>' +
    '</div>';
}

// =================================================================
// HTML GENERATION - MAIN CONTENT AREA
// =================================================================
// Generate results bar, news grid, and pagination for main content area

/**
 * Generate main content section with results and controls
 * Combines results bar, news grid, and pagination
 * @param {Object} searchData - Processed search data
 * @param {Object} apiData - Raw API response
 * @returns {string} Complete main content HTML
 */
function generateMainContentSection(searchData, apiData) {
  var html = createHtmlBuffer();

  html.add('<div class="nsw-layout__main results-list">');
  html.add(generateResultsBar(searchData));
  html.add(generateNewsGrid(apiData));
  html.add(generatePagination(apiData));
  html.add('</div>');

  return html.toString();
}

function generateResultsBar(searchData) {
  return '<div class="nsw-results-bar">' +
    '<div class="nsw-results-bar__info">' +
    'Showing results ' + searchData.pagination.currStart + ' - ' + searchData.pagination.currEnd + ' of ' + searchData.totalResults + ' results' +
    '</div>' +
    '<div class="nsw-results-bar__sorting">' +
    generateSortingForm(searchData) +
    '</div>' +
    '</div>';
}

function generateSortingForm(searchData) {
  var html = createHtmlBuffer();

  html.add('<form id="js-results-bar-sort" class="nsw-display-flex nsw-align-items-center" method="GET" action="%globals_asset_url%">');

  // Add hidden input for current query if it exists
  if (searchData.currentQuery && searchData.currentQuery !== '' && searchData.currentQuery !== '!null') {
    html.add('<input type="hidden" name="query" value="' + searchData.currentQuery + '">');
  }

  searchData.facets.forEach(function (facet) {
    if (facet.allValues && Array.isArray(facet.allValues)) {
      facet.allValues.forEach(function (value) {
        if (value.selected && facet.labels[value.label]) {
          var paramName = facet.labels[value.label].queryParam.split('=')[0];
          html.add('<input type="hidden" name="' + decodeURIComponent(paramName) + '" value="' + value.label + '">');
        }
      });
    }
  });

  html.add('<label class="nsw-form__label" for="sort">Sort by:</label>');
  html.add('<select class="nsw-form__select" name="sort" id="sort">');
  html.add('<option value="date"' + (searchData.currentSort === 'date' ? ' selected="selected"' : '') + '>Date descending</option>');
  html.add('<option value="adate"' + (searchData.currentSort === 'adate' ? ' selected="selected"' : '') + '>Date ascending</option>');
  html.add('<option value="title"' + (searchData.currentSort === 'title' ? ' selected="selected"' : '') + '>A-Z</option>');
  html.add('<option value="dtitle"' + (searchData.currentSort === 'dtitle' ? ' selected="selected"' : '') + '>Z-A</option>');
  html.add('<option value="default"' + (searchData.currentSort === 'default' ? ' selected="selected"' : '') + '>Relevance</option>');
  html.add('</select>');
  html.add('<button type="submit" class="nsw-button nsw-button--dark nsw-m-left-xs sr-only">Submit</button>');
  html.add('</form>');

  return html.toString();
}

// =================================================================
// HTML GENERATION - NEWS RESULTS
// =================================================================
// Generate news cards and result grid layout
// Handles news-specific field extraction and card layout

/**
 * Generate news results grid
 * Creates responsive grid of news cards
 * @param {Object} apiData - Raw API response with results
 * @returns {string} Complete news grid HTML
 */
function generateNewsGrid(apiData) {
  var html = createHtmlBuffer();
  var results = safeGet(apiData, 'response.resultPacket.results', []);

  html.add('<div class="results-grid nsw-grid">');

  results.forEach(function (result) {
    html.add(generateNewsCard(result));
  });

  html.add('</div>');
  return html.toString();
}

function generateNewsCard(result) {
  var html = createHtmlBuffer();

  var fullTitle = result.title || 'Untitled Article';
  var newsTitle = fullTitle.replace(/ - Department of Primary Industries.*$/, '');

  var newsType = safeGet(result, 'listMetadata.newstype.0', '');
  var imageUrl = safeGet(result, 'listMetadata.newsImage.0', '');

  var clickUrl = result.liveUrl || result.clickTrackingUrl || '';
  var summary = result.summary || '';
  var date = result.date;
  var formattedDate = '';

  if (date) {
    var dateObj = new Date(date);
    formattedDate = dateObj.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  var isEvent = newsType.toLowerCase() === 'event';
  var cardClass = 'nsw-card nsw-card--pirsa nsw-card--headline' + (isEvent ? ' nsw-card--pirsa-invert' : '');

  html.add('<div class="nsw-col nsw-col-sm-6 nsw-col-xl-4">');
  html.add('<article class="' + cardClass + '">');

  if (imageUrl) {
    html.add('<div class="nsw-card__image">');
    html.add('<img src="' + imageUrl + '" alt="' + fullTitle + '">');
    html.add('</div>');
  }

  html.add('<div class="nsw-card__content" style="display:flex;flex-direction:column;">');

  html.add('<div class="nsw-card__title" style="order:2;">');
  html.add('<h4><a href="' + clickUrl + '">' + newsTitle + '</a></h4>');
  html.add('</div>');

  html.add('<div class="nsw-card--pirsa__meta" style="order:1;">');
  if (newsType) {
    html.add('<span class="nsw-card--pirsa__tag">' + newsType + '</span>');
  }
  if (formattedDate) {
    html.add('<time datetime="' + date + '">' + formattedDate + '</time>');
  }
  html.add('</div>');

  if (summary) {
    html.add('<div class="nsw-card__copy" style="order:3;">');
    html.add('<p>' + summary + '</p>');
    html.add('</div>');
  }

  html.add('<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">arrow_forward</span>');

  html.add('</div>');
  html.add('</article>');
  html.add('</div>');

  return html.toString();
}

function generatePagination(apiData) {
  var resultsSummary = safeGet(apiData, 'response.resultPacket.resultsSummary', {});
  var totalMatching = resultsSummary.totalMatching || 0;
  var currStart = resultsSummary.currStart || 1;
  var pageSize = 12;

  if (totalMatching <= pageSize) return '';

  var html = createHtmlBuffer();
  var currentPage = Math.floor((currStart - 1) / pageSize) + 1;
  var totalPages = Math.ceil(totalMatching / pageSize);

  html.add('<div class="nsw-block pirsa-pagination">');
  html.add('<nav class="nsw-pagination" aria-label="Pagination">');
  html.add('<ul><ul class="pagination-list">');

  for (var i = 1; i <= Math.min(7, totalPages); i++) {
    var startRank = (i - 1) * pageSize + 1;
    var isActive = i === currentPage ? ' class="active"' : '';
    var currentParams = '%globals_server_query_string%'.replace(/[&?]start_rank=\d+/g, '');
    // Remove any existing start_rank parameter
    var cleanParams = currentParams.replace(/&?start_rank=\d+/g, '').replace(/^&/, '');
    var newUrl = cleanParams ? cleanParams + '&start_rank=' + startRank : 'start_rank=' + startRank;

    html.add('<li>');
    html.add('<a href="?' + newUrl + '"' + isActive + '>');
    html.add('<span class="sr-only">Page </span>' + i);
    html.add('</a>');
    html.add('</li>');
  }

  if (resultsSummary.nextStart) {
    html.add('<li>');
    // html.add('<a class="nsw-icon-button" href="?start_rank=' + resultsSummary.nextStart + '">');
    var currentParams = '%globals_server_query_string%';
    var cleanParams = currentParams.replace(/&?start_rank=\d+/g, '').replace(/^&/, '');
    var nextUrl = cleanParams ? cleanParams + '&start_rank=' + resultsSummary.nextStart : 'start_rank=' + resultsSummary.nextStart;
    html.add('<a class="nsw-icon-button" href="?' + nextUrl + '">');
    html.add('<span class="material-icons nsw-material-icons notranslate" focusable="false" aria-hidden="true">keyboard_arrow_right</span>');
    html.add('<span class="sr-only">Next</span>');
    html.add('</a>');
    html.add('</li>');
  }

  html.add('</ul></ul></nav></div>');

  return html.toString();
}