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
    serviceId: 'service_83wtc9p',      // Replace with your service ID from EmailJS
    templateId: 'template_b11fuc8',    // Replace with your template ID from EmailJS
    publicKey: 'JIIMPiyW7cMaaYEeE'
};

// ==========================================
// AI CATEGORIZATION CONFIGURATION
// ==========================================
const AI_CONFIG = {
    endpoint: 'https://shelfie-worker.shelfie-worker.workers.dev',
    enabled: true
};

// Create email notification service instance
let emailNotificationService = null;

// Initialize EmailJS service
function initializeEmailService() {
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
        window.location.href = "index.html";
    } else {
        loadToBuyList();
        
        // Initialize and setup email notifications
        initializeEmailService();
        setupEmailNotifications(user);
    }
});

// Logout function
window.logout = function () {
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
    'food-groceries': ['rice', 'flour', 'oil', 'sugar', 'salt', 'spices', 'pasta', 'noodles', 'cereal', 'grain', 'beans', 'lentils', 'pulses', 'cooking'],
    'diary-bakery': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'bread', 'cake', 'pastry', 'cookie', 'biscuit', 'paneer', 'curd', 'ghee'],
    'snack-beverages': ['chips', 'chocolate', 'candy', 'juice', 'soda', 'coffee', 'tea', 'water', 'drink', 'snack', 'cola', 'energy drink', 'smoothie', 'beer', 'wine', 'alcohol'],
    'personal-care': ['soap', 'shampoo', 'toothpaste', 'deodorant', 'perfume', 'lotion', 'cream', 'moisturizer', 'sunscreen', 'razor', 'tissue', 'toilet paper', 'sanitary', 'pad', 'tampon', 'lip balm'],
    'laundry-cleaning': ['detergent', 'soap', 'bleach', 'cleaner', 'disinfectant', 'mop', 'broom', 'sponge', 'cloth', 'wipe', 'liquid', 'powder', 'fabric softener'],
    'health-pharmacy': ['medicine', 'tablet', 'pill', 'vitamin', 'supplement', 'bandage', 'thermometer', 'inhaler', 'antiseptic', 'pain relief', 'antibiotic', 'syrup', 'capsule', 'ointment'],
    'household': ['bulb', 'battery', 'candle', 'matches', 'foil', 'wrap', 'bag', 'container', 'plate', 'cup', 'utensil', 'knife', 'spoon', 'fork'],
    'stationary': ['pen', 'pencil', 'paper', 'notebook', 'eraser', 'ruler', 'stapler', 'tape', 'glue', 'marker', 'highlighter', 'folder', 'file']
};

// Keyword-based categorization (fast, first attempt)
function categorizeProductByKeywords(productName) {
    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryMapping)) {
        for (const keyword of keywords) {
            if (lowerName.includes(keyword)) {
                console.log(`✅ Keyword match: "${productName}" → ${category}`);
                return category;
            }
        }
    }
    
    return null;
}

// AI-based categorization (smart fallback) - ONLY ONE VERSION
async function categorizeProductWithAI(productName) {
    if (!AI_CONFIG.enabled) {
        console.log('AI categorization disabled');
        return null;
    }
    
    try {
        console.log(`🤖 Calling AI to categorize: "${productName}"`);
        
        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                productName: productName
            })
        });
        
        if (!response.ok) {
            console.error(`❌ AI API returned status: ${response.status}`);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            return null;
        }
        
        const data = await response.json();
        console.log('AI response data:', data);
        
        if (data.debug) {
            console.log('AI Debug Info:', data.debug);
        }
        
        const category = data.category;
        
        if (category && categoryMapping[category]) {
            console.log(`✅ AI categorized: "${productName}" → ${category}`);
            return category;
        } else {
            console.warn(`⚠️ AI returned invalid or null category:`, category);
            return null;
        }
        
    } catch (error) {
        console.error('❌ AI categorization failed:', error);
        console.error('Error details:', error.message);
        return null;
    }
}

// Smart categorization: Keywords first, then AI fallback - THIS WAS MISSING!
async function categorizeProduct(productName) {
    // Step 1: Try keyword matching (fast)
    const keywordCategory = categorizeProductByKeywords(productName);
    if (keywordCategory) {
        return keywordCategory;
    }
    
    // Step 2: Fall back to AI (smart but slower)
    const aiCategory = await categorizeProductWithAI(productName);
    if (aiCategory) {
        return aiCategory;
    }
    
    // Step 3: Final fallback to default
    console.log(`⚠️ No match found for "${productName}", using default: food-groceries`);
    return 'food-groceries';
}

// Test function for AI
window.testAICategorization = async function(productName) {
    console.log('=== Testing AI Categorization ===');
    console.log('Product:', productName);
    console.log('Endpoint:', AI_CONFIG.endpoint);
    console.log('Enabled:', AI_CONFIG.enabled);
    
    const result = await categorizeProductWithAI(productName);
    console.log('Result:', result);
    console.log('=================================');
    
    return result;
};

// TO BUY LIST FUNCTIONALITY
let toBuyLists = {};

function loadToBuyList() {
    const saved = localStorage.getItem('toBuyLists');
    if (saved) {
        toBuyLists = JSON.parse(saved);
        renderAllLists();
    }
}

function saveToBuyList() {
    localStorage.setItem('toBuyLists', JSON.stringify(toBuyLists));
}

async function addToBuyItem(productName) {
    const addBtn = document.getElementById('addToBuyBtn');
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span>';
    addBtn.disabled = true;
    
    try {
        const category = await categorizeProduct(productName);
        
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
        
        return category;
    } finally {
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;
    }
}

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

function renderAllLists() {
    Object.keys(categoryMapping).forEach(category => {
        renderList(category);
    });
}

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

document.addEventListener('DOMContentLoaded', () => {
    const toBuySearchInput = document.getElementById('toBuySearch');
    const addToBuyBtn = document.getElementById('addToBuyBtn');
    
    if (addToBuyBtn) {
        addToBuyBtn.addEventListener('click', async () => {
            const productName = toBuySearchInput.value.trim();
            if (!productName) {
                alert('Please enter a product name!');
                return;
            }
            
            const category = await addToBuyItem(productName);
            toBuySearchInput.value = '';
            
            const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            alert(`✅ "${productName}" added to ${categoryName}!`);
        });
        
        toBuySearchInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addToBuyBtn.click();
            }
        });
    }
    
    const clearButtons = document.querySelectorAll('.clear-btn');
    clearButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            clearList(category);
        });
    });
    
    cameraContainer = document.getElementById('cameraContainer');
    const productSearchInput = document.getElementById('productSearch');
    const searchProductBtn = document.getElementById('searchProductBtn');
    const barcodeBtn = document.getElementById('barcodeBtn');
    const closeCameraBtn = document.getElementById('closeCameraBtn');
    
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
    
    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', closeCamera);
    }
    
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }
    
    const expiryDateInput = document.getElementById('expiryDate');
    const mfgDateInput = document.getElementById('mfgDate');
    const bestBeforeYears = document.getElementById('bestBeforeYears');
    const bestBeforeMonths = document.getElementById('bestBeforeMonths');
    const bestBeforeDays = document.getElementById('bestBeforeDays');
    
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
        
        const closeCameraBtn = document.getElementById('closeCameraBtn');
        if (closeCameraBtn) {
            closeCameraBtn.addEventListener('click', closeCamera);
        }
    }

    isScanning = false;
}

async function fetchProductFromBarcode(barcode) {
    try {
        console.log("Fetching product by barcode:", barcode);

        let res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        let data = await res.json();

        if (data.status === 1) {
            autofillProduct(data.product);
            return;
        }

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

        let res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=1`);
        let data = await res.json();

        if (data.products && data.products.length > 0) {
            autofillProduct(data.products[0]);
            return;
        }

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

function autofillProduct(product) {
    const productName = product.product_name || product.product_name_en || "Unknown product";
    
    alert(`✅ Product Found: ${productName}`);

    const productNameField = document.getElementById("productName");
    const categoryField = document.getElementById("category");

    if (productNameField) {
        productNameField.value = productName;
    }

    if (categoryField) {
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
    
    const reminderDate = new Date(calculatedExpiryDate);
    reminderDate.setMonth(reminderDate.getMonth() - parseInt(remindMonths));
    reminderDate.setDate(reminderDate.getDate() - parseInt(remindDays));
    
    const item = {
        productName,
        category,
        expiryDate: calculatedExpiryDate.toISOString(),
        reminderDate: reminderDate.toISOString(),
        addedDate: new Date().toISOString(),
        userId: auth.currentUser.uid
    };
    
    try {
        await addDoc(collection(db, 'shelfItems'), item);
        
        alert(`✅ Item added successfully to ${category} shelf!`);
        
        document.getElementById('addItemForm').reset();
        
    } catch (error) {
        console.error("Error adding item:", error);
        alert("Failed to add item. Please try again.");
    }
}