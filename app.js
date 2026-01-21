// --- FIREBASE SETUP ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
let candidates = [];
let editingId = null;

// --- 1. SESSION PERSISTENCE ---
setPersistence(auth, browserSessionPersistence)
    .then(() => console.log("Session Mode: Closing tab will log out."))
    .catch((error) => console.error("Persistence Error:", error));

// --- 2. AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
    const overlay = document.getElementById('loginOverlay');
    const logoutBtn = document.getElementById('btnLogout');
    const headerTitle = document.querySelector('h1');

    if (user) {
        // LOGGED IN
        currentUser = user;
        overlay.classList.add('hidden');
        logoutBtn.classList.remove('hidden');

        const shortName = user.displayName || user.email.split('@')[0];
        if (headerTitle) {
            headerTitle.innerHTML = `HOT LIST <span class="text-xs align-middle bg-slate-800 text-rose-400 px-2 py-1 rounded border border-rose-900/50 ml-2">${shortName.toUpperCase()}</span>`;
        }

        console.log("Loading data for:", user.uid);
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'candidates'));

        onSnapshot(q, (snapshot) => {
            candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            performAutoRollover();
            renderList();
        });

    } else {
        // LOGGED OUT
        currentUser = null;
        candidates = [];
        renderList();
        overlay.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        if (headerTitle) headerTitle.innerHTML = `HOT LIST`;
    }
});

let openPanelId = null; // Track open panel globally

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
        await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id));
        showToast("Candidate Deleted");
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

    if (candidates.length === 0) {
        listContainer.innerHTML = '<div class="text-slate-500 text-center py-10">No candidates found.</div>';
        return;
    }

    candidates.sort((a, b) => new Date(a.availDate) - new Date(b.availDate));

    candidates.forEach(c => {
        const glowClass = getTrafficLightGlow(c.availDate);
        let dateBadgeClass = "";
        if (glowClass === 'glow-green') dateBadgeClass = "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
        if (glowClass === 'glow-yellow') dateBadgeClass = "text-amber-400 border-amber-500/50 bg-amber-500/10";
        if (glowClass === 'glow-red') dateBadgeClass = "text-red-400 border-red-500/50 bg-red-500/10";

        const dateDisplay = new Date(new Date(c.availDate).valueOf() + new Date().getTimezoneOffset() * 60000).toLocaleDateString('en-US');
        const displayStatus = c.contractStatus || "Available";
        const pipelineBar = getPipelineBar(c.status);
        const showExtBadge = c.status === 'Placed' && c.extensionInterest;

        const isGreen = glowClass === 'glow-green';
        const isPlaced = c.status === 'Placed';
        let resumeBadgeHtml = '';
        if (isPlaced && isGreen) {
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
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-bold text-slate-900 bg-slate-400 px-1.5 py-0.5 rounded uppercase">${c.credential}</span>
                            <span class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">${displayStatus}</span>
                            ${showExtBadge ? '<span class="ext-badge">OPEN TO EXTENSION</span>' : ''}
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
                                <a href="tel:${c.phone}" class="font-mono hover:text-rose-400 hover:underline transition">${c.phone || 'N/A'}</a>
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
                                <div>
                                    <label class="block text-[10px] text-slate-500 mb-1">Start Date</label>
                                    <input type="date" value="${c.contractStart || ''}" class="w-full bg-slate-800 border border-slate-600 text-slate-200 text-xs p-1.5 rounded [color-scheme:dark]">
                                </div>
                                <div>
                                    <label class="block text-[10px] text-emerald-500 font-bold mb-1">End Date (Auto-Updates Avail)</label>
                                    <input type="date" value="${c.contractEnd || ''}" onchange="window.handlePlacementDates('${c.id}', this.value)" class="w-full bg-slate-800 border border-emerald-900/50 text-emerald-400 text-xs p-1.5 rounded [color-scheme:dark]">
                                </div>
                                
                                <div class="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700">
                                    <span class="text-[10px] font-bold text-lime-400 uppercase">Interested in Extension?</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" onchange="window.toggleExtension('${c.id}')" class="sr-only peer" ${c.extensionInterest ? 'checked' : ''}>
                                        <div class="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lime-500"></div>
                                    </label>
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
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Licenses</p>
                            <div class="flex flex-wrap gap-1.5">
                                ${(c.licenses || 'N/A').split(',').map(l => `<span class="bg-rose-950/30 text-rose-400 text-[10px] px-2 py-0.5 rounded border border-rose-900/30">${l.trim()}</span>`).join('')}
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
                
                <div class="px-6 pb-6 pt-0 flex justify-end gap-3 border-t border-slate-800/30 mt-4 pt-4">
                    <button onclick="window.editCandidate('${c.id}')" class="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider px-3 py-2 border border-slate-700 rounded hover:bg-slate-800 transition">
                        Edit Details
                    </button>
                    <button onclick="window.deleteCandidate('${c.id}')" class="text-xs font-bold text-rose-500 hover:text-rose-400 uppercase tracking-wider px-3 py-2 border border-rose-900/30 rounded hover:bg-rose-900/20 transition">
                        Delete
                    </button>
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

window.handlePlacementDates = async function (id, endDateString) {
    if (!endDateString) return;
    try {
        const safeDate = new Date(endDateString + 'T12:00:00');
        const safeDay = safeDate.getDay();
        const daysToAdd = (1 + 7 - safeDay) % 7 || 7;
        const nextMonday = new Date(safeDate);
        nextMonday.setDate(safeDate.getDate() + daysToAdd);
        const newAvail = nextMonday.toISOString().split('T')[0];

        const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', id);
        await updateDoc(docRef, {
            contractEnd: endDateString,
            availDate: newAvail
        });
        showToast(`Placed! Avail updated to Mon, ${newAvail}`);
    } catch (e) { console.error(e); showToast("Error updating dates"); }
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
            const formValues = {
                fullName: document.getElementById('fullName').value,
                credential: document.getElementById('credential').value,
                availDate: document.getElementById('availDate').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                pay: document.getElementById('payReq').value,
                shift: document.getElementById('shiftPref').value,
                units: selectedUnits,
                states: document.getElementById('statesInterested').value,
                licenses: document.getElementById('licenses').value,
                notes: document.getElementById('notes').value,
                contractStatus: document.getElementById('contractStatus').value
            };
            const sendEmail = document.getElementById('sendEmailToggle').checked;
            try {
                if (editingId) {
                    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates', editingId);
                    await updateDoc(docRef, formValues);
                    showToast("Candidate Updated");
                } else {
                    const newDoc = { ...formValues, status: "Qualified", createdAt: new Date().toISOString() };
                    const colRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'candidates');
                    await addDoc(colRef, newDoc);

                    if (sendEmail) {
                        const webhookUrl = "https://hook.us2.make.com/pxbfgeonx5iyasmm83855wehl31jydrh";
                        fetch(webhookUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: formValues.fullName,
                                email: formValues.email,
                                phone: formValues.phone,
                                credential: formValues.credential,
                                notes: formValues.notes
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
    if (diffDays <= 45) return 'glow-green';
    if (diffDays <= 90) return 'glow-yellow';
    return 'glow-red';
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

            const listWebhookUrl = "https://hook.us2.make.com/4alhbwlqbiyo9sl3ekv9wbxjap1sr7fi";

            try {
                const response = await fetch(listWebhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        candidateList: JSON.stringify(hotList)
                    })
                });

                if (response.ok) {
                    showToast(`Sent ${hotList.length} candidates!`);
                } else {
                    showToast("Error sending list.");
                }
            } catch (e) {
                console.error(e);
                showToast("Network Error.");
            } finally {
                setTimeout(() => btn.innerHTML = originalText, 2000);
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
