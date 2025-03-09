import { protectRoute } from './routeGuard.js';
import AuthContext from './authContext.js';


protectRoute();
document.addEventListener('DOMContentLoaded', async () => {
    // Get the 'id' from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');

    if (!docId) {
        console.error('No file ID provided in URL');
        return;
    }

    try {
        // Make API call to backend
        const response = await fetch(`http://localhost:3000/api/matches/${docId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the response data
        const fileDetails = await response.json();
        console.log(fileDetails);

        // Display file content in the preview section
        const filePreview = document.getElementById('filePreview');
        filePreview.textContent = fileDetails.document.content;
        filePreview.style.whiteSpace = "pre-wrap";
        filePreview.style.overflow = "auto";

        // Update file size
        const fileSizeInBytes = fileDetails.document.fileSize;
        let fileSizeText = fileSizeInBytes >= 1024 * 1024
            ? (fileSizeInBytes / (1024 * 1024)).toFixed(2) + " MB"
            : (fileSizeInBytes / 1024).toFixed(2) + " KB";
        fileSize.textContent = fileSizeText;

        // Update match score in the circle
        const matchScore = document.getElementById('matchScore');
        matchScore.textContent = `${Math.round(fileDetails.document.match_rate)}%`;
        const cardValueMatched = document.querySelector('.card-value-matched');
        const cardScore = document.querySelector('.card-value-score');
        const cardLevenshtein = document.querySelector('.card-value-levenshtein');
        if (cardLevenshtein) {
            cardLevenshtein.textContent = fileDetails.matches[0].levenshteinSimilarity;
        }
        if (cardScore) {
            cardScore.textContent = fileDetails.matches[0].wordFrequencySimilarity;
        }
        if (cardValueMatched) {
            cardValueMatched.textContent = fileDetails.matches.length;
        }


        // Update matches table
        const tableBody = document.querySelector('.document-list tbody');
        tableBody.innerHTML = ''; // Clear existing content

        fileDetails.matches.forEach(match => {
            const statusClass = getStatusClass(match.avgSimilarity);
            const statusText = getStatusText(match.avgSimilarity);

            const row = document.createElement('tr');
            row.className = 'doc-row';
            row.innerHTML = `
                <td><input type="checkbox" class="doc-checkbox"></td>
                <td>
                    <div class="doc-icon">	📄</div>
                </td>
                <td>
                    <div class="doc-name">${match.filename}</div>
                    <div class="doc-meta">Similarity Match</div>
                </td>
                <td>${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${parseFloat(match.avgSimilarity).toFixed(2)}%</td>
                <td>
                    <button class="view-btn">View File</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update credits display
        const credits = AuthContext.getUserCredits();
        const remaining = 20 - credits;
        const creditLabel = document.querySelector('.credit-label span:last-child');
        const creditText = document.querySelector('.credit-text span:first-child');
        creditLabel.textContent = `${credits}/20`;
        creditText.textContent = `${remaining} credits remaining`;

        const creditBar = document.querySelector('.credit-used');
        const percentage = (credits / 20) * 100;
        creditBar.style.width = `${percentage}%`;




        const tabs = document.querySelectorAll('.tab');
        const resultsContent = document.querySelector('.results-content');

        // Create content for each tab
        const tabContents = {
            'Overview': createOverviewTab(fileDetails),
            'AI Contextual Scan': createSimilarDocumentsTab(fileDetails),
            'Analysis': createAnalysisTab(fileDetails),
            'Matches': createMatchesTab(fileDetails),
        };

        // Set initial content
        resultsContent.innerHTML = tabContents['Overview'];

        // Add click handlers for tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                // Update content
                resultsContent.innerHTML = tabContents[tab.textContent];
            });
        });
        function setupAIScanEvents() {
            document.body.addEventListener('click', async (e) => {
                if (e.target.id === 'aiScanButton') {
                    const credits = AuthContext.getUserCredits();
                    if (credits < 2) {
                        showNotification('Insufficient credits. You need 2 credits for AI scanning.', 'error');
                        return;
                    }

                    const button = e.target;
                    button.disabled = true;
                    button.innerHTML = '<img class="icon-nav" src="../icons/loading.png" /> Analyzing...';

                    try {
                        // Hide the AI scan info section
                        const aiScanInfo = document.querySelector('.ai-scan-info');
                        aiScanInfo.style.display = 'none';

                        // Show analysis progress
                        const aiScanResults = document.getElementById('aiScanResults');
                        aiScanResults.style.display = 'block';

                        // Get the document ID from URL
                        const urlParams = new URLSearchParams(window.location.search);
                        const docId = urlParams.get('id');

                        // Start progress simulation
                        const progressPromise = simulateAnalysisProgress();

                        // Make API call
                        const apiPromise = fetch(`http://localhost:3000/api/scan/ai/${docId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                // 'Authorization': `Bearer ${AuthContext.getToken()}`
                            },
                            body: JSON.stringify({
                                documentId: docId,
                                analysisType: 'full'
                            })
                        });

                        // Wait for both progress simulation and API call to complete
                        const [aiResponse] = await Promise.all([apiPromise, progressPromise]);

                        if (!aiResponse.ok) {
                            throw new Error(`HTTP error! status: ${aiResponse.status}`);
                        }

                        const aiResults = await aiResponse.json();

                        // Update the UI with actual results
                        updateAIResults(aiResults);

                        // Hide progress indicator after completion
                        document.getElementById('analysisProgress').style.display = 'none';

                        // Update credits
                        // AuthContext.updateCredits(credits - 2);

                        showNotification('AI analysis completed successfully!', 'success');

                    } catch (error) {
                        console.error('AI scanning failed:', error);
                        showNotification('AI scanning failed. Please try again.', 'error');
                        // Show the AI scan info section again in case of error
                        const aiScanInfo = document.querySelector('.ai-scan-info');
                        aiScanInfo.style.display = 'block';
                        document.getElementById('aiScanResults').style.display = 'none';
                    } finally {
                        button.disabled = false;
                        button.innerHTML = '<img class="icon-nav" src="../icons/ai-scan.png" /> Start AI Analysis';
                    }
                }

                // View Document Comparison
                if (e.target.classList.contains('compare-btn')) {
                    const docId = e.target.dataset.docid;
                    const originalDocId = urlParams.get('id'); // Get the original document ID
                    fetchAndDisplayComparison(originalDocId, docId);
                }

                // Back to Results
                if (e.target.id === 'backToResults') {
                    document.getElementById('comparisonView').style.display = 'none';
                    document.getElementById('aiScanResults').style.display = 'block';
                }

                // Export Results
                if (e.target.id === 'exportResults') {
                    exportAnalysisResults();
                }

                // View More Matches
                if (e.target.id === 'viewMoreMatches') {
                    loadMoreMatches();
                }

                // Bookmark Document
                // if (e.target.classList.contains('bookmark-btn')) {
                //     const docId = e.target.dataset.docid;
                //     toggleBookmark(docId, e.target);
                // }
            });
            document.body.addEventListener('click', (e) => {
                if (e.target.id === 'backToResults') {
                    showResults();
                }
            });
            // Filter and sort event listeners
            document.body.addEventListener('change', (e) => {
                if (e.target.id === 'matchTypeFilter' || e.target.id === 'sortResults') {
                    filterAndSortMatches();
                }
            });

            // Tooltip functionality
            document.body.addEventListener('mouseover', (e) => {
                if (e.target.classList.contains('tooltip-icon')) {
                    showTooltip(e.target);
                }
            });

            document.body.addEventListener('mouseout', (e) => {
                if (e.target.classList.contains('tooltip-icon')) {
                    hideTooltip();
                }
            });
        }





        setupAIScanEvents();
        function updateAIResults(aiResults) {
            // Update confidence scores
            document.querySelector('.card-value-ai').textContent = `${aiResults.summary.aiConfidenceScore}%`;
            document.querySelector('.card-value-semantic').textContent = `${aiResults.summary.semanticSimilarity}%`;
            document.querySelector('.card-value-pattern').textContent = `${aiResults.summary.patternMatch}%`;

            // Update matches table
            const aiMatchesBody = document.getElementById('aiMatchesBody');

            // Check if matches array exists and has items
            if (!aiResults.matches || !Array.isArray(aiResults.matches)) {
                console.error('No matches array found in AI results');
                return;
            }

            aiMatchesBody.innerHTML = aiResults.matches.map(match => {
                // Add null checks and default values for match properties
                const type = match.type ? match.type.toLowerCase() : 'unknown';
                const confidence = match.confidence || 0;
                const filename = match.filename || 'Unnamed Document';
                const id = match.id || '';
                const fileType = match.fileType || 'default';
                const score = match.score || 0;

                return `
            <tr data-type="${type}" data-confidence="${confidence}" data-name="${filename}">
                <td><div class="bookmark-container"><button class="bookmark-btn" data-docid="${id}"></button></div></td>
                <td> 📄</td>
                <td>${filename}</td>
                <td><span class="confidence-badge ${getConfidenceClass(confidence)}">${confidence}%</span></td>
                <td>${match.type || 'Unknown'}</td>
                <td>${score}%</td>
                <td>
                    <div class="action-buttons">
                        <button class="compare-btn" data-docid="${id}">
                            <img class="icon-nav-sm" src="../icons/compare.png" />
                            Compare
                        </button>
                        <button class="view-btn" data-docid="${id}">
                            <img class="icon-nav-sm" src="../icons/view.png" />
                        </button>
                    </div>
                </td>
            </tr>
        `;
            }).join('');
        }

        function getConfidenceClass(confidence) {
            if (confidence > 90) return 'high-match';
            if (confidence > 75) return 'medium-match';
            return 'low-match';
        }

    } catch (error) {
        console.error('Error fetching file details:', error);
    }
});

// Helper functions for status
function getStatusClass(similarity) {
    if (similarity >= 75) return 'match';
    if (similarity >= 40) return 'partial';
    return 'no-match';
}

function getStatusText(similarity) {
    if (similarity >= 75) return 'High Match';
    if (similarity >= 40) return 'Partial Match';
    return 'No Match';
}

// ðŸ” Zoom & Fullscreen Functionality
document.getElementById('zoomInBtn').addEventListener('click', () => {
    const preview = document.getElementById('filePreview');
    let currentSize = parseFloat(window.getComputedStyle(preview).fontSize);
    preview.style.fontSize = (currentSize + 2) + 'px';
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const preview = document.getElementById('filePreview');
    let currentSize = parseFloat(window.getComputedStyle(preview).fontSize);
    preview.style.fontSize = (currentSize - 2) + 'px';
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    const preview = document.getElementById('filePreview');
    if (preview.requestFullscreen) {
        preview.requestFullscreen();
    } else if (preview.mozRequestFullScreen) { // Firefox
        preview.mozRequestFullScreen();
    } else if (preview.webkitRequestFullscreen) { // Chrome, Safari, Opera
        preview.webkitRequestFullscreen();
    } else if (preview.msRequestFullscreen) { // IE/Edge
        preview.msRequestFullscreen();
    }
});


function showResults() {
    document.getElementById('comparisonView').style.display = 'none';
    document.getElementById('aiScanResults').style.display = 'block';
}


// Helper functions for creating tab content
function createOverviewTab(fileDetails) {
    return `
        <div class="tab-content active">
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="card-icon"><img class="icon-nav" src="../icons/similar.png" /></div>
                    <div class="card-info">
                        <h4>Similar Documents</h4>
                        <h2 class="card-value-matched">${fileDetails.matches.length}</h2>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon"><img class="icon-nav" src="../icons/connections.png" /></div>
                    <div class="card-info">
                        <h4>Levenshtein Similarity</h4>
                        <h2 class="card-value-levenshtein">${fileDetails.matches[0]?.levenshteinSimilarity || '0'}%</h2>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="card-icon"><img class="icon-nav" src="../icons/font-size.png" /></div>
                    <div class="card-info">
                        <h4>Word Frequency</h4>
                        <h2 class="card-value-score">${fileDetails.matches[0]?.wordFrequencySimilarity || '0'}%</h2>
                    </div>
                </div>
            </div>
            ${createMatchesTable(fileDetails.matches)}
        </div>
    `;
}

function createMatchesTab(fileDetails) {
    return `
        <div class="tab-content">
            <div class="matches-list">
                ${fileDetails.matches.map(match => `
                    <div class="match-item">
                        <h3>${match.filename}</h3>
                        <div class="match-details">
                            <p>Levenshtein Similarity: ${match.levenshteinSimilarity}%</p>
                            <p>Word Frequency Similarity: ${match.wordFrequencySimilarity}%</p>
                            <p>Average Similarity: ${match.avgSimilarity}%</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

//herer
function createSimilarDocumentsTab(fileDetails) {
    return `
        <div class="tab-content">
            <div class="ai-scan-container">
                <div class="ai-scan-info">
                    <h2>AI-Powered Document Analysis</h2>
                    <p>Our advanced AI scanning provides deeper insights by:</p>
                    <ul>
                        <li>Understanding document context and semantics</li>
                        <li>Detecting paraphrased content and ideas</li>
                        <li>Analyzing writing patterns and style similarities</li>
                        <li>Cross-referencing with extensive document databases</li>
                    </ul>
                    <div class="credit-notice">
                        <img class="icon-nav" src="../icons/credit.png" />
                        <span>Requires 2 scan credits</span>
                    </div>
                    <button id="aiScanButton" class="ai-scan-button">
                        <img class="icon-nav" src="../icons/ai-scan.png" />
                        Start AI Analysis
                    </button>
                </div>
                
                <div id="aiScanResults" class="ai-scan-results" style="display: none;">
                    <!-- Analysis Progress Indicator -->
                    <div id="analysisProgress" class="analysis-progress">
                        <div class="progress-bar">
                            <div id="progressFill" class="progress-fill"></div>
                        </div>
                        <p id="analysisStatus">Processing document...</p>
                    </div>
                
                    <!-- Summary Cards -->
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="card-icon"><img class="icon-nav2" src="../icons/brain.png" /></div>
                            <div class="card-info">
                                <h4>AI Confidence Score</h4>
                                <h2 class="card-value-ai">98%</h2>
                                <div class="tooltip-icon" data-tooltip="Overall AI confidence in document similarity matches">?</div>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><img class="icon-nav2" src="../icons/semantic.png" /></div>
                            <div class="card-info">
                                <h4>Semantic Similarity</h4>
                                <h2 class="card-value-semantic">95%</h2>
                                <div class="tooltip-icon" data-tooltip="How similar the meaning and context of content is">?</div>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="card-icon"><img class="icon-nav" src="../icons/pattern.png" /></div>
                            <div class="card-info">
                                <h4>Pattern Match</h4>
                                <h2 class="card-value-pattern">92%</h2>
                                <div class="tooltip-icon" data-tooltip="Similar writing patterns, structure and style">?</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Filter Controls -->
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label for="matchTypeFilter">Filter by:</label>
                            <select id="matchTypeFilter" class="filter-select">
                                <option value="all">All match types</option>
                                <option value="semantic">Semantic</option>
                                <option value="pattern">Pattern</option>
                                <option value="context">Context</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="sortResults">Sort by:</label>
                            <select id="sortResults" class="filter-select">
                                <option value="confidence">Confidence (High-Low)</option>
                                <option value="score">Match Score (High-Low)</option>
                                <option value="name">Document Name (A-Z)</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Document Matches Table -->
                    <table class="document-list">
                        <thead>
                            <tr>
                                <th width="30"></th>
                                <th width="40"></th>
                                <th>Document Name</th>
                                <th>AI Confidence</th>
                                <th>Similarity Type</th>
                                <th>Match Score</th>
                                <th width="120">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="aiMatchesBody">
                            <!-- Table content will be populated by JavaScript -->
                        </tbody>
                    </table>
                    
                    <!-- View More Button -->
                    <div class="view-more-container">
                        <button id="viewMoreMatches" class="view-more-button">
                            <img class="icon-nav" src="../icons/plus.png" />
                            View More Matches
                        </button>
                    </div>
                    
                    <!-- Export Results Button -->
                    <div class="export-container">
                        <button id="exportResults" class="export-button">
                            <img class="icon-nav" src="../icons/export.png" />
                            Export Analysis
                        </button>
                    </div>
                </div>
                
                <!-- Detailed Comparison View -->
                <div id="comparisonView" class="comparison-view" style="display: none;">
                    <div class="comparison-header">
                        <button id="backToResults" class="back-button">
                            <img class="icon-nav" src="../icons/back.png" />
                            Back to Results
                        </button>
                        <h3>Document Comparison</h3>
                    </div>
                    <div class="comparison-container">
                        <div class="document-panel">
                            <h4>Your Document</h4>
                            <div id="originalDocument" class="document-content"></div>
                        </div>
                        <div class="document-panel">
                            <h4 id="comparedDocName">Compared Document</h4>
                            <div id="comparedDocument" class="document-content"></div>
                        </div>
                    </div>
                    <div class="similarity-stats">
                        <div class="stat-item">
                            <span class="stat-label">Overall Match:</span>
                            <span id="overallMatch" class="stat-value">95%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Similar Paragraphs:</span>
                            <span id="similarParagraphs" class="stat-value">12/15</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Key Phrases Matched:</span>
                            <span id="keyPhrases" class="stat-value">28</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function simulateAnalysisProgress() {
    const progressFill = document.getElementById('progressFill');
    const analysisStatus = document.getElementById('analysisStatus');
    const statuses = [
        'Analyzing document structure...',
        'Extracting key phrases...',
        'Performing semantic analysis...',
        'Matching writing patterns...',
        'Cross-referencing database...',
        'Generating similarity scores...'
    ];

    for (let i = 0; i < statuses.length; i++) {
        analysisStatus.textContent = statuses[i];
        const progress = (i + 1) * (100 / statuses.length);
        progressFill.style.width = `${progress}%`;
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    analysisStatus.textContent = 'Analysis complete!';
    progressFill.style.width = '100%';
    await new Promise(resolve => setTimeout(resolve, 400));
}

// Generate AI matches
function generateAIMatches() {
    const matches = [
        { id: 'doc1', filename: 'research_paper_v2.pdf', confidence: 98, type: 'Semantic', score: 95, icon: 'pdf' },
        { id: 'doc2', filename: 'thesis_draft.docx', confidence: 92, type: 'Pattern', score: 88, icon: 'word' },
        { id: 'doc3', filename: 'literature_review.txt', confidence: 85, type: 'Context', score: 82, icon: 'text' },
        { id: 'doc4', filename: 'project_proposal.pdf', confidence: 78, type: 'Semantic', score: 75, icon: 'pdf' },
        { id: 'doc5', filename: 'meeting_notes.docx', confidence: 72, type: 'Pattern', score: 70, icon: 'word' }
    ];

    let html = '';
    matches.forEach(match => {
        const confidenceClass = match.confidence > 90 ? 'high-match' : (match.confidence > 75 ? 'medium-match' : 'low-match');

        html += `
            <tr data-type="${match.type.toLowerCase()}" data-confidence="${match.confidence}" data-name="${match.filename}">
                <td><div class="bookmark-container"><button class="bookmark-btn" data-docid="${match.id}"></button></div></td>
                <td><img class="doc-icon" src="../icons/${match.icon}.png" alt="${match.icon}" /></td>
                <td>${match.filename}</td>
                <td><span class="confidence-badge ${confidenceClass}">${match.confidence}%</span></td>
                <td>${match.type}</td>
                <td>${match.score}%</td>
                <td>
                    <div class="action-buttons">
                        <button class="compare-btn" data-docid="${match.id}">
                            <img class="icon-nav-sm" src="../icons/compare.png" />
                            Compare
                        </button>
                        <button class="view-btn" data-docid="${match.id}">
                            <img class="icon-nav-sm" src="../icons/view.png" />
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    return html;
}

function filterAndSortMatches() {
    const filterValue = document.getElementById('matchTypeFilter').value;
    const sortValue = document.getElementById('sortResults').value;
    const rows = document.querySelectorAll('#aiMatchesBody tr');

    // Convert NodeList to Array for sorting
    const rowsArray = Array.from(rows);

    // Filter rows
    rowsArray.forEach(row => {
        if (filterValue === 'all' || row.dataset.type === filterValue) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Sort rows
    rowsArray.sort((a, b) => {
        if (sortValue === 'confidence') {
            return parseInt(b.dataset.confidence) - parseInt(a.dataset.confidence);
        } else if (sortValue === 'score') {
            return parseInt(b.dataset.score) - parseInt(a.dataset.score);
        } else if (sortValue === 'name') {
            return a.dataset.name.localeCompare(b.dataset.name);
        }
    });

    // Reinsert sorted rows
    const tbody = document.getElementById('aiMatchesBody');
    rowsArray.forEach(row => tbody.appendChild(row));
}
async function fetchAndDisplayComparison(originalDocId, compareId) {
    try {
        // Show loading state
        const resultsContainer = document.getElementById('aiScanResults');
        const comparisonContainer = document.getElementById('comparisonView');

        resultsContainer.style.display = 'none';
        comparisonContainer.innerHTML = '<div class="loading">Loading comparison data...</div>';
        comparisonContainer.style.display = 'block';

        // Make API call to get comparison data
        const response = await fetch(`http://localhost:3000/api/ai/compare/${originalDocId}/${compareId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch comparison data');
        }

        const comparisonData = await response.json();

        // Build the comparison view
        renderComparisonView(comparisonData);

    } catch (error) {
        console.error('Comparison error:', error);
        document.getElementById('comparisonView').innerHTML = `
            <div class="error-message">
                <h3>Error Loading Comparison</h3>
                <p>${error.message}</p>
                <button id="backToResults" class="back-button">
                    <img class="icon-nav" src="../icons/back.png" />
                    Back to Results
                </button>
            </div>
        `;
    }
}
function renderComparisonView(data) {
    const comparisonView = document.getElementById('comparisonView');

    // Validate data structure
    if (!data || !data.originalDocument || !data.comparedDocument) {
        comparisonView.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Comparison</h3>
                <p>Invalid comparison data received</p>
                <button id="backToResults" class="back-button">
                    <img class="icon-nav" src="../icons/back.png" />
                    Back to Results
                </button>
            </div>
        `;
        return;
    }

    // Calculate similarity statistics
    const totalParagraphs = data.originalDocument.paragraphs.length;
    const similarParagraphs = data.originalDocument.paragraphs.filter(p => p.similar).length;
    const overallMatch = Math.round((similarParagraphs / totalParagraphs) * 100);

    comparisonView.innerHTML = `
        <div class="comparison-header">
            <button id="backToResults" class="back-button">
                <img class="icon-nav" src="../icons/back.png" />
                Back to Results
            </button>
            <h3>Document Comparison</h3>
        </div>
        <div class="comparison-container">
            <div class="document-panel">
                <h4>Your Document</h4>
                <div id="originalDocument" class="document-content">
                    ${data.originalDocument.paragraphs.map(para =>
        `<p${para.similar ? ' class="similar"' : ''}>${para.text}</p>`
    ).join('')}
                </div>
            </div>
            <div class="document-panel">
                <h4 id="comparedDocName">${data.comparedDocument.filename}</h4>
                <div id="comparedDocument" class="document-content">
                    ${data.comparedDocument.paragraphs.map(para =>
        `<p${para.similar ? ' class="similar"' : ''}>${para.text}</p>`
    ).join('')}
                </div>
            </div>
        </div>
        <div class="similarity-stats">
            <div class="stat-item">
                <span class="stat-label">Overall Match:</span>
                <span id="overallMatch" class="stat-value">${overallMatch}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Similar Paragraphs:</span>
                <span id="similarParagraphs" class="stat-value">${similarParagraphs}/${totalParagraphs}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Key Phrases Matched:</span>
                <span id="keyPhrases" class="stat-value">${similarParagraphs}</span>
            </div>
        </div>
    `;
}
function renderDocumentList(documents) {
    const documentListEl = document.getElementById('documentList');

    documentListEl.innerHTML = documents.map(doc => `
      <div class="document-item">
        <div class="document-info">
          <span class="document-name">${doc.filename}</span>
          <span class="similarity-score">${doc.similarityScore}% Match</span>
        </div>
        <button class="compare-btn" data-docid="${doc.originalId}" data-compareid="${doc.id}">
          Compare
        </button>
      </div>
    `).join('');
}
// Show comparison view
function showComparisonView(docId) {
    // Hide results and show comparison
    document.getElementById('aiScanResults').style.display = 'none';
    document.getElementById('comparisonView').style.display = 'block';

    // Sample data - replace with actual document data fetch
    const documents = {
        doc1: {
            name: 'research_paper_v2.pdf',
            content: `<p class="similar">This research investigates the impact of artificial intelligence on modern document management systems.</p>
                     <p>The evolution of technology has drastically changed how organizations handle documentation.</p>
                     <p class="similar">Recent advancements in natural language processing have enabled semantic understanding of document content.</p>
                     <p class="similar">Our analysis shows a 67% improvement in document retrieval accuracy when using AI-powered systems.</p>`
        },
        doc2: {
            name: 'thesis_draft.docx',
            content: `<p>Document management has evolved significantly in the digital era.</p>
                     <p class="similar">This thesis examines how artificial intelligence is revolutionizing document management systems.</p>
                     <p>Traditional methods relied on metadata and basic search functions.</p>
                     <p class="similar">Modern NLP techniques now allow for deeper semantic understanding of document contents.</p>
                     <p>The results demonstrate a notable improvement in retrieval accuracy with AI implementation.</p>`
        }
    };

    // Set document name
    document.getElementById('comparedDocName').textContent = documents[docId].name;

    // Set document contents with highlighted similarities
    document.getElementById('originalDocument').innerHTML = documents.doc1.content;
    document.getElementById('comparedDocument').innerHTML = documents[docId].content;

    // Update similarity stats based on the selected document
    document.getElementById('overallMatch').textContent = docId === 'doc1' ? '95%' : '88%';
    document.getElementById('similarParagraphs').textContent = docId === 'doc1' ? '3/4' : '2/5';
    document.getElementById('keyPhrases').textContent = docId === 'doc1' ? '28' : '21';
}

// Export analysis results
function exportAnalysisResults() {
    showNotification('Analysis results exported successfully.', 'success');
    // Actual export functionality would go here
}

// Load more matches
function loadMoreMatches() {
    const moreMatches = [
        { id: 'doc6', filename: 'conference_abstract.pdf', confidence: 68, type: 'Context', score: 65, icon: 'pdf' },
        { id: 'doc7', filename: 'reference_document.txt', confidence: 64, type: 'Semantic', score: 62, icon: 'text' },
        { id: 'doc8', filename: 'related_study.docx', confidence: 58, type: 'Pattern', score: 55, icon: 'word' }
    ];

    let html = '';
    moreMatches.forEach(match => {
        const confidenceClass = match.confidence > 90 ? 'high-match' : (match.confidence > 75 ? 'medium-match' : 'low-match');

        html += `
            <tr data-type="${match.type.toLowerCase()}" data-confidence="${match.confidence}" data-name="${match.filename}">
                <td><img class="doc-icon" src="../icons/${match.icon}.png" alt="${match.icon}" /></td>
                <td>${match.filename}</td>
                <td><span class="confidence-badge ${confidenceClass}">${match.confidence}%</span></td>
                <td>${match.type}</td>
                <td>${match.score}%</td>
                <td>
                    <div class="action-buttons">
                        <button class="compare-btn" data-docid="${match.id}">
                            <img class="icon-nav-sm" src="../icons/compare.png" />
                            Compare
                        </button>
                        <button class="view-btn" data-docid="${match.id}">
                            <img class="icon-nav-sm" src="../icons/view.png" />
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    document.getElementById('aiMatchesBody').innerHTML += html;

    // Hide view more button after showing all results
    document.getElementById('viewMoreMatches').style.display = 'none';

    // Apply current filters to new rows
    filterAndSortMatches();
}

// Toggle bookmark
function toggleBookmark(docId, button) {
    const isBookmarked = button.textContent === 'â˜…';
    button.textContent = isBookmarked ? 'â˜†' : 'â˜…';
    button.classList.toggle('bookmarked');

    showNotification(
        isBookmarked ? 'Document removed from bookmarks.' : 'Document added to bookmarks.',
        'success'
    );
}

// Show notification
function showNotification(message, type) {
    // Check if notification container exists, if not create it
    let notifContainer = document.querySelector('.notification-container');
    if (!notifContainer) {
        notifContainer = document.createElement('div');
        notifContainer.className = 'notification-container';
        document.body.appendChild(notifContainer);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add to container
    notifContainer.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Show tooltip
function showTooltip(element) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = element.dataset.tooltip;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;

    document.body.appendChild(tooltip);
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) tooltip.remove();
}

// // Initialize
// document.addEventListener('DOMContentLoaded', () => {
//     setupAIScanEvents();
// });

//to here

// Add this to your existing event listeners


// function generateAIMatches() {
//     const matches = [
//         { filename: 'document1.pdf', confidence: 98, type: 'Semantic', score: 95 },
//         { filename: 'document2.pdf', confidence: 92, type: 'Pattern', score: 88 },
//         { filename: 'document3.pdf', confidence: 85, type: 'Context', score: 82 }
//     ];

//     return matches.map(match => `
//         <tr class="doc-row">
//             <td><input type="checkbox" class="doc-checkbox"></td>
//             <td><div class="doc-icon">ðŸ“„</div></td>
//             <td>
//                 <div class="doc-name">${match.filename}</div>
//                 <div class="doc-meta">AI Analyzed</div>
//             </td>
//             <td>${match.confidence}%</td>
//             <td><span class="status-badge match">${match.type}</span></td>
//             <td>${match.score}%</td>
//             <td><button class="view-btn">View</button></td>
//         </tr>
//     `).join('');
// }

function createAnalysisTab(fileDetails) {
    // Calculate statistics
    const avgSimilarity = fileDetails.matches.reduce((acc, match) =>
        acc + parseFloat(match.avgSimilarity), 0) / fileDetails.matches.length;
    
    const highestMatch = Math.max(...fileDetails.matches.map(m => parseFloat(m.avgSimilarity)));
    const lowestMatch = Math.min(...fileDetails.matches.map(m => parseFloat(m.avgSimilarity)));
    
    // Count by similarity range
    const highMatches = fileDetails.matches.filter(m => parseFloat(m.avgSimilarity) >= 75).length;
    const mediumMatches = fileDetails.matches.filter(m => parseFloat(m.avgSimilarity) >= 40 && parseFloat(m.avgSimilarity) < 75).length;
    const lowMatches = fileDetails.matches.filter(m => parseFloat(m.avgSimilarity) < 40).length;
    
    // Calculate word frequency stats if available
    const wordFreqAvg = fileDetails.matches.reduce((acc, match) => 
        acc + (parseFloat(match.wordFrequencySimilarity) || 0), 0) / fileDetails.matches.length;
    
    // Calculate Levenshtein stats if available
    const levenshteinAvg = fileDetails.matches.reduce((acc, match) => 
        acc + (parseFloat(match.levenshteinSimilarity) || 0), 0) / fileDetails.matches.length;
    
    // Prepare chart data
    const chartData = [highMatches, mediumMatches, lowMatches];
    
    return `
        <div class="tab-content analysis-tab">
            <!-- Main Stats Section -->
            <div class="analysis-header">
                <h2>Document Analysis Results</h2>
                <div class="analysis-timestamp">Analysis completed on ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
            </div>
            
            <!-- Key Metrics Cards -->
            <div class="metrics-container">
                <div class="metric-card primary">
                    <div class="metric-value">${avgSimilarity.toFixed(1)}%</div>
                    <div class="metric-label">Average Similarity</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${fileDetails.matches.length}</div>
                    <div class="metric-label">Total Matches</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${highestMatch.toFixed(1)}%</div>
                    <div class="metric-label">Highest Match</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${wordFreqAvg.toFixed(1)}%</div>
                    <div class="metric-label">Word Frequency Score</div>
                </div>
            </div>
            
            <!-- Visual Charts Section -->
            <div class="charts-container">
                <div class="chart-card">
                    <h3>Match Distribution</h3>
                    <div class="chart-wrapper">
                        <div class="donut-chart">
                            <svg viewBox="0 0 36 36" class="circular-chart">
                                <!-- Donut chart segments -->
                                <path class="circle high-match" 
                                    stroke-dasharray="${(highMatches/fileDetails.matches.length)*100} 100"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path class="circle medium-match" 
                                    stroke-dasharray="${(mediumMatches/fileDetails.matches.length)*100} 100"
                                    stroke-dashoffset="${-(highMatches/fileDetails.matches.length)*100}"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path class="circle low-match" 
                                    stroke-dasharray="${(lowMatches/fileDetails.matches.length)*100} 100" 
                                    stroke-dashoffset="${-((highMatches+mediumMatches)/fileDetails.matches.length)*100}"
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <text x="18" y="20.35" class="percentage">${avgSimilarity.toFixed(0)}%</text>
                            </svg>
                        </div>
                        <div class="chart-legend">
                            <div class="legend-item">
                                <span class="legend-color high-match"></span>
                                <span class="legend-label">High Matches (${highMatches})</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color medium-match"></span>
                                <span class="legend-label">Medium Matches (${mediumMatches})</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color low-match"></span>
                                <span class="legend-label">Low Matches (${lowMatches})</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="chart-card">
                    <h3>Similarity Metrics</h3>
                    <div class="bar-chart-container">
                        <div class="bar-chart">
                            <div class="bar-item">
                                <div class="bar-label">Average</div>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${avgSimilarity}%"></div>
                                </div>
                                <div class="bar-value">${avgSimilarity.toFixed(1)}%</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Word Freq</div>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${wordFreqAvg}%"></div>
                                </div>
                                <div class="bar-value">${wordFreqAvg.toFixed(1)}%</div>
                            </div>
                            <div class="bar-item">
                                <div class="bar-label">Levenshtein</div>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width: ${levenshteinAvg}%"></div>
                                </div>
                                <div class="bar-value">${levenshteinAvg.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Detailed Stats Section -->
            <div class="statistics-section">
                <h3>Detailed Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-title">Match Range</div>
                        <div class="stat-content">
                            <div class="range-bar">
                                <span class="range-min">${lowestMatch.toFixed(1)}%</span>
                                <div class="range-track">
                                    <div class="range-indicator" style="left: ${(avgSimilarity-lowestMatch)/(highestMatch-lowestMatch)*100}%"></div>
                                </div>
                                <span class="range-max">${highestMatch.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-box">
                        <div class="stat-title">Match Breakdown</div>
                        <div class="stat-content breakdown-stats">
                            <div class="breakdown-item">
                                <span class="breakdown-label">High Match (75%+):</span>
                                <span class="breakdown-value">${highMatches}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Medium Match (40-74%):</span>
                                <span class="breakdown-value">${mediumMatches}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Low Match (<40%):</span>
                                <span class="breakdown-value">${lowMatches}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-box full-width">
                        <div class="stat-title">Comparison by Document Type</div>
                        <div class="stat-content">
                            <table class="comparison-table">
                                <thead>
                                    <tr>
                                        <th>Document Type</th>
                                        <th>Count</th>
                                        <th>Avg. Similarity</th>
                                        <th>Highest Match</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Text Files</td>
                                        <td>${fileDetails.matches.filter(m => m.filename.endsWith('.txt')).length}</td>
                                        <td>${calculateAvgByType(fileDetails.matches, '.txt')}%</td>
                                        <td>${calculateMaxByType(fileDetails.matches, '.txt')}%</td>
                                    </tr>
                                    <tr>
                                        <td>PDF Documents</td>
                                        <td>${fileDetails.matches.filter(m => m.filename.endsWith('.pdf')).length}</td>
                                        <td>${calculateAvgByType(fileDetails.matches, '.pdf')}%</td>
                                        <td>${calculateMaxByType(fileDetails.matches, '.pdf')}%</td>
                                    </tr>
                                    <tr>
                                        <td>Word Documents</td>
                                        <td>${fileDetails.matches.filter(m => m.filename.endsWith('.docx') || m.filename.endsWith('.doc')).length}</td>
                                        <td>${calculateAvgByType(fileDetails.matches, ['.docx', '.doc'])}%</td>
                                        <td>${calculateMaxByType(fileDetails.matches, ['.docx', '.doc'])}%</td>
                                    </tr>
                                    <tr>
                                        <td>Other Formats</td>
                                        <td>${fileDetails.matches.filter(m => !m.filename.endsWith('.txt') && !m.filename.endsWith('.pdf') && !m.filename.endsWith('.docx') && !m.filename.endsWith('.doc')).length}</td>
                                        <td>${calculateAvgByOtherTypes(fileDetails.matches)}%</td>
                                        <td>${calculateMaxByOtherTypes(fileDetails.matches)}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Export & Actions Section -->
            <div class="analysis-actions">
                <button class="action-button export-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export Analysis Report
                </button>
                <button class="action-button detail-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    View Detailed Breakdown
                </button>
                <button class="action-button ai-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                        <path d="M12 8v8"></path>
                        <path d="M8 12h8"></path>
                    </svg>
                    Get AI Insights
                </button>
            </div>
        </div>
    `;
}

// Helper functions for document type statistics
function calculateAvgByType(matches, fileExtensions) {
    const filteredMatches = Array.isArray(fileExtensions)
        ? matches.filter(m => fileExtensions.some(ext => m.filename.endsWith(ext)))
        : matches.filter(m => m.filename.endsWith(fileExtensions));
    
    if (filteredMatches.length === 0) return "0.0";
    
    const avg = filteredMatches.reduce((acc, match) => 
        acc + parseFloat(match.avgSimilarity), 0) / filteredMatches.length;
    
    return avg.toFixed(1);
}

function calculateMaxByType(matches, fileExtensions) {
    const filteredMatches = Array.isArray(fileExtensions)
        ? matches.filter(m => fileExtensions.some(ext => m.filename.endsWith(ext)))
        : matches.filter(m => m.filename.endsWith(fileExtensions));
    
    if (filteredMatches.length === 0) return "0.0";
    
    const max = Math.max(...filteredMatches.map(m => parseFloat(m.avgSimilarity)));
    
    return max.toFixed(1);
}

function calculateAvgByOtherTypes(matches) {
    const filteredMatches = matches.filter(m => 
        !m.filename.endsWith('.txt') && 
        !m.filename.endsWith('.pdf') && 
        !m.filename.endsWith('.docx') && 
        !m.filename.endsWith('.doc'));
    
    if (filteredMatches.length === 0) return "0.0";
    
    const avg = filteredMatches.reduce((acc, match) => 
        acc + parseFloat(match.avgSimilarity), 0) / filteredMatches.length;
    
    return avg.toFixed(1);
}

function calculateMaxByOtherTypes(matches) {
    const filteredMatches = matches.filter(m => 
        !m.filename.endsWith('.txt') && 
        !m.filename.endsWith('.pdf') && 
        !m.filename.endsWith('.docx') && 
        !m.filename.endsWith('.doc'));
    
    if (filteredMatches.length === 0) return "0.0";
    
    const max = Math.max(...filteredMatches.map(m => parseFloat(m.avgSimilarity)));
    
    return max.toFixed(1);
}
function createMatchesTable(matches) {
    return `
        <table class="document-list">
            <thead>
                <tr>
                    <th width="30"></th>
                    <th width="40"></th>
                    <th>Document Name</th>
                    <th>Scan Date</th>
                    <th>Status</th>
                    <th>Match Rate</th>
                    <th width="80">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${matches.map(match => {
        const statusClass = getStatusClass(match.avgSimilarity);
        const statusText = getStatusText(match.avgSimilarity);
        return `
                        <tr class="doc-row">
                            <td><input type="checkbox" class="doc-checkbox"></td>
                            <td><div class="doc-icon"> 	
📄</div></td>
                            <td>
                                <div class="doc-name">${match.filename}</div>
                                <div class="doc-meta">Similarity Match</div>
                            </td>
                            <td>${new Date().toLocaleDateString()}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${parseFloat(match.avgSimilarity).toFixed(2)}%</td>
                            <td><button class="view-btn">View</button></td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;
}
