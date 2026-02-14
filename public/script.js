// FIREBASE AUTHENTICATION
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { EmailNotificationService } from './email-notification-service.js';

const firebaseConfig = {
    apiKey: "AIzaSyDcmN6fevwByDdUBPvp0G2kypeGjxd93bQ",
    authDomain: "shelfie-93cb0.firebaseapp.com",
    projectId: "shelfie-93cb0",
    storageBucket: "shelfie-93cb0.firebasestorage.app",
    messagingSenderId: "381959208222",
    appId: "1:381959208222:web:a95ec154e6cd8f16b29d0f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// EMAILJS CONFIGURATION
// ==========================================
const EMAILJS_CONFIG = {
    serviceId: 'service_83wtc9p',     
    templateId: 'template_b11fuc8',    
    publicKey: 'JIIMPiyW7cMaaYEeE'      
};

// Create email notification service instance
let emailNotificationService = null;

// Initialize EmailJS service
function initializeEmailService() {
    // Pass Firebase functions to the EmailNotificationService
    emailNotificationService = new EmailNotificationService(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        EMAILJS_CONFIG.publicKey,
        {
            query: query,
            where: where,
            collection: collection,
            getDocs: getDocs
        }
    );
}

// Setup email notifications
async function setupEmailNotifications(user) {
    const userEmail = user.email;
    const userName = user.displayName || userEmail.split('@')[0];
    
    if (emailNotificationService) {
        emailNotificationService.startDailyCheck(db, auth, userEmail, userName);
        console.log('✅ Email notifications enabled');
    }
}

// Redirect if not logged in and setup notifications
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        loadToBuyList();
        
        // Initialize and setup email notifications
        initializeEmailService();
        setupEmailNotifications(user);
    }
});

// Logout function
window.logout = function () {
    // Stop email checks
    if (emailNotificationService) {
        emailNotificationService.stopDailyCheck();
    }
    
    signOut(auth);
};

// Optional: Manual test function
window.testEmailNotification = async function() {
    if (emailNotificationService && auth.currentUser) {
        const userEmail = auth.currentUser.email;
        const userName = auth.currentUser.displayName || userEmail.split('@')[0];
        
        const success = await emailNotificationService.sendNow(db, auth, userEmail, userName);
        
        if (success) {
            alert('✅ Test email sent! Check your inbox.');
        } else {
            alert('No items need reminders, or email sending failed. Check console for details.');
        }
    } else {
        alert('Email service not initialized or user not logged in.');
    }
};

// PRODUCT CATEGORIZATION MAPPING
const categoryMapping = {
    // Food & Groceries
    'food-groceries': ['rice', 'flour', 'oil', 'sugar', 'salt', 'spices', 'pasta', 'noodles', 'cereal', 'grain', 'beans', 'lentils', 'pulses', 'cooking'],
    
    // Diary & Bakery
    'diary-bakery': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'bread', 'cake', 'pastry', 'cookie', 'biscuit', 'paneer', 'curd', 'ghee'],
    
    // Snack & Beverages
    'snack-beverages': ['chips', 'chocolate', 'candy', 'juice', 'soda', 'coffee', 'tea', 'water', 'drink', 'snack', 'cola', 'energy drink', 'smoothie', 'beer', 'wine', 'alcohol'],
    
    // Personal Care
    'personal-care': ['soap', 'shampoo', 'toothpaste', 'deodorant', 'perfume', 'lotion', 'cream', 'moisturizer', 'sunscreen', 'razor', 'tissue', 'toilet paper', 'sanitary', 'pad', 'tampon'],
    
    // Laundry & Cleaning
    'laundry-cleaning': ['detergent', 'soap', 'bleach', 'cleaner', 'disinfectant', 'mop', 'broom', 'sponge', 'cloth', 'wipe', 'liquid', 'powder', 'fabric softener'],
    
    // Health & Pharmacy
    'health-pharmacy': ['medicine', 'tablet', 'pill', 'vitamin', 'supplement', 'bandage', 'thermometer', 'inhaler', 'antiseptic', 'pain relief', 'antibiotic', 'syrup', 'capsule'],
    
    // Household
    'household': ['bulb', 'battery', 'candle', 'matches', 'foil', 'wrap', 'bag', 'container', 'plate', 'cup', 'utensil', 'knife', 'spoon', 'fork'],
    
    // Stationary
    'stationary': ['pen', 'pencil', 'paper', 'notebook', 'eraser', 'ruler', 'stapler', 'tape', 'glue', 'marker', 'highlighter', 'folder', 'file']
};

// Auto-categorize product
function categorizeProduct(productName) {
    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryMapping)) {
        for (const keyword of keywords) {
            if (lowerName.includes(keyword)) {
                return category;
            }
        }
    }
    
    // Default to food-groceries if no match
    return 'food-groceries';
}

// TO BUY LIST FUNCTIONALITY
let toBuyLists = {};

// Load to-buy list from localStorage
function loadToBuyList() {
    const saved = localStorage.getItem('toBuyLists');
    if (saved) {
        toBuyLists = JSON.parse(saved);
        renderAllLists();
    }
}

// Save to-buy list to localStorage
function saveToBuyList() {
    localStorage.setItem('toBuyLists', JSON.stringify(toBuyLists));
}

// Add item to to-buy list
function addToBuyItem(productName) {
    const category = categorizeProduct(productName);
    
    if (!toBuyLists[category]) {
        toBuyLists[category] = [];
    }
    
    toBuyLists[category].push({
        name: productName,
        checked: false,
        id: Date.now()
    });
    
    saveToBuyList();
    renderList(category);
}

// Render a specific list
function renderList(category) {
    const listElement = document.getElementById(`list-${category}`);
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    const items = toBuyLists[category] || [];
    
    items.forEach(item => {
        const li = document.createElement('li');
        if (item.checked) {
            li.classList.add('checked');
        }
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.addEventListener('change', () => {
            item.checked = checkbox.checked;
            li.classList.toggle('checked', checkbox.checked);
            saveToBuyList();
        });
        
        const label = document.createElement('label');
        label.textContent = item.name;
        label.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            item.checked = checkbox.checked;
            li.classList.toggle('checked', checkbox.checked);
            saveToBuyList();
        });
        
        li.appendChild(checkbox);
        li.appendChild(label);
        listElement.appendChild(li);
    });
}

// Render all lists
function renderAllLists() {
    Object.keys(categoryMapping).forEach(category => {
        renderList(category);
    });
}

// Clear a specific list
function clearList(category) {
    if (confirm('Are you sure you want to clear this list?')) {
        toBuyLists[category] = [];
        saveToBuyList();
        renderList(category);
    }
}

// BARCODE SCANNER VARIABLES
let isScanning = false;
let cameraContainer = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // TO BUY LIST - ADD BUTTON
    const toBuySearchInput = document.getElementById('toBuySearch');
    const addToBuyBtn = document.getElementById('addToBuyBtn');
    
    if (addToBuyBtn) {
        addToBuyBtn.addEventListener('click', () => {
            const productName = toBuySearchInput.value.trim();
            if (!productName) {
                alert('Please enter a product name!');
                return;
            }
            
            addToBuyItem(productName);
            toBuySearchInput.value = '';
            alert(`"${productName}" added to your to-buy list!`);
        });
        
        toBuySearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addToBuyBtn.click();
            }
        });
    }
    
    // CLEAR BUTTONS
    const clearButtons = document.querySelectorAll('.clear-btn');
    clearButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            clearList(category);
        });
    });
    
    // ADD ITEM SECTION - SEARCH AND BARCODE
    cameraContainer = document.getElementById('cameraContainer');
    const productSearchInput = document.getElementById('productSearch');
    const searchProductBtn = document.getElementById('searchProductBtn');
    const barcodeBtn = document.getElementById('barcodeBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    
    // Search product
    if (searchProductBtn) {
        searchProductBtn.addEventListener('click', () => {
            const query = productSearchInput.value.trim();
            if (!query) {
                alert('Please enter a product name to search!');
                return;
            }
            searchProductOpenFoodFacts(query);
        });
        
        productSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchProductBtn.click();
            }
        });
    }
    
    // Barcode scanner
    if (barcodeBtn) {
        barcodeBtn.addEventListener('click', () => {
            if (isScanning) {
                console.log("Scanner already running");
                return;
            }
            
            isScanning = true;
            cameraContainer.style.display = "block";
            startBarcodeScanner();
        });
    }
    
    // Close camera
    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', closeCamera);
    }
    
    // ADD ITEM FORM
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }
    
    // Date field interactivity
    const expiryDateInput = document.getElementById('expiryDate');
    const mfgDateInput = document.getElementById('mfgDate');
    const bestBeforeYears = document.getElementById('bestBeforeYears');
    const bestBeforeMonths = document.getElementById('bestBeforeMonths');
    const bestBeforeDays = document.getElementById('bestBeforeDays');
    
    // When expiry date is set, clear mfg and best before
    if (expiryDateInput) {
        expiryDateInput.addEventListener('change', () => {
            if (expiryDateInput.value) {
                mfgDateInput.value = '';
                bestBeforeYears.value = '';
                bestBeforeMonths.value = '';
                bestBeforeDays.value = '';
            }
        });
    }
    
    // When mfg or best before is set, clear expiry
    [mfgDateInput, bestBeforeYears, bestBeforeMonths, bestBeforeDays].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                if (mfgDateInput.value || bestBeforeYears.value || bestBeforeMonths.value || bestBeforeDays.value) {
                    expiryDateInput.value = '';
                }
            });
        }
    });
});

// BARCODE SCANNER
function startBarcodeScanner() {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: cameraContainer,
            constraints: {
                facingMode: "environment",
                width: { min: 640 },
                height: { min: 480 }
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "upc_reader",
                "upc_e_reader",
                "code_128_reader"
            ]
        },
        locate: true,
        numOfWorkers: navigator.hardwareConcurrency || 2
    }, (err) => {
        if (err) {
            console.error("Quagga init failed:", err);
            alert("Failed to start barcode scanner");
            closeCamera();
            return;
        }

        Quagga.start();
        console.log("Quagga started");

        Quagga.offDetected(onBarcodeDetected);
        Quagga.onDetected(onBarcodeDetected);
    });
}

function onBarcodeDetected(result) {
    const barcode = result.codeResult.code;
    console.log("Barcode detected:", barcode);

    // Prevent multiple detections
    Quagga.offDetected(onBarcodeDetected);

    closeCamera();
    fetchProductFromBarcode(barcode);
}

function closeCamera() {
    if (!isScanning) return;

    console.log("Stopping scanner...");

    try {
        Quagga.stop();
        Quagga.offDetected(onBarcodeDetected);
    } catch (e) {
        console.log("Quagga already stopped");
    }

    if (cameraContainer) {
        cameraContainer.style.display = "none";
        cameraContainer.innerHTML = `
            <button type="button" class="close-camera" id="closeCameraBtn">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        
        // Re-attach event listener
        const closeCameraBtn = document.getElementById('closeCameraBtn');
        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', closeCamera);
        }
    }

    isScanning = false;
}

// OPEN FOOD FACTS / OPEN BEAUTY FACTS API
async function fetchProductFromBarcode(barcode) {
    try {
        console.log("Fetching product by barcode:", barcode);

        // Try Open Food Facts first
        let res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        let data = await res.json();

        if (data.status === 1) {
            autofillProduct(data.product);
            return;
        }

        // Try Open Beauty Facts if not found
        res = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
        data = await res.json();

        if (data.status === 1) {
            autofillProduct(data.product);
            return;
        }

        alert("Product not found. Please add details manually.");
    } catch (err) {
        console.error("API error:", err);
        alert("Failed to fetch product details");
    }
}

async function searchProductOpenFoodFacts(query) {
    try {
        console.log("Searching for product:", query);

        // Try Open Food Facts
        let res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=1`);
        let data = await res.json();

        if (data.products && data.products.length > 0) {
            autofillProduct(data.products[0]);
            return;
        }

        // Try Open Beauty Facts
        res = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=1`);
        data = await res.json();

        if (data.products && data.products.length > 0) {
            autofillProduct(data.products[0]);
            return;
        }

        alert("Product not found. Please add details manually.");
    } catch (err) {
        console.error("Search error:", err);
        alert("Failed to search for product");
    }
}

// Autofill product details
function autofillProduct(product) {
    const productName = product.product_name || product.product_name_en || "Unknown product";
    
    alert(`✅ Product Found: ${productName}`);

    const productNameField = document.getElementById("productName");
    const categoryField = document.getElementById("category");

    if (productNameField) {
        productNameField.value = productName;
    }

    // Auto-select category based on product
    if (categoryField) {
        // Try to determine shelf category from product categories
        const productCategories = (product.categories || '').toLowerCase();
        
        if (productCategories.includes('food') || 
            productCategories.includes('beverage') || 
            productCategories.includes('snack') ||
            productCategories.includes('grocery')) {
            categoryField.value = 'food';
        } else if (productCategories.includes('cosmetic') || 
                   productCategories.includes('beauty') || 
                   productCategories.includes('skincare') ||
                   productCategories.includes('skin care')) {
            categoryField.value = 'skincare';
        } else if (productCategories.includes('medicine') || 
                   productCategories.includes('drug') || 
                   productCategories.includes('pharmaceutical')) {
            categoryField.value = 'medicine';
        } else {
            categoryField.value = 'household-others';
        }
    }
}

// HANDLE ADD ITEM FORM SUBMISSION
async function handleAddItem(e) {
    e.preventDefault();
    
    const productName = document.getElementById('productName').value.trim();
    const category = document.getElementById('category').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const mfgDate = document.getElementById('mfgDate').value;
    const bestBeforeYears = document.getElementById('bestBeforeYears').value;
    const bestBeforeMonths = document.getElementById('bestBeforeMonths').value;
    const bestBeforeDays = document.getElementById('bestBeforeDays').value;
    const remindMonths = document.getElementById('remindMonths').value || 0;
    const remindDays = document.getElementById('remindDays').value || 0;
    
    if (!productName || !category) {
        alert('Please fill in product name and category!');
        return;
    }
    
    // Calculate expiry date
    let calculatedExpiryDate;
    
    if (expiryDate) {
        calculatedExpiryDate = new Date(expiryDate);
    } else if (mfgDate && (bestBeforeYears || bestBeforeMonths || bestBeforeDays)) {
        const mfg = new Date(mfgDate);
        const years = parseInt(bestBeforeYears) || 0;
        const months = parseInt(bestBeforeMonths) || 0;
        const days = parseInt(bestBeforeDays) || 0;
        
        calculatedExpiryDate = new Date(mfg);
        calculatedExpiryDate.setFullYear(calculatedExpiryDate.getFullYear() + years);
        calculatedExpiryDate.setMonth(calculatedExpiryDate.getMonth() + months);
        calculatedExpiryDate.setDate(calculatedExpiryDate.getDate() + days);
    } else {
        alert('Please provide either an expiry date OR manufacturing date with best before period!');
        return;
    }
    
    // Calculate reminder date
    const reminderDate = new Date(calculatedExpiryDate);
    reminderDate.setMonth(reminderDate.getMonth() - parseInt(remindMonths));
    reminderDate.setDate(reminderDate.getDate() - parseInt(remindDays));
    
    // Create item object
    const item = {
        productName,
        category,
        expiryDate: calculatedExpiryDate.toISOString(),
        reminderDate: reminderDate.toISOString(),
        addedDate: new Date().toISOString(),
        userId: auth.currentUser.uid
    };
    
    try {
        // Save to Firestore
        await addDoc(collection(db, 'shelfItems'), item);
        
        alert(`✅ Item added successfully to ${category} shelf!`);
        
        // Reset form
        document.getElementById('addItemForm').reset();
        
    } catch (error) {
        console.error("Error adding item:", error);
        alert("Failed to add item. Please try again.");
    }
}