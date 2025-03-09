// authContext.js
class AuthContext {
    constructor() {
      this.user = null;
      this.initializeContext();
      this.tokenRefreshInterval = null;
    }
  
    initializeContext() {
      // Check if user data exists in sessionStorage
      const storedUser = sessionStorage.getItem('userContext');
      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
          // Start token verification when context is initialized
          this.startTokenVerification();
        } catch (error) {
          console.error('Error parsing user data:', error);
          this.clearContext();
        }
      }
    }
  
    // Set user data after login
    login(userData, accessToken) {
      this.user = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'user',
          credits: userData.credits || 20,
          accessToken: accessToken // Ensure it's defined
      };
      
      // Use JSON.stringify directly, not as a property of this.user
      // alert(JSON.stringify(this.user));
      
      console.log("User data saved:", this.user); // Debug

      sessionStorage.setItem('userContext', JSON.stringify(this.user));
      
      // Start token verification after login
      this.startTokenVerification();
    }
    
    // Start token verification process
    startTokenVerification() {
      // Clear any existing interval
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
      }
      
      // Verify token immediately
      this.verifyToken();
      
      // Set up interval to verify token every 5 minutes (300000 ms)
      // This is less than the 15-minute expiration to ensure we refresh before expiry
      this.tokenRefreshInterval = setInterval(() => {
        this.verifyToken();
      }, 300000);
    }
    
    // Verify token and refresh if needed
    async verifyToken() {
      if (!this.user || !this.user.accessToken) return;
      
      try {
        const response = await fetch('http://localhost:3000/api/auth/verify', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.user.accessToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // If token is refreshed, update it
          if (data.accessToken) {
            this.user.accessToken = data.accessToken;
            sessionStorage.setItem('userContext', JSON.stringify(this.user));
            console.log('Token refreshed successfully');
          }
        } else {
          // If verification fails, user might need to login again
          console.error('Token verification failed');
          
          // If response is 401 (Unauthorized), token is invalid or expired
          if (response.status === 401) {
            this.logout();
          }
        }
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }
  
    // Logout user
    logout() {
      // Clear token verification interval
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
        this.tokenRefreshInterval = null;
      }
      
      this.clearContext();
      // Redirect to login page
      window.location.href = '/';
    }
  
    // Clear user context
    clearContext() {
      this.user = null;
      sessionStorage.removeItem('userContext');
    }
  
    // Check if user is authenticated
    isAuthenticated() {
      console.log("Checking authentication status:", !!this.user)
      return !!this.user;
    }
  
    // Get current user
    getUser() {
      return this.user;
    }
  
    // Get user role
    getUserRole() {
      return this.user ? this.user.role : null;
    }
  
    // Get user credits
    getUserCredits() {
      return this.user ? this.user.credits : 0;
    }
  
    // Deduct credits
    deductCredits(amount = 1) {
      if (this.user && this.user.credits >= amount) {
        this.user.credits -= amount;
        sessionStorage.setItem('userContext', JSON.stringify(this.user));
        return true;
      }
      return false;
    }
}
  
// Create a singleton instance
const authContext = new AuthContext();
export default authContext;