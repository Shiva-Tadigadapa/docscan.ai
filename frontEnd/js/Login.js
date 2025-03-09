
import AuthContext from './authContext.js';
import { checkAuthStatus } from './routeGuard.js';
const API_URL = "http://localhost:3000/api/auth";


checkAuthStatus();
async function loginUser(email, password) {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        // Store user in context
        // alert(JSON.stringify(result.accessToken))
        AuthContext.login(result.user,result.accessToken);
        
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
      alert(error.message);
    }
  }

async function register(name, email, password) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  return response.json();
}

// Handle form submission
// document.getElementById("login-form").addEventListener("submit", async (e) => {
//   e.preventDefault();
//   const email = document.getElementById("login-email").value;
//   const password = document.getElementById("login-password").value;
//   console.log(email, password);

//   const result = await login(email, password);
//   alert(result.message);
// });

// Login form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
         await loginUser(email, password);
        // alert(result.message);
      });
    }
  });
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  const result = await register(name, email, password);
  alert(result.message);
});
