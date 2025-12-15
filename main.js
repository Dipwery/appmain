// ১. প্রয়োজনীয় Firebase মডিউলগুলো import করুন
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// ২. আপনার Firebase কনফিগারেশন (আপনার প্রজেক্টের সাথে মিলিয়ে নিন)
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

// ৪. গ্লোবাল ডেটা স্টেট ও ক্যালেন্ডার ট্র্যাকার
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
// ক্যালেন্ডার ট্র্যাকার
let currentReportDate = new Date();
const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

// --- গ্লোবাল ফাংশনগুলো উইন্ডো অবজেক্টে যোগ করা (HTML এর onclick এর জন্য) ---
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


// ৫. ইউজার লগইন স্টেট মনিটর করা
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("auth-view").style.display = "none";
        document.getElementById("content").style.display = "block";
        document.getElementById("userEmailDisplay").innerText = "স্বাগতম: " + user.email;
        loadDataOnline(); 
    } else {
        currentUser = null;
        document.getElementById("auth-view").style.display = "block";
        document.getElementById("content").style.display = "none";
        document.getElementById("userEmailDisplay").innerText = "লগইন করুন";
    }
});

// ৬. ডাটাবেস থেকে ডাটা নামানো (Load Data)
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
        renderMonthlyReport();
    });
}

// ৭. ডাটাবেসে ডাটা পাঠানো (Save Data)
function saveDataOnline() {
    if (currentUser) {
        const userRef = ref(db, 'users/' + currentUser.uid);
        set(userRef, appData)
          .catch((error) => {
              console.error("Error saving data: ", error);
              document.getElementById("authError").innerText = "ডেটা সেভ করতে সমস্যা হয়েছে। Firebase Rules চেক করুন।";
          });
    }
}

// ৮. লগইন, রেজিস্ট্রেশন ও লগআউট ফাংশন
function loginUser() {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    document.getElementById("authError").innerText = ""; 
    if(!e || !p) { document.getElementById("authError").innerText = "ইমেইল এবং পাসওয়ার্ড দিন"; return; }

    signInWithEmailAndPassword(auth, e, p)
        .catch(err => {
            let msg = "ত্রুটি: " + err.message;
            if(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                 msg = "ভুল ইমেইল বা পাসওয়ার্ড। আপনার লগইন তথ্য যাচাই করুন।";
            }
            if(err.code === 'auth/invalid-api-key') msg = "গুরুত্বপূর্ণ: API Key কাজ করছে না! Firebase Console চেক করুন।";
            document.getElementById("authError").innerText = msg;
        });
}

function registerUser() {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    document.getElementById("authError").innerText = ""; 
    if(!e || !p || p.length < 6) { 
        document.getElementById("authError").innerText = "সঠিক ইমেইল ও পাসওয়ার্ড (কমপক্ষে ৬ সংখ্যা) দিন।"; 
        return; 
    }

    createUserWithEmailAndPassword(auth, e, p)
        .then(() => {
            alert("অ্যাকাউন্ট তৈরি সফল! আপনি অটো লগইন হয়েছেন।");
            document.getElementById("authError").innerText = "";
        })
        .catch(err => {
            let msg = "রেজিস্ট্রেশন হয়নি।";
            if(err.code === 'auth/email-already-in-use') msg = "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে।";
            if(err.code === 'auth/weak-password') msg = "পাসওয়ার্ড খুবই দুর্বল। কমপক্ষে ৬টি অক্ষর দিন।";
            if(err.code === 'auth/invalid-email') msg = "ইমেল ফরম্যাট ভুল আছে।";
            if(err.code === 'auth/invalid-api-key') msg = "গুরুত্বপূর্ণ: API Key কাজ করছে না! Firebase Console চেক করুন।";
            document.getElementById("authError").innerText = msg;
        });
}

function logoutUser() {
    signOut(auth).then(() => {
        alert("লগ-আউট সফল।");
        location.reload();
    });
}

let isLoginMode = true;
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById("authTitle").innerText = isLoginMode ? "লগইন" : "নতুন অ্যাকাউন্ট";
    document.getElementById("loginBtn").style.display = isLoginMode ? "inline-block" : "none";
    document.getElementById("regBtn").style.display = isLoginMode ? "none" : "inline-block";
    document.getElementById("toggleText").innerHTML = isLoginMode 
        ? "অ্যাকাউন্ট নেই? <span>নতুন খুলুন</span>" 
        : "আগেই অ্যাকাউন্ট আছে? <span>লগইন করুন</span>";
    document.getElementById("authError").innerText = "";
}

// ৯. দৈনিক বেতন হার আপডেট করা
function updateDailyRate() {
    const rate = parseInt(document.getElementById("dailyRateInput").value);
    if (rate > 0) {
        appData.dailyRate = rate;
        saveDataOnline();
        updateUI();
        alert(`দৈনিক বেতন হার ৳ ${rate} এ সেভ করা হয়েছে।`);
    } else {
        alert("সঠিক বেতন হার দিন।");
    }
}

// ১০. আজকের হাজিরা দেওয়া
function markAttendance(status) {
    if (!currentUser) { alert("অনুগ্রহ করে আগে লগইন করুন।"); return; }
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('bn-BD');
    const year = today.getFullYear().toString();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    if (appData.lastActionDate === todayStr) { alert("আজকের এন্ট্রি ইতিমধ্যে নেওয়া হয়েছে!"); return; }

    // attendance অবজেক্ট আপডেট করা
    if (!appData.attendance[year]) appData.attendance[year] = {};
    if (!appData.attendance[year][month]) appData.attendance[year][month] = {};
    
    appData.attendance[year][month][day] = status;

    if (status === 'Present') {
        const income = appData.dailyRate;
        appData.totalIncome += income;
        appData.balance += income;
        addTransaction(todayStr, "কাজে উপস্থিত (বেতন)", "জমা", income);
    } else {
        addTransaction(todayStr, "কাজে অনুপস্থিত", "---", 0);
    }

    appData.lastDate = todayStr;
    appData.lastActionDate = todayStr;
    
    saveDataOnline(); 
    renderMonthlyReport();
    alert("আপনার উপস্থিতি গ্রহণ করা হয়েছে।");
}

// ১১. অতীত তারিখের হাজিরা দেওয়া (নতুন ফাংশন)
function markPastAttendance(status) {
    if (!currentUser) { alert("অনুগ্রহ করে আগে লগইন করুন।"); return; }
    
    const dateInput = document.getElementById("pastDateInput").value;
    if (!dateInput) { alert("অনুগ্রহ করে একটি অতীত তারিখ নির্বাচন করুন।"); return; }

    const selectedDate = new Date(dateInput);
    const today = new Date();
    
    // ভবিষ্যতের তারিখ এন্ট্রি ব্লক করা
    if (selectedDate > today) { alert("ভবিষ্যতের তারিখে এন্ট্রি দেওয়া সম্ভব নয়।"); return; }
    
    // ডেটাবেসের জন্য স্ট্রিং ফরম্যাট তৈরি করা
    const year = selectedDate.getFullYear().toString();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    
    // বাংলাদেশি লোকাল স্ট্রিং (History এবং Last Date-এর জন্য)
    const dateStrBn = selectedDate.toLocaleDateString('bn-BD'); 

    // attendance অবজেক্ট আপডেট করা
    if (!appData.attendance[year]) appData.attendance[year] = {};
    if (!appData.attendance[year][month]) appData.attendance[year][month] = {};
    
    // যদি ঐ তারিখে আগেই কোনো এন্ট্রি থাকে
    if (appData.attendance[year][month][day]) {
        if (!confirm(`${dateStrBn} তারিখের এন্ট্রি ইতিমধ্যেই নেওয়া আছে। নতুন ডেটা ওভাররাইড করতে চান?`)) {
            return;
        }
    }
    
    appData.attendance[year][month][day] = status;

    if (status === 'Present') {
        const income = appData.dailyRate;
        appData.totalIncome += income;
        appData.balance += income;
        addTransaction(dateStrBn, `অতীতের উপস্থিতি (${dateStrBn})`, "জমা", income);
    } else {
        addTransaction(dateStrBn, `অতীতের অনুপস্থিতি (${dateStrBn})`, "---", 0);
    }

    saveDataOnline(); 
    renderMonthlyReport(); // মাসিক রিপোর্ট আপডেট করা
    alert(`${dateStrBn} তারিখের ${status} এন্ট্রি সফলভাবে সম্পন্ন হয়েছে।`);
}


// ১২. টাকা তোলা (Withdraw)
function withdrawMoney() {
    if (!currentUser) { alert("অনুগ্রহ করে আগে লগইন করুন।"); return; }

    const amountInput = document.getElementById("withdrawAmount");
    const reasonInput = document.getElementById("withdrawReason");
    const amount = parseFloat(amountInput.value);
    const reason = reasonInput.value || "খরচ";

    if (!amount || amount <= 0) { alert("সঠিক টাকার পরিমাণ লিখুন।"); return; }
    
    const todayStr = new Date().toLocaleDateString('bn-BD');
    
    appData.totalWithdraw += amount;
    appData.balance -= amount;
    
    addTransaction(todayStr, `টাকা তোলা (${reason})`, "খরচ", amount);
    
    amountInput.value = "";
    reasonInput.value = "";
    
    saveDataOnline(); 
    alert("টাকা তোলা হয়েছে এবং ডাটাবেসে সেভ হয়েছে।");
}

// ১৩. ট্রানজেকশন অ্যারেতে যোগ করা
function addTransaction(date, desc, type, amount) {
    const transaction = {
        date: date,
        description: desc,
        type: type, 
        amount: amount,
        runningBalance: appData.balance,
        timestamp: Date.now() 
    };
    
    if (!appData.transactions) { appData.transactions = []; }
    appData.transactions.unshift(transaction); 
}

// ১৪. স্ক্রিন আপডেট করা (UI Update)
function updateUI() {
    document.getElementById("lastDate").innerText = appData.lastDate || "--/--/----";
    document.getElementById("totalIncome").innerText = "৳ " + (appData.totalIncome || 0);
    document.getElementById("totalWithdraw").innerText = "৳ " + (appData.totalWithdraw || 0);
    document.getElementById("currentBalance").innerText = "৳ " + (appData.balance || 0);
    document.getElementById("dailyRateInput").value = appData.dailyRate || 400;
    document.getElementById("displayDailyRate").innerText = appData.dailyRate || 400;

    renderMonthlyReport();
}

// ১৫. ক্যালেন্ডারের মাস পরিবর্তন করা
function changeMonth(step) {
    const newMonth = currentReportDate.getMonth() + step;
    currentReportDate.setMonth(newMonth);
    currentReportDate.setDate(1); 
    renderMonthlyReport();
}

// ১৬. মাসিক রিপোর্ট তৈরি এবং রেন্ডার করা
function renderMonthlyReport() {
    const year = currentReportDate.getFullYear().toString();
    const month = (currentReportDate.getMonth() + 1).toString().padStart(2, '0');
    const monthName = MONTHS[currentReportDate.getMonth()];
    const today = new Date();
    const isCurrentMonth = today.getFullYear().toString() === year && today.getMonth().toString() === (currentReportDate.getMonth()).toString();
    
    document.getElementById("currentMonthYear").innerText = `${monthName} ${year}`;

    // ১. মাসিক পরিসংখ্যান গণনা
    let monthlyPresent = 0;
    let monthlyAbsent = 0;
    let monthlyIncome = 0;
    const attendanceData = appData.attendance[year]?.[month] || {};

    for (const day in attendanceData) {
        if (attendanceData[day] === 'Present') {
            monthlyPresent++;
        } else if (attendanceData[day] === 'Absent') {
            monthlyAbsent++;
        }
    }
    monthlyIncome = monthlyPresent * (appData.dailyRate || 400);

    document.getElementById("monthlyPresent").innerText = monthlyPresent;
    document.getElementById("monthlyAbsent").innerText = monthlyAbsent;
    document.getElementById("monthlyIncome").innerText = "৳ " + monthlyIncome;

    // ২. ক্যালেন্ডার রেন্ডার করা
    const calendarBody = document.getElementById("calendarDays");
    calendarBody.innerHTML = '';

    const firstDay = new Date(year, currentReportDate.getMonth(), 1).getDay(); 
    const daysInMonth = new Date(year, currentReportDate.getMonth() + 1, 0).getDate();
    
    // ফাঁকা ঘর যোগ করা
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty-day';
        calendarBody.appendChild(emptyDiv);
    }

    // মাসের দিনগুলো যোগ করা
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const status = attendanceData[dayStr];
        const isToday = isCurrentMonth && day === today.getDate();
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        if (status === 'Present') dayDiv.classList.add('present');
        if (status === 'Absent') dayDiv.classList.add('absent');
        if (isToday) dayDiv.classList.add('today');

        dayDiv.innerHTML = `<span class="day-date">${day}</span><span class="day-status">${status || ''}</span>`;
        calendarBody.appendChild(dayDiv);
    }
    
    // ৩. ইতিহাস টেবিল রেন্ডার করা
    renderHistoryTable(year, month);
}

// ১৭. ইতিহাস টেবিল রেন্ডার করা (মাসিক ফিল্টারিং - ফিক্সড)
function renderHistoryTable(year, month) {
    const tbody = document.getElementById("historyBody");
    tbody.innerHTML = "";

    // প্রথমে সমস্ত ট্রানজেকশন timestamp অনুযায়ী সাজানো
    const sortedTransactions = appData.transactions.slice().sort((a, b) => b.timestamp - a.timestamp);

    const filteredTransactions = sortedTransactions.filter(t => {
        const parts = t.date.split('/');
        
        if (parts.length < 3) return false; 
        
        // DD/MM/YYYY ফরম্যাট থেকে মাস ও বছর
        const transactionMonth = parts[1]; 
        const transactionYear = parts[2];
        
        return transactionYear === year && transactionMonth === month;
    });

    if (filteredTransactions.length > 0) {
        filteredTransactions.forEach(t => {
            const row = document.createElement("tr");
            let amountClass = t.type === 'জমা' ? 'credit' : (t.type === 'খরচ' ? 'debit' : '');
            let displayAmount = t.type === '---' ? '-' : `৳ ${t.amount}`;
            
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${t.type}</td>
                <td class="${amountClass}">${displayAmount}</td>
                <td>৳ ${t.runningBalance}</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>এই মাসের কোনো লেনদেন পাওয়া যায়নি</td></tr>";
    }
}

// ১৮. পেজ নেভিগেশন
function showSection(sectionId) {
    document.getElementById("dashboard-view").style.display = "none";
    document.getElementById("monthly-report-view").style.display = "none";
    document.getElementById("history-view").style.display = "none";
    
    document.getElementById(sectionId).style.display = "block";
    
    let title = "ড্যাশবোর্ড";
    if (sectionId === 'monthly-report-view') {
        title = "মাসিক রিপোর্ট ও ক্যালেন্ডার";
        renderMonthlyReport(); 
    } else if (sectionId === 'history-view') {
        title = "লেনদেন ইতিহাস";
        const year = currentReportDate.getFullYear().toString();
        const month = (currentReportDate.getMonth() + 1).toString().padStart(2, '0');
        renderHistoryTable(year, month);
    }
    document.getElementById("currentViewTitle").innerText = title;

    // মেনুতে হাইলাইট পরিবর্তন
    document.querySelectorAll('#main-nav button').forEach(btn => {
        btn.style.backgroundColor = 'transparent';
    });
    // বর্তমানে দেখা সেকশনের বাটন হাইলাইট করা
    let currentButton;
    if (sectionId === 'dashboard-view') {
        currentButton = document.querySelector('#main-nav button[onclick*="dashboard-view"]');
    } else if (sectionId === 'monthly-report-view') {
        currentButton = document.querySelector('#main-nav button[onclick*="monthly-report-view"]');
    } else if (sectionId === 'history-view') {
        currentButton = document.querySelector('#main-nav button[onclick*="history-view"]');
    }

    if (currentButton) {
        currentButton.style.backgroundColor = '#007bff';
    }
}

// ১৯. পিডিএফ ডাউনলোড
function downloadPDF() {
    showSection('history-view'); 
    
    const element = document.getElementById('statement-area');
    const monthName = MONTHS[currentReportDate.getMonth()];
    const year = currentReportDate.getFullYear();

    const opt = {
      margin:       0.5,
      filename:     `Dhruva_Power_Statement_${monthName}_${year}.pdf`,
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        setTimeout(() => showSection('dashboard-view'), 2000);
    });
}

// অ্যাপ লোড হওয়ার পর ডিফল্ট সেকশন সেট করা (শুধুমাত্র ডিজাইন হাইলাইটের জন্য)
window.onload = function() {
    // নিশ্চিত করুন যে লগইন অবস্থায় থাকলে ড্যাশবোর্ড হাইলাইট হয়
    if (document.getElementById("content").style.display !== 'none') {
        showSection('dashboard-view');
    }
};
// ২০. সাইড মেনু টগল করা
function toggleMenu() {
    const sideMenu = document.getElementById("side-menu");
    const overlay = document.getElementById("overlay");
    
    if (sideMenu.style.transform === 'translateX(0%)') {
        // মেনু বন্ধ করা
        sideMenu.style.transform = 'translateX(-100%)';
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    } else {
        // মেনু খোলা
        if (currentUser) {
            document.getElementById("menuEmailDisplay").innerText = currentUser.email;
            sideMenu.style.transform = 'translateX(0%)';
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden'; // স্ক্রল লক করা
        } else {
            alert("অনুগ্রহ করে আগে লগইন করুন।");
        }
    }
}
window.toggleMenu = toggleMenu; // গ্লোবাল লিস্টে ফাংশন যোগ করা