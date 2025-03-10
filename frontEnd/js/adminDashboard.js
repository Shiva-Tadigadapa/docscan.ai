document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    checkAdminAuth();
    
    // Load dashboard data
    loadDashboardData();
    
    // Add event listeners
    setupEventListeners();
});

// Check if user is logged in and is admin
// Check if user is logged in and is admin
function checkAdminAuth() {
    const userContextStr = sessionStorage.getItem('userContext');
    
    if (!userContextStr) {
        window.location.href = '/';
        return;
    }
    
    try {
        // Parse the JSON string to get the user context object
        const userContext = JSON.parse(userContextStr);
        
        // Extract the access token
        const token = userContext.accessToken;
        // alert(token)
        
        if (!token) {
            throw new Error('No access token found');
        }
        
        // Verify admin status
        fetch('https://docscan-ai.onrender.com/api/admin/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authorized as admin');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Auth error:', error);
            window.location.href = '/';
        });
    } catch (error) {
        console.error('Error parsing user context:', error);
        window.location.href = '/';
    }
}

// Load dashboard data
function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    fetch('https://docscan-ai.onrender.com/api/dashboard/stats', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            updateDashboardUI(data.data);
        }
    })
    .catch(error => {
        console.error('Error fetching dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    });
}

// Update dashboard UI with data
function updateDashboardUI(data) {
    // Update stats
    console.log(data)
    updateStats(data.stats);
    
    // Update pending credit requests
    updatePendingRequests(data.pendingRequests);
    
    // Update top users
    updateTopUsers(data.topUsers);
    
    // Update recent document matches
    updateRecentMatches(data.recentMatches);
}

// Update stats section
function updateStats(stats) {
    // Total Users
    document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-value').textContent = stats.totalUsers;
    document.querySelector('.stats-grid .stat-card:nth-child(1) .stat-footer').textContent = `+${stats.newUsersThisWeek} this week`;
    
    // Credit Requests
    document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-value').textContent = stats.creditRequests;
    document.querySelector('.stats-grid .stat-card:nth-child(2) .stat-footer').textContent = `${stats.todaysCreditRequests} new today`;
    
    // Total Documents
    document.querySelector('.stats-grid .stat-card:nth-child(3) .stat-value').textContent = stats.totalDocuments.toLocaleString();
    document.querySelector('.stats-grid .stat-card:nth-child(3) .stat-footer').textContent = `+${stats.newDocumentsThisWeek} this week`;
    
    // Credits Issued
    document.querySelector('.stats-grid .stat-card:nth-child(4) .stat-value').textContent = stats.totalCreditsIssued.toLocaleString();
    document.querySelector('.stats-grid .stat-card:nth-child(4) .stat-footer').textContent = `Last 30 days`;
}

// Update pending credit requests
function updatePendingRequests(requests) {
    const container = document.querySelector('.credit-requests');
    
    // Clear existing request cards (except the section title)
    const sectionTitle = container.querySelector('.section-title');
    container.innerHTML = '';
    container.appendChild(sectionTitle);
    
    // Add new request cards
    requests.forEach(request => {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        requestCard.innerHTML = `
            <div class="request-header">
                <div class="user-info">
                    <div class="user-avatar">${request.user.initials}</div>
                    <div>
                        <div class="user-name">${request.user.name}</div>
                        <div class="user-email">${request.user.email}</div>
                    </div>
                </div>
                <div class="request-date">${request.timeAgo}</div>
            </div>
            <div class="request-details">
                <span class="request-amount">Requested: ${request.requestedAmount} credits</span>
                <div class="request-reason">"${request.reason}"</div>
            </div>
            <div class="request-actions">
                <button class="btn btn-approve" data-request-id="${request.id}" data-action="approve">Approve</button>
                <button class="btn btn-deny" data-request-id="${request.id}" data-action="deny">Deny</button>
            </div>
        `;
        container.appendChild(requestCard);
    });
    
    // If no requests, show a message
    if (requests.length === 0) {
        const noRequests = document.createElement('div');
        noRequests.className = 'request-card';
        noRequests.innerHTML = `
            <div class="request-details">
                <div class="request-reason" style="text-align: center;">No pending credit requests</div>
            </div>
        `;
        container.appendChild(noRequests);
    }
    
    // Add event listeners to new buttons
    document.querySelectorAll('.btn-approve, .btn-deny').forEach(button => {
        button.addEventListener('click', handleCreditRequestAction);
    });
}

// Update top users
function updateTopUsers(users) {
    const tbody = document.querySelector('.user-list tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-avatar" style="width: 24px; height: 24px; font-size: 10px;">${user.initials}</div>
                    <div style="margin-left: 8px;">${user.name}</div>
                </div>
            </td>
            <td>${user.scansToday}</td>
            <td>${user.totalScans}</td>
            <td>${user.creditsLeft}</td>
        `;
        tbody.appendChild(row);
    });
    
    // If no users, show a message
    if (users.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center;">No user data available</td>
        `;
        tbody.appendChild(row);
    }
}

// Update recent document matches
function updateRecentMatches(matches) {
    const tbody = document.querySelector('.document-list tbody');
    tbody.innerHTML = '';
    
    matches.forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="font-weight: 500;">${match.filename}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${match.fileSize}</div>
            </td>
            <td>${match.uploadedBy}</td>
            <td>${match.uploadDate}</td>
            <td>${match.matchCount} matches</td>
            <td>${match.matchRate}%</td>
            <td>
                <button class="btn view-document-btn" data-doc-id="${match.id}" style="padding: 4px 8px; font-size: 12px;">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // If no matches, show a message
    if (matches.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" style="text-align: center;">No recent document matches</td>
        `;
        tbody.appendChild(row);
    }
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-document-btn').forEach(button => {
        button.addEventListener('click', viewDocument);
    });
}

// Handle credit request approval/denial
function handleCreditRequestAction(e) {
    const button = e.target;
    const requestId = button.dataset.requestId;
    const action = button.dataset.action;
    const status = action === 'approve' ? 'approved' : 'denied';
    
    // Disable buttons to prevent double-clicks
    const actionButtons = button.parentElement.querySelectorAll('button');
    actionButtons.forEach(btn => btn.disabled = true);
    // Send request to server
    const userContextStr = sessionStorage.getItem('userContext');
    const userContext = JSON.parse(userContextStr);
    const token = userContext.accessToken;
    
    fetch('https://docscan-ai.onrender.com/api/credits/admin/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            requestId,
            status
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to process credit request');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification(`Credit request ${status} successfully`, 'success');
            
            // Remove the card with animation
            const card = button.closest('.request-card');
            card.style.opacity = '0';
            card.style.transition = 'opacity 0.5s';
            
            setTimeout(() => {
                card.remove();
                
                // If no more cards, reload data
                if (document.querySelectorAll('.request-card').length === 0) {
                    loadDashboardData();
                }
            }, 500);
        }
    })
    .catch(error => {
        console.error('Error handling credit request:', error);
        showNotification('Failed to process credit request', 'error');
        
        // Re-enable buttons
        actionButtons.forEach(btn => btn.disabled = false);
    });
}

// View document details
function viewDocument(e) {
    const docId = e.target.dataset.docId;
    window.location.href = `/pages/document-details.html?id=${docId}`;
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    document.getElementById('logout-button')?.addEventListener('click', function() {
        sessionStorage.removeItem('userContext');
        window.location.href = '/';
    });
    
    // View all credit requests button
    document.querySelector('.credit-requests .btn-approve')?.addEventListener('click', function() {
        window.location.href = '/pages/credit-requests.html';
    });
    
    // Search documents
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('.document-list tbody tr');
            
            rows.forEach(row => {
                const filename = row.querySelector('td:first-child div:first-child').textContent.toLowerCase();
                const uploadedBy = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                
                if (filename.includes(searchTerm) || uploadedBy.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Pagination buttons
    document.querySelectorAll('.page-btn').forEach(button => {
        button.addEventListener('click', function() {
            // This would be implemented with actual pagination logic
            document.querySelectorAll('.page-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Check if notification container exists, if not create it
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'success' ? '#000' : '#ff3b30';
    notification.style.color = '#fff';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '4px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.textContent = message;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initial load
loadDashboardData();