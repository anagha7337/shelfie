//LOGOUT
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// Redirect if not logged in
onAuthStateChanged(auth, (user) => {
if (!user) {
    window.location.href = "login.html";
}
});

// Logout function
window.logout = function () {
signOut(auth);
};



let isScanning = false;
let cameraContainer = null;

document.addEventListener('DOMContentLoaded', () => {

    cameraContainer = document.getElementById('cameraContainer');

    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-icon').parentElement;
    const barcodeButton = document.querySelector('.barcode-icon').parentElement;
    const closeCameraBtn = document.querySelector('.close-camera');

    /* SEARCH */
    function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            alert("Please enter something to search!");
            return;
        }
        console.log("Searching for:", query);
    }

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    /* OPEN SCANNER */
    barcodeButton.addEventListener('click', () => {
        if (isScanning) {
            console.log("Scanner already running");
            return;
        }

        isScanning = true;
        cameraContainer.style.display = "block";
        startBarcodeScanner();
    });

    /* CLOSE SCANNER */
    closeCameraBtn.addEventListener('click', closeCamera);
});


/* BARCODE SCANNER */
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
    fetchProductFromOpenFoodFacts(barcode);
}


/* CLOSE CAMERA */
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
            <button type="button" class="close-camera">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
    }

    isScanning = false;
}


/* OPEN FOOD FACTS API */
async function fetchProductFromOpenFoodFacts(barcode) {
    try {
        console.log("Fetching product:", barcode);

        const res = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        );
        const data = await res.json();

        if (data.status === 1) {
            const p = data.product;

            autofillProduct(
                p.product_name || "Unknown product",
                p.brands || "",
                p.categories || "",
                p.image_front_url || ""
            );
        } else {
            alert("Product not found. Please add it manually.");
        }

    } catch (err) {
        console.error("OFF API error:", err);
        alert("Failed to fetch product details");
    }
}


/* AUTOFILL */
function autofillProduct(name, brand, category, imageUrl) {
    alert(`✅ Product Found\n\n${name}\n${brand}`);

    const productNameField = document.getElementById("productName");
    const brandField = document.getElementById("brand");
    const categoryField = document.getElementById("category");
    const productImage = document.getElementById("productImage");

    if (productNameField) productNameField.value = name;
    if (brandField) brandField.value = brand;
    if (categoryField) categoryField.value = category;
    if (productImage && imageUrl) productImage.src = imageUrl;
}
