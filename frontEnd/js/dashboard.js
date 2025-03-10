// dashboard.js
import AuthContext from './authContext.js';
import { protectRoute } from './routeGuard.js';

// Protect the route
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authenticated
  if (!protectRoute()) {
    return; // Route protection will handle redirection
  }

  // Verify token immediately when dashboard loads
  await AuthContext.verifyToken();

  // Get user from context
  const user = AuthContext.getUser();

  // Update user info in dashboard
  if (user) {
    // Example: Update user name
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = user.name;
    }

    // Example: Display user credits
    const userCreditsElement = document.getElementById('user-credits');
    if (userCreditsElement) {
      userCreditsElement.textContent = `Credits: ${AuthContext.getUserCredits()}`;
    }
  }

  // Logout functionality
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        const response = await fetch('https://docscan-ai.onrender.com/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          // Clear context and redirect
          AuthContext.logout();
        } else {
          throw new Error('Logout failed');
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout');
      }
    });
  }
});

// Credit request functionality
document.addEventListener('DOMContentLoaded', function() {
    // Show credit request modal
    document.getElementById('requestCreditsBtn').addEventListener('click', function() {
        document.getElementById('requestCreditsModal').style.display = 'flex';
    });
    
    // Hide credit request modal on cancel
    document.getElementById('cancelCreditRequest').addEventListener('click', function() {
        document.getElementById('requestCreditsModal').style.display = 'none';
    });
    
    // Submit credit request
    document.querySelector('#requestCreditsModal .btn-submit').addEventListener('click', submitCreditRequest);
    
    // Update credit info in sidebar
    updateCreditInfo();
});

// Submit credit request to API
function submitCreditRequest() {
    const creditsInput = document.querySelector('#requestCreditsModal .form-input');
    const reasonInput = document.querySelector('#requestCreditsModal .form-textarea');
    
    const requestedCredits = parseInt(creditsInput.value);
    const reason = reasonInput.value.trim();
    
    // Validate inputs
    if (isNaN(requestedCredits) || requestedCredits <= 0 || requestedCredits > 20) {
        showNotification('Please enter a valid number of credits (1-20)', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Please provide a reason for your request', 'error');
        return;
    }
    
    // Get user context from session storage
    const userContextStr = sessionStorage.getItem('userContext');
    if (!userContextStr) {
        showNotification('Authentication error. Please log in again.', 'error');
        return;
    }
    
    try {
        const userContext = JSON.parse(userContextStr);
        const token = userContext.accessToken;
        
        // Disable submit button to prevent multiple submissions
        const submitBtn = document.querySelector('#requestCreditsModal .btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        // Send request to API
        fetch('https://docscan-ai.onrender.com/api/credits/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                requestedAmount: requestedCredits,
                reason: reason
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Credit request submitted successfully', 'success');
                
                // Reset form and close modal
                creditsInput.value = 20;
                reasonInput.value = '';
                document.getElementById('requestCreditsModal').style.display = 'none';
                
                // Update stats to show pending request
                updatePendingRequestsCount(data.pendingRequests);
            } else {
                showNotification(data.error || 'Failed to submit request', 'error');
            }
        })
        .catch(error => {
            console.error('Error submitting credit request:', error);
            showNotification('An error occurred. Please try again.', 'error');
        })
        .finally(() => {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        });
    } catch (error) {
        console.error('Error parsing user context:', error);
        showNotification('Authentication error. Please log in again.', 'error');
    }
}

// Update credit info in sidebar
function updateCreditInfo() {
    const userContextStr = sessionStorage.getItem('userContext');
    if (!userContextStr) return;
    
    try {
        const userContext = JSON.parse(userContextStr);
        const credits = userContext.credits || 0;
        const maxCredits = 20; // Maximum credits allowed
        
        // Update credit display
        document.querySelector('.credit-label span:last-child').textContent = `${credits}/${maxCredits}`;
        
        // Update progress bar
        const percentage = (credits / maxCredits) * 100;
        document.querySelector('.credit-used').style.width = `${percentage}%`;
        
        // Update remaining credits text
        document.querySelector('.credit-text span:first-child').textContent = `${credits} credits remaining`;
    } catch (error) {
        console.error('Error updating credit info:', error);
    }
}

// Update pending requests count in stats
function updatePendingRequestsCount(count) {
    const pendingRequestsValue = document.querySelector('.stats-grid .stat-card:nth-child(4) .stat-value');
    if (pendingRequestsValue) {
        pendingRequestsValue.textContent = count;
    }
}
// Add this function to check for credit reset
function checkCreditReset() {
    const userContextStr = sessionStorage.getItem('userContext');
    if (!userContextStr) return;
    
    try {
        const userContext = JSON.parse(userContextStr);
        const token = userContext.accessToken;
        
        fetch('https://docscan-ai.onrender.com/api/credits/reset/check-reset', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // If credits were reset, update the user context
                if (data.wasReset) {
                    userContext.credits = data.credits;
                    sessionStorage.setItem('userContext', JSON.stringify(userContext));
                    showNotification('Your daily credits have been reset to 20', 'success');
                }
                
                // Update credit display
                updateCreditInfo();
            }
        })
        .catch(error => {
            console.error('Error checking credit reset:', error);
        });
    } catch (error) {
        console.error('Error parsing user context:', error);
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code
    
    // Check if credits need to be reset
    checkCreditReset();
});
// Show notification
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'success' ? '#000' : '#ff3b30';
    notification.style.color = '#fff';
    notification.style.padding = '12px 16px';
    notification.style.borderRadius = '8px';
    notification.style.marginBottom = '10px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.textContent = message;
    
    // Add to container
    container.appendChild(notification);
    
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

document.addEventListener('DOMContentLoaded', () => {
  // Modal functionality
  const requestCreditsBtn = document.getElementById('requestCreditsBtn');
  const requestCreditsModal = document.getElementById('requestCreditsModal');
  const cancelCreditRequest = document.getElementById('cancelCreditRequest');
  
  requestCreditsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    requestCreditsModal.style.display = 'flex';
  });
  
  cancelCreditRequest.addEventListener('click', () => {
    requestCreditsModal.style.display = 'none';
  });
  
  // Upload document modal functionality
  const scanDocumentCard = document.querySelector('.scan-icon').parentElement;
  const uploadDocumentModal = document.getElementById('uploadDocumentModal');
  const cancelUpload = document.getElementById('cancelUpload');
  
  scanDocumentCard.addEventListener('click', () => {
    uploadDocumentModal.style.display = 'flex';
  });
  
  cancelUpload.addEventListener('click', () => {
    uploadDocumentModal.style.display = 'none';
  });
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === requestCreditsModal) {
      requestCreditsModal.style.display = 'none';
    }
    if (e.target === uploadDocumentModal) {
      uploadDocumentModal.style.display = 'none';
    }
  });
  
  // Upload zone functionality
  const dropZone = document.getElementById('dropZone');
  
  dropZone.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt';
    fileInput.click();
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
      }
    });
  });
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-color)';
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.txt')) {
        handleFileUpload(file);
      } else {
        alert('Only .txt files are supported');
      }
    }
  });
  
  function handleFileUpload(file) {
    // Show upload status
    const uploadStatus = document.createElement('div');
    uploadStatus.textContent = `Uploading ${file.name}...`;
    dropZone.innerHTML = '';
    dropZone.appendChild(uploadStatus);
    
    // Get optional document name if provided
    const documentName = document.querySelector('#uploadDocumentModal .form-input').value || file.name;
    
    // Create FormData to send file to backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentName', documentName);
    
    console.log(formData.fileName)
  
    // Send file to backend
    fetch('https://docscan-ai.onrender.com/api/scan', {  // Update with your backend URL
      method: 'POST',
      body: formData,
      credentials: 'include',  // Include if you're using cookies
      headers: {
        'Accept': 'application/json',
        'userId': AuthContext.getUser().id
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log(data.documentId)
      
      uploadStatus.textContent = 'Scan complete!';
      
      // Add the new document to the table
      // addDocumentToTable(documentName, data.matchRate);
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        window.location.href = `/pages/scan-results.html?id=${data.documentId}&filename=${encodeURIComponent(documentName)}`;
      }, 1000);
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      uploadStatus.textContent = 'Error uploading file. Please try again.';
      uploadStatus.style.color = 'red';
    });
  }






  // function addDocumentToTable(fileName, matchRate = null) {
  //   const table = document.querySelector('.document-list tbody');
  //   const newRow = document.createElement('tr');
  //   newRow.className = 'doc-row';
    
  //   const currentDate = new Date().toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric'
  //   });
    
  //   // Use provided match rate or generate random one for demo
  //   matchRate = matchRate || Math.floor(Math.random() * 86) + 10;
  //   let statusClass, statusText;
    
  //   if (matchRate >= 75) {
  //     statusClass = 'match';
  //     statusText = 'High Match';
  //   } else if (matchRate >= 40) {
  //     statusClass = 'partial';
  //     statusText = 'Partial Match';
  //   } else {
  //     statusClass = 'no-match';
  //     statusText = 'No Match';
  //   }
    
    
  //   newRow.innerHTML = `
  //     <td><input type="checkbox" class="doc-checkbox"></td>
  //     <td>
  //       <div class="doc-icon">📄</div>
  //     </td>
  //     <td>
  //       <div class="doc-name">${fileName}</div>
  //       <div class="doc-meta">New scan · txt</div>
  //     </td>
  //     <td>${currentDate}</td>
  //     <td><span class="status-badge ${statusClass}">${statusText}</span></td>
  //     <td>${matchRate}%</td>
  //     <td>
  //       <button class="view-btn">View Results</button>
  //     </td>
  //   `;
    
  //   // Insert at the top of the table
  //   table.insertBefore(newRow, table.firstChild);
    
  //   // Update stats
  //   const scansStat = document.querySelector('.stats-grid .stat-card:first-child .stat-value');
  //   const scansRemaining = document.querySelector('.stats-grid .stat-card:first-child .stat-footer');
  //   const currentScans = parseInt(scansStat.textContent);
  //   scansStat.textContent = currentScans + 1;
    
  //   const creditsRemaining = parseInt(scansRemaining.textContent);
  //   scansRemaining.textContent = `${creditsRemaining - 1} credits remaining`;
    
  //   // Update credit bar
  //   const creditValue = document.querySelector('.credit-label span:last-child');
  //   const creditUsed = document.querySelector('.credit-used');
  //   const creditText = document.querySelector('.credit-text span:first-child');
    
  //   const [used, total] = creditValue.textContent.split('/');
  //   const newUsed = parseInt(used) + 1;
  //   const newRemaining = parseInt(total) - newUsed;
    
  //   creditValue.textContent = `${newUsed}/${total}`;
  //   creditUsed.style.width = `${(newUsed / parseInt(total)) * 100}%`;
  //   creditText.textContent = `${newRemaining} credits remaining`;
  // }
  
  // Dynamic functionality for navbar toggle
  const toggle = document.querySelector('.toggle');
  const body = document.querySelector('body');
  
  toggle.addEventListener('click', () => {
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      toggle.style.backgroundColor = '#e0e0e0';
      toggle.querySelector('::after').style.transform = 'translateX(0)';
    } else {
      body.classList.add('dark-mode');
      toggle.style.backgroundColor = 'var(--accent-color)';
      toggle.querySelector('::after').style.transform = 'translateX(14px)';
    }
  });
  
  // View Results button functionality
  const viewButtons = document.querySelectorAll('.view-btn');
  
  viewButtons.forEach(button => {
    button.addEventListener('click', function() {
      const docName = this.closest('.doc-row').querySelector('.doc-name').textContent;
      alert(`Viewing results for: ${docName}`);
      // This would typically open a detailed view page or modal
    });
  });
});

async function fetchAndDisplayDocuments() {
  const userId = AuthContext.getUser().id;
  try {
    const response = await fetch(`https://docscan-ai.onrender.com/api/documents/${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const data = await response.json();
    console.log('Response data:', data.credits); // Debug the response

      if (data.credits) {
      var used = data.credits.credits;
      const total = 20;
      used = total - used;
      const remaining = total - used;
      
      // Update AuthContext credits
      const user = AuthContext.getUser();
      user.credits = used;
      sessionStorage.setItem('userContext', JSON.stringify(user));
      
      // Update credit label
      const creditLabel = document.querySelector('.credit-label span:last-child');
      const creditText2 = document.querySelector('.stat-value');
      const creditText3 = document.querySelector('.stat-footer');
      creditText2.textContent = used;
      creditText3.textContent = `${remaining} credits remaining`;
      creditLabel.textContent = `${used}/${total}`;
      
      // Update credit bar
      const creditBar = document.querySelector('.credit-used');
      const percentage = (used / total) * 100;
      creditBar.style.width = `${percentage}%`;
      
      // Update credit text
      const creditText = document.querySelector('.credit-text span:first-child');
      creditText.textContent = `${remaining} credits remaining`;
    }

    // Ensure we're working with an array of documents
    const documents = Array.isArray(data) ? data : data.documents || [];
    
    const table = document.querySelector('.document-list tbody');
    table.innerHTML = ''; // Clear existing rows

    if (documents.length === 0) {
      // Handle empty state
      table.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center;">No documents found</td>
        </tr>
      `;
      return;
    }

    documents.forEach(doc => {
      addDocumentToTable(doc);
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    const table = document.querySelector('.document-list tbody');
    table.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center;">Error loading documents</td>
      </tr>
    `;
  }
}

function addDocumentToTable(doc) {  // Changed parameter name from 'document' to 'doc'
  console.log(doc.match_rate)
  const table = document.querySelector('.document-list tbody');
  const newRow = document.createElement('tr');
  newRow.className = 'doc-row';
  
  const uploadDate = new Date(doc.upload_date).toLocaleDateString('en-US', {  // Changed document to doc
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Convert fileSize to KB
  const fileSizeKB = Math.round(doc.fileSize / 1024);  // Changed document to doc
  
  // Get match rate from the document if available
  const matchRate = doc.match_rate ? parseFloat(doc.match_rate) : 0;  // Changed document to doc
  let statusClass, statusText;
  
  if (matchRate >= 75) {
    statusClass = 'match';
    statusText = 'High Match';
  } else if (matchRate >= 40) {
    statusClass = 'partial';
    statusText = 'Partial Match';
  } else {
    statusClass = 'no-match';
    statusText = 'No Match';
  }
  
  newRow.innerHTML = `
    <td><input type="checkbox" class="doc-checkbox"></td>
    <td>
      <div class="doc-icon">📄</div>
    </td>
    <td>
      <div class="doc-name">${doc.filename}</div>   
      <div class="doc-meta">${fileSizeKB} KB · txt</div>
    </td>
    <td>${uploadDate}</td>
    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    <td>${matchRate.toFixed(2)}%</td>
    <td>
      <button class="view-btn" data-id="${doc.id}">View Results</button>   
    </td>
  `;
  
  // Insert at the top of the table
  table.insertBefore(newRow, table.firstChild);
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplayDocuments();
  
  // Update view button functionality
  document.querySelector('.document-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('view-btn')) {
      const docId = e.target.dataset.id;
      const docName = e.target.closest('.doc-row').querySelector('.doc-name').textContent;
      window.location.href = `/pages/scan-results.html?id=${docId}&filename=${encodeURIComponent(docName)}`;
    }
  });
});