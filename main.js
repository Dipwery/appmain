// ১. প্রয়োজনীয় Firebase মডিউলগুলো import করুন
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, onValue, set, push } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js"; 

// ২. আপনার Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyA42LzYBbvJ3k74zXLl4gb-_UmsbuknDhI", 
    authDomain: "save-21ab8.firebaseapp.com",
    projectId: "save-21ab8",
    storageBucket: "save-21ab8.firebasestorage.app",
    messagingSenderId: "443569656328",
    appId: "1:443569656328:web:ef54880950a9d74df1b7bd",
    measurementId: "G-DJE6L2GDGQ",
    databaseURL: "https://save-21ab8-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// ৩. Firebase অ্যাপ এবং সার্ভিসগুলো ইনিশিয়ালাইজ করুন
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ৪. গ্লোবাল ডেটা স্টেট
let currentUser = null;
let appData = {
    balance: 0,
    totalIncome: 0,
    totalWithdraw: 0,
    dailyRate: 400, 
    lastDate: "--/--/----", 
    lastActionDate: null, 
    transactions: [],
    attendance: {} 
};
let currentReportDate = new Date();
const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

// ***** নোটিফিকেশনের জন্য গ্লোবাল ভেরিয়েবল *****
let lastMessageTimestamp = 0; 

// --- গ্লোবাল ফাংশনগুলো উইন্ডো অবজেক্টে যোগ করা ---
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutUser = logoutUser;
window.toggleAuthMode = toggleAuthMode;
window.markAttendance = markAttendance;
window.markPastAttendance = markPastAttendance; 
window.withdrawMoney = withdrawMoney;
window.showSection = showSection;
window.downloadPDF = downloadPDF;
window.updateDailyRate = updateDailyRate;
window.changeMonth = changeMonth;
window.toggleMenu = toggleMenu;
window.sendMessage = sendMessage; 
window.requestNotificationPermission = requestNotificationPermission; // নতুন

// ৫. ইউজার লগইন স্টেট মনিটর করা
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("auth-view").style.display = "none";
        document.getElementById("content").style.display = "block";
        document.getElementById("userEmailDisplay").innerText = "লগইন: " + user.email;
        loadDataOnline(); 
        showSection('dashboard-view'); 
        checkNotificationStatus(); // লগইনের পর স্ট্যাটাস চেক
    } else {
        currentUser = null;
        document.getElementById("auth-view").style.display = "block";
        document.getElementById("content").style.display = "none";
        document.getElementById("userEmailDisplay").innerText = "";
    }
});

// ৬. ডাটাবেস থেকে ডাটা নামানো
function loadDataOnline() {
    const uid = currentUser.uid;
    const userRef = ref(db, 'users/' + uid);
    
    onValue(userRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            appData = {
                balance: data.balance || 0,
                totalIncome: data.totalIncome || 0,
                totalWithdraw: data.totalWithdraw || 0,
                dailyRate: data.dailyRate || 400,
                lastDate: data.lastDate || "--/--/----",
                lastActionDate: data.lastActionDate || null,
                transactions: data.transactions || [],
                attendance: data.attendance || {}
            };
        } else {
            saveDataOnline(); 
        }
        updateUI(); 
    });
}

// ৭. ডাটাবেসে ডাটা পাঠানো
function saveDataOnline() {
    if (currentUser) {
        const userRef = ref(db, 'users/' + currentUser.uid);
        set(userRef, appData).catch((error) => console.error("Error:", error));
    }
}

// ৮. লগইন/রেজিস্ট্রেশন
function loginUser() {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    if(!e || !p) { document.getElementById("authError").innerText = "ইমেইল এবং পাসওয়ার্ড দিন"; return; }
    signInWithEmailAndPassword(auth, e, p).catch(err => document.getElementById("authError").innerText = "লগইন এরর: " + err.message);
}

function registerUser() {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    if(!e || !p || p.length < 6) { document.getElementById("authError").innerText = "সঠিক তথ্য দিন (পাসওয়ার্ড ৬+)।"; return; }
    createUserWithEmailAndPassword(auth, e, p).then(() => alert("অ্যাকাউন্ট তৈরি সফল!")).catch(err => document.getElementById("authError").innerText = err.message);
}

function logoutUser() {
    signOut(auth).then(() => location.reload());
}

let isLoginMode = true;
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById("authTitle").innerText = isLoginMode ? "লগইন" : "নতুন অ্যাকাউন্ট";
    document.getElementById("loginBtn").style.display = isLoginMode ? "inline-block" : "none";
    document.getElementById("regBtn").style.display = isLoginMode ? "none" : "inline-block";
    document.getElementById("toggleText").innerHTML = isLoginMode ? "অ্যাকাউন্ট নেই? <span>নতুন খুলুন</span>" : "আগেই অ্যাকাউন্ট আছে? <span>লগইন করুন</span>";
    document.getElementById("authError").innerText = "";
}

// ৯. সেটিংস: দৈনিক বেতন হার আপডেট
function updateDailyRate() {
    const rate = parseInt(document.getElementById("dailyRateInput").value);
    if (rate > 0) {
        appData.dailyRate = rate;
        saveDataOnline();
        updateUI();
        alert(`✅ দৈনিক রেট ৳ ${rate} আপডেট হয়েছে।`);
    } else {
        alert("❌ সঠিক টাকার পরিমাণ দিন।");
    }
}

// ১০. আজকের হাজিরা
function markAttendance(status) {
    if (!currentUser) return;
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('bn-BD');
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    if (appData.lastActionDate === todayStr) { alert("⚠️ আজকের এন্ট্রি ইতিমধ্যে নেওয়া হয়েছে!"); return; }

    if (!appData.attendance[year]) appData.attendance[year] = {};
    if (!appData.attendance[year][month]) appData.attendance[year][month] = {};
    
    appData.attendance[year][month][day] = status;

    if (status === 'Present') {
        const income = appData.dailyRate;
        appData.totalIncome += income;
        appData.balance += income;
        addTransaction(todayStr, "বেতন (উপস্থিত)", "জমা", income);
    } else {
        addTransaction(todayStr, "অনুপস্থিত", "---", 0);
    }

    appData.lastDate = todayStr;
    appData.lastActionDate = todayStr;
    saveDataOnline(); 
    alert("✅ উপস্থিতি গ্রহণ করা হয়েছে।");
}

// ১১. সেটিংস: অতীত তারিখের হাজিরা
function markPastAttendance(status) {
    if (!currentUser) return;
    
    const dateInput = document.getElementById("pastDateInput").value;
    if (!dateInput) { alert("তারিখ নির্বাচন করুন।"); return; }

    const selectedDate = new Date(dateInput);
    const today = new Date();
    if (selectedDate > today) { alert("ভবিষ্যতের তারিখ দেওয়া যাবে না।"); return; }
    
    const year = selectedDate.getFullYear().toString();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const dateStrBn = selectedDate.toLocaleDateString('bn-BD'); 

    if (!appData.attendance[year]) appData.attendance[year] = {};
    if (!appData.attendance[year][month]) appData.attendance[year][month] = {};
    
    if (appData.attendance[year][month][day]) {
        if (!confirm(`${dateStrBn} এর ডাটা আছে। রিপ্লেস করবেন?`)) return;
    }
    
    appData.attendance[year][month][day] = status;

    if (status === 'Present') {
        const income = appData.dailyRate;
        appData.totalIncome += income;
        appData.balance += income;
        addTransaction(dateStrBn, `অতীতের এন্ট্রি (${dateStrBn})`, "জমা", income);
    } else {
        addTransaction(dateStrBn, `অতীতের এন্ট্রি (${dateStrBn}) - না`, "---", 0);
    }

    saveDataOnline(); 
    alert(`✅ ${dateStrBn} তারিখ আপডেট হয়েছে।`);
}

// ১২. সেটিংস: টাকা তোলা 
function withdrawMoney() {
    if (!currentUser) return;

    const amountInput = document.getElementById("withdrawAmount");
    const reasonInput = document.getElementById("withdrawReason");
    const amount = parseFloat(amountInput.value);
    const reason = reasonInput.value || "খরচ";

    if (!amount || amount <= 0) { alert("টাকার পরিমাণ লিখুন।"); return; }
    
    if (amount > appData.balance) { alert("অপর্যাপ্ত ব্যালেন্স!"); return; } 
    
    const todayStr = new Date().toLocaleDateString('bn-BD');
    
    appData.totalWithdraw += amount;
    appData.balance -= amount;
    
    addTransaction(todayStr, `উত্তোলন (${reason})`, "খরচ", amount);
    
    amountInput.value = "";
    reasonInput.value = "";
    saveDataOnline(); 
    alert("✅ টাকা তোলা সফল হয়েছে।");
}

// ১৩. ট্রানজেকশন হেল্পার
function addTransaction(date, desc, type, amount) {
    const transaction = {
        date: date,
        description: desc,
        type: type, 
        amount: amount,
        runningBalance: appData.balance,
        timestamp: Date.now() 
    };
    if (!appData.transactions) appData.transactions = [];
    appData.transactions.unshift(transaction); 
}

// ১৪. UI আপডেট
function updateUI() {
    document.getElementById("lastDate").innerText = appData.lastDate || "--/--/----";
    document.getElementById("totalIncome").innerText = "৳ " + (appData.totalIncome || 0);
    document.getElementById("totalWithdraw").innerText = "৳ " + (appData.totalWithdraw || 0);
    document.getElementById("currentBalance").innerText = "৳ " + (appData.balance || 0);
    document.getElementById("dailyRateInput").value = appData.dailyRate || 400;
    document.getElementById("displayDailyRate").innerText = appData.dailyRate || 400;

    // যদি বর্তমান ভিউ রিপোর্ট হয়, তবে রিফ্রেশ করুন
    if(document.getElementById("monthly-report-view").style.display === 'block') renderMonthlyReport();
    if(document.getElementById("history-view").style.display === 'block') {
         const year = currentReportDate.getFullYear().toString();
         const month = (currentReportDate.getMonth() + 1).toString().padStart(2, '0');
         renderHistoryTable(year, month);
    }
}

// ১৫. রিপোর্ট এবং নেভিগেশন (অপরিবর্তিত)
function changeMonth(step) {
    const newMonth = currentReportDate.getMonth() + step;
    currentReportDate.setMonth(newMonth);
    currentReportDate.setDate(1); 
    renderMonthlyReport();
}

function renderMonthlyReport() {
    const year = currentReportDate.getFullYear().toString();
    const month = (currentReportDate.getMonth() + 1).toString().padStart(2, '0');
    const monthName = MONTHS[currentReportDate.getMonth()];
    
    document.getElementById("currentMonthYear").innerText = `${monthName} ${year}`;

    let monthlyPresent = 0;
    let monthlyAbsent = 0;
    const attendanceData = appData.attendance[year]?.[month] || {};

    for (const day in attendanceData) {
        if (attendanceData[day] === 'Present') monthlyPresent++;
        else if (attendanceData[day] === 'Absent') monthlyAbsent++;
    }
    document.getElementById("monthlyPresent").innerText = monthlyPresent;
    document.getElementById("monthlyAbsent").innerText = monthlyAbsent;
    document.getElementById("monthlyIncome").innerText = "৳ " + (monthlyPresent * (appData.dailyRate || 400));

    const calendarBody = document.getElementById("calendarDays");
    calendarBody.innerHTML = '';
    const firstDay = new Date(year, currentReportDate.getMonth(), 1).getDay(); 
    const daysInMonth = new Date(year, currentReportDate.getMonth() + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        calendarBody.innerHTML += `<div></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const status = attendanceData[dayStr];
        let className = 'calendar-day';
        if (status === 'Present') className += ' present';
        if (status === 'Absent') className += ' absent';
        if (today.getDate() === day && today.getMonth() === currentReportDate.getMonth() && today.getFullYear().toString() === year) className += ' today';
        
        calendarBody.innerHTML += `<div class="${className}">
            <span>${day}</span>
            <span style="font-size:9px">${status ? (status === 'Present'?'P':'A') : ''}</span>
        </div>`;
    }
}

function renderHistoryTable(year, month) {
    const tbody = document.getElementById("historyBody");
    tbody.innerHTML = "";
    const sorted = appData.transactions.slice().sort((a, b) => b.timestamp - a.timestamp);
    const filtered = sorted.slice(0, 50); 

    filtered.forEach(t => {
        const row = document.createElement("tr");
        let amountClass = t.type === 'জমা' ? 'credit' : (t.type === 'খরচ' ? 'debit' : '');
        row.innerHTML = `<td>${t.date}</td><td>${t.description}</td><td class="${amountClass}">${t.type==='---'?'-':'৳ '+t.amount}</td><td>৳ ${t.runningBalance}</td>`;
        tbody.appendChild(row);
    });
}

// ১৬. পেজ নেভিগেশন
function showSection(sectionId) {
    ['dashboard-view', 'monthly-report-view', 'history-view', 'settings-view', 'chat-view'].forEach(id => { 
        document.getElementById(id).style.display = "none";
    });
    
    document.getElementById(sectionId).style.display = "block";
    
    let title = "ড্যাশবোর্ড";
    if (sectionId === 'monthly-report-view') {
        title = "মাসিক রিপোর্ট";
        renderMonthlyReport(); 
    } else if (sectionId === 'history-view') {
        title = "লেনদেন ইতিহাস";
        const year = currentReportDate.getFullYear().toString();
        const month = (currentReportDate.getMonth() + 1).toString().padStart(2, '0');
        renderHistoryTable(year, month);
    } else if (sectionId === 'settings-view') {
        title = "সেটিংস ও টুলস";
    } else if (sectionId === 'chat-view') { 
        title = "যোগাযোগ/চ্যাট";
        loadChatMessages(); 
    }
    document.getElementById("currentViewTitle").innerText = title;
}

// ১৭. মেনু টগল (অপরিবর্তিত)
function toggleMenu() {
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    if (sideMenu.style.transform === 'translateX(0%)') {
        sideMenu.style.transform = 'translateX(-100%)';
        overlay.style.display = 'none';
    } else {
        if (currentUser) {
            document.getElementById("menuEmailDisplay").innerText = currentUser.email;
            sideMenu.style.transform = 'translateX(0%)';
            overlay.style.display = 'block';
        } else {
            alert("আগে লগইন করুন।");
        }
    }
}

// ১৮. পিডিএফ ডাউনলোড (অপরিবর্তিত)
function downloadPDF() {
    showSection('history-view'); 
    const element = document.getElementById('statement-area');
    html2pdf().set({ margin: 0.5, filename: `Statement.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter' } }).from(element).save();
}

// ১৯. চ্যাট লজিক (মেসেজ পাঠানো অপরিবর্তিত)
function sendMessage() {
    const input = document.getElementById("chatInput");
    const messageText = input.value.trim();

    if (!currentUser) { 
        alert("মেসেজ পাঠাতে হলে অনুগ্রহ করে প্রথমে লগইন করুন।");
        return; 
    }
    
    if (!messageText) {
        alert("মেসেজ লেখার বক্সে কিছু লিখুন।");
        return;
    }

    const message = {
        sender: currentUser.email.split('@')[0], 
        text: messageText,
        timestamp: Date.now(),
        date: new Date().toLocaleTimeString('bn-BD', {hour: '2-digit', minute:'2-digit'})
    };

    const chatRef = ref(db, 'chat/');
    
    const newMessageRef = push(chatRef);
    set(newMessageRef, message)
        .then(() => {
            input.value = ""; 
        })
        .catch((error) => console.error("Message send failed:", error));
}


function loadChatMessages() {
    if (!currentUser) {
        document.getElementById("chat-messages").innerHTML = '<p style="text-align: center; color: red; padding: 20px;">মেসেজ দেখতে হলে প্রথমে লগইন করুন।</p>';
        return;
    }

    const chatRef = ref(db, 'chat/');
    const chatBox = document.getElementById("chat-messages");
    
    onValue(chatRef, (snapshot) => {
        chatBox.innerHTML = '';
        const messages = [];
        let latestMessage = null;

        snapshot.forEach((childSnapshot) => {
            const msg = childSnapshot.val();
            messages.push(msg);
            
            // সর্বশেষ মেসেজ বের করা
            if (!latestMessage || msg.timestamp > latestMessage.timestamp) {
                latestMessage = msg;
            }
        });
        
        // ***** নতুন: নোটিফিকেশন চেক ও ট্রিগার করা *****
        const currentUserID = currentUser.email.split('@')[0];
        if (latestMessage && latestMessage.timestamp > lastMessageTimestamp && latestMessage.sender !== currentUserID) {
            displayNotification(latestMessage.sender, latestMessage.text);
        }
        // সর্বশেষ মেসেজের টাইমস্ট্যাম্প আপডেট করা
        if (latestMessage) {
             lastMessageTimestamp = latestMessage.timestamp;
        }

        // ডিসপ্লে করা
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        messages.slice(-50).forEach(msg => {
            const isSentByCurrentUser = currentUser && msg.sender === currentUserID;
            const bubbleClass = isSentByCurrentUser ? 'message-bubble sent-message' : 'message-bubble';
            
            const messageElement = document.createElement("div");
            messageElement.className = bubbleClass;
            messageElement.innerHTML = `
                ${msg.text}
                <span class="message-meta">${msg.sender} @ ${msg.date}</span>
            `;
            chatBox.appendChild(messageElement);
        });

        // অটো স্ক্রল ডাউন
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}


// ***** ২০. নোটিফিকেশন লজিক (নতুন) *****

function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("দুঃখিত, এই ব্রাউজার নোটিফিকেশন সমর্থন করে না।");
        return;
    }

    Notification.requestPermission().then(permission => {
        checkNotificationStatus();
        if (permission === 'granted') {
            // নোটিফিকেশন পাঠানোর পরে ইউজারকে জানানো যেতে পারে
            new Notification("✅ সফল!", { body: "আপনি এখন নতুন মেসেজের নোটিফিকেশন পাবেন।" });
        }
    });
}

function checkNotificationStatus() {
    const statusElement = document.getElementById("notificationStatus");
    if (!("Notification" in window)) {
        statusElement.innerText = "ব্রাউজার সমর্থন করে না";
        statusElement.style.color = '#e74c3c';
        return;
    }
    
    switch(Notification.permission) {
        case 'granted':
            statusElement.innerText = "নোটিফিকেশন চালু আছে (✅)";
            statusElement.style.color = '#27ae60';
            break;
        case 'denied':
            statusElement.innerText = "নোটিফিকেশন ব্লক করা আছে (❌)। ব্রাউজার সেটিংসে পরিবর্তন করুন।";
            statusElement.style.color = '#e74c3c';
            break;
        default:
            statusElement.innerText = "পারমিশনের জন্য 'নোটিফিকেশন চালু করুন' বাটনটি ক্লিক করুন।";
            statusElement.style.color = '#f39c12';
    }
}

function displayNotification(sender, message) {
    if (Notification.permission === 'granted') {
        // স্ক্রল করার জন্য একটি সাধারণ নোটিফিকেশন দেখানো হচ্ছে
        new Notification(`💬 নতুন মেসেজ: ${sender}`, {
            body: message.length > 50 ? message.substring(0, 47) + '...' : message,
            icon: 'https://i.imgur.com/your-app-icon.png' // এখানে আপনার অ্যাপের লোগোর URL দিতে পারেন
        });
    }
}