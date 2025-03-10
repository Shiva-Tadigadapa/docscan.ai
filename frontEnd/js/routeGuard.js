// routeGuard.js
import AuthContext from './authContext.js';

export async function protectRoute() {
  // Check if user is authenticated
  if (!AuthContext.isAuthenticated()) {
    // Redirect to login if not authenticated
    window.location.href = '/';
    return false;
  }
  
  // Verify token when protecting route
  try {
    await AuthContext.verifyToken();
    return AuthContext.isAuthenticated(); // Return authentication status after verification
  } catch (error) {
    console.error('Token verification error in route guard:', error);
    return false;
  }
}

export async function protectAdminRoute() {
  // Check if user is authenticated and is an admin
  if (!AuthContext.isAuthenticated() || AuthContext.getUserRole() !== 'admin') {
    // Redirect to login or unauthorized page
    window.location.href = '/index.html';
    return false;
  }
  
  // Verify token when protecting admin route
  try {
    await AuthContext.verifyToken();
    return AuthContext.isAuthenticated() && AuthContext.getUserRole() === 'admin';
  } catch (error) {
    console.error('Token verification error in admin route guard:', error);
    return false;
  }
}

export function checkAuthStatus() {
  const publicPages = ['/','/index.html', '/register.html'];
  const currentPath = window.location.pathname;
  
  // If on a public page and logged in, redirect based on role
  if (publicPages.includes(currentPath) && AuthContext.isAuthenticated()) {
    const userRole = AuthContext.getUserRole();
    window.location.href = userRole === 'admin' 
      ? '/pages/admin-dashboard.html' 
      : '/pages/dashboard.html';
    return false;
  }
  
  return true;
}