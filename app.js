// --- FIREBASE SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, getDoc, getDocs, collectionGroup, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBUfky5nGOCIxFDjCr6vbEqH0SlDygwYkc",
    authDomain: "hot-candi-list.firebaseapp.com",
    projectId: "hot-candi-list",
    storageBucket: "hot-candi-list.firebasestorage.app",
    messagingSenderId: "335142884374",
    appId: "1:335142884374:web:c9afc7a17f9d27fe1b5137"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'default-app-id';
let currentUser = null;
// let currentUser = null; // Removed duplicate
let candidates = [];
let userMap = {}; // Map uid -> Display Name
let editingId = null;
let currentView = 'mine'; // 'mine' or 'team'
let unsubscribeCandidates = null; // To handle switching listeners
let currentPayrollDate = null; // Tracks the Saturday of the week being viewed


// --- 1. SESSION PERSISTENCE ---
setPersistence(auth, browserSessionPersistence)
    .then(() => console.log("Session Mode: Closing tab will log out."))
    .catch((error) => console.error("Persistence Error:", error));

// --- 2. AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('loginOverlay');
    const logoutBtn = document.getElementById('btnLogout');
    const adminBtn = document.getElementById('adminEmailBtn');
    const headerTitle = document.querySelector('h1');

    if (user) {
        // LOGGED IN
        currentUser = user;
        overlay.classList.add('hidden');
        logoutBtn.classList.remove('hidden');

        // Admin Button Logic
        if (user.email === 'ben.layher@gmail.com' && adminBtn) {
            adminBtn.classList.remove('hidden');
        } else if (adminBtn) {
            adminBtn.classList.add('hidden');
        }

        const shortName = (user.email === 'ben.layher@gmail.com' ? 'BJ Layher' : (user.displayName || user.email.split('@')[0]));

        // Force update current user display name for local logic
        if (user.email === 'ben.layher@gmail.com') user.displayName = "BJ Layher";

        if (headerTitle) {
            headerTitle.innerHTML = `HOT LIST <span class="text-xs align-middle bg-slate-800 text-rose-400 px-2 py-1 rounded border border-rose-900/50 ml-2">${shortName.toUpperCase()}</span>`;
        }

        fetchUserMap(); // Load all user names for the list

        console.log("Loading data for:", user.uid);
        loadMyCandidates(); // Default to my view
    } else {
        // LOGGED OUT
        if (unsubscribeCandidates) unsubscribeCandidates();
        currentUser = null;
        candidates = [];
        renderList();
        overlay.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        if (headerTitle) headerTitle.innerHTML = `HOT LIST`;
    }
});

// --- FETCHING LOGIC ---
function loadMyCandidates() {
    if (!currentUser) return;
    if (unsubscribeCandidates) unsubscribeCandidates();

    currentView = 'mine';
    updateTabs();

    const q = query(collection(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates'));
    unsubscribeCandidates = onSnapshot(q, (snapshot) => {
        candidates = snapshot.docs.map(doc => {
            // For MY candidates, I am the owner.
            return { id: doc.id, ...doc.data(), ownerId: currentUser.uid };
        });
        performAutoRollover();
        renderList();
    }, (error) => {
        console.error("Snapshot Error:", error);
        document.getElementById('candidateList').innerHTML = '<div class="text-red-500 text-center py-10">Connection Error. Please Logout and Retry.</div>';
        showToast("Error loading candidates");
    });
}

function loadTeamCandidates() {
    if (!currentUser) return;
    if (unsubscribeCandidates) unsubscribeCandidates();

    currentView = 'team';
    updateTabs();

    // Query ALL candidates from ALL users that are active (availDate logic is tricky in query, so getting all and filtering client side for now or using simple date filter if possible)
    // To keep it robust, we will fetch 'candidates' collection group.
    // Important: Requires Index? Maybe.
    const q = query(collectionGroup(db, 'candidates'));

    unsubscribeCandidates = onSnapshot(q, (snapshot) => {
        const today = new Date();
        const rawList = snapshot.docs.map(doc => {
            // Must capture parent ID as ownerId if not stored
            const data = doc.data();
            const ownerId = data.ownerId || (doc.ref.parent.parent ? doc.ref.parent.parent.id : 'unknown');
            return { id: doc.id, ...data, ownerId: ownerId };
        });

        // Filter for "Cardio 45" (Avail <= 45 Days)
        candidates = rawList.filter(c => {
            const targetDate = new Date(c.availDate);
            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 45; // Only show hot candidates in team view
        });

        renderList();
    }, (error) => {
        console.error("Team Query Error:", error);
        showToast("Error loading team data. Valid Indexes?");
    });
}

// Fetch all users to build a Name Map
async function fetchUserMap() {
    try {
        const q = query(collection(db, 'artifacts', appId, 'users'));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const email = data.email || "";
            let name = data.displayName || (email ? email.split('@')[0] : "Unknown User");
            if (email === 'ben.layher@gmail.com') name = "BJ Layher"; // Override
            userMap[doc.id] = name;
        });
        console.log("User Map Built:", Object.keys(userMap).length);
        renderList(); // Re-render to show names
    } catch (e) { console.error("Error fetching user map:", e); }
}

const stateLicenses = [
    { name: "Alabama", abbr: "AL", quick: false, link: "https://asbrt.igovsolution.net/online/Lookups/Individual.aspx", costInit: "$100.00", costRenew: "$75.00", temp: true },
    { name: "Alaska", abbr: "AK", quick: false, link: "#", costInit: "$0.00", costRenew: "$0.00", temp: false, note: "No License Required" },
    { name: "Arizona", abbr: "AZ", quick: true, link: "https://azbrce.portalus.thentiacloud.net/webs/portal/register/#/", costInit: "$273.00", costRenew: "$153.00", temp: false },
    { name: "Arkansas", abbr: "AR", quick: false, link: "https://www.armedicalboard.org/Public.aspx", costInit: "$4.00", costRenew: "$2.00", temp: true },
    { name: "California", abbr: "CA", quick: false, link: "https://search.dca.ca.gov/", costInit: "$300.00", costRenew: "$300.00", temp: false },
    { name: "Colorado", abbr: "CO", quick: true, link: "https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx", costInit: "$85.00", costRenew: "$24.00 - $76.00", temp: false },
    { name: "Connecticut", abbr: "CT", quick: true, link: "https://www.elicense.ct.gov/Lookup/LicenseLookup.aspx", costInit: "$190.00", costRenew: "$105.00", temp: true },
    { name: "Delaware", abbr: "DE", quick: false, link: "https://delpros.delaware.gov/OH_VerifyLicense", costInit: "$143.00", costRenew: "$101.00", temp: true },
    { name: "Florida", abbr: "FL", quick: true, link: "https://mqa-internet.doh.state.fl.us/MQASearchServices/HealthCareProviders", costInit: "$105.00", costRenew: "$95.00 - $120.00", temp: false },
    { name: "Georgia", abbr: "GA", quick: false, link: "https://gateway.medicalboard.georgia.gov/verification/search.aspx", costInit: "$150.00", costRenew: "$105.00", temp: true },
    { name: "Hawaii", abbr: "HI", quick: false, link: "https://pvl.ehawaii.gov/pvlsearch/", costInit: "$340.00", costRenew: "$270.00 - $340.00", temp: false },
    { name: "Idaho", abbr: "ID", quick: true, link: "https://bom.idaho.gov/BOMPortal/Home.aspx", costInit: "$100.00", costRenew: "$65.00", temp: true },
    { name: "Illinois", abbr: "IL", quick: true, link: "https://online-dfpr.micropact.com/lookup/licenselookup.aspx", costInit: "$100.00", costRenew: "$100.00 - $120.00", temp: true },
    { name: "Indiana", abbr: "IN", quick: false, link: "https://mylicense.in.gov/EVerification/", costInit: "$50.00", costRenew: "$50.00", temp: true },
    { name: "Iowa", abbr: "IA", quick: false, link: "https://amanda-portal.idph.state.ia.us/ibpl/portal/#/license/license-query", costInit: "$75.00", costRenew: "$75.00", temp: false },
    { name: "Kansas", abbr: "KS", quick: false, link: "https://www.kansas.gov/ssrv-ksbhada/search.html", costInit: "$80.00", costRenew: "$75.00", temp: true },
    { name: "Kentucky", abbr: "KY", quick: false, link: "https://kbrc.ky.gov/Pages/License-Verifications.aspx", costInit: "$150.00", costRenew: "$90.00", temp: true },
    { name: "Louisiana", abbr: "LA", quick: false, link: "https://online.lasbme.org/#/verifylicense", costInit: "$125.00", costRenew: "$85.00", temp: true },
    { name: "Maine", abbr: "ME", quick: true, link: "https://www.pfr.maine.gov/almsonline/almsquery/welcome.aspx", costInit: "$135.00", costRenew: "$65.00 - $135.00", temp: true },
    { name: "Maryland", abbr: "MD", quick: false, link: "https://www.mbp.state.md.us/bpqapp/", costInit: "$200.00", costRenew: "$176.00", temp: false },
    { name: "Massachusetts", abbr: "MA", quick: true, link: "https://checkahealthlicense.mass.gov/search", costInit: "$260.00", costRenew: "$110.00", temp: true },
    { name: "Michigan", abbr: "MI", quick: false, link: "https://aca-prod.accela.com/MILARA/GeneralProperty/PropertyLookUp.aspx?isLicensee=Y&TabName=APO", costInit: "$95.00", costRenew: "~$162.00", temp: true },
    { name: "Minnesota", abbr: "MN", quick: false, link: "https://bmp.hlb.state.mn.us/#/onlineEntitySearch", costInit: "$222.00", costRenew: "$90.00", temp: true },
    { name: "Mississippi", abbr: "MS", quick: true, link: "https://msdh.ms.gov/msdhsite/_static/30,0,82.html", costInit: "$75.00", costRenew: "$100.00", temp: true },
    { name: "Missouri", abbr: "MO", quick: true, link: "https://pr.mo.gov/licensee-search-division.asp", costInit: "$40.00", costRenew: "$30.00", temp: true },
    { name: "Montana", abbr: "MT", quick: true, link: "#", costInit: "$100.00", costRenew: "$75.00", temp: false },
    { name: "Nebraska", abbr: "NE", quick: true, link: "https://www.nebraska.gov/LISSearch/search.cgi", costInit: "$118.00", costRenew: "$118.00", temp: true },
    { name: "Nevada", abbr: "NV", quick: false, link: "https://vs.nv.gov/License/Search", costInit: "~$285.00", costRenew: "$185.00", temp: false },
    { name: "New Hampshire", abbr: "NH", quick: true, link: "#", costInit: "$165.00", costRenew: "$165.00", temp: false },
    { name: "New Jersey", abbr: "NJ", quick: false, link: "#", costInit: "$285.00", costRenew: "$160.00", temp: true },
    { name: "New Mexico", abbr: "NM", quick: false, link: "https://nmrldlpi.my.site.com/bcd/s/rld-public-search", costInit: "$150.00", costRenew: "$150.00", temp: false },
    { name: "New York", abbr: "NY", quick: false, link: "http://www.op.nysed.gov/opsearches.htm", costInit: "$294.00", costRenew: "~$237.00", temp: true },
    { name: "North Carolina", abbr: "NC", quick: true, link: "https://ncrcb.org/", costInit: "~$213.00", costRenew: "$75.00", temp: true },
    { name: "North Dakota", abbr: "ND", quick: true, link: "https://www.ndsbrc.com/verify/", costInit: "$80.00", costRenew: "$80.00", temp: false },
    { name: "Ohio", abbr: "OH", quick: false, link: "https://elicense.ohio.gov/oh_verifylicense", costInit: "$75.00", costRenew: "$75.00", temp: false },
    { name: "Oklahoma", abbr: "OK", quick: false, link: "https://www.okmedicalboard.org/search", costInit: "$100.00", costRenew: "$100.00", temp: true },
    { name: "Oregon", abbr: "OR", quick: false, link: "https://elite.hlo.state.or.us/OHLOPublicR/LPRBrowser.aspx", costInit: "$100.00", costRenew: "$100.00", temp: false },
    { name: "Pennsylvania", abbr: "PA", quick: false, link: "https://www.pals.pa.gov/#!/page/search", costInit: "$30.00", costRenew: "$25.00", temp: false },
    { name: "Rhode Island", abbr: "RI", quick: false, link: "https://health.ri.gov/find/licensees/", costInit: "$60.00", costRenew: "$60.00", temp: true },
    { name: "South Carolina", abbr: "SC", quick: false, link: "https://verify.llronline.com/LicLookup/Med/Med.aspx?div=16", costInit: "$120.00", costRenew: "$75.00", temp: true },
    { name: "South Dakota", abbr: "SD", quick: true, link: "https://www.sdbmoe.gov/", costInit: "$75.00", costRenew: "$60.00", temp: true },
    { name: "Tennessee", abbr: "TN", quick: false, link: "https://internet.health.tn.gov/Licensure/", costInit: "$160.00", costRenew: "$75.00 - $85.00", temp: true },
    { name: "Texas", abbr: "TX", quick: false, link: "https://profile.tmb.state.tx.us/Search.aspx?135a91a3-a770-49e6-a164-294696a6ff9f", costInit: "$125.00", costRenew: "$106.00 - $113.00", temp: true },
    { name: "Utah", abbr: "UT", quick: true, link: "https://secure.utah.gov/llv/search/index.html", costInit: "$60.00", costRenew: "$52.00", temp: true },
    { name: "Vermont", abbr: "VT", quick: true, link: "https://sos.vermont.gov/opr/find-a-professional/", costInit: "$100.00", costRenew: "$240.00", temp: false },
    { name: "Virginia", abbr: "VA", quick: false, link: "https://dhp.virginiainteractive.org/lookup/index", costInit: "$135.00", costRenew: "$135.00", temp: false },
    { name: "Washington", abbr: "WA", quick: false, link: "https://fortress.wa.gov/doh/providercredentialsearch/", costInit: "$140.00", costRenew: "$110.00", temp: true },
    { name: "West Virginia", abbr: "WV", quick: true, link: "https://www.wvborc.com/Verify", costInit: "$200.00", costRenew: "$65.00", temp: true },
    { name: "Wisconsin", abbr: "WI", quick: true, link: "https://app.wi.gov/licensesearch", costInit: "$150.00", costRenew: "$141.00 - $170.00", temp: true },
    { name: "Wyoming", abbr: "WY", quick: true, link: "https://wyoming.imagetrendlicense.com/lms/public/portal#/search", costInit: "$100.00", costRenew: "$100.00", temp: true }
];

window.switchTab = function (view) {
    if (view === currentView) return;

    // License View Logic
    const pipelineContainer = document.getElementById('pipelineContainer');
    const licensesContainer = document.getElementById('licensesContainer');

    if (view === 'licenses') {
        renderLicenses();
        pipelineContainer.classList.add('hidden');
        licensesContainer.classList.remove('hidden');
    } else if (view === 'payroll') {
        pipelineContainer.classList.add('hidden');
        licensesContainer.classList.add('hidden');
        document.getElementById('payrollContainer').classList.remove('hidden');

        // Initialize Date if null
        if (!currentPayrollDate) {
            currentPayrollDate = getLastSaturday(new Date());
        }
        updatePayrollHeader();
        renderPayrollView();
    } else {
        pipelineContainer.classList.remove('hidden');
        licensesContainer.classList.add('hidden');
        document.getElementById('payrollContainer').classList.add('hidden');
        if (view === 'mine') loadMyCandidates();
        if (view === 'team') loadTeamCandidates();
    }

    currentView = view;
    updateTabs();
}

function renderLicenses() {
    const container = document.getElementById('licensesList');
    container.innerHTML = '';

    stateLicenses.forEach(state => {
        const item = document.createElement('div');
        item.className = "bg-[#0f172a] border border-purple-900/30 rounded overflow-hidden group transition-all duration-300 hover:border-purple-500/50";

        const verifyBtnHtml = (state.link && state.link !== '#') ?
            `<a href="${state.link}" target="_blank" class="mt-4 block w-full text-center py-2 rounded border border-purple-500/50 text-purple-400 hover:bg-purple-900/20 hover:text-white transition font-bold uppercase text-xs tracking-wider">
                Verify License ↗
            </a>` :
            `<button disabled class="mt-4 block w-full text-center py-2 rounded border border-slate-700 text-slate-500 cursor-not-allowed font-bold uppercase text-xs tracking-wider">
                Link Unavailable
            </button>`;

        const noteHtml = state.note ? `<li class="text-xs text-amber-400 italic pt-2 border-t border-slate-800 mt-2">${state.note}</li>` : '';

        item.innerHTML = `
            <div class="px-5 py-4 flex items-center justify-between cursor-pointer bg-slate-900/50 hover:bg-purple-900/10 transition" onclick="window.toggleLicense('${state.abbr}')">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded flex items-center justify-center bg-slate-800 text-purple-400 font-bold border border-slate-700 group-hover:bg-purple-900/20 group-hover:text-purple-300 group-hover:border-purple-500/30 transition">
                        ${state.abbr}
                    </div>
                    <h3 class="font-bold text-lg text-slate-200 group-hover:text-white transition">${state.name}</h3>
                </div>

                <div class="flex items-center gap-4">
                    ${state.quick ? '<span class="text-[10px] font-bold text-emerald-400 bg-emerald-900/20 border border-emerald-900/50 px-2 py-1 rounded uppercase tracking-wider">Quick State</span>' : ''}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-500 group-hover:text-purple-400 transform transition-transform duration-300" id="arrow-${state.abbr}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            <div id="details-${state.abbr}" class="hidden bg-slate-950/50 border-t border-purple-900/30">
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                         <p class="text-[10px] font-bold text-purple-500/70 uppercase tracking-widest mb-2">License Details</p>
                         <ul class="space-y-2 text-slate-300">
                            <li class="flex justify-between border-b border-slate-800 pb-1">
                                <span>Temp License Available?</span>
                                <span class="font-mono ${state.temp ? 'text-emerald-400' : 'text-rose-400'}">${state.temp ? 'YES' : 'NO'}</span>
                            </li>
                            <li class="flex justify-between border-b border-slate-800 pb-1">
                                <span>Quick License State?</span>
                                <span class="font-mono ${state.quick ? 'text-emerald-400' : 'text-slate-500'}">${state.quick ? 'YES' : 'NO'}</span>
                            </li>
                            ${noteHtml}
                         </ul>
                    </div>
                    <div>
                         <p class="text-[10px] font-bold text-purple-500/70 uppercase tracking-widest mb-2">Costs</p>
                         <ul class="space-y-2 text-slate-300">
                            <li class="flex justify-between border-b border-slate-800 pb-1">
                                <span>Initial Application</span>
                                <span class="font-mono text-white">${state.costInit}</span>
                            </li>
                            <li class="flex justify-between border-b border-slate-800 pb-1">
                                <span>Renewal Cost</span>
                                <span class="font-mono text-white">${state.costRenew}</span>
                            </li>
                         </ul>

                         ${verifyBtnHtml}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

window.toggleLicense = function (abbr) {
    const el = document.getElementById(`details-${abbr}`);
    const arrow = document.getElementById(`arrow-${abbr}`);
    if (el.classList.contains('hidden')) {
        // Close others? Optional but cleaner
        document.querySelectorAll('[id^="details-"]').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('[id^="arrow-"]').forEach(a => a.classList.remove('rotate-180'));

        el.classList.remove('hidden');
        arrow.classList.add('rotate-180');
    } else {
        el.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
};

function updateTabs() {
    const btnMine = document.getElementById('tabMine');
    const btnTeam = document.getElementById('tabTeam');
    const btnLicenses = document.getElementById('tabLicenses');
    const btnPayroll = document.getElementById('tabPayroll');

    if (!btnMine || !btnTeam || !btnLicenses) return;

    // Reset All
    [btnMine, btnTeam, btnLicenses, btnPayroll].forEach(btn => {
        if (btn) btn.className = "text-xs font-bold uppercase tracking-wider px-6 py-3 text-slate-500 hover:text-slate-300 border-b-2 border-transparent hover:border-slate-800 transition-all";
    });

    if (currentView === 'mine') {
        btnMine.className = "text-xs font-bold uppercase tracking-wider px-6 py-3 text-rose-500 border-b-2 border-rose-500 bg-slate-900/30 transition-all hover:bg-slate-900/50";
    } else if (currentView === 'team') {
        btnTeam.className = "text-xs font-bold uppercase tracking-wider px-6 py-3 text-rose-500 border-b-2 border-rose-500 bg-slate-900/30 transition-all hover:bg-slate-900/50";
    } else if (currentView === 'licenses') {
        btnLicenses.className = "text-xs font-bold uppercase tracking-wider px-6 py-3 text-purple-400 border-b-2 border-purple-500 bg-purple-900/10 transition-all hover:bg-purple-900/20";
    } else if (currentView === 'payroll') {
        const btn = document.getElementById('tabPayroll');
        if (btn) btn.className = "text-xs font-bold uppercase tracking-wider px-6 py-3 text-emerald-400 border-b-2 border-emerald-500 bg-emerald-900/10 transition-all hover:bg-emerald-900/20";
    }
}

let openPanelId = null; // Track open panel globally

// --- PAYROLL LOGIC ---

const payrollPeriods = [
    { id: 1, start: '2025-12-28', end: '2026-01-24' },
    { id: 2, start: '2026-01-25', end: '2026-02-21' },
    { id: 3, start: '2026-02-22', end: '2026-03-28' },
    { id: 4, start: '2026-03-29', end: '2026-04-25' },
    { id: 5, start: '2026-04-26', end: '2026-05-23' },
    { id: 6, start: '2026-05-24', end: '2026-06-27' },
    { id: 7, start: '2026-06-28', end: '2026-07-25' },
    { id: 8, start: '2026-07-26', end: '2026-08-22' },
    { id: 9, start: '2026-08-23', end: '2026-09-26' },
    { id: 10, start: '2026-09-27', end: '2026-10-24' },
    { id: 11, start: '2026-10-25', end: '2026-11-21' },
    { id: 12, start: '2026-11-22', end: '2026-12-26' }
];

function getLastSaturday(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // Avoid timezone shifts
    const day = d.getDay();
    // If today is Saturday (6), return today. Else, go back.
    // Actually, user said "processing week end 1/17" on 1/22. 
    // 1/17 was Saturday. 1/22 is Thursday.
    // So distinct logic: Return standard 'Last Saturday'.
    const diff = d.getDate() - day + (day === 6 ? 0 : -1);
    // Wait: if day is 6 (Sat), diff = 0. Correct.
    // if day is 0 (Sun), diff = -1 -> Returns Sat. Correct.
    // if day is 4 (Thu), diff = 4 - 4 - 1 = -1? No.
    // Standard approach:
    // const day = date.getDay();
    // const diff = date.getDate() - day - 1 + (day == 6 ? 7 : 0);

    // Let's use simple loop
    while (d.getDay() !== 6) {
        d.setDate(d.getDate() - 1);
    }
    return d;
}

function getPeriodInfo(dateStr) {
    // Check which period this date falls into
    // dateStr is YYYY-MM-DD
    for (let p of payrollPeriods) {
        if (dateStr >= p.start && dateStr <= p.end) {
            // Calculate week number
            const start = new Date(p.start);
            const current = new Date(dateStr);
            const diffTime = Math.abs(current - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(diffDays / 7) + 1;
            return { period: p.id, week: weekNum, label: `P${p.id}W${weekNum}` };
        }
    }
    return { period: 0, week: 0, label: "Unknown" };
}

function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

window.changePayrollWeek = function (delta) {
    if (!currentPayrollDate) return;

    const newDate = new Date(currentPayrollDate);
    newDate.setDate(newDate.getDate() + (delta * 7));

    // Limits: 
    // Back 5 weeks from TODAY's last saturday?
    // User said: "edit a futur week... Forward only 1... back up to 5 weeks"
    // I should probably anchor the limits to the actual "Last Saturday".

    const anchor = getLastSaturday(new Date());
    const forwardLimit = new Date(anchor);
    forwardLimit.setDate(forwardLimit.getDate() + 7); // +1 week

    const backLimit = new Date(anchor);
    backLimit.setDate(backLimit.getDate() - (5 * 7)); // -5 weeks

    if (newDate > forwardLimit) {
        showToast("Cannot navigate further forward.");
        return;
    }
    if (newDate < backLimit) {
        showToast("Cannot navigate further back.");
        return;
    }

    currentPayrollDate = newDate;
    updatePayrollHeader();
    renderPayrollView();
}

function updatePayrollHeader() {
    const display = document.getElementById('payrollDateDisplay');
    if (display && currentPayrollDate) {
        display.textContent = currentPayrollDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    // Totals updated in render
}

function renderPayrollView() {
    const list = document.getElementById('payrollList');
    const formersList = document.getElementById('formersList');
    const formersContainer = document.getElementById('formersContainer');

    list.innerHTML = '';
    formersList.innerHTML = '';

    const weekKey = formatDateKey(currentPayrollDate);
    // Calc week start (Sunday before)
    const weekStart = new Date(currentPayrollDate);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = formatDateKey(weekStart);
    const weekEndStr = formatDateKey(currentPayrollDate); // Saturday

    // 1. Separate Active vs Former
    // Active: status=Placed AND (start <= Sat AND end >= Sun)
    // Former: status=Placed AND (end < Sun)    
    const activeCandidates = [];
    const formerCandidates = [];

    candidates.forEach(c => {
        // Inclusion Logic:
        // 1. Must have valid contract START.
        // 2. Must be EITHER:
        //    a) Currently 'Placed' (Active)
        //    b) OR have Payroll History (Existing Data)
        //    c) OR be Hidden (Soft Deleted) - implied by (b) usually, but we want to be sure.

        if (!c.contractStart) return;

        const hasPayroll = c.payroll && c.payroll.weeks && Object.keys(c.payroll.weeks).length > 0;
        const shouldInclude = c.status === 'Placed' || hasPayroll;

        if (!shouldInclude) return;

        // Active Logic for THIS week
        // Treated missing contractEnd as "Active Forever" -> so only check Start
        // If there IS an end date, check if it Ended before the week started.

        const isEnded = c.contractEnd && c.contractEnd < weekStartStr;

        if (c.contractStart <= weekEndStr && !isEnded) {
            activeCandidates.push(c);
        } else if (isEnded) {
            // Former Logic: Contract ended before this week started
            formerCandidates.push(c);
        }
    });

    // Sort
    activeCandidates.sort((a, b) => a.fullName.localeCompare(b.fullName));
    formerCandidates.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Render Active
    if (activeCandidates.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-500 py-10">No active travelers for this week.</div>';
    } else {
        renderPayrollCards(activeCandidates, list, weekKey);
    }

    // Render Formers
    if (formerCandidates.length > 0) {
        formersContainer.classList.remove('hidden');
        renderPayrollCards(formerCandidates, formersList, weekKey, true);
    } else {
        formersContainer.classList.add('hidden');
    }

    // Totals logic (Only Active? Or both? User probably means Active Totals, but let's confirm.
    // Usually standard reports separate active margin from residual/adjustments.
    // I'll calculate totals only for ACTIVE for now to start clean.)
    calculateTotals(activeCandidates, weekKey);
}

function renderPayrollCards(candidateList, container, weekKey, isFormer = false) {
    candidateList.forEach(c => {
        const payrollData = c.payroll || {};
        const weeks = payrollData.weeks || {};
        const weekData = weeks[weekKey] || { timecardProcessed: false, hoursWorked: 0, ukgVerified: false, calculatedMargin: 0 };

        // Status Color
        const isGreen = weekData.timecardProcessed && weekData.hoursWorked > 0;
        let statusClass = isGreen
            ? "border-l-4 border-l-emerald-500 bg-emerald-900/10"
            : "border-l-4 border-l-red-500 bg-red-900/10";

        // If former, maybe make it duller?
        if (isFormer) {
            statusClass = "border-l-4 border-l-slate-600 bg-slate-900/30 grayscale-[50%]";
        }

        // No Timecard Styling
        if (weekData.noTimecard) {
            statusClass = "border-l-4 border-l-slate-600 bg-slate-800/50 opacity-60 grayscale";
        }

        const card = document.createElement('div');
        card.className = `bg-[#0f172a] border border-slate-800 rounded p-4 ${statusClass} flex flex-col gap-4 transition-all`;

        card.innerHTML = `
            <div class="flex justify-between items-center cursor-pointer" onclick="window.togglePayrollDetails('${c.id}')">
                <div>
                    <h3 class="font-bold text-slate-200 text-lg ${isFormer ? 'text-slate-400' : ''}">
                        ${c.fullName} 
                        ${isFormer ? '<span class="text-xs text-slate-500">(Former)</span>' : ''}
                        ${weekData.noTimecard ? '<span class="ml-2 text-xs font-bold text-slate-400 border border-slate-600 px-1 rounded">NO TIMECARD</span>' : ''}
                    </h3>
                    <p class="text-[10px] text-slate-500 uppercase">${c.credentials || 'RT'} - ${c.ownerName || 'My Candidate'}</p>
                </div>
                <div class="flex items-center gap-6" onclick="event.stopPropagation()">
                    <label class="flex items-center gap-1.5 cursor-pointer" title="No Timecard / Did Not Work">
                        <input type="checkbox" onchange="window.updatePayroll('${c.id}', 'noTimecard', this.checked)" 
                            class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-slate-400 focus:ring-slate-700" 
                            ${weekData.noTimecard ? 'checked' : ''}>
                        <span class="text-[10px] font-bold text-slate-500 uppercase">No TC</span>
                    </label>

                    <div class="h-8 w-px bg-slate-800 mx-2"></div>

                    <label class="flex items-center gap-2 cursor-pointer ${weekData.noTimecard ? 'opacity-30 pointer-events-none' : ''}">
                        <input type="checkbox" onchange="window.updatePayroll('${c.id}', 'timecard', this.checked)" 
                            class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-900" 
                            ${weekData.timecardProcessed ? 'checked' : ''}>
                        <span class="text-xs font-bold text-slate-400 uppercase">Timecard</span>
                    </label>
                    
                    <div class="flex flex-col items-end ${weekData.noTimecard ? 'opacity-30 pointer-events-none' : ''}">
                         <span class="text-[10px] font-bold text-slate-500 uppercase">Hours</span>
                         <input type="number" value="${weekData.hoursWorked || ''}" 
                            onchange="window.updatePayroll('${c.id}', 'hours', this.value)"
                            class="w-20 bg-slate-900 border border-slate-700 rounded p-1 text-right text-sm text-white focus:border-emerald-500 outline-none" placeholder="0.0">
                    </div>
                    
                    <label class="flex items-center gap-2 cursor-pointer ${weekData.noTimecard ? 'opacity-30 pointer-events-none' : ''}">
                        <input type="checkbox" onchange="window.updatePayroll('${c.id}', 'ukg', this.checked)" 
                            class="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-900" 
                            ${weekData.ukgVerified ? 'checked' : ''}>
                        <span class="text-xs font-bold text-slate-400 uppercase">UKG</span>
                    </label>
                </div>
            </div>
            
            <!-- DROPDOWN -->
            <div id="payroll-details-${c.id}" class="hidden border-t border-slate-800 pt-4 mt-2">
                 <!-- Contract Stats -->
                 <div class="grid grid-cols-2 gap-4 mb-4 bg-slate-900/50 p-3 rounded">
                    <div>
                        <label class="block text-[10px] text-slate-500 uppercase mb-1">Contract Hours</label>
                        <input type="number" value="${payrollData.contractHours || ''}" 
                            onchange="window.updatePayrollMeta('${c.id}', 'contractHours', this.value)"
                            class="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-300 text-xs">
                    </div>
                    <div>
                        <label class="block text-[10px] text-slate-500 uppercase mb-1">Est. Weekly Margin</label>
                        <input type="number" value="${payrollData.weeklyMarginEst || ''}" 
                            onchange="window.updatePayrollMeta('${c.id}', 'weeklyMarginEst', this.value)"
                            class="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-slate-300 text-xs">
                    </div>
                 </div>
                 
                 <!-- History -->
                 <div class="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    ${renderPayrollHistory(c, payrollData)}
                 </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function calculateTotals(activeList, weekKey) {
    let weekTotal = 0;
    activeList.forEach(c => {
        const wData = c.payroll?.weeks?.[weekKey];
        if (wData) weekTotal += (wData.calculatedMargin || 0);
    });

    document.getElementById('weekTotalMargin').textContent = `$${weekTotal.toFixed(2)}`;
    // Period Total for Active
    calculatePeriodTotal(activeList);
}

function renderPayrollHistory(c, data) {
    if (!data.weeks) return '<p class="text-xs text-slate-500 italic">No history yet.</p>';

    // Group by Period
    const history = {}; // PeriodId -> { totalMargin: 0, weeks: [] }

    Object.keys(data.weeks).sort().reverse().forEach(dateKey => {
        const info = getPeriodInfo(dateKey);
        if (!history[info.period]) history[info.period] = { totalMargin: 0, weeks: [] };

        const wData = data.weeks[dateKey];
        history[info.period].totalMargin += (wData.calculatedMargin || 0);
        history[info.period].weeks.push({ date: dateKey, info, ...wData });
    });

    let html = '';
    Object.keys(history).sort((a, b) => b - a).forEach(pId => {
        const pGroup = history[pId];
        html += `
            <div class="mb-2">
                <div class="flex justify-between items-center bg-slate-800/80 px-3 py-1.5 rounded-t border-b border-slate-700">
                    <span class="text-xs font-bold text-slate-300">Period ${pId}</span>
                    <span class="text-xs font-mono text-emerald-400">$${pGroup.totalMargin.toFixed(2)}</span>
                </div>
                <div class="bg-slate-900/30 rounded-b p-2 space-y-1">
                    ${pGroup.weeks.map(w => `
                        <div class="flex justify-between text-[10px] text-slate-400">
                            <span>${w.info.label} (${w.date})</span>
                            <span class="font-mono">${w.hoursWorked} hrs | $${(w.calculatedMargin || 0).toFixed(0)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    return html;
}

function calculatePeriodTotal(candidatesList) {
    // Current Payroll Date determines the period we want to sum?
    // "I also want to be able to see ... period total margin at the top of the tab"
    // Does this mean the period OF the currently viewed week? Yes, implied.

    const currentPeriodInfo = getPeriodInfo(formatDateKey(currentPayrollDate));
    if (!currentPeriodInfo.period) {
        document.getElementById('periodTotalMargin').textContent = "$0.00";
        return;
    }

    let total = 0;
    candidatesList.forEach(c => {
        const weeks = c.payroll?.weeks || {};
        Object.keys(weeks).forEach(dateKey => {
            const inf = getPeriodInfo(dateKey);
            if (inf.period === currentPeriodInfo.period) {
                total += (weeks[dateKey].calculatedMargin || 0);
            }
        });
    });

    document.getElementById('periodTotalMargin').textContent = `$${total.toFixed(2)}`;
}

window.togglePayrollDetails = function (id) {
    const el = document.getElementById(`payroll-details-${id}`);
    if (el.classList.contains('hidden')) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

window.updatePayroll = async function (id, field, value) {
    // 1. Get Candidate
    // 2. data.payroll.weeks[currentDateKey] or init
    // 3. Update field
    // 4. Recalculate Margin

    const c = candidates.find(x => x.id === id);
    if (!c) return;

    const weekKey = formatDateKey(currentPayrollDate);
    const payroll = c.payroll || { weeklyMarginEst: 0, contractHours: 0, weeks: {} };
    if (!payroll.weeks) payroll.weeks = {};
    if (!payroll.weeks[weekKey]) payroll.weeks[weekKey] = { timecardProcessed: false, hoursWorked: 0, ukgVerified: false, calculatedMargin: 0 };

    const wData = payroll.weeks[weekKey];

    if (field === 'timecard') wData.timecardProcessed = value;
    if (field === 'ukg') wData.ukgVerified = value;
    if (field === 'noTimecard') {
        wData.noTimecard = value;
        if (value === true) {
            wData.hoursWorked = 0; // Reset hours if No Timecard ? Or keep them? User implied "didn't work".
            wData.calculatedMargin = 0;
        }
    }
    if (field === 'hours') {
        wData.hoursWorked = parseFloat(value) || 0;
        // Calc Margin: (Est / Contract) * Actual
        const rate = (parseFloat(payroll.weeklyMarginEst) || 0) / (parseFloat(payroll.contractHours) || 1); // Avoid div 0
        wData.calculatedMargin = rate * wData.hoursWorked;
    }

    // Save
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', c.ownerId || currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { payroll: payroll });
        // Optimistic Update
        c.payroll = payroll;
        renderPayrollView(); // Refresh totals and UI
    } catch (e) { console.error(e); showToast("Error saving payroll"); }
}

window.updatePayrollMeta = async function (id, field, value) {
    const c = candidates.find(x => x.id === id);
    if (!c) return;

    const payroll = c.payroll || { weeklyMarginEst: 0, contractHours: 0, weeks: {} };
    payroll[field] = parseFloat(value) || 0;

    // Should we re-calc current week margin? Maybe not automatically, user might just be setting up.
    // Ideally yes, if hours exist.
    const weekKey = formatDateKey(currentPayrollDate);
    if (payroll.weeks && payroll.weeks[weekKey]) {
        const wData = payroll.weeks[weekKey];
        const rate = (parseFloat(payroll.weeklyMarginEst) || 0) / (parseFloat(payroll.contractHours) || 1);
        wData.calculatedMargin = rate * (wData.hoursWorked || 0);
    }

    try {
        const docRef = doc(db, 'artifacts', appId, 'users', c.ownerId || currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { payroll: payroll });
        c.payroll = payroll;
        renderPayrollView();
    } catch (e) { console.error(e); }
}

// --- 3. UI INTERACTIONS ---
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPass');
    const errorMsg = document.getElementById('loginError');

    const btnGoogle = document.getElementById('btnGoogle');
    if (btnGoogle) {
        btnGoogle.onclick = async () => {
            try {
                errorMsg.classList.add('hidden');
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            } catch (e) {
                console.error(e);
                errorMsg.textContent = "Google Sign-In Failed.";
                errorMsg.classList.remove('hidden');
            }
        };
    }

    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.onclick = async () => {
            try {
                errorMsg.classList.add('hidden');
                await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
            } catch (e) {
                errorMsg.textContent = "Invalid email or password.";
                errorMsg.classList.remove('hidden');
            }
        };
    }

    const btnRegister = document.getElementById('btnRegister');
    if (btnRegister) {
        btnRegister.onclick = async () => {
            try {
                errorMsg.classList.add('hidden');
                await createUserWithEmailAndPassword(auth, emailInput.value, passInput.value);
            } catch (e) {
                errorMsg.textContent = "Error: Password must be 6+ chars or email invalid.";
                errorMsg.classList.remove('hidden');
            }
        };
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            signOut(auth);
        };
    }

    populatePayDropdown();
    setupModal();
    setupMapInteractions();

    const asapBtn = document.getElementById('asapBtn');
    if (asapBtn) {
        asapBtn.onclick = () => {
            const today = new Date();
            const offset = today.getTimezoneOffset();
            const localToday = new Date(today.getTime() - (offset * 60 * 1000));
            document.getElementById('availDate').value = localToday.toISOString().split('T')[0];
        };
    }
    setupPhoneFormatting(); // new helper
});

function setupPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;
    phoneInput.addEventListener('input', (e) => {
        let x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
}

function populatePayDropdown() {
    const select = document.getElementById('payReq');
    if (!select) return;
    const start = 1400, end = 3000, step = 100;
    for (let i = start; i <= end; i += step) {
        const option = document.createElement('option');
        option.value = `$${i}/wk`;
        option.text = `$${i}/wk`;
        select.appendChild(option);
    }
}

async function performAutoRollover() {
    if (!currentUser) return;
    const today = new Date();
    let businessDaysAdded = 0;
    let thresholdDate = new Date(today);
    while (businessDaysAdded < 10) {
        thresholdDate.setDate(thresholdDate.getDate() + 1);
        const day = thresholdDate.getDay();
        if (day !== 0 && day !== 6) businessDaysAdded++;
    }
    thresholdDate.setHours(0, 0, 0, 0);

    candidates.forEach(async (c) => {
        if (c.status === 'Placed') return;
        let cDate = new Date(c.availDate + 'T12:00:00');
        if (cDate < thresholdDate) {
            while (cDate < thresholdDate) {
                const currentDay = cDate.getDay();
                const daysToNextMonday = (8 - currentDay) % 7 || 7;
                cDate.setDate(cDate.getDate() + daysToNextMonday);
            }
            const newDateStr = cDate.toISOString().split('T')[0];
            if (newDateStr !== c.availDate) {
                const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', c.id);
                await updateDoc(docRef, { availDate: newDateStr });
            }
        }
    });
}

window.deleteCandidate = async function (id) {
    if (confirm("Are you sure you want to delete this candidate?")) {
        const c = candidates.find(x => x.id === id);
        if (!c) return;

        const targetOwnerId = c.ownerId || currentUser.uid;
        const docRef = doc(db, 'artifacts', appId, 'users', targetOwnerId, 'candidates', id);

        // Check for Payroll History
        const hasPayroll = c.payroll && c.payroll.weeks && Object.keys(c.payroll.weeks).length > 0;

        try {
            if (hasPayroll) {
                // Soft Delete: Hide from Pipeline, Keep in Payroll
                await updateDoc(docRef, { hidden: true });
                showToast("Archived (Payroll Preserved)");
            } else {
                // Hard Delete: No payroll history, safe to remove
                await deleteDoc(docRef);
                showToast("Candidate Deleted");
            }
        } catch (e) {
            console.error("Delete failed:", e);
            showToast(`Delete Failed: ${e.message}`);
        }
    }
}

function getPipelineBar(status) {
    const stages = ['Qualified', 'Full Packet', 'Submitted', 'Placed'];
    const index = stages.indexOf(status);
    const safeIndex = index === -1 ? 0 : index;
    let html = '<div class="flex flex-col gap-1"><div class="flex gap-1">';
    for (let i = 0; i < 4; i++) {
        let colorClass = "bg-slate-800";
        let shadowClass = "";
        if (i <= safeIndex) {
            if (safeIndex === 0) { colorClass = "bg-slate-500"; shadowClass = "shadow-[0_0_6px_rgba(100,116,139,0.6)]"; }
            else if (safeIndex === 1) { colorClass = "bg-indigo-500"; shadowClass = "shadow-[0_0_6px_rgba(99,102,241,0.6)]"; }
            else if (safeIndex === 2) { colorClass = "bg-amber-500"; shadowClass = "shadow-[0_0_6px_rgba(245,158,11,0.6)]"; }
            else if (safeIndex === 3) { colorClass = "bg-emerald-500"; shadowClass = "shadow-[0_0_6px_rgba(16,185,129,0.6)]"; }
        }
        html += `<div class="h-1.5 w-6 rounded-sm ${colorClass} ${shadowClass} transition-all duration-300"></div>`;
    }
    html += '</div></div>';
    return html;
}

function renderList() {
    const listContainer = document.getElementById('candidateList');
    listContainer.innerHTML = '';

    // Filter out hidden (Soft Deleted) candidates from Pipeline View
    const visibleCandidates = candidates.filter(c => !c.hidden);

    if (visibleCandidates.length === 0) {
        listContainer.innerHTML = '<div class="text-slate-500 text-center py-10">No candidates found.</div>';
        return;
    }

    visibleCandidates.sort((a, b) => new Date(a.availDate) - new Date(b.availDate));

    visibleCandidates.forEach(c => {
        const glowClass = getTrafficLightGlow(c.availDate);
        let dateBadgeClass = "";
        if (glowClass === 'glow-red') dateBadgeClass = "text-red-400 border-red-500/50 bg-red-500/10";
        if (glowClass === 'glow-yellow') dateBadgeClass = "text-amber-400 border-amber-500/50 bg-amber-500/10";
        if (glowClass === 'glow-blue') dateBadgeClass = "text-sky-400 border-sky-500/50 bg-sky-500/10";

        const dateDisplay = new Date(new Date(c.availDate).valueOf() + new Date().getTimezoneOffset() * 60000).toLocaleDateString('en-US');
        const displayStatus = c.contractStatus || "Available";
        const pipelineBar = getPipelineBar(c.status);
        const showExtBadge = c.status === 'Placed' && c.extensionInterest;

        const isRed = glowClass === 'glow-red';
        const isPlaced = c.status === 'Placed';
        let resumeBadgeHtml = '';
        if (isPlaced && isRed) {
            if (c.resumeUpdated) {
                resumeBadgeHtml = `<span class="resume-updated ml-2" onclick="window.toggleResumeStatus('${c.id}', event)">RESUME UPDATED</span>`;
            } else {
                resumeBadgeHtml = `<span class="resume-alert ml-2" onclick="window.confirmResumeUpdate('${c.id}', event)">RESUME UPDATE REQUIRED</span>`;
            }
        }

        const card = document.createElement('div');
        card.className = `bg-[#0f172a] border-t border-r border-b border-slate-800/60 rounded ${glowClass} cursor-pointer hover:bg-[#1e293b] transition relative overflow-hidden group`;

        card.innerHTML = `
            <div class="p-5 flex items-center justify-between" onclick="window.toggleDetails('${c.id}')">
                <div class="flex items-center gap-5">
                    <div class="flex items-center justify-center w-24 h-12 rounded border ${dateBadgeClass} transition shadow-inner bg-opacity-10">
                        <span class="text-base font-bold font-mono tracking-tight">${dateDisplay}</span>
                    </div>
                    
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-3">
                            <h3 class="font-bold text-xl text-slate-100 group-hover:text-white transition tracking-wide">${c.fullName}</h3>
                            ${pipelineBar}
                            ${resumeBadgeHtml}
                            ${(c.ownerId && c.ownerId !== currentUser.uid) ? `<span class="text-[10px] text-slate-500 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded font-medium">${userMap[c.ownerId] || c.ownerName || 'Unknown Recruiter'}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-slate-900 bg-slate-400 px-1.5 py-0.5 rounded uppercase">${c.credential}</span>
                            <span class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">${displayStatus}</span>
                            ${showExtBadge ? '<span class="ext-badge">OPEN TO EXTENSION</span>' : ''}
                            ${c.extensionRequested ? '<span class="text-[9px] font-bold text-amber-500 border border-amber-600/50 bg-amber-900/40 px-1.5 py-0.5 rounded tracking-wide">EXT REQ</span>' : ''}
                            ${c.extensionSubmitted ? '<span class="text-[9px] font-bold text-indigo-400 border border-indigo-500/50 bg-indigo-900/40 px-1.5 py-0.5 rounded tracking-wide">SUBMITTED</span>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="text-slate-600 group-hover:text-rose-500 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform transition-transform duration-300" id="arrow-${c.id}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            
            <div id="details-${c.id}" class="details-panel bg-slate-950/30 border-t border-slate-800/50">
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div class="space-y-4">
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Link</p>
                            <div class="flex items-center gap-2 text-slate-300">
                                <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                <a href="mailto:${c.email}" class="font-mono hover:text-rose-400 hover:underline transition">${c.email || 'N/A'}</a>
                            </div>
                            <div class="flex items-center gap-2 text-slate-300 mt-2">
                                <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                <span onclick="window.copyToClipboard('${c.phone}')" class="font-mono hover:text-rose-400 hover:underline transition cursor-pointer" title="Click to Copy">${c.phone || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="bg-slate-900 p-4 rounded border border-slate-700/50">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Update Status</p>
                            <select onchange="window.updateStatus('${c.id}', this.value)" class="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs p-2 rounded focus:border-rose-500 focus:outline-none">
                                <option value="Qualified" ${c.status === 'Qualified' ? 'selected' : ''}>Qualified</option>
                                <option value="Full Packet" ${c.status === 'Full Packet' ? 'selected' : ''}>Full Packet</option>
                                <option value="Submitted" ${c.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                                <option value="Placed" ${c.status === 'Placed' ? 'selected' : ''}>Placed (Offer Accepted)</option>
                            </select>
                            
                            <div id="placement-fields-${c.id}" class="${c.status === 'Placed' ? '' : 'hidden'} mt-3 space-y-3 border-t border-slate-700 pt-3">
                                <div class="relative">
                                    <label class="block text-[10px] text-slate-500 mb-1">Start Date</label>
                                    <div class="flex items-center gap-2">
                                        <input type="text" placeholder="MM/DD" value="${c.contractStart ? new Date(c.contractStart + 'T12:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}" onchange="window.handleStartInput('${c.id}', this.value)" class="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs p-1.5 rounded [color-scheme:dark]">
                                        <button class="text-slate-400 hover:text-white" onclick="document.getElementById('picker-start-${c.id}').showPicker()">📅</button>
                                        <input type="date" id="picker-start-${c.id}" class="sr-only" onchange="window.handleStartInput('${c.id}', this.value)">
                                    </div>
                                </div>
                                <div class="relative">
                                    <label class="block text-[10px] text-emerald-500 font-bold mb-1">End Date (Auto-Updates Avail)</label>
                                    <div class="flex items-center gap-2">
                                        <input type="text" placeholder="MM/DD" value="${c.contractEnd ? new Date(c.contractEnd + 'T12:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}" onchange="window.handleEndInput('${c.id}', this.value)" class="w-full bg-slate-800 border border-emerald-900/50 text-emerald-400 text-xs p-1.5 rounded [color-scheme:dark]">
                                        <button class="text-emerald-500 hover:text-emerald-300" onclick="document.getElementById('picker-end-${c.id}').showPicker()">📅</button>
                                        <input type="date" id="picker-end-${c.id}" class="sr-only" onchange="window.handleEndInput('${c.id}', this.value)">
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700">
                                    <span class="text-[10px] font-bold text-lime-400 uppercase">Interested in Extension?</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" onchange="window.toggleExtension('${c.id}')" class="sr-only peer" ${c.extensionInterest ? 'checked' : ''}>
                                        <div class="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lime-500"></div>
                                    </label>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-2 mt-2">
                                    <button onclick="window.toggleExtensionRequested('${c.id}')" class="text-[10px] font-bold uppercase py-2 rounded border transition ${c.extensionRequested ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}">
                                        Extension Requested
                                    </button>
                                    <button onclick="window.toggleExtensionSubmitted('${c.id}')" class="text-[10px] font-bold uppercase py-2 rounded border transition ${c.extensionSubmitted ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'}">
                                        Submitted
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unit Experience</p>
                            <p class="text-slate-300 leading-relaxed font-light">${c.units || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pay Requirements</p>
                            <p class="text-slate-300 font-mono text-xs">${(c.payReq || c.pay) ? '$' + (c.payReq || c.pay).toString().replace(/^\$+|(\/wk)+$/ig, '') + '/wk' : 'Open'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Licenses</p>
                            <div class="flex flex-wrap gap-1.5">
                                ${(c.licenses || 'N/A').split(',').map(l => `<span class="bg-amber-950/30 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-900/30">${l.trim()}</span>`).join('')}
                            </div>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Certifications</p>
                            <div class="flex flex-wrap gap-1.5">
                                ${(c.certs || 'N/A').split(',').map(ce => `<span class="bg-amber-950/30 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-900/30">${ce.trim()}</span>`).join('')}
                            </div>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Geo Preferences</p>
                            <p class="text-slate-300 leading-relaxed font-light">${c.states || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes</p>
                            <div class="text-slate-400 text-xs italic bg-slate-900/50 p-2 rounded border border-slate-800">
                                ${c.notes || 'No notes added.'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="px-6 pb-6 pt-0 flex justify-between items-center border-t border-slate-800/30 mt-4 pt-4">
                    <div class="flex items-center gap-3">
                        <button onclick="window.logTalk('${c.id}', '${c.ownerId || currentUser.uid}')" class="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider px-3 py-2 border border-emerald-900/30 rounded hover:bg-emerald-900/20 transition flex items-center gap-2">
                            <span>🕒</span> Talked
                        </button>
                        <span class="text-[10px] text-slate-500 font-mono">
                            ${c.lastTalked ? `Last: ${new Date(c.lastTalked.seconds * 1000).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })} ${new Date(c.lastTalked.seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Last: Never'}
                        </span>
                    </div>

                    <div class="flex gap-3">
                    <button onclick="window.editCandidate('${c.id}')" class="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider px-3 py-2 border border-slate-700 rounded hover:bg-slate-800 transition">
                        ${(c.ownerId && c.ownerId !== currentUser.uid) ? 'Edit (Shared)' : 'Edit Details'}
                    </button>
                    ${(!c.ownerId || c.ownerId === currentUser.uid || currentUser.email === 'ben.layher@gmail.com') ? `
                    <button onclick="window.deleteCandidate('${c.id}')" class="text-xs font-bold text-rose-500 hover:text-rose-400 uppercase tracking-wider px-3 py-2 border border-rose-900/30 rounded hover:bg-rose-900/20 transition">
                        Delete
                    </button>` : ''}
                    </div>
                </div>
            </div>
        `;
        // Check if this panel should be open (persist state)
        if (openPanelId === c.id) {
            setTimeout(() => {
                const p = document.getElementById(`details-${c.id}`);
                const a = document.getElementById(`arrow-${c.id}`);
                if (p && a) {
                    p.classList.add('open');
                    a.classList.add('rotate-180');
                }
            }, 50);
        }

        listContainer.appendChild(card);
    });
}

window.confirmResumeUpdate = async function (id, event) {
    event.stopPropagation();
    if (confirm("Confirm: Has the resume been updated for this candidate?")) {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { resumeUpdated: true });
        showToast("Resume Marked as Updated");
    }
}

window.toggleResumeStatus = async function (id, event) {
    event.stopPropagation();
    if (confirm("Mark resume as NOT updated (Required)?")) {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { resumeUpdated: false });
    }
}

window.updateStatus = async function (id, newStatus) {
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        let updateData = { status: newStatus };
        if (newStatus !== 'Placed') {
            updateData.extensionInterest = false;
        }
        await updateDoc(docRef, updateData);
        const placeFields = document.getElementById(`placement-fields-${id}`);
        if (placeFields) {
            if (newStatus === 'Placed') placeFields.classList.remove('hidden');
            else placeFields.classList.add('hidden');
        }
    } catch (e) { console.error(e); showToast("Error updating status"); }
};

window.toggleExtension = async function (id) {
    const c = candidates.find(cand => cand.id === id);
    if (!c) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { extensionInterest: !c.extensionInterest });
    } catch (e) { console.error(e); }
};

window.toggleExtensionRequested = async function (id) {
    const c = candidates.find(cand => cand.id === id);
    if (!c) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { extensionRequested: !c.extensionRequested });
    } catch (e) { console.error("Error toggling requested:", e); }
};

window.toggleExtensionSubmitted = async function (id) {
    const c = candidates.find(cand => cand.id === id);
    if (!c) return;
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { extensionSubmitted: !c.extensionSubmitted });
    } catch (e) { console.error("Error toggling submitted:", e); }
};

// --- SMART DATE LOGIC ---
function parseSmartDate(input) {
    if (!input) return null;
    // If already YYYY-MM-DD (from picker)
    if (input.match(/^\d{4}-\d{2}-\d{2}$/)) return input;

    // Handle MM/DD or M/D
    const parts = input.split('/');
    if (parts.length >= 2) {
        const month = parseInt(parts[0]) - 1; // 0-11
        const day = parseInt(parts[1]);
        const today = new Date();
        const year = today.getFullYear();

        let date = new Date(year, month, day);

        // If date is in the past (more than a few days aka user meant next year), add year
        // Threshold: if input is Jan and today is Dec, clearly next year. 
        // Simple rule: if date < today - 7 days, assume next year.
        if (date < new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
            date.setFullYear(year + 1);
        }

        // Return ISO
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return null;
}

window.handleStartInput = async function (id, value) {
    const isoDate = parseSmartDate(value);
    if (!isoDate) return;

    // 1. Calculate End Date (13 Weeks - 2 Days = Saturday)
    // 13 * 7 = 91 days. -2 = 89 days? 
    // Wait, 13 weeks from Monday is Monday. Saturday is 2 days prior. Yes.
    const startDate = new Date(isoDate + 'T12:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (13 * 7) - 2);
    const isoEnd = endDate.toISOString().split('T')[0];

    // 2. Calculate Avail (Next Monday after End)
    const nextMonday = new Date(endDate);
    const day = nextMonday.getDay();
    const daysToAdd = (1 + 7 - day) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysToAdd);
    const isoAvail = nextMonday.toISOString().split('T')[0];

    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, {
            contractStart: isoDate,
            contractEnd: isoEnd,
            availDate: isoAvail
        });
        showToast("Contract Started! End Date Auto-Calculated.");
    } catch (e) { console.error(e); showToast("Error saving dates"); }
};

window.handleEndInput = async function (id, value) {
    const isoDate = parseSmartDate(value);
    if (!isoDate) return;

    // Calc Avail
    const endDate = new Date(isoDate + 'T12:00:00');
    const nextMonday = new Date(endDate);
    const day = nextMonday.getDay();
    const daysToAdd = (1 + 7 - day) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysToAdd);
    const isoAvail = nextMonday.toISOString().split('T')[0];

    try {
        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, {
            contractEnd: isoDate, // START DATE NOT TOUCHED
            availDate: isoAvail
        });
        showToast("End Date Updated");
    } catch (e) { console.error(e); showToast("Error saving end date"); }
};

window.editCandidate = function (id) {
    const c = candidates.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById('fullName').value = c.fullName;
    document.getElementById('credential').value = c.credential;
    document.getElementById('availDate').value = c.availDate;
    document.getElementById('email').value = c.email;
    document.getElementById('phone').value = c.phone;
    document.getElementById('payReq').value = c.pay;
    document.getElementById('shiftPref').value = c.shift;
    document.getElementById('notes').value = c.notes || "";
    document.getElementById('contractStatus').value = c.contractStatus || "Available";
    document.getElementById('licenses').value = c.licenses || "";

    document.querySelectorAll('#unitsContainer input').forEach(cb => cb.checked = false);
    if (c.units) {
        const unitList = c.units.split(',').map(u => u.trim());
        unitList.forEach(u => {
            const cb = document.querySelector(`#unitsContainer input[value="${u}"]`);
            if (cb) cb.checked = true;
        });
    }
    document.getElementById('statesInterested').value = c.states;
    document.querySelectorAll('#map-container path.selected').forEach(p => p.classList.remove('selected'));
    if (c.states) {
        const stateIds = c.states.split(',').map(s => s.trim());
        stateIds.forEach(id => {
            const path = document.querySelector(`#map-container path[id="${id}"]`) || document.querySelector(`#map-container path[id="US-${id}"]`);
            if (path) path.classList.add('selected');
        });
    }
    document.getElementById('modalTitle').innerText = "EDIT CANDIDATE";
    document.getElementById('submitBtn').innerText = "Update Candidate";

    // Reset Certs first
    document.querySelectorAll('#certsContainer input').forEach(cb => cb.checked = false);
    if (c.certs) {
        const certList = c.certs.split(',').map(ce => ce.trim());
        certList.forEach(ce => {
            const cb = document.querySelector(`#certsContainer input[value="${ce}"]`);
            if (cb) cb.checked = true;
        });
    }

    document.getElementById('modalOverlay').classList.remove('hidden');
}

window.toggleDetails = function (id) {
    const panel = document.getElementById(`details-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    if (!panel) return;
    if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        arrow.classList.remove('rotate-180');
        openPanelId = null; // Clear global state
    } else {
        document.querySelectorAll('.details-panel').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('[id^="arrow-"]').forEach(el => el.classList.remove('rotate-180'));
        panel.classList.add('open');
        arrow.classList.add('rotate-180');
        openPanelId = id; // Set global state
    }
};

function setupModal() {
    const modal = document.getElementById('modalOverlay');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('candidateForm');

    if (openBtn) {
        openBtn.onclick = () => {
            editingId = null;
            form.reset();
            document.getElementById('modalTitle').innerText = "NEW CANDIDATE INTAKE";
            document.getElementById('submitBtn').innerText = "Initiate Candidate";
            document.querySelectorAll('#map-container path.selected').forEach(p => p.classList.remove('selected'));
            document.querySelectorAll('#unitsContainer input').forEach(cb => cb.checked = false);

            // Certs Default (BLS = true)
            document.querySelectorAll('#certsContainer input').forEach(cb => {
                cb.checked = (cb.value === 'BLS');
            });

            if (!document.getElementById('availDate').value) {
                document.getElementById('availDate').valueAsDate = new Date();
            }
            modal.classList.remove('hidden');
        };
    }
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    if (submitBtn) {
        submitBtn.onclick = async () => {
            if (!form.checkValidity()) { form.reportValidity(); return; }
            const selectedUnits = Array.from(document.querySelectorAll('#unitsContainer input:checked')).map(cb => cb.value).join(', ');
            const selectedCerts = Array.from(document.querySelectorAll('#certsContainer input:checked')).map(cb => cb.value).join(', ');

            const formValues = {
                fullName: document.getElementById('fullName').value,
                credential: document.getElementById('credential').value,
                availDate: document.getElementById('availDate').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                payReq: document.getElementById('payReq').value,
                shift: document.getElementById('shiftPref').value,
                units: selectedUnits,
                certs: selectedCerts,
                states: document.getElementById('statesInterested').value,
                states: document.getElementById('statesInterested').value,
                licenses: document.getElementById('licenses').value,
                notes: document.getElementById('notes').value,
                contractStatus: document.getElementById('contractStatus').value
            };
            const sendEmail = document.getElementById('sendEmailToggle').checked;
            try {
                if (sendEmail && !formValues.email) {
                    showToast("Error: Candidate Email Required for Automation");
                    return;
                }

                if (editingId) {
                    // Updating an existing candidate
                    // Check if I am the owner. If not, append audit trail.
                    const existingC = candidates.find(c => c.id === editingId);

                    if (existingC && existingC.ownerId && existingC.ownerId !== currentUser.uid) {
                        const time = new Date().toLocaleString();
                        const auditNote = `\n[Last Edit: ${currentUser.displayName || currentUser.email} - ${time}]`;
                        formValues.notes = (formValues.notes || "") + auditNote;
                    }

                    // For updates, we need to know the PATH. 
                    // If shared, the path is users/{ownerId}/candidates/{docId}
                    const targetOwnerId = (existingC && existingC.ownerId) ? existingC.ownerId : currentUser.uid;

                    const docRef = doc(db, 'artifacts', appId, 'users', targetOwnerId, 'candidates', editingId);
                    await updateDoc(docRef, formValues);
                    showToast("Candidate Updated");
                } else {
                    // Creating new - Add owner info
                    const newDoc = {
                        ...formValues,
                        status: "Qualified",
                        createdAt: new Date().toISOString(),
                        ownerId: currentUser.uid,
                        ownerName: currentUser.displayName || currentUser.email
                    };
                    const colRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates');
                    await addDoc(colRef, newDoc);

                    if (sendEmail) {
                        // Determine Target Email (Exact match to Email List Logic)
                        let targetEmail = currentUser && currentUser.email ? currentUser.email : "unknown@example.com";

                        // Attempt to fetch override (fail gracefully)
                        if (currentUser) {
                            try {
                                const userDocRef = doc(db, 'artifacts', appId, 'users', currentUser.uid);
                                const userSnap = await getDoc(userDocRef);

                                if (userSnap.exists() && userSnap.data().officialEmail) {
                                    targetEmail = userSnap.data().officialEmail;
                                    console.log("Using Official Email Override:", targetEmail);
                                } else {
                                    console.log("Using Login Email (No Override Found):", targetEmail);
                                }
                            } catch (profileErr) {
                                console.warn("Profile fetch failed, defaulting to login email:", profileErr);
                                // Do not stop! Proceed with default email.
                            }
                        }

                        console.log("Sending Webhook Payload...", { candidate: formValues.fullName, target: targetEmail }); // DEBUG

                        const webhookUrl = "https://hook.us2.make.com/pxbfgeonx5iyasmm83855wehl31jydrh";
                        fetch(webhookUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: formValues.fullName,
                                email: formValues.email,
                                phone: formValues.phone,
                                credential: formValues.credential,
                                certs: formValues.certs,
                                notes: formValues.notes,
                                targetEmail: targetEmail || currentUser?.email || "missing_target_email_error",
                                ownerName: newDoc.ownerName
                            })
                        }).then(response => {
                            if (response.ok) showToast(`Pipeline Initiated: ${formValues.fullName}`);
                            else showToast("Saved, but Email Trigger Failed");
                        });
                    } else {
                        showToast("Candidate Added (Silent Mode)");
                    }
                }
                modal.classList.add('hidden');
            } catch (error) {
                console.error("Error saving document:", error);
                showToast("Error Saving Candidate");
            }
        };
    }
}

function getTrafficLightGlow(dateString) {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 45) return 'glow-red';
    if (diffDays <= 90) return 'glow-yellow';
    return 'glow-blue';
}

function setupMapInteractions() {
    const container = document.getElementById('map-container');
    const statesInput = document.getElementById('statesInterested');
    if (!container) return;
    container.addEventListener('click', (e) => {
        if (e.target.tagName === 'path') {
            e.target.classList.toggle('selected');
            const selected = Array.from(container.querySelectorAll('path.selected'))
                .map(el => {
                    const id = el.id || el.getAttribute('name');
                    return id ? id.replace('US-', '') : '';
                })
                .filter(Boolean);
            statesInput.value = selected.join(', ');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('emailListBtn');
    if (btn) {
        btn.onclick = async () => {
            const originalText = btn.innerHTML;

            // 1. Filter the Hot List
            const today = new Date();
            const hotList = candidates.filter(c => {
                const targetDate = new Date(c.availDate);
                const diffTime = targetDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 45;
            }).map(c => ({
                Name: c.fullName,
                Avail: c.availDate,
                Cred: c.credential,
                Lic: c.licenses || "N/A",
                Units: c.units || "N/A",
                Loc: c.states || "Open",
                Pay: c.pay || "Open",
                Status: c.status
            }));

            if (hotList.length === 0) {
                showToast("No candidates available in 45 days.");
                return;
            }

            btn.innerHTML = `<span class="animate-pulse">Sending...</span>`;

            // 2. Determine Target Email (Exact match to Email List Logic)
            let targetEmail = currentUser && currentUser.email ? currentUser.email : "unknown@example.com";

            // Attempt to fetch override (fail gracefully)
            if (currentUser) {
                try {
                    const userDocRef = doc(db, 'artifacts', appId, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);

                    if (userSnap.exists() && userSnap.data().officialEmail) {
                        targetEmail = userSnap.data().officialEmail;
                        console.log("Using Official Email Override:", targetEmail);
                    } else {
                        console.log("Using Login Email (No Override Found):", targetEmail);
                    }
                } catch (profileErr) {
                    console.warn("Profile fetch failed, defaulting to login email:", profileErr);
                    // Do not stop! Proceed with default email.
                }
            }

            // 3. Send Webhook
            const listWebhookUrl = "https://hook.us2.make.com/4alhbwlqbiyo9sl3ekv9wbxjap1sr7fi";

            try {
                const response = await fetch(listWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        candidateList: JSON.stringify(hotList),
                        targetEmail: targetEmail
                    })
                });

                if (response.ok) {
                    showToast(`List sent to ${targetEmail}`);
                } else {
                    showToast("Error sending list (Webhook Failed).");
                }
            } catch (e) {
                console.error("Webhook Error:", e);
                showToast("Network Error: Could not reach automation.");
            } finally {
                setTimeout(() => btn.innerHTML = originalText, 2000);
            }
        };
    }

    // --- ADMIN EMAIL BUTTON LOGIC ---
    const adminBtn = document.getElementById('adminEmailBtn');
    if (adminBtn) {
        adminBtn.onclick = async () => {
            const originalText = adminBtn.innerHTML;
            adminBtn.innerHTML = `<span class="animate-pulse">Fetching Team Data...</span>`;

            try {
                // 1. Fetch ALL candidates fresh (Snapshot of global team view)
                const q = query(collectionGroup(db, 'candidates'));
                const snapshot = await getDocs(q);

                const today = new Date();
                const rawList = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const ownerId = data.ownerId || (doc.ref.parent.parent ? doc.ref.parent.parent.id : 'unknown');
                    return { id: doc.id, ...data, ownerId: ownerId };
                });

                // 2. Filter for Hot (<= 45 Days)
                const adminHotList = rawList.filter(c => {
                    const targetDate = new Date(c.availDate);
                    const diffTime = targetDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 45;
                }).map(c => ({
                    Recruiter: c.ownerName || userMap[c.ownerId] || "Unknown", // First Column!
                    Name: c.fullName,
                    Avail: c.availDate,
                    Cred: c.credential,
                    Lic: c.licenses || "N/A",
                    Units: c.units || "N/A",
                    Loc: c.states || "Open",
                    Pay: c.pay || "Open",
                    Status: c.status
                }));

                if (adminHotList.length === 0) {
                    showToast("No team candidates available in 45 days.");
                    adminBtn.innerHTML = originalText;
                    return;
                }

                // 3. Determine Admin Target Email
                let targetEmail = currentUser && currentUser.email ? currentUser.email : "ben.layher@gmail.com";
                // Optionally fetch override again, but admin is usually fixed. 
                // We'll stick to same robust logic just in case.
                try {
                    const userDocRef = doc(db, 'artifacts', appId, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists() && userSnap.data().officialEmail) {
                        targetEmail = userSnap.data().officialEmail;
                    }
                } catch (e) { }

                // 4. Send to Webhook
                const listWebhookUrl = "https://hook.us2.make.com/4alhbwlqbiyo9sl3ekv9wbxjap1sr7fi";
                const response = await fetch(listWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        candidateList: JSON.stringify(adminHotList),
                        targetEmail: targetEmail
                    })
                });

                if (response.ok) showToast(`Team List sent to ${targetEmail}`);
                else showToast("Error sending team list.");

            } catch (e) {
                console.error("Admin Email Error:", e);
                showToast("Error generating admin list.");
            } finally {
                setTimeout(() => adminBtn.innerHTML = originalText, 2000);
            }
        };
    }
});

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const msg = document.getElementById('toastMessage');
    if (msg) msg.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 3000);
}

// --- CLIPBOARD HELPER ---
window.copyToClipboard = function (text) {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Phone Copied to Clipboard");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast("Error Copying Phone");
    });
};

// --- LOG TALK HELPER ---
window.logTalk = async function (id, ownerId) {
    try {
        const docRef = doc(db, 'artifacts', appId, 'users', ownerId || currentUser.uid, 'candidates', id);
        await updateDoc(docRef, { lastTalked: serverTimestamp() });
        showToast("Talk Logged");
    } catch (e) {
        console.error("Error logging talk:", e);
        showToast("Error logging talk");
    }
};

// --- GEO HELPERS ---
const regionMap = {
    'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'NJ', 'DE', 'MD', 'DC'],
    'Southeast': ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'],
    'Midwest': ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
    'South Central': ['TX', 'OK'],
    'Northwest': ['WA', 'OR', 'ID', 'MT', 'WY', 'AK'],
    'Southwest': ['CA', 'NV', 'UT', 'CO', 'AZ', 'NM', 'HI'],
    'East': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'NJ', 'DE', 'MD', 'DC', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'],
    'West': ['WA', 'OR', 'ID', 'MT', 'WY', 'AK', 'CA', 'NV', 'UT', 'CO', 'AZ', 'NM', 'HI']
};

window.toggleOpenGeo = function (isChecked) {
    const input = document.getElementById('statesInterested');
    const container = document.getElementById('map-container');

    if (isChecked) {
        // Clear Map selections
        container.querySelectorAll('path.selected').forEach(el => el.classList.remove('selected'));
        // Set Value
        input.value = "OPEN";
        // Visual Feedback (Fade map)
        container.classList.add('opacity-50', 'pointer-events-none');
    } else {
        input.value = "";
        container.classList.remove('opacity-50', 'pointer-events-none');
    }
};

window.selectRegion = function (region) {
    // Uncheck Open Geo if active
    const openCheck = document.getElementById('openGeoToggle');
    if (openCheck && openCheck.checked) {
        openCheck.click(); // Trigger click to reset state safely
    }

    const states = regionMap[region];
    if (!states) return;

    const container = document.getElementById('map-container');
    const input = document.getElementById('statesInterested');

    // Check if currently fully selected
    const allSelected = states.every(code => {
        const path = container.querySelector(`path[id="US-${code}"]`);
        return path && path.classList.contains('selected');
    });

    if (allSelected) {
        // Deselect
        states.forEach(code => {
            const path = container.querySelector(`path[id="US-${code}"]`);
            if (path) path.classList.remove('selected');
        });
    } else {
        // Select
        states.forEach(code => {
            const path = container.querySelector(`path[id="US-${code}"]`);
            if (path) path.classList.add('selected');
        });
    }

    // Update Input
    // Get all currently selected
    const currentlySelected = Array.from(container.querySelectorAll('path.selected'))
        .map(el => el.id.replace('US-', ''));

    input.value = currentlySelected.join(', ');
};
