// --- 1. INITIALIZATION ---
// UN-COMMENT THESE LINES TO FIX THE ERROR
// const SUPABASE_URL = 'https://eafohpvmownsqyykdcyt.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZm9ocHZtb3duc3F5eWtkY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzY5MTMsImV4cCI6MjA3NzY1MjkxM30.Q-sFPyYJEX1ZZBULzQ_2xIR-rGGgXZGpPGlY4viQlxE';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- END OF FIX ---

let currentUser = null;

// --- 2. PAGE LOAD ---
document.addEventListener('DOMContentLoaded', function() {
    
    // REMOVE THE UNDEFINED CHECK, IT'S NO LONGER NEEDED
    /*
    if (typeof _supabase === 'undefined') {
        // This check is no longer strictly needed but is good to keep
        console.error("Supabase client not loaded.");
        return;
    }
    */
    
    // Get the current user
    _supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
    });
    
    setupFilterLogic();
    setupFormLogic();
    setupAuthButtons();
    loadDynamicResources(); // <-- NEW: Load resources from DB
});

// --- 3. LOAD DYNAMIC RESOURCES ---
async function loadDynamicResources() {
    const resourceGrid = document.querySelector('.resource-grid');
    if (!resourceGrid) return;

    resourceGrid.innerHTML = '<h3><i class="fas fa-spinner fa-spin"></i> Loading resources...</h3>';

    const { data: resources, error } = await _supabase
        .from('community_resources')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching resources:', error);
        resourceGrid.innerHTML = '<p style="color: red;">Could not load resources.</p>';
        return;
    }

    if (resources.length === 0) {
        resourceGrid.innerHTML = '<h3>No resources shared yet. Be the first!</h3>';
        return;
    }

    resourceGrid.innerHTML = ''; // Clear loading message
    resources.forEach(resource => {
        const card = createResourceCard(resource);
        resourceGrid.appendChild(card);
    });

    // Re-attach listeners to the new dynamic buttons
    setupAuthButtons(); 
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = `resource-card ${resource.resource_type}`; // Add type class for filtering
    
    // Format the date
    const postDate = new Date(resource.created_at).toLocaleDateString();

    card.innerHTML = `
        <div class="resource-status available">Available</div>
        <div class="resource-content">
            <h3>${resource.title}</h3>
            <p>${resource.description}</p>
            <div class="resource-tags">
                <span class="tag-type">${resource.resource_type}</span>
            </div>
            <div class="farmer-details">
                <span class="farmer-name">${resource.farmer_name || 'Anonymous Farmer'}</span>
                <span class="location"><i class="fas fa-map-marker-alt"></i> ${resource.location}</span>
                
                <!-- The phone number is now hidden and dynamic -->
                <span class="phone hidden"><i class="fas fa-phone"></i> ${resource.phone_number || 'No Phone'}</span>
                
                <span class="time"><i class="fas fa-clock"></i> Posted on ${postDate}</span>
            </div>
            <!-- This button will be activated by setupAuthButtons() -->
            <button class="contact-btn"><i class="fas fa-phone"></i> Show Contact Details</button>
        </div>
    `;
    return card;
}


// --- 4. FILTER LOGIC (No changes) ---
function setupFilterLogic() {
    const slider = document.getElementById('distanceRange');
    const distanceValue = document.getElementById('distanceValue');
    
    if (slider) {
        slider.oninput = function() {
            distanceValue.textContent = this.value + ' miles';
        }
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const type = button.getAttribute('data-type');
            
            // This now filters the dynamic cards
            const resourceCards = document.querySelectorAll('.resource-card'); 
            resourceCards.forEach(card => {
                if (type === 'all' || card.classList.contains(type)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// --- 5. FORM SUBMISSION LOGIC (Updated) ---
function setupFormLogic() {
    const shareForm = document.getElementById('share-resource-form');
    if (shareForm) {
        shareForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stop page reload

            // 1. Check for logged-in user
            if (!currentUser) {
                alert("Please log in to share a resource.");
                window.location.href = '../index.html'; 
                return;
            }
            
            const submitButton = shareForm.querySelector('.share-button');
            submitButton.disabled = true;
            submitButton.textContent = "Sharing...";

            // 2. Get form values
            const formData = new FormData(shareForm);
            const newResource = {
                user_id: currentUser.id,
                farmer_name: currentUser.user_metadata.full_name,
                phone_number: currentUser.phone || 'Not Provided', // Get phone from profile
                resource_type: formData.get('resource_type'),
                title: formData.get('title'),
                description: formData.get('description'),
                location: formData.get('location')
            };

            // 3. Insert into Supabase
            const { data, error } = await _supabase
                .from('community_resources')
                .insert([newResource]);
            
            if (error) {
                console.error("Error sharing resource:", error);
                alert("Error: Could not share your resource. " + error.message);
                submitButton.disabled = false;
                submitButton.textContent = "Share Resource";
            } else {
                alert("Resource shared successfully!");
                shareForm.reset();
                submitButton.disabled = false;
                submitButton.textContent = "Share Resource";
                loadDynamicResources(); // Refresh the grid
            }
        });
    }

    // TODO: Add submit logic for the "Post Your Resource Exchange" form
    const exchangeForm = document.querySelector('.post-form');
    if (exchangeForm) {
        exchangeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert("This form is not yet functional.");
        });
    }
}

// --- 6. AUTHENTICATION FOR BUTTONS (Updated) ---
function setupAuthButtons() {
    
    // --- Contact buttons on Resource Cards ---
    // We use event delegation on the grid since cards are dynamic
    const resourceGrid = document.querySelector('.resource-grid');
    if (resourceGrid) {
        resourceGrid.addEventListener('click', function(e) {
            if (!e.target.classList.contains('contact-btn')) return;

            if (!currentUser) {
                alert("Please log in to see contact details.");
                window.location.href = '../index.html';
                return;
            }
            
            const button = e.target;
            const resourceCard = button.closest('.resource-content');
            const phoneSpan = resourceCard.querySelector('.phone');
            
            if (phoneSpan) {
                const phoneNumber = phoneSpan.textContent.trim();
                phoneSpan.classList.remove('hidden');
                phoneSpan.classList.add('show');
                button.innerHTML = `<i class="fas fa-phone"></i> ${phoneNumber}`;
                button.classList.add('clicked');
            }
        });
    }

    // --- Contact buttons on Exchange Cards (Static) ---
    const exchangeContactButtons = document.querySelectorAll('.exchange-card .contact-farmer');
    exchangeContactButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!currentUser) {
                alert("Please log in to see contact details.");
                window.location.href = '../index.html';
                return;
            }
            
            const phoneNumber = this.getAttribute('data-phone');
            if (phoneNumber) {
                this.innerHTML = '<i class="fas fa-phone"></i> ' + phoneNumber;
                this.classList.add('clicked');
                this.style.pointerEvents = 'none';
            }
        });
    });

    // "Use current location" button
    const locationButton = document.querySelector('.use-current-location');
    if (locationButton) {
        locationButton.addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    alert('Location captured! (This is a demo)');
                    // In a real app, you'd use a reverse geocoding API
                    // to turn (position.coords.latitude, position.coords.longitude)
                    // into a city name and fill the input.
                });
            } else {
                alert('Geolocation is not supported by your browser');
            }
        });
    }
}



