// --- 1. INITIALIZATION ---
// These are the *exact same* credentials from your marketplace.js
const SUPABASE_URL = 'https://eafohpvmownsqyykdcyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZm9ocHZtb3duc3F5eWtkY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzY5MTMsImV4cCI6MjA3NzY1MjkxM30.Q-sFPyYJEX1ZZBULzQ_2xIR-rGGgXZGpPGlY4viQlxE';

// Check if the supabase client library is loaded
if (!window.supabase) {
    console.error("Supabase client not loaded. Make sure to include the script tag in your HTML.");
}
const { createClient } = window.supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- 2. GET ALL HTML ELEMENTS ---
const loginModal = document.getElementById('login-modal');
const signupModal = document.getElementById('signup-modal');
const loginButton = document.getElementById('login-button');
const loginModalClose = document.getElementById('login-modal-close');
const signupModalClose = document.getElementById('signup-modal-close');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

let currentUser = null;

// --- 3. HELPER FUNCTIONS ---

/**
 * Shows a message inside a form.
 * @param {HTMLElement} form - The form element (loginForm or signupForm)
 * @param {string} message - The text to display
 * @param {boolean} [isError=true] - True for red (error), false for green (success)
 */
function showMessage(form, message, isError = true) {
    const messageEl = form.querySelector('.form-message');
    if (!messageEl) return;
    
    messageEl.textContent = message;
    messageEl.style.color = isError ? '#d9534f' : '#4CAF50';
    messageEl.style.display = 'block';
}

function clearMessage(form) {
     const messageEl = form.querySelector('.form-message');
     if (messageEl) {
        messageEl.textContent = '';
        messageEl.style.display = 'none';
     }
}

// --- 4. SIGN UP LOGIC ---

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(signupForm);

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        showMessage(signupForm, "Passwords do not match.");
        return;
    }

    try {
        // 1. Create the user in Supabase Auth
        // **IMPROVEMENT**: Pass the user's name in the 'options.data' field
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) throw error;
        
        const user = data.user;
        if (!user) throw new Error("User registration failed. Please try again.");

        // 2. Store extra user data (like name) in the 'profiles' table
        // This insert will now succeed because "Confirm email" is off
        const { error: profileError } = await _supabase
            .from('profiles')
            .insert({ 
                id: user.id, // Link to the auth user's ID
                full_name: name, 
                email: email 
            });

        if (profileError) throw profileError;

        // Success!
        showMessage(signupForm, "Account created successfully! You are logged in.", false); // Updated message

        setTimeout(() => {
            signupModal.style.display = 'none';
            signupForm.reset();
            clearMessage(signupForm);
        }, 2000);

    } catch (error) {
        console.error("Sign up error: ", error);
        showMessage(signupForm, error.message || "Could not create account.");
    }
});

// --- 5. LOGIN LOGIC ---

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage(loginForm);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // 1. Sign in with Supabase Auth
        const { error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Success! (onAuthStateChanged will handle the rest)
        showMessage(loginForm, "Login successful! Welcome back.", false);
        
        setTimeout(() => {
            loginModal.style.display = 'none';
            loginForm.reset();
            clearMessage(loginForm);
        }, 1500);

    } catch (error) {
        console.error("Login error: ", error);
        showMessage(loginForm, "Invalid email or password.");
    }
});

// --- 6. AUTH STATE LISTENER (Core Logic) ---

_supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    currentUser = user;
    
    updateNavButton(user);
    protectServiceLinks(user);
});

/**
 * Updates the "Login" button to "Logout" and vice-versa.
 */
function updateNavButton(user) {
    // We need to query the button each time, as it might be replaced
    const loginBtn = document.getElementById('login-button');
    const logoutBtn = document.getElementById('logout-button');

    if (user) {
        // User is logged in
        if (loginBtn) {
            const logoutButton = document.createElement('a');
            logoutButton.href = '#';
            logoutButton.id = 'logout-button';
            logoutButton.className = 'cta-button';
            logoutButton.style = 'padding: 0.5rem 1rem; background-color: #d9534f; border-color: #d43f3a;';
            logoutButton.textContent = 'Logout';
            
            loginBtn.replaceWith(logoutButton);

            logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await _supabase.auth.signOut();
            });
        }
    } else {
        // User is logged out
        if (logoutBtn) {
            const loginButtonElement = document.createElement('a');
            loginButtonElement.href = '#';
            loginButtonElement.id = 'login-button';
            loginButtonElement.className = 'cta-button';
            loginButtonElement.style = 'padding: 0.5rem 1rem;';
            loginButtonElement.textContent = 'Login';
            
            logoutBtn.replaceWith(loginButtonElement);

            loginButtonElement.addEventListener('click', openLoginModal);
        }
    }
}

/**
 * Adds/Removes click protection from all service links.
 * @param {object|null} user - The Supabase user object
 */
function protectServiceLinks(user) {
    // **FIXED**: This now correctly matches all links inside your "Services" folder
    const serviceLinks = document.querySelectorAll(
        '.nav-links a[href^="Services/"], a.service-card[href^="Services/"], .services-view-all a[href^="Services/"], .hero a[href^="Services/"]'
    );

    serviceLinks.forEach(link => {
        if (user) {
            // User is logged in, remove protection
            link.removeEventListener('click', showLoginPrompt);
        } else {
            // User is logged out, add protection
            link.addEventListener('click', showLoginPrompt);
        }
    });
}

/**
 * The event listener function to show the login modal.
 */
function showLoginPrompt(e) {
    e.preventDefault(); // Stop navigation
    openLoginModal();
}

// --- 7. MODAL UI LOGIC ---

function openLoginModal(e) {
    if (e) e.preventDefault();
    clearMessage(loginForm);
    clearMessage(signupForm);
    loginModal.style.display = 'flex';
}

// Initial setup for the login button
if (loginButton) {
    loginButton.addEventListener('click', openLoginModal);
}

showSignupLink.onclick = (e) => {
    e.preventDefault();
    loginModal.style.display = 'none';
    signupModal.style.display = 'flex';
};

showLoginLink.onclick = (e) => {
    e.preventDefault();
    signupModal.style.display = 'none';
    loginModal.style.display = 'flex';
};

loginModalClose.onclick = () => loginModal.style.display = 'none';
signupModalClose.onclick = () => signupModal.style.display = 'none';

window.onclick = (event) => {
    if (event.target == loginModal) loginModal.style.display = 'none';
    if (event.target == signupModal) signupModal.style.display = 'none';
};

// --- 8. INITIAL LOAD ---
// Manually check auth state on load just in case
(async () => {
    const { data: { session } } = await _supabase.auth.getSession();
    currentUser = session?.user || null;
    updateNavButton(currentUser);
    protectServiceLinks(currentUser);
})();

