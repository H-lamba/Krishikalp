// --- 1. INITIALIZATION ---
// Paste your Supabase URL and Key here

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ADD THIS SNIPPET HERE
let currentUser = null;
_supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
});
// --- 2. CROP CATEGORY DATA ---
const cropCategories = {
    "Grains & Cereals": ["Rice (Basmati)", "Rice (Non-Basmati)", "Wheat", "Maize", "Barley", "Oats", "Ragi"],
    "Pulses": ["Red Lentils (Masoor Dal)", "Yellow Lentils (Moong Dal)", "Black Gram (Urad Dal)", "Chickpeas (Chana)"],
    "Vegetables": ["Potato", "Tomato", "Onion", "Cauliflower", "Cabbage", "Carrots", "Spinach"],
    "Fruits": ["Mango", "Apple", "Banana", "Orange", "Grapes", "Pomegranate", "Papaya"],
    "Oil Seeds": ["Mustard", "Sesame", "Groundnut", "Sunflower", "Soybean"],
    "Spices": ["Black Pepper", "Cardamom", "Cinnamon", "Cloves", "Cumin", "Coriander", "Turmeric"],
    "Cash Crops": ["Cotton", "Sugarcane", "Tobacco", "Jute", "Coffee", "Tea"],
    "Organic Produce": ["Organic Rice", "Organic Wheat", "Organic Fruits", "Organic Vegetables"],
    "Medicinal Crops": ["Aloe Vera", "Tulsi", "Ashwagandha", "Stevia", "Mint"]
};

// --- 3. GET KEY ELEMENTS ---
const productsGrid = document.querySelector('.products-grid');
const listingModal = document.getElementById('listingModal');
const detailsModal = document.getElementById('detailsModal');
const contactModal = document.getElementById('contactModal');
const listingForm = document.getElementById('cropListingForm');
const categorySelect = document.getElementById('cropCategory');
const cropSelect = document.getElementById('cropName');

// --- 4. INITIAL PAGE LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    initializeCategories();
    loadProducts(); // Load products from Supabase
    setupEventListeners(); // Setup filtering, sorting, etc.
});

// --- 5. SUPABASE FUNCTIONS (READ & WRITE) ---

/**
 * Loads all products from the Supabase 'products' table
 * and replaces the static HTML.
 */
async function loadProducts() {
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    // Clear the static products
    productsGrid.innerHTML = ''; 

    // Add each product from the database to the grid
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });

    // After loading, setup listeners for the new buttons
    setupProductButtonListeners();
}

/**
 * Handles the "List Crop" form submission.
 * Uploads an image (if any) to Supabase Storage.
 * Inserts the product data into the Supabase 'products' table.
 */
async function handleListingSubmit(e) {
    e.preventDefault();

    // ADD THIS CHECK
    if (!currentUser) {
        alert("You must be logged in to list a crop.");
        return;
    }
    let imageUrl = null;
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Listing...';

    // 1. Upload Image (if one exists)
    const imageFile = listingForm.cropImage.files[0];
    if (imageFile) {
        const filePath = `public/${Date.now()}-${imageFile.name}`;
        const { data: uploadData, error: uploadError } = await _supabase.storage
            .from('crop-images')
            .upload(filePath, imageFile);

        if (uploadError) {
            console.error('Image upload error:', uploadError);
            alert('Error uploading image. Please try again.');
            submitButton.disabled = false;
            submitButton.textContent = 'List Crop';
            return;
        }

        // Get the public URL
        const { data: urlData } = _supabase.storage
            .from('crop-images')
            .getPublicUrl(uploadData.path);
        
        imageUrl = urlData.publicUrl;
    }

// 2. Prepare Product Data
    const newProduct = {
        category: categorySelect.value,
        name: cropSelect.value,
        quantity: parseFloat(listingForm.quantity.value),
        unit: listingForm.quantityUnit.value,
        price: parseFloat(listingForm.price.value),
        location_region: listingForm.listingLocation.value,
        specific_location: listingForm['specific-location'].value,
        description: listingForm.description.value,
        image_url: imageUrl,
        
        // ADD THESE TWO LINES
        user_id: currentUser.id, 
        farmer_name: currentUser.user_metadata.full_name
    };
    // 3. Insert into Supabase 'products' table
    const { data, error } = await _supabase
        .from('products')
        .insert([newProduct])
        .select();

    if (error) {
        console.error('Error inserting data:', error);
        alert('Error listing your crop. Please try again.');
    } else {
        alert('Your crop has been listed successfully!');
        listingForm.reset();
        closeListingModal();
        loadProducts(); // Refresh the grid with the new product
    }

    submitButton.disabled = false;
    submitButton.textContent = 'List Crop';
}

/**
 * Creates an HTML element for a product.
 * @param {object} product - The product object from Supabase.
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.category = product.category;
    card.dataset.location = product.location_region;
    card.dataset.date = new Date(product.created_at).getTime();

    // --- FIX: Use real data, with fallbacks ---
    const displayImage = product.image_url || 'https://example.com/default-crop.jpg'; // A fallback image
    const farmerName = product.farmer_name || "Unknown Farmer"; // Use real data
    const farmerImg = product.farmer_image_url || "https://example.com/default-farmer.jpg"; // A fallback
    const farmerPhone = product.farmer_phone || "+91 99999 88888"; // Fallback phone
    const farmerAddress = product.specific_location;

    card.innerHTML = `
        <div class="farmer-info">
            <img src="${farmerImg}" alt="Farmer" class="farmer-pic">
            <span>${farmerName}</span> <div class="hidden-info">
                <span class="farmer-phone">${farmerPhone}</span>
                <span class="farmer-address">${farmerAddress}</span>
            </div>
        </div>
        <img src="${displayImage}" alt="${product.name}" class="product-image">
        <h3>${product.name}</h3>
        <p class="location"><i class="fas fa-map-marker-alt"></i> ${product.specific_location}</p>
        <p class="price">₹${product.price}/${product.unit}</p>
        <p class="quantity">Available: ${product.quantity} ${product.unit}</p>
        <p class="description">${product.description.substring(0, 80)}...</p>
        <div class="card-actions">
            <button class="contact-farmer">Contact Farmer</button>
            <button class="view-details">View Details</button>
        </div>
    `;
    return card;
}

// --- 6. MODAL & EVENT LISTENER FUNCTIONS ---

/**
 * Sets up all main event listeners for filtering, sorting,
 * and opening the "List Crop" modal.
 */
function setupEventListeners() {
    // "List Your Crops" button
    document.querySelector('.sell-crops-btn').addEventListener('click', openListingModal);

    // Listing form submission
    listingForm.addEventListener('submit', handleListingSubmit);

    // Category filtering
    document.querySelector('.category-list').addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            document.querySelectorAll('.category-list a').forEach(a => a.classList.remove('active'));
            e.target.classList.add('active');
            filterProducts(e.target.dataset.category);
        }
    });

    // Sorting dropdown
    document.getElementById('sort').addEventListener('change', (e) => sortProducts(e.target.value));

    // Location dropdown
    document.getElementById('location').addEventListener('change', (e) => filterByLocation(e.target.value));

    // Modal "X" close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeListingModal();
            closeDetailsModal();
            closeContactModal();
        });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target == listingModal) closeListingModal();
        if (e.target == detailsModal) closeDetailsModal();
        if (e.target == contactModal) closeContactModal();
    });

    // Contact form submission
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
}

/**
 * Uses event delegation on the product grid to handle all
 * "View Details" and "Contact Farmer" clicks.
 */
function setupProductButtonListeners() {
    productsGrid.addEventListener('click', function(event) {
        const productCard = event.target.closest('.product-card');
        if (!productCard) return;

        if (event.target.classList.contains('contact-farmer')) {
            openContactModal(productCard);
        }
        
        if (event.target.classList.contains('view-details')) {
            openDetailsModal(productCard);
        }
    });
}

/**
 * Populates the category sidebar and the form dropdown.
 */
function initializeCategories() {
    const categoryList = document.querySelector('.category-list');
    categoryList.innerHTML = '<li><a href="#" data-category="all" class="active">All Crops</a></li>';
    categorySelect.innerHTML = '<option value="">Select Category</option>';

    Object.keys(cropCategories).forEach(category => {
        // Add to sidebar
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-category="${category}">${category}</a>`;
        categoryList.appendChild(li);
        
        // Add to form dropdown
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    });

    // Handle form category change
    categorySelect.addEventListener('change', () => {
        const selectedCategory = categorySelect.value;
        cropSelect.innerHTML = '<option value="">Select Crop</option>';
        if (selectedCategory && cropCategories[selectedCategory]) {
            cropCategories[selectedCategory].forEach(crop => {
                cropSelect.innerHTML += `<option value="${crop}">${crop}</option>`;
            });
        }
    });
}

// --- 7. MODAL OPEN/CLOSE & POPULATION FUNCTIONS ---

function openListingModal() {
    listingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeListingModal() {
    listingModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openDetailsModal(productCard) {
    // Read data from the clicked card
    const title = productCard.querySelector('h3').textContent;
    const farmerName = productCard.querySelector('.farmer-info span').textContent;
    const farmerImg = productCard.querySelector('.farmer-pic').src;
    const location = productCard.querySelector('.location').textContent;
    const price = productCard.querySelector('.price').textContent;
    const quantity = productCard.querySelector('.quantity').textContent;
    const description = productCard.querySelector('.description').textContent;
    const category = productCard.dataset.category;
    const mainImage = productCard.querySelector('.product-image').src;
    
    // Populate modal
    document.getElementById('detailsTitle').textContent = title;
    document.getElementById('detailsFarmerName').textContent = farmerName;
    document.getElementById('detailsFarmerImg').src = farmerImg;
    document.getElementById('detailsLocation').textContent = location;
    document.getElementById('detailsMainImage').src = mainImage;
    document.getElementById('detailsCategory').textContent = category;
    document.getElementById('detailsPrice').textContent = price;
    document.getElementById('detailsQuantity').textContent = quantity;
    document.getElementById('detailsDescription').textContent = description;
    
    // Placeholder data
    document.getElementById('detailsGrade').textContent = 'Grade A';
    document.getElementById('detailsHarvestDate').textContent = new Date().toLocaleDateString();

    detailsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeDetailsModal() {
    detailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openContactModal(productCard) {
    // Read data from the card
    const farmerName = productCard.querySelector('.farmer-info span').textContent;
    const farmerImg = productCard.querySelector('.farmer-pic').src;
    const location = productCard.querySelector('.location').textContent;
    const quantityUnit = productCard.querySelector('.quantity').textContent.split(' ')[2]; // e.g., "kg"
    
    // Read hidden farmer data
    const farmerPhone = productCard.querySelector('.farmer-phone').textContent;
    const farmerAddress = productCard.querySelector('.farmer-address').textContent;

    // Populate modal
    document.getElementById('contactFarmerImg').src = farmerImg;
    document.getElementById('contactFarmerName').textContent = farmerName;
    document.getElementById('contactLocation').textContent = location;
    document.getElementById('contactFarmerPhone').textContent = farmerPhone;
    document.getElementById('contactFarmerAddress').textContent = farmerAddress;
    document.getElementById('quantityUnit').textContent = quantityUnit;

    contactModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeContactModal() {
    contactModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function handleContactSubmit(e) {
    e.preventDefault();
    alert('Message sent successfully! The farmer will contact you soon.');
    closeContactModal();
    e.target.reset();
}

// --- 8. FILTERING & SORTING FUNCTIONS ---

function filterProducts(category) {
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        product.style.display = (category === 'all' || product.dataset.category === category) ? 'block' : 'none';
    });
}

function filterByLocation(location) {
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        product.style.display = (!location || product.dataset.location === location) ? 'block' : 'none';
    });
}

function sortProducts(sortBy) {
    const products = Array.from(productsGrid.querySelectorAll('.product-card'));

    products.sort((a, b) => {
        switch(sortBy) {
            case 'price-low':
                return getPriceValue(a) - getPriceValue(b);
            case 'price-high':
                return getPriceValue(b) - getPriceValue(a);
            case 'quantity':
                return getQuantityValue(b) - getQuantityValue(a);
            default: // newest
                return b.dataset.date - a.dataset.date;
        }
    });

    productsGrid.innerHTML = '';
    products.forEach(product => productsGrid.appendChild(product));
}

function getPriceValue(productCard) {
    const priceText = productCard.querySelector('.price').textContent; // "₹2,400/quintal"
    return parseFloat(priceText.replace(/[^0-9.]/g, ''));
}

function getQuantityValue(productCard) {
    const quantityText = productCard.querySelector('.quantity').textContent; // "Available: 50 quintals"
    return parseFloat(quantityText.match(/[0-9.]+/)[0]);
}