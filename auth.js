// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('roklearn_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateUI();
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login button
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showLoginModal();
        });

        // Register button
        document.getElementById('registerBtn').addEventListener('click', () => {
            this.showRegisterModal();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Login form submission
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form submission
        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    showLoginModal() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('authModal').style.display = 'block';
    }

    showRegisterModal() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('authModal').style.display = 'block';
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            // Simple password hashing (in production, use proper hashing)
            const hashedPassword = this.hashPassword(password);
            const user = await dbManager.authenticateUser(email, hashedPassword);

            if (user) {
                this.currentUser = user;
                localStorage.setItem('roklearn_current_user', JSON.stringify(user));
                this.updateUI();
                this.closeAuthModal();
                this.showSuccess('Login successful!');
                
                // Clear form
                document.getElementById('loginFormElement').reset();
            } else {
                this.showError('Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!name || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        try {
            // Simple password hashing (in production, use proper hashing)
            const hashedPassword = this.hashPassword(password);
            const result = await dbManager.createUser(name, email, hashedPassword);

            if (result.success) {
                this.showSuccess('Registration successful! Please login.');
                this.showLoginForm();
                
                // Clear form
                document.getElementById('registerFormElement').reset();
            } else {
                this.showError(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please try again.');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('roklearn_current_user');
        this.updateUI();
        this.showSuccess('Logged out successfully!');
        
        // Redirect to home if on write page
        if (blogManager && blogManager.currentSection === 'write') {
            blogManager.showSection('home');
            blogManager.updateActiveNavLink(document.querySelector('.nav-link[href="#home"]'));
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const writeLink = document.querySelector('.nav-link[href="#write"]');

        if (this.currentUser) {
            // User is logged in
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            userName.textContent = this.currentUser.name;
            writeLink.style.display = 'inline-block';
        } else {
            // User is not logged in
            loginBtn.style.display = 'inline-block';
            registerBtn.style.display = 'inline-block';
            userMenu.style.display = 'none';
            writeLink.style.display = 'none';
        }
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
    }

    showLoginForm() {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    }

    showRegisterForm() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }

    // Utility methods
    hashPassword(password) {
        // Simple hash function (in production, use bcrypt or similar)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        // Create or update error message
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        // Create or update success message
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message ${type}`;
        messageDiv.textContent = message;

        // Add to page
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Global functions for HTML onclick handlers
function closeAuthModal() {
    authManager.closeAuthModal();
}

function showLoginForm() {
    authManager.showLoginForm();
}

function showRegisterForm() {
    authManager.showRegisterForm();
}

// Initialize auth manager when DOM is loaded
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});