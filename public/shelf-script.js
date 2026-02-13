// FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Get current shelf from URL
const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

// Redirect if not logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        await loadShelfItems();
    }
});

// Load items for current shelf
async function loadShelfItems() {
    try {
        const itemsGrid = document.getElementById('itemsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!itemsGrid || !emptyState) return;
        
        // Clear existing items
        itemsGrid.innerHTML = '';
        
        // Query items for this shelf
        const q = query(
            collection(db, 'shelfItems'),
            where('userId', '==', auth.currentUser.uid),
            where('category', '==', currentPage)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            emptyState.classList.add('show');
            return;
        }
        
        emptyState.classList.remove('show');
        
        // Create item cards
        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const card = createItemCard(item, docSnap.id);
            itemsGrid.appendChild(card);
        });
        
    } catch (error) {
        console.error("Error loading shelf items:", error);
        alert("Failed to load items. Please try again.");
    }
}

// Create item card element
function createItemCard(item, docId) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const expiryDate = new Date(item.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    // Determine status and color
    let statusClass, statusText;
    
    if (daysUntilExpiry < 0) {
        statusClass = 'status-expired';
        statusText = 'Expired';
    } else if (daysUntilExpiry <= 3) {
        statusClass = 'status-danger';
        statusText = `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
    } else if (daysUntilExpiry <= 7) {
        statusClass = 'status-warning';
        statusText = `Expires in ${daysUntilExpiry} days`;
    } else {
        statusClass = 'status-safe';
        statusText = `Expires in ${daysUntilExpiry} days`;
    }
    
    card.classList.add(statusClass);
    
    // Format dates
    const expiryDateStr = expiryDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    const addedDate = new Date(item.addedDate);
    const addedDateStr = addedDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    
    card.innerHTML = `
        <button class="delete-btn" data-doc-id="${docId}">
            <span class="material-symbols-outlined">delete</span>
        </button>
        
        <div class="item-name">${item.productName}</div>
        
        <div class="item-info">
            <div class="info-row">
                <span class="info-label">Expiry Date:</span>
                <span class="info-value expiry-date">${expiryDateStr}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Added:</span>
                <span class="info-value">${addedDateStr}</span>
            </div>
        </div>
        
        <div class="expiry-status">${statusText}</div>
    `;
    
    // Add delete functionality
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteItem(docId));
    
    return card;
}

// Delete item
async function deleteItem(docId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'shelfItems', docId));
        await loadShelfItems();
        alert('Item deleted successfully!');
    } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item. Please try again.");
    }
}