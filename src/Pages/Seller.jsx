import React, { useEffect, useState } from "react";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, query, where } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

import { API_BASE_URL } from "../apiConfig.js"; 
import "./Seller.css"; 

const firebaseConfig = {
    apiKey: "AIzaSyBgH8hpWJ97mqLFfoDDW9A_78pR5YjEmxo", 
    authDomain: "jamba-wear.firebaseapp.com",
    projectId: "jamba-wear",
    storageBucket: "jamba-wear.firebasestorage.app",
    messagingSenderId: "679544590258",
    appId: "1:679544590258:web:eac3841e5f555e3fb89eab",
    measurementId: "G-8XSNJG079Z"
};

const appName = "jambawear-seller";
const app = getApps().some((firebaseApp) => firebaseApp.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseConfig, appName);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 🚀 GLOBAL VARIABLES: Safe from React page reloads
let currentEditImageUrls = [];
let selectedFiles = [];
let editingProductId = null; 
let activeUserEmail = ""; 
let tempProfilePhoto = ""; 
let globalSellerProducts = []; 

const stateDistrictMap = {
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup Metropolitan", "Kamrup", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
    "Nagaland": ["Chumukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Psham", "Tuensang", "Wokha", "Zunheboto"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"]
};

export default function SellerDashboard() {
    const [sellerEmail, setSellerEmail] = useState("");
    const [wallet, setWallet] = useState({ available: 0, pending: 0, withdrawn: 0 });
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [sellerProfile, setSellerProfile] = useState({}); 
    const [isProfileEditing, setIsProfileEditing] = useState(false); 
    const [activeTab, setActiveTab] = useState("orders");

    const [selectedState, setSelectedState] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedPickupState, setSelectedPickupState] = useState("");
    const [selectedPickupDistrict, setSelectedPickupDistrict] = useState("");
    const [sameAsPermanent, setSameAsPermanent] = useState(false);

    // 🚀 THE FIX: Background systems only load ONCE to prevent infinite loops and crashes
    useEffect(() => {
        window.showSection = function(sectionId) {
            setActiveTab(sectionId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.showToast = function(message) {
            const toast = document.getElementById('toast-notification');
            if(toast) {
                toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
                toast.classList.add('show');
                setTimeout(() => { toast.classList.remove('show'); }, 3000);
            }
        };

        window.updateCategoryOptions = function(gender, selectedCategory = "") {
            const categorySelect = document.getElementById('p-category');
            if(!categorySelect) return;
            
            const categoryMap = {
                "Women": ["Dokhona", "Fasra", "Blows", "Jwmgra"],
                "Men": ["Shirt", "Gamsa", "Waistcoat"],
                "Accessories": ["Aronai", "Bag", "Flowers"]
            };

            categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            if (categoryMap[gender]) {
                categoryMap[gender].forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat;
                    if (cat === selectedCategory) option.selected = true;
                    categorySelect.appendChild(option);
                });
            }
        };

        window.renderImagePreview = function() {
            const previewContainer = document.getElementById('image-preview-container');
            const promptContent = document.getElementById('upload-prompt-content');
            if(!previewContainer || !promptContent) return;

            previewContainer.innerHTML = ''; 
            const totalImages = currentEditImageUrls.length + selectedFiles.length;

            if (totalImages > 0) {
                promptContent.style.display = 'none';
                previewContainer.style.display = 'flex';

                let html = '';
                currentEditImageUrls.forEach((url, index) => {
                    html += `
                        <div style="position:relative; display:inline-block; margin: 4px;">
                            <img src="${url}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid var(--input-border);">
                            <button type="button" onclick="window.removeEditImage(${index})" style="position:absolute; top:-8px; right:-8px; background:var(--danger); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.2);"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                });

                selectedFiles.forEach((file, index) => {
                    const objectUrl = URL.createObjectURL(file);
                    html += `
                        <div style="position:relative; display:inline-block; margin: 4px;">
                            <img src="${objectUrl}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 2px solid var(--success);">
                            <button type="button" onclick="window.removeNewImage(${index})" style="position:absolute; top:-8px; right:-8px; background:var(--danger); color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.2);"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    `;
                });
                previewContainer.innerHTML = html;
            } else {
                promptContent.style.display = 'block';
                previewContainer.style.display = 'none';
            }
        };

        window.removeEditImage = function(index) {
            currentEditImageUrls.splice(index, 1);
            window.renderImagePreview();
        };

        window.removeNewImage = function(index) {
            selectedFiles.splice(index, 1);
            document.getElementById('file-upload').value = "";
            window.renderImagePreview();
        };

        window.handleFileSelect = function(e) {
            const files = Array.from(e.target.files);
            if (currentEditImageUrls.length + selectedFiles.length + files.length > 5) {
                alert("You can only have a maximum of 5 images per product.");
                e.target.value = "";
                return;
            }
            selectedFiles = selectedFiles.concat(files);
            e.target.value = ""; 
            window.renderImagePreview();
        };

        window.editProduct = function(productId) {
            const product = globalSellerProducts.find(p => p.id === productId);
            if (!product) {
                alert("Error: Product data not found.");
                return;
            }

            editingProductId = product.id; 

            document.getElementById('p-name').value = product.title || "";
            document.getElementById('p-original-price').value = product.original_price || product.selling_price || 0;
            document.getElementById('p-price').value = product.selling_price || 0;
            document.getElementById('p-stock').value = product.stock || 0;
            
            const parts = (product.category || "").split(' - ');
            const catName = parts[0] ? parts[0].trim() : '';
            const genName = parts[1] ? parts[1].trim() : '';
            
            document.getElementById('p-gender').value = genName;
            window.updateCategoryOptions(genName, catName);

            document.getElementById('p-color').value = product.color || "";
            document.getElementById('p-fabric').value = product.fabric || "";
            document.getElementById('p-desc').value = product.description || "";
            
            document.getElementById('p-pay-cod').checked = product.allow_cod !== false; 
            document.getElementById('p-pay-online').checked = product.allow_online !== false; 

            currentEditImageUrls = product.images || [];
            selectedFiles = [];
            window.renderImagePreview();

            document.getElementById('submit-btn').innerText = "Update & Request Approval";
            document.getElementById('cancel-edit-btn').style.display = "inline-block";
            
            window.showSection('add-product');
        };

        window.cancelEdit = function() {
            document.getElementById('new-product-form').reset();
            document.getElementById('p-pay-cod').checked = true; 
            document.getElementById('p-pay-online').checked = true; 
            
            editingProductId = null;
            currentEditImageUrls = [];
            selectedFiles = [];
            window.renderImagePreview();

            document.getElementById('submit-btn').innerText = "Submit for Admin Approval";
            document.getElementById('cancel-edit-btn').style.display = "none";
            window.showSection('live-products');
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const overlay = document.getElementById('login-overlay');
            const errorMsg = document.getElementById('login-error');
            
            if (user) {
                activeUserEmail = user.email; 
                setSellerEmail(user.email);
                
                try {
                    const docRef = doc(db, "authorized_sellers", activeUserEmail);
                    const docSnap = await getDoc(docRef);
                    
                    if (!docSnap.exists()) {
                        await signOut(auth);
                        if (errorMsg) {
                            errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Unauthorized: Email not registered. Please contact JAMBAWEAR Admin.`;
                            errorMsg.style.display = 'block';
                        }
                        return; 
                    }

                    if (errorMsg) errorMsg.style.display = 'none';
                    if (overlay) overlay.style.display = 'none';
                    
                    // Fetch Profile
                    const profileRef = doc(db, "seller_profiles", activeUserEmail);
                    const profileSnap = await getDoc(profileRef);
                    
                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        setSellerProfile(data);
                        tempProfilePhoto = data.profilePhoto || ""; 
                        setSameAsPermanent(data.sameAsPermanent || false);
                        setSelectedState(data.state || "");
                        setSelectedDistrict(data.district || "");
                        setSelectedPickupState(data.pickupState || "");
                        setSelectedPickupDistrict(data.pickupDistrict || "");
                        setIsProfileEditing(false); // Valid profile exists, show beautiful UI
                    } else {
                        setIsProfileEditing(true); // New seller, force them to edit profile
                    }

                    // Boot other data
                    setWallet({ available: 0, pending: 0, withdrawn: 0 });
                    setPayoutHistory([]);
                    await loadSellerInventory(activeUserEmail); 
                    await loadSellerOrders(activeUserEmail); 

                } catch (err) {
                    console.error("Verification failed", err);
                }
            } else {
                if (overlay) overlay.style.display = 'flex';
            }
        });

        return () => unsubscribe();
    }, []); // Empty array guarantees this hook only runs ONCE!

    window.handleSellerLogin = async () => {
        const errorMsg = document.getElementById('login-error');
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
            errorMsg.innerText = "Login failed: " + error.message;
            errorMsg.style.display = 'block';
        }
    };

    window.handleLogout = async () => {
        await signOut(auth);
        window.location.reload(); 
    };

    const handleProductSubmit = async function(e) {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting to Admin...';

        if(!sellerProfile.brandName || !sellerProfile.sellerName || !selectedState) {
            alert("Please complete your Store Profile (Brand, Permanent & Pickup Location) before submitting a product!");
            window.showSection('profile');
            submitBtn.disabled = false;
            submitBtn.innerText = editingProductId ? "Update & Request Approval" : "Submit for Admin Approval";
            return;
        }

        try {
            let finalUrls = [...currentEditImageUrls];
            
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("upload_preset", "jambawear_preset");
                    const res = await fetch("https://api.cloudinary.com/v1_1/dbbafwgug/image/upload", { method: "POST", body: formData });
                    const data = await res.json();
                    if (data.secure_url) finalUrls.push(data.secure_url);
                    else throw new Error(data.error?.message || "Image upload failed.");
                }
            }

            if (finalUrls.length === 0) throw new Error("Please upload at least 1 image.");

            const productData = {
                title: document.getElementById('p-name').value || "",
                original_price: parseFloat(document.getElementById('p-original-price').value) || 0,
                selling_price: parseFloat(document.getElementById('p-price').value) || 0,
                stock: parseInt(document.getElementById('p-stock').value) || 0, 
                category: (document.getElementById('p-category').value || "") + " - " + (document.getElementById('p-gender').value || ""),
                images: finalUrls,
                description: document.getElementById('p-desc').value || "",
                color: document.getElementById('p-color').value || "",
                fabric: document.getElementById('p-fabric').value || "",
                
                brandName: sellerProfile.brandName || "",
                sellerName: sellerProfile.sellerName || "",
                sellerPhone: sellerProfile.primaryPhone || "",
                sellerEmail: sellerProfile.storeEmail || activeUserEmail, 
                
                sellerAddress: sellerProfile.address || "",
                city: sellerProfile.town || "",
                district: sellerProfile.district || "",
                state: selectedState || "",
                pincode: sellerProfile.pincode || "",

                pickupAddress: sellerProfile.pickupAddress || "",
                pickupTown: sellerProfile.pickupTown || "",
                pickupDistrict: selectedPickupDistrict || "",
                pickupState: selectedPickupState || "",
                pickupPincode: sellerProfile.pickupPincode || "",
                
                allow_cod: document.getElementById('p-pay-cod').checked,
                allow_online: document.getElementById('p-pay-online').checked,
                
                approval_status: "pending", 
                isHidden: true,
                updated_at: new Date().toISOString()
            };

            if (editingProductId) {
                await updateDoc(doc(db, "products", editingProductId), productData);
                window.showToast("Product Updated & Sent for Approval!");
            } else {
                productData.item_id = "JW" + Date.now().toString().slice(-6);
                productData.created_at = new Date().toISOString();
                await addDoc(collection(db, "products"), productData);
                window.showToast("Product Submitted for Admin Approval!");
            }

            document.getElementById('new-product-form').reset();
            document.getElementById('cancel-edit-btn').style.display = "none";
            editingProductId = null;
            currentEditImageUrls = [];
            selectedFiles = [];
            window.renderImagePreview();
            
            window.showSection('live-products');
            loadSellerInventory(activeUserEmail);
        } catch (err) { 
            alert("Error submitting product: " + err.message); 
        } finally { 
            submitBtn.disabled = false; 
            submitBtn.innerText = "Submit for Admin Approval"; 
        }
    };

    async function loadSellerInventory(email) {
        try {
            const q = query(collection(db, "products"), where("sellerEmail", "==", email));
            const querySnapshot = await getDocs(q);
            
            globalSellerProducts = []; 
            querySnapshot.forEach((doc) => {
                globalSellerProducts.push({ id: doc.id, ...doc.data() });
            });
            
            renderInventoryList(globalSellerProducts);
        } catch (err) {
            console.error("Inventory Load Error:", err);
        }
    }

    function renderInventoryList(productsToRender) {
        const inventoryList = document.getElementById('seller-inventory-list');
        if(!inventoryList) return;
        inventoryList.innerHTML = ''; 
        
        if(productsToRender.length === 0) {
            inventoryList.innerHTML = '<p style="padding: 20px; color: var(--text-muted); font-weight: 500;">You haven\'t submitted any products yet.</p>';
            return;
        }

        productsToRender.forEach((product) => {
            let mainImgUrl = (product.images && product.images.length > 0) ? product.images[0] : "https://via.placeholder.com/150";

            let statusBadge = '';
            if (product.approval_status === 'pending') {
                statusBadge = '<span class="hero-badge" style="background-color: var(--accent);"><i class="fa-solid fa-clock"></i> Pending Admin Approval</span>';
            } else if (product.approval_status === 'rejected') {
                statusBadge = '<span class="hero-badge" style="background-color: var(--danger);"><i class="fa-solid fa-xmark"></i> Rejected</span>';
            } else {
                statusBadge = '<span class="hero-badge" style="background-color: var(--success);"><i class="fa-solid fa-check-double"></i> Live on Store</span>';
            }

            inventoryList.innerHTML += `
            <div class="card" style="display: flex; gap: 24px; padding: 24px; border: ${product.approval_status === 'pending' ? '2px solid var(--accent)' : '1px solid #e5e7eb'}">
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 600; color: var(--primary); margin-bottom: 8px;">${product.title}</div>
                    <div style="font-size: 14px; color: var(--text-main); margin-bottom: 12px;">
                        <span style="font-weight: 600;">₹${product.selling_price}</span> &nbsp;<span style="color:#d1d5db;">|</span>&nbsp; ${product.category || 'N/A'} &nbsp;<span style="color:#d1d5db;">|</span>&nbsp; Stock: <strong>${product.stock || 0}</strong>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                        ${statusBadge}
                        <button type="button" class="action-btn btn-edit" style="padding: 6px 12px; font-size: 12px;" onclick="window.editProduct('${product.id}')"><i class="fa-solid fa-pen"></i> Edit Details</button>
                    </div>
                </div>
                <img src="${mainImgUrl}" style="width:90px; height:90px; object-fit:cover; border-radius:8px; border: 1px solid #e5e7eb;">
            </div>`;
        });
    }

    async function loadSellerOrders(email) {
        try {
            const querySnapshot = await getDocs(collection(db, "orders"));
            let sellerOrders = [];
            
            querySnapshot.forEach(document => {
                const orderData = document.data();
                if(orderData.items) {
                    const hasMyItems = orderData.items.some(item => item.sellerEmail === email || item.brandName === sellerProfile.brandName);
                    if(hasMyItems) {
                        sellerOrders.push({ id: document.id, ...orderData });
                    }
                }
            });

            sellerOrders.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
            renderOrdersList(sellerOrders);
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    }

    window.acceptOrder = async function(orderId) {
        if(confirm("By accepting, you confirm you have this item in stock and will prepare it for pickup.")) {
            try {
                await updateDoc(doc(db, "orders", orderId), { 
                    seller_accepted: true,
                    accepted_at: new Date().toISOString()
                });
                window.showToast("Order Accepted Successfully!");
                loadSellerOrders(activeUserEmail);
            } catch(e) {
                alert("Error accepting order: " + e.message);
            }
        }
    };

    function renderOrdersList(ordersToRender) {
        const ordersList = document.getElementById('seller-orders-list');
        if(!ordersList) return;
        ordersList.innerHTML = ''; 
        
        if(ordersToRender.length === 0) {
            ordersList.innerHTML = '<p style="padding: 20px; color: var(--text-muted); font-weight: 500;">No pending orders for your products right now.</p>';
            return;
        }

        ordersToRender.forEach(order => {
            const isAcceptedBySeller = order.seller_accepted === true;
            const pMethod = order.payment_method || order.paymentMethod;
            const isCOD = pMethod && pMethod.toUpperCase() === 'COD';
            
            let actionAreaHtml = '';
            
            if (isCOD && !isAcceptedBySeller) {
                actionAreaHtml = `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                        <button type="button" class="action-btn btn-status-active" style="width: 100%; padding: 12px; font-size: 14px;" onclick="window.acceptOrder('${order.id}')">
                            <i class="fa-solid fa-handshake"></i> Accept COD Order
                        </button>
                    </div>
                `;
            } else if (!order.shipping_label_url && !order.trackingId) {
                const waitingText = isCOD 
                    ? "Order Accepted. Waiting for Admin to generate tracking details..." 
                    : "Prepaid Order Verified. Waiting for Admin to generate tracking details...";

                actionAreaHtml = `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: var(--accent); font-weight: 600; font-size: 13px;">
                        <i class="fa-solid fa-hourglass-half"></i> ${waitingText}
                    </div>
                `;
            } else if (order.trackingId) {
                actionAreaHtml = `
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #e5e7eb;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                            <strong>Courier:</strong> ${order.courierName} | <strong>Tracking:</strong> ${order.trackingId}
                        </div>
                    </div>
                `;
            }

            let itemsHtml = order.items.map(i => `
                <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #eee;">
                    <img src="${i.image || 'https://via.placeholder.com/80x100'}" style="width: 50px; height: 60px; object-fit: cover; border-radius: 4px;">
                    <div style="line-height: 1.4; font-size:13px;">
                        <strong style="font-size: 13px;">${i.quantity}x</strong> ${i.title} <br>
                        <span style="color: var(--text-muted);">Size: ${i.size || 'N/A'}</span>
                    </div>
                </div>
            `).join('');

            ordersList.innerHTML += `
                <div class="card" style="padding: 24px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); font-weight: 500;">Order Ref: ${order.id}</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Placed: ${new Date(order.created_at || order.createdAt).toLocaleString()}</div>
                            <div style="font-size: 11px; font-weight: bold; color: ${isCOD ? '#b45309' : '#1d4ed8'}; margin-top: 6px;">
                                ${isCOD ? '<i class="fa-solid fa-money-bill"></i> CASH ON DELIVERY' : '<i class="fa-solid fa-credit-card"></i> PREPAID ONLINE'}
                            </div>
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: var(--primary);">₹${order.total || order.totalAmount}</div>
                    </div>
                    
                    <div style="border: 1px solid #e5e7eb; border-top: 3px solid #3b82f6; padding: 16px; border-radius: 6px; background: #fff;">
                        <strong style="color: var(--primary); display:flex; align-items: center; gap: 6px; margin-bottom:12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
                            <i class="fa-solid fa-box-open" style="color: #3b82f6;"></i> Items to fulfill
                        </strong>
                        <div style="max-height: 150px; overflow-y: auto;">
                            ${itemsHtml}
                        </div>
                    </div>

                    ${actionAreaHtml}
                </div>`;
        });
    }

    window.handleProfilePhotoUpload = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const btnText = document.getElementById('profile-photo-btn-text');
        if(btnText) btnText.innerText = "Uploading...";
        
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "jambawear_preset");
            
            const res = await fetch("https://api.cloudinary.com/v1_1/dbbafwgug/image/upload", { method: "POST", body: formData });
            const data = await res.json();
            
            if (data.secure_url) {
                tempProfilePhoto = data.secure_url;
                setSellerProfile(prev => ({...prev, profilePhoto: data.secure_url}));
                window.showToast("Photo uploaded! Click Save to confirm.");
            } else {
                throw new Error("Upload failed");
            }
        } catch (err) {
            alert("Image upload failed: " + err.message);
        } finally {
            if(btnText) btnText.innerText = "Change Photo";
            e.target.value = ""; 
        }
    };

    const handleProfileSave = async function(e) {
        e.preventDefault();

        const accNum = document.getElementById('bank-acc-num').value;
        const confirmAccNum = document.getElementById('bank-acc-num-confirm').value;
        const ifsc = document.getElementById('bank-ifsc').value;
        const confirmIfsc = document.getElementById('bank-ifsc-confirm').value;

        if (accNum !== confirmAccNum) {
            alert("Account Numbers do not match. Please verify carefully.");
            return;
        }

        if (ifsc !== confirmIfsc) {
            alert("IFSC Codes do not match. Please verify carefully.");
            return;
        }

        const btn = document.getElementById('save-profile-btn');
        btn.disabled = true;
        btn.innerText = 'Saving...';

        const profileData = {
            email: activeUserEmail,
            profilePhoto: tempProfilePhoto,
            brandName: document.getElementById('prof-brand-name').value,
            sellerName: document.getElementById('prof-seller-name').value,
            storeEmail: document.getElementById('prof-email').value,
            primaryPhone: document.getElementById('prof-phone-1').value,
            secondaryPhone: document.getElementById('prof-phone-2').value,
            
            address: document.getElementById('prof-address').value,
            town: document.getElementById('prof-town').value,
            state: selectedState,
            district: selectedDistrict,
            pincode: document.getElementById('prof-pincode').value,
            
            pickupAddress: sameAsPermanent ? document.getElementById('prof-address').value : document.getElementById('pickup-address').value,
            pickupTown: sameAsPermanent ? document.getElementById('prof-town').value : document.getElementById('pickup-town').value,
            pickupState: sameAsPermanent ? selectedState : selectedPickupState,
            pickupDistrict: sameAsPermanent ? selectedDistrict : selectedPickupDistrict,
            pickupPincode: sameAsPermanent ? document.getElementById('prof-pincode').value : document.getElementById('pickup-pincode').value,
            sameAsPermanent: sameAsPermanent,

            bankName: document.getElementById('bank-name').value,
            accName: document.getElementById('bank-acc-name').value,
            accNumber: accNum,
            ifsc: ifsc,
            updated_at: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "seller_profiles", activeUserEmail), profileData);
            setSellerProfile(profileData); 
            setIsProfileEditing(false); 
            window.showToast("Store Profile Saved!");
        } catch (err) {
            alert("Failed to save profile.");
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Profile Details';
        }
    };

    window.requestPayout = async function() {
        if(!sellerProfile.accNumber) {
            alert("Please save your Bank Details in the 'Store Profile' tab before requesting a payout.");
            window.showSection('profile');
            return;
        }

        if(wallet.available <= 0) {
            alert("You have no available balance to withdraw.");
            return;
        }

        if(confirm(`Request withdrawal of ₹${wallet.available}?`)) {
            try {
                await addDoc(collection(db, "payout_requests"), { 
                    email: activeUserEmail, 
                    amount: wallet.available,
                    status: 'pending',
                    date: new Date().toISOString()
                });
                window.showToast("Payout Request Submitted to Admin!");
            } catch(err) {
                alert("Failed to request payout.");
            }
        }
    };

    return (
        <div className="seller-isolated-wrapper">
            <div id="toast-notification" className="toast-notification"></div>

            <div id="login-overlay">
                <div className="login-box" style={{ textAlign: 'center' }}>
                    <h2><span style={{ color: 'var(--accent)' }}>JAMBA</span>WEAR</h2>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '10px', fontSize: '16px' }}>Seller Dashboard</h3>
                    <p>Log in to manage your inventory and orders.</p>
                    <div className="login-error" id="login-error" style={{ display: 'none', marginBottom: '15px' }}></div>
                    <button type="button" className="btn-submit" onClick={() => window.handleSellerLogin()} style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <i className="fa-brands fa-google"></i> Sign In With Google
                    </button>
                </div>
            </div>

            <nav className="sidebar">
                <div className="logo-container" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="logo-text"><span className="logo-jamba">JAMBA</span>WEAR</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', fontWeight: 'bold', marginTop: '4px', textTransform: 'uppercase' }}>Seller Dashboard</span>
                </div>
                <ul className="nav-menu">
                    <li className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => window.showSection('orders')}><i className="fa-solid fa-truck"></i> My Orders</li>
                    <li className={`nav-item ${activeTab === 'live-products' ? 'active' : ''}`} onClick={() => window.showSection('live-products')}><i className="fa-solid fa-layer-group"></i> My Catalogue</li>
                    <li className={`nav-item ${activeTab === 'add-product' ? 'active' : ''}`} onClick={() => window.showSection('add-product')}><i className="fa-solid fa-plus"></i> Submit Product</li>
                    <li className={`nav-item ${activeTab === 'payouts' ? 'active' : ''}`} onClick={() => window.showSection('payouts')}><i className="fa-solid fa-wallet"></i> Earnings & Payouts</li>
                    <li className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => window.showSection('profile')}><i className="fa-solid fa-user-gear"></i> Store Profile</li>
                </ul>
            </nav>

            <div className="main-pannel">
                <div className="header">
                    <h1>Seller Dashboard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}><i className="fa-solid fa-user"></i> {sellerEmail}</span>
                        <button type="button" className="btn-login" onClick={() => window.handleLogout()}>Logout</button>
                    </div>
                </div>

                {/* MY ORDERS TAB */}
                <div id="orders" className={`content-section ${activeTab === 'orders' ? 'active' : ''}`}>
                    <span className="section-title" style={{ marginBottom: '24px' }}>Incoming Orders</span>
                    <div id="seller-orders-list">
                        <p style={{ padding: '20px', fontWeight: '500', color: 'var(--text-muted)' }}>Loading incoming orders...</p>
                    </div>
                </div>

                {/* MY PRODUCTS TAB */}
                <div id="live-products" className={`content-section ${activeTab === 'live-products' ? 'active' : ''}`}>
                    <span className="section-title" style={{ marginBottom: '24px' }}>My Catalogue</span>
                    <div id="seller-inventory-list">
                        <p style={{ padding: '20px', fontWeight: '500', color: 'var(--text-muted)' }}>Loading your inventory...</p>
                    </div>
                </div>

                {/* SUBMIT/EDIT PRODUCT TAB */}
                <div id="add-product" className={`content-section ${activeTab === 'add-product' ? 'active' : ''}`}>
                    <span className="section-title" style={{ marginBottom: '24px' }}>Submit/Edit Product</span>
                    <p className="text-helper" style={{ marginBottom: '20px' }}>Your brand and dispatch information will be automatically attached using your Store Profile.</p>
                    
                    <form className="card" id="new-product-form" onSubmit={handleProductSubmit}>
                        <span className="section-subtitle">Product Details</span>
                        <div className="field-grid">
                            <div className="form-group"><span className="label">Product Name</span><input type="text" id="p-name" className="input-box" placeholder="e.g. Classic Bodo Waistcoat" required /></div>
                            <div className="form-group"><span className="label">Original Price (₹)</span><input type="number" id="p-original-price" className="input-box" placeholder="2500" required min="0" /></div>
                            <div className="form-group"><span className="label">Selling Price (₹)</span><input type="number" id="p-price" className="input-box" placeholder="1999" required min="0" /></div>
                        </div>
                        
                        <div className="field-grid">
                            <div className="form-group">
                                <span className="label">Department / Gender</span> 
                                <select id="p-gender" className="input-box" required defaultValue="" onChange={(e) => window.updateCategoryOptions(e.target.value)}>
                                    <option value="" disabled>Select Department</option>
                                    <option value="Women">Women</option>
                                    <option value="Men">Men</option>
                                    <option value="Accessories">Accessories</option> 
                                </select>
                            </div>
                            <div className="form-group">
                                <span className="label">Category</span>
                                <select id="p-category" className="input-box" required defaultValue="">
                                    <option value="" disabled>Select Department First</option>
                                </select>
                            </div>
                            <div className="form-group"><span className="label">Available Stock</span><input type="number" id="p-stock" className="input-box" placeholder="e.g. 50" required min="0" /></div>
                        </div>
                        
                        <div className="field-grid">
                            <div className="form-group"><span className="label">Colour</span><input type="text" id="p-color" className="input-box" placeholder="e.g. Mustard Yellow" required /></div>
                            <div className="form-group"><span className="label">Fabric</span><input type="text" id="p-fabric" className="input-box" placeholder="e.g. Pure Cotton" required /></div>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '30px' }}>
                            <span className="label">Description</span>
                            <textarea id="p-desc" className="input-box" style={{ height: '100px' }} placeholder="Write a compelling description for the product..." required></textarea>
                        </div>

                        <div style={{ marginBottom: '30px', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--input-border)' }}>
                            <span className="label" style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: 'var(--primary)' }}>Allowed Payment Ways</span>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                    <input type="checkbox" id="p-pay-cod" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} /> Cash on Delivery (COD)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                    <input type="checkbox" id="p-pay-online" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} /> Online Payment
                                </label>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <span className="section-subtitle">Product Images (Max 5)</span>
                            <label htmlFor="file-upload" className="product-preview upload-label">
                                <div id="upload-prompt-content">
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--text-muted)' }}></i><br />
                                    <span>Click to upload up to 5 high-quality images</span>
                                </div>
                                <div id="image-preview-container" className="preview-grid" style={{ display: 'none' }}></div>
                            </label>
                            <input id="file-upload" type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => window.handleFileSelect(e)} />
                        </div>
                        
                        <button type="submit" id="submit-btn" className="btn-submit">Submit for Admin Approval</button> 
                        <button type="button" id="cancel-edit-btn" className="btn-submit" style={{ background: '#ffffff', color: 'var(--text-main)', border: '1px solid var(--input-border)', display: 'none', marginLeft: '10px' }} onClick={() => window.cancelEdit()}>Cancel Edit</button> 
                    </form>
                </div>

                {/* EARNINGS & PAYOUTS TAB */}
                <div id="payouts" className={`content-section ${activeTab === 'payouts' ? 'active' : ''}`}>
                    <span className="section-title" style={{ marginBottom: '24px' }}>Earnings & Payouts</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                        <div className="card" style={{ padding: '24px', marginBottom: '0', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Pending Escrow</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>₹{wallet.pending}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Funds in clearing or return window</div>
                        </div>

                        <div className="card" style={{ padding: '24px', marginBottom: '0', borderLeft: '4px solid var(--success)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Available for Payout</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>₹{wallet.available}</div>
                            <button type="button" className="action-btn" onClick={() => window.requestPayout()} style={{ marginTop: '12px', background: 'var(--primary)', color: 'white', border: 'none', width: '100%' }}>
                                Request Payout
                            </button>
                        </div>

                        <div className="card" style={{ padding: '24px', marginBottom: '0', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '8px' }}>Total Withdrawn</div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>₹{wallet.withdrawn}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Lifetime earnings paid out</div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '24px' }}>
                        <span className="section-subtitle">Payout History</span>
                        {payoutHistory.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>You have no previous payout requests.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Date</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Amount</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Status</th>
                                        <th style={{ padding: '12px 8px', fontWeight: '500' }}>Bank Ref (UTR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payoutHistory.map((p, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '12px 8px', color: 'var(--primary)' }}>{new Date(p.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: '600' }}>₹{p.amount}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                {p.status === 'paid' 
                                                    ? <span style={{ color: 'var(--success)', fontWeight: '600' }}><i className="fa-solid fa-check"></i> Paid</span> 
                                                    : <span style={{ color: 'var(--accent)', fontWeight: '600' }}><i className="fa-solid fa-clock"></i> Pending</span>}
                                            </td>
                                            <td style={{ padding: '12px 8px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.utr || 'Awaiting Transfer'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* STORE PROFILE TAB */}
                <div id="profile" className={`content-section ${activeTab === 'profile' ? 'active' : ''}`}>
                    
                    {isProfileEditing ? (
                        /* --- EDIT FORM UI --- */
                        <>
                            <span className="section-title" style={{ marginBottom: '24px' }}>Store Settings & Bank Details</span>
                            <form className="card" onSubmit={handleProfileSave}>
                                
                                <span className="section-subtitle"><i className="fa-solid fa-address-card" style={{ color: 'var(--text-muted)' }}></i> Identity & Branding</span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                                        {sellerProfile.profilePhoto ? (
                                            <img src={sellerProfile.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            sellerProfile.brandName ? sellerProfile.brandName.charAt(0).toUpperCase() : 'S'
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="profile-photo-upload" className="action-btn" style={{ background: '#f3f4f6', color: 'var(--text-main)', border: '1px solid var(--input-border)', cursor: 'pointer', display: 'inline-block', padding: '8px 16px' }}>
                                            <i className="fa-solid fa-camera"></i> <span id="profile-photo-btn-text">Upload Store Logo</span>
                                        </label>
                                        <input id="profile-photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => window.handleProfilePhotoUpload(e)} />
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Square image recommended (Max 2MB)</div>
                                    </div>
                                </div>

                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Brand Name</span><input type="text" id="prof-brand-name" defaultValue={sellerProfile.brandName || ""} className="input-box" placeholder="e.g. Bodo Weavers Auth" required /></div>
                                    <div className="form-group"><span className="label">Seller Name</span><input type="text" id="prof-seller-name" defaultValue={sellerProfile.sellerName || ""} className="input-box" placeholder="Owner's full name" required /></div>
                                </div>

                                <span className="section-subtitle" style={{ marginTop: '20px' }}><i className="fa-solid fa-phone" style={{ color: 'var(--text-muted)' }}></i> Contact</span>
                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Email</span><input type="email" id="prof-email" defaultValue={sellerProfile.storeEmail || ""} className="input-box" placeholder="store@example.com" required /></div>
                                    <div className="form-group"><span className="label">Primary Phone Number</span><input type="text" id="prof-phone-1" defaultValue={sellerProfile.primaryPhone || ""} className="input-box" required minLength="10" maxLength="10" /></div>
                                </div>
                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Secondary Phone Number</span><input type="text" id="prof-phone-2" defaultValue={sellerProfile.secondaryPhone || ""} className="input-box" minLength="10" maxLength="10" /></div>
                                </div>

                                <span className="section-subtitle" style={{ marginTop: '20px' }}><i className="fa-solid fa-location-dot" style={{ color: 'var(--text-muted)' }}></i> Permanent Address</span>
                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <span className="label">Permanent Address</span>
                                    <input type="text" id="prof-address" defaultValue={sellerProfile.address || ""} className="input-box" placeholder="Full permanent address..." required />
                                </div>

                                <div className="field-grid">
                                    <div className="form-group">
                                        <span className="label">State / UT</span>
                                        <select id="prof-state" className="input-box" required value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(""); }}>
                                            <option value="" disabled>Select State</option>
                                            {Object.keys(stateDistrictMap).sort().map(state => <option key={state} value={state}>{state}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <span className="label">District</span>
                                        <select id="prof-district" className="input-box" required value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} disabled={!selectedState}>
                                            <option value="" disabled>Select District</option>
                                            {selectedState && stateDistrictMap[selectedState] ? stateDistrictMap[selectedState].map(dist => <option key={dist} value={dist}>{dist}</option>) : null}
                                        </select>
                                    </div>
                                </div>

                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Town / City</span><input type="text" id="prof-town" defaultValue={sellerProfile.town || ""} className="input-box" placeholder="e.g. Kokrajhar" required /></div>
                                    <div className="form-group"><span className="label">Pincode</span><input type="text" id="prof-pincode" defaultValue={sellerProfile.pincode || ""} className="input-box" required minLength="6" maxLength="6" /></div>
                                </div>

                                <span className="section-subtitle" style={{ marginTop: '30px' }}><i className="fa-solid fa-box" style={{ color: 'var(--text-muted)' }}></i> Pickup Location</span>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: 'var(--primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={sameAsPermanent}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setSameAsPermanent(isChecked);
                                                if(isChecked) {
                                                    setSelectedPickupState(selectedState);
                                                    setSelectedPickupDistrict(selectedDistrict);
                                                    document.getElementById('pickup-address').value = document.getElementById('prof-address').value;
                                                    document.getElementById('pickup-town').value = document.getElementById('prof-town').value;
                                                    document.getElementById('pickup-pincode').value = document.getElementById('prof-pincode').value;
                                                }
                                            }}
                                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} 
                                        />
                                        Same as Permanent Address
                                    </label>
                                </div>

                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <span className="label">Pickup Address</span>
                                    <input type="text" id="pickup-address" defaultValue={sellerProfile.pickupAddress || ""} className="input-box" placeholder="Full address for courier pickups..." disabled={sameAsPermanent} required />
                                </div>

                                <div className="field-grid">
                                    <div className="form-group">
                                        <span className="label">State / UT</span>
                                        <select id="pickup-state" className="input-box" required value={selectedPickupState} onChange={(e) => { setSelectedPickupState(e.target.value); setSelectedPickupDistrict(""); }} disabled={sameAsPermanent}>
                                            <option value="" disabled>Select State</option>
                                            {Object.keys(stateDistrictMap).sort().map(state => <option key={state} value={state}>{state}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <span className="label">District</span>
                                        <select id="pickup-district" className="input-box" required value={selectedPickupDistrict} onChange={(e) => setSelectedPickupDistrict(e.target.value)} disabled={!selectedPickupState || sameAsPermanent}>
                                            <option value="" disabled>Select District</option>
                                            {selectedPickupState && stateDistrictMap[selectedPickupState] ? stateDistrictMap[selectedPickupState].map(dist => <option key={dist} value={dist}>{dist}</option>) : null}
                                        </select>
                                    </div>
                                </div>

                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Town / City</span><input type="text" id="pickup-town" defaultValue={sellerProfile.pickupTown || ""} className="input-box" placeholder="e.g. Kokrajhar" disabled={sameAsPermanent} required /></div>
                                    <div className="form-group"><span className="label">Pincode</span><input type="text" id="pickup-pincode" defaultValue={sellerProfile.pickupPincode || ""} className="input-box" required minLength="6" maxLength="6" disabled={sameAsPermanent} /></div>
                                </div>

                                <span className="section-subtitle" style={{ color: 'var(--success)', marginTop: '30px' }}><i className="fa-solid fa-building-columns"></i> Financial Details</span>
                                <p className="text-helper" style={{ marginBottom: '20px' }}>This account will be used by JAMBA Admin to transfer your cleared earnings. Please ensure details are exact.</p>
                                
                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Bank Name</span><input type="text" id="bank-name" defaultValue={sellerProfile.bankName || ""} className="input-box" placeholder="e.g. State Bank of India" required /></div>
                                    <div className="form-group"><span className="label">Account Holder Name</span><input type="text" id="bank-acc-name" defaultValue={sellerProfile.accName || ""} className="input-box" placeholder="Exact name on account" required /></div>
                                </div>
                                
                                <div className="field-grid">
                                    <div className="form-group"><span className="label">Account Number</span><input type="text" id="bank-acc-num" defaultValue={sellerProfile.accNumber || ""} className="input-box" required /></div>
                                    <div className="form-group"><span className="label" style={{ color: 'var(--danger)' }}>Confirm Account Number</span><input type="text" id="bank-acc-num-confirm" defaultValue={sellerProfile.accNumber || ""} className="input-box" style={{ borderColor: '#fca5a5' }} required /></div>
                                </div>
                                
                                <div className="field-grid">
                                    <div className="form-group"><span className="label">IFSC Code</span><input type="text" id="bank-ifsc" defaultValue={sellerProfile.ifsc || ""} className="input-box" placeholder="e.g. SBIN0001234" required /></div>
                                    <div className="form-group"><span className="label" style={{ color: 'var(--danger)' }}>Confirm IFSC Code</span><input type="text" id="bank-ifsc-confirm" defaultValue={sellerProfile.ifsc || ""} className="input-box" style={{ borderColor: '#fca5a5' }} placeholder="e.g. SBIN0001234" required /></div>
                                </div>

                                <button type="submit" id="save-profile-btn" className="btn-submit" style={{ marginTop: '30px' }}>Save Profile Details</button>
                            </form>
                        </>

                    ) : (

                        /* --- READ-ONLY BEAUTIFUL UI --- */
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <span className="section-title" style={{ margin: 0 }}>Store Profile</span>
                                <button type="button" className="btn-login" onClick={() => setIsProfileEditing(true)}>
                                    <i className="fa-solid fa-pen" style={{ marginRight: '6px' }}></i> Edit Profile
                                </button>
                            </div>

                            <div className="card" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', overflow: 'hidden' }}>
                                        {sellerProfile.profilePhoto ? (
                                            <img src={sellerProfile.profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            sellerProfile.brandName ? sellerProfile.brandName.charAt(0).toUpperCase() : 'S'
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{sellerProfile.brandName}</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Owned by {sellerProfile.sellerName}</div>
                                    </div>
                                </div>

                                <div className="field-grid">
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}><i className="fa-solid fa-phone"></i> Contact Details</div>
                                        <div style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.6' }}>
                                            <strong>Email:</strong> {sellerProfile.storeEmail}<br/>
                                            <strong>Primary:</strong> {sellerProfile.primaryPhone}<br/>
                                            <strong>Secondary:</strong> {sellerProfile.secondaryPhone || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}><i className="fa-solid fa-building-columns"></i> Banking Info</div>
                                        <div style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.6' }}>
                                            <strong>Bank:</strong> {sellerProfile.bankName}<br/>
                                            <strong>Holder:</strong> {sellerProfile.accName}<br/>
                                            <strong>A/C No:</strong> •••• •••• {String(sellerProfile.accNumber).slice(-4)}<br/>
                                            <strong>IFSC:</strong> {sellerProfile.ifsc}
                                        </div>
                                    </div>
                                </div>

                                <div className="field-grid" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f3f4f6' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}><i className="fa-solid fa-location-dot"></i> Permanent Address</div>
                                        <div style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.6' }}>
                                            {sellerProfile.address}<br/>
                                            {sellerProfile.town}, {sellerProfile.district}<br/>
                                            {sellerProfile.state} - <strong>{sellerProfile.pincode}</strong>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}><i className="fa-solid fa-box"></i> Pickup Location</div>
                                        <div style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.6' }}>
                                            {sellerProfile.pickupAddress}<br/>
                                            {sellerProfile.pickupTown}, {sellerProfile.pickupDistrict}<br/>
                                            {sellerProfile.pickupState} - <strong>{sellerProfile.pickupPincode}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}