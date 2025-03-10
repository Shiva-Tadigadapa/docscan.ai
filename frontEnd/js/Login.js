import AuthContext from './authContext.js';
import { checkAuthStatus } from './routeGuard.js';
const API_URL = "https://docscan-ai.onrender.com/api/auth";

// Add server status check
let serverReady = false;

// Function to check if server is ready
async function checkServerStatus() {
  try {
    const response = await fetch('https://docscan-ai.onrender.com/ ', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.log('Server not ready yet:', error);
    return false;
  }
}

// Function to show server loading overlay
function showServerLoading() {
  const overlay = document.getElementById('server-loading-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

// Function to hide server loading overlay
function hideServerLoading() {
  const overlay = document.getElementById('server-loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Initialize server check
async function initServerCheck() {
  showServerLoading();
  
  // Try to connect to server
  serverReady = await checkServerStatus();
  
  if (serverReady) {
    hideServerLoading();
  } else {
    // If server not ready, start polling
    const statusInterval = setInterval(async () => {
      serverReady = await checkServerStatus();
      
      if (serverReady) {
        hideServerLoading();
        clearInterval(statusInterval);
      }
    }, 3000); // Check every 3 seconds
  }
}

// Start server check when page loads
document.addEventListener('DOMContentLoaded', initServerCheck);

checkAuthStatus();
async function loginUser(email, password) {
    try {
      // Check if server is ready
      if (!serverReady) {
        throw new Error('Server is still starting up. Please wait a moment and try again.');
      }
      
      // Show loading state on button
      const loginButton = document.querySelector('#login-form button[type="submit"]');
      if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
      }
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Store user in context
        AuthContext.login(result.user, result.accessToken);
        
        // Redirect based on role
        if (result.user.role === 'admin') {
          window.location.href = '/pages/admin-dashboard.html';
        } else {
          window.location.href = '/pages/dashboard.html';
        }
      } else {
        // Handle login error
        throw new Error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show user-friendly error for CORS or network issues
      if (error.message.includes('Failed to fetch') || error.message === 'NetworkError') {
        alert('Unable to connect to the server. Please try again later.');
      } else {
        alert(error.message);
      }
    } finally {
      // Reset button state
      const loginButton = document.querySelector('#login-form button[type="submit"]');
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
      }
    }
}

async function register(name, email, password) {
  try {
    // Show loading state on button
    const registerButton = document.querySelector('#register-form button[type="submit"]');
    if (registerButton) {
      registerButton.disabled = true;
      registerButton.textContent = 'Registering...';
    }
    
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      credentials: 'include',
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json" 
      },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }
    
    return result;
  } catch (error) {
    console.error('Registration error:', error);
    
    // Show user-friendly error for CORS or network issues
    if (error.message.includes('Failed to fetch') || error.message === 'NetworkError') {
      throw new Error('Unable to connect to the server. Please try again later.');
    }
    
    throw error;
  } finally {
    // Reset button state
    const registerButton = document.querySelector('#register-form button[type="submit"]');
    if (registerButton) {
      registerButton.disabled = false;
      registerButton.textContent = 'Register';
    }
  }
}

// Login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        await loginUser(email, password);
      });
    }
    
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;

        try {
          const result = await register(name, email, password);
          alert(result.message);
          // Redirect to login page after successful registration
          window.location.href = '/index.html';
        } catch (error) {
          alert(error.message);
        }
      });
    }
});