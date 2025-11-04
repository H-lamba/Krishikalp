/*
 * =================================
 * AUTH GUARD SCRIPT
 * =================================
 * This script is loaded on every protected page.
 * It checks for a valid Supabase session.
 * If no session exists, it redirects to the index page.
*/

// These credentials MUST match your auth.js and marketplace.js files
// These are the *exact same* credentials from your marketplace.js
const SUPABASE_URL = 'https://eafohpvmownsqyykdcyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZm9ocHZtb3duc3F5eWtkY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzY5MTMsImV4cCI6MjA3NzY1MjkxM30.Q-sFPyYJEX1ZZBULzQ_2xIR-rGGgXZGpPGlY4viQlxE';
// Check if the Supabase client library was loaded in the HTML
if (!window.supabase) {
    alert("Supabase client not loaded. Auth guard cannot run.");
} else {
    const { createClient } = window.supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    (async () => {
        // Check if a user is currently logged in
        const { data: { session } } = await _supabase.auth.getSession();

        if (!session) {
            // NO user is logged in.
            console.warn("Auth Guard: No user session found. Redirecting to login.");
            
            // Redirect back to the main page (which has the login modal)
            // We use '../index.html' as the correct relative path from the /Services/ folder.
            window.location.href = '../index.html#login-required';
        } else {
            // User is logged in. Allow the page to load.
            console.log("Auth Guard: Passed. User is logged in.");
        }
    })();
}