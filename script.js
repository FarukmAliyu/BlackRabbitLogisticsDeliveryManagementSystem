/* =========================================================
   BLACK RABBIT LOGISTICS - MAIN SCRIPT (single file)
   Fixes: duplicate load guard, rider approval, rider status
   updates, pending riders in dropdown, GPS-free check-out.
========================================================= */
(() => {
"use strict";

if (window.BlackRabbitDashboardLoaded) return;
window.BlackRabbitDashboardLoaded = true;

/* ================= CONFIG ================= */
const KEYS = {
    riders: "blackRabbitRiders",
    deliveries: "blackRabbitDeliveries",
    attendance: "blackRabbitAttendance",
    payments: "blackRabbitRiderPayments",
    loggedIn: "blackRabbitLoggedIn",
    currentUser: "blackRabbitCurrentUser"
};
const SUPER_ADMIN = {
    phone: "08000000000", password: "Admin@123",
    firstName: "Super", lastName: "Admin",
    name: "Super Admin", role: "super_admin", id: "SUPER-ADMIN"
};
const OFFICE = { latitude: 10.5366473, longitude: 7.4682503, radiusMeters: 200 };
const DAILY_CHECKIN_FEE = 1000;
const PAGE_INFO = {
    dashboard: ["Dashboard", "Welcome to your delivery operations."],
    deliveries: ["Deliveries", "Manage and monitor delivery orders."],
    tracking: ["Tracking", "Track the progress of a delivery."],
    customers: ["Customers", "Customer information from delivery records."],
    drivers: ["Riders", "Manage registered riders."],
    analytics: ["Analytics", "Review delivery performance and revenue."],
    attendance: ["Attendance", "Rider attendance and check-in records."],
    settings: ["Settings", "System configuration."]
};
const NEXT_STATUS = {
    "Pending": "Picked Up",
    "Assigned": "Picked Up",
    "Picked Up": "In Transit",
    "In Transit": "Delivered"
};

let deliveryFilter = "All";
let editingDeliveryId = null;
let charts = {};
const $ = id => document.getElementById(id);

/* ================= DATA HELPERS ================= */
function read(key, fallback = []) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
    } catch (e) { console.error("Could not read:", key, e); return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
const arr = key => { const v = read(key, []); return Array.isArray(v) ? v : []; };
const getRiders = () => arr(KEYS.riders);
const getDeliveries = () => arr(KEYS.deliveries);
const getAttendance = () => arr(KEYS.attendance);
const getPayments = () => arr(KEYS.payments);
const getUser = () => read(KEYS.currentUser, null);

function isAdmin() {
    const u = getUser();
    return !!u && (u.role === "super_admin" || u.role === "admin");
}
function currentRiderId() {
    const u = getUser();
    return u ? String(u.id || u.phone) : "";
}
function riderId(r) { return String(r?.id || r?.phone || ""); }
function deliveryRiderId(d) { return String(d.riderId || d.assignedRiderId || d.rider || ""); }
function riderName(r) {
    if (!r) return "Unassigned";
    return r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.fullName || r.phone || "Rider";
}
function deliveryRiderName(d) {
    const assigned = deliveryRiderId(d);
    const r = getRiders().find(x =>
        riderId(x) === assigned || x.name === assigned ||
        [x.firstName, x.lastName].filter(Boolean).join(" ") === assigned);
    return r ? riderName(r) : (d.riderName || assigned || "Unassigned");
}
function normaliseStatus(status) {
    const s = String(status || "Pending").toLowerCase();
    if (s.includes("deliver")) return "Delivered";
    if (s.includes("cancel")) return "Cancelled";
    if (s.includes("transit") || s.includes("on the way")) return "In Transit";
    if (s.includes("pickup") || s.includes("picked")) return "Picked Up";
    if (s.includes("assign")) return "Assigned";
    return "Pending";
}
function money(n) {
    return "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
}
function escapeHTML(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}
function todayKey(date = new Date()) {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${m}-${d}`;
}
function weekStart(date = new Date()) {
    const r = new Date(date);
    r.setHours(0, 0, 0, 0);
    const day = r.getDay();
    r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
    return r;
}
function isThisWeek(s) {
    if (!s) return false;
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d >= weekStart() && d <= new Date();
}
function dateTime(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return escapeHTML(v);
    return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}
function showMessage(id, message, type = "error") {
    const el = $(id);
    if (!el) { alert(message); return; }
    el.textContent = message;
    el.style.color = type === "success" ? "#15803d" : "#dc2626";
}
function clearMessage(id) { const el = $(id); if (el) el.textContent = ""; }
function setVisible(el, visible) { if (el) el.style.display = visible ? "" : "none"; }
function setText(id, v) { if ($(id)) $(id).textContent = v; }
function canSeeDelivery(d) { return isAdmin() || deliveryRiderId(d) === currentRiderId(); }
function visibleDeliveries() { return getDeliveries().filter(canSeeDelivery); }
function generateId(prefix = "BR") {
    return `${prefix}-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}
function isRiderApproved(r) {
    return r.active !== false && !["Disabled", "Pending Approval", "Pending", "Rejected"].includes(r.status);
}

/* ================= AUTH UI ================= */
function showAuthPanel(panelId) {
    ["riderLoginForm", "adminLoginForm", "registerForm"].forEach(id => {
        const p = $(id);
        if (!p) return;
        const show = id === panelId;
        p.classList.toggle("hidden-auth", !show);
        p.style.display = show ? "" : "none";
    });
}
function setRoleButtons(role) {
    $("riderRoleBtn")?.classList.toggle("active", role === "rider");
    $("adminRoleBtn")?.classList.toggle("active", role === "admin");
}
function clearAuthMessages() {
    ["loginMessage", "adminMessage", "registerMessage"].forEach(clearMessage);
}
window.selectRole = function (role) {
    setRoleButtons(role);
    showAuthPanel(role === "rider" ? "riderLoginForm" : "adminLoginForm");
    clearAuthMessages();
};
window.showRegister = function () {
    setRoleButtons("rider");
    showAuthPanel("registerForm");
    clearAuthMessages();
};
window.showLogin = function () {
    setRoleButtons("rider");
    showAuthPanel("riderLoginForm");
    clearAuthMessages();
};
window.togglePassword = function (id, button) {
    const input = $(id);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    if (button) button.textContent = input.type === "password" ? "Show" : "Hide";
};
function normalisePhone(phone) {
    let v = String(phone || "").trim().replace(/\s+/g, "").replace(/-/g, "");
    if (v.startsWith("+234")) v = "0" + v.substring(4);
    if (v.startsWith("234") && v.length === 13) v = "0" + v.substring(3);
    return v;
}

/* ================= LOGIN / REGISTER ================= */
window.riderLogin = function () {
    const phone = normalisePhone($("loginPhone")?.value || "");
    const password = $("loginPassword")?.value || "";
    if (!phone || !password)
        return showMessage("loginMessage", "Enter your phone number and password.");

    const rider = getRiders().find(r => normalisePhone(r.phone) === phone && r.password === password);
    if (!rider)
        return showMessage("loginMessage", "Rider account not found or password is incorrect.");
    if (rider.active === false || rider.status === "Disabled" || rider.status === "Rejected")
        return showMessage("loginMessage", "Your rider account is disabled.");
    if (rider.status === "Pending Approval" || rider.status === "Pending")
        return showMessage("loginMessage", "Your rider account is awaiting administrator approval.");

    save(KEYS.currentUser, {
        id: riderId(rider), phone: rider.phone,
        firstName: rider.firstName || rider.name || "", lastName: rider.lastName || "",
        name: riderName(rider), role: "rider"
    });
    localStorage.setItem(KEYS.loggedIn, "true");
    openApplication();
};
window.adminLogin = function () {
    const phone = normalisePhone($("adminPhone")?.value || "");
    const password = $("adminPassword")?.value || "";
    if (!phone || !password)
        return showMessage("adminMessage", "Enter the admin phone number and password.");
    if (phone !== normalisePhone(SUPER_ADMIN.phone) || password !== SUPER_ADMIN.password)
        return showMessage("adminMessage", "Incorrect admin credentials.");

    const { password: _omit, ...safeAdmin } = SUPER_ADMIN; // don't store password in session
    save(KEYS.currentUser, safeAdmin);
    localStorage.setItem(KEYS.loggedIn, "true");
    openApplication();
};
window.registerRider = function () {
    const firstName = ($("regFirstName")?.value || "").trim();
    const lastName = ($("regLastName")?.value || "").trim();
    const phone = normalisePhone($("regPhone")?.value || "");
    const password = $("regPassword")?.value || "";

    if (!firstName || !lastName || !phone || !password)
        return showMessage("registerMessage", "Complete all required fields.");
    if (password.length < 6)
        return showMessage("registerMessage", "Password must be at least 6 characters.");
    if (!$("regTerms")?.checked)
        return showMessage("registerMessage", "Please accept the rider terms.");

    const riders = getRiders();
    if (riders.some(r => normalisePhone(r.phone) === phone))
        return showMessage("registerMessage", "This phone number is already registered.");

    riders.push({
        id: generateId("RIDER"), firstName, lastName,
        name: `${firstName} ${lastName}`, phone, password,
        role: "rider", status: "Pending Approval", active: true,
        createdAt: new Date().toISOString()
    });
    save(KEYS.riders, riders);
    showMessage("registerMessage",
        "Registration submitted successfully. Please wait for administrator approval.", "success");
    if ($("regPassword")) $("regPassword").value = "";
    if ($("regTerms")) $("regTerms").checked = false;
};
window.forgotPassword = function (e) {
    e?.preventDefault();
    alert("Please contact your Black Rabbit Logistics administrator to reset your password.");
};
window.logout = function () {
    localStorage.removeItem(KEYS.loggedIn);
    localStorage.removeItem(KEYS.currentUser);
    setVisible($("mainApp"), false);
    setVisible($("authScreen"), true);
    window.selectRole("rider");
};

/* ================= OPEN APP ================= */
function openApplication() {
    const user = getUser();
    if (!user) return;
    setVisible($("authScreen"), false);
    setVisible($("mainApp"), true);

    const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("") || "BR";

    setText("sidebarAvatar", initials);
    setText("headerAvatar", initials);
    if ($("sidebarUser"))
        $("sidebarUser").innerHTML =
            `${escapeHTML(name)}<small>${user.role === "rider" ? "Rider" : "Super Admin"}</small>`;
    setText("dashboardGreeting", `Welcome, ${name}`);

    ["customersNav", "driversNav", "analyticsNav", "attendanceNav"]
        .forEach(id => setVisible($(id), isAdmin()));
    document.querySelectorAll(".primary.new").forEach(b => setVisible(b, isAdmin()));
    // Settings is admin-only too
    document.querySelectorAll('[data-page="settings"]').forEach(b => setVisible(b, isAdmin()));

    goToPage("dashboard");
    renderAll();
}

/* ================= NAVIGATION ================= */
function goToPage(page) {
    if (!PAGE_INFO[page]) page = "dashboard";
    if (!isAdmin() && ["customers", "drivers", "analytics", "attendance", "settings"].includes(page))
        page = "dashboard";

    document.querySelectorAll(".page").forEach(s => s.classList.toggle("hidden", s.id !== page));
    document.querySelectorAll("[data-page]").forEach(b =>
        b.classList.toggle("active", b.dataset.page === page));
    setText("title", PAGE_INFO[page][0]);
    setText("sub", PAGE_INFO[page][1]);

    if (page === "attendance") renderAttendancePage();
    if (page === "deliveries") renderDeliveries();
}
document.querySelectorAll("[data-page]").forEach(b =>
    b.addEventListener("click", () => goToPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b =>
    b.addEventListener("click", () => goToPage(b.dataset.go)));
$("menu")?.addEventListener("click", () =>
    document.querySelector(".side")?.classList.toggle("open"));

/* ================= DELIVERY MODAL ================= */
function fillRiderOptions(selected = "") {
    const select = $("deliveryRider");
    if (!select) return;
    const riders = getRiders().filter(isRiderApproved);
    select.innerHTML = '<option value="">Unassigned</option>' + riders.map(r => {
        const id = riderId(r);
        return `<option value="${escapeHTML(id)}" ${id === String(selected) ? "selected" : ""}>${escapeHTML(riderName(r))}</option>`;
    }).join("");
}
function openDeliveryModal(delivery = null) {
    if (!isAdmin()) return alert("Only an administrator can create or edit deliveries.");
    editingDeliveryId = delivery?.id || null;
    $("form")?.reset();
    fillRiderOptions(delivery ? deliveryRiderId(delivery) : "");

    if ($("deliveryEditId")) $("deliveryEditId").value = editingDeliveryId || "";
    setText("modalTitle", delivery ? "Edit Delivery" : "Create New Delivery");
    setText("modalDescription", delivery ? "Update delivery details." : "Create and assign a delivery.");
    setText("saveDeliveryButton", delivery ? "Save Changes" : "Create Delivery");

    if (delivery) {
        const fields = {
            deliveryCustomer: delivery.customer || "",
            deliveryPhone: delivery.phone || "",
            deliveryPickup: delivery.pickup || "",
            deliveryDestination: delivery.destination || "",
            deliveryPackage: delivery.packageDescription || delivery.package || "",
            deliveryAmount: delivery.amount ?? "",
            deliveryRiderEarning: delivery.riderEarning ?? "",
            deliveryStatus: normaliseStatus(delivery.status),
            deliveryNotes: delivery.notes || ""
        };
        Object.entries(fields).forEach(([id, v]) => { if ($(id)) $(id).value = v; });
        renderDeliveryHistory(delivery);
    } else {
        if ($("deliveryStatus")) $("deliveryStatus").value = "Pending";
        if ($("deliveryHistory")) {
            $("deliveryHistory").innerHTML = "";
            $("deliveryHistory").classList.add("hidden");
        }
    }
    $("modal")?.classList.add("show");
    $("modal")?.classList.remove("hidden");
}
window.closeDeliveryModal = function () {
    $("modal")?.classList.remove("show");
    $("modal")?.classList.add("hidden");
    editingDeliveryId = null;
};
document.querySelectorAll(".primary.new").forEach(b =>
    b.addEventListener("click", () => openDeliveryModal()));
$("close")?.addEventListener("click", window.closeDeliveryModal);

function renderDeliveryHistory(delivery) {
    const c = $("deliveryHistory");
    if (!c) return;
    const history = Array.isArray(delivery.history) ? delivery.history : [];
    c.classList.toggle("hidden", history.length === 0);
    c.innerHTML = history.length
        ? "<strong>Delivery history</strong>" + history.map(i =>
            `<p>${escapeHTML(i.status || "Updated")} — ${escapeHTML(dateTime(i.date || i.createdAt))}</p>`).join("")
        : "";
}

$("form")?.addEventListener("submit", event => {
    event.preventDefault();
    if (!isAdmin()) return alert("Only an administrator can save delivery changes.");

    const customer = $("deliveryCustomer")?.value.trim() || "";
    const phone = $("deliveryPhone")?.value.trim() || "";
    const pickup = $("deliveryPickup")?.value.trim() || "";
    const destination = $("deliveryDestination")?.value.trim() || "";
    if (!customer || !phone || !pickup || !destination)
        return alert("Complete the customer, phone, pickup and destination fields.");

    const deliveries = getDeliveries();
    const now = new Date().toISOString();
    const existing = deliveries.find(d => String(d.id) === String(editingDeliveryId));
    const assignedRider = $("deliveryRider")?.value || "";
    let newStatus = normaliseStatus($("deliveryStatus")?.value);
    // Auto-promote Pending -> Assigned when a rider is chosen
    if (assignedRider && newStatus === "Pending") newStatus = "Assigned";

    const updated = {
        ...(existing || {}),
        id: existing?.id || generateId(),
        customer, phone, pickup, destination,
        packageDescription: $("deliveryPackage")?.value.trim() || "",
        amount: Number($("deliveryAmount")?.value || 0),
        riderEarning: Number($("deliveryRiderEarning")?.value || 0),
        riderId: assignedRider,
        riderName: deliveryRiderName({ riderId: assignedRider }),
        status: newStatus,
        notes: $("deliveryNotes")?.value.trim() || "",
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        history: Array.isArray(existing?.history) ? [...existing.history] : []
    };
    if (newStatus === "Delivered" && !updated.deliveredAt) updated.deliveredAt = now;
    if (newStatus !== "Delivered") delete updated.deliveredAt;

    if (!existing || normaliseStatus(existing.status) !== newStatus)
        updated.history.push({ status: newStatus, date: now });

    if (existing) {
        deliveries[deliveries.findIndex(d => String(d.id) === String(existing.id))] = updated;
    } else {
        deliveries.unshift(updated);
    }
    save(KEYS.deliveries, deliveries);
    window.closeDeliveryModal();
    renderAll();
});

window.editDelivery = function (id) {
    const d = getDeliveries().find(x => String(x.id) === String(id));
    if (d) openDeliveryModal(d);
};
window.deleteDelivery = function (id) {
    if (!isAdmin()) return alert("Administrator access is required.");
    const d = getDeliveries().find(x => String(x.id) === String(id));
    if (!d) return;
    if (!confirm(`Delete delivery ${d.id}? This cannot be undone.`)) return;
    save(KEYS.deliveries, getDeliveries().filter(x => String(x.id) !== String(id)));
    renderAll();
};

/* ===== NEW: rider (or admin) advances a delivery's status ===== */
window.advanceDelivery = function (id) {
    const deliveries = getDeliveries();
    const d = deliveries.find(x => String(x.id) === String(id));
    if (!d) return;
    if (!isAdmin() && deliveryRiderId(d) !== currentRiderId())
        return alert("You can only update your own deliveries.");

    const current = normaliseStatus(d.status);
    const next = NEXT_STATUS[current];
    if (!next) return alert("This delivery cannot be advanced further.");
    if (!confirm(`Mark delivery ${d.id} as "${next}"?`)) return;

    const now = new Date().toISOString();
    d.status = next;
    d.updatedAt = now;
    d.history = Array.isArray(d.history) ? d.history : [];
    d.history.push({ status: next, date: now, by: getUser()?.name || "" });
    if (next === "Delivered") d.deliveredAt = now;
    save(KEYS.deliveries, deliveries);
    renderAll();
};

/* ================= DELIVERY TABLES ================= */
function statusBadge(status) {
    const n = normaliseStatus(status);
    return `<span class="status ${n.toLowerCase().replace(/\s+/g, "-")}">${escapeHTML(n)}</span>`;
}
function deliveryRow(d) {
    const id = escapeHTML(d.id);
    const next = NEXT_STATUS[normaliseStatus(d.status)];
    const advance = next
        ? `<button type="button" class="link" onclick="advanceDelivery('${id}')">Mark ${escapeHTML(next)}</button>`
        : "";
    const actions = isAdmin()
        ? `<button type="button" class="link" onclick="editDelivery('${id}')">Edit</button>
           <button type="button" class="link" onclick="deleteDelivery('${id}')">Delete</button>`
        : `${advance}
           <button type="button" class="link" onclick="trackSpecificDelivery('${id}')">Track</button>`;
    return `<tr>
        <td>${id}</td>
        <td>${escapeHTML(d.customer || "—")}</td>
        <td>${escapeHTML(d.pickup || "—")}</td>
        <td>${escapeHTML(d.destination || "—")}</td>
        <td>${escapeHTML(deliveryRiderName(d))}</td>
        <td>${statusBadge(d.status)}</td>
        <td>${money(d.amount)}</td>
        <td>${actions}</td>
    </tr>`;
}
function renderDeliveries() {
    const term = ($("search")?.value || "").trim().toLowerCase();
    const filtered = visibleDeliveries().filter(d => {
        const okStatus = deliveryFilter === "All" || normaliseStatus(d.status) === deliveryFilter;
        const text = [d.id, d.customer, d.phone, d.pickup, d.destination,
            deliveryRiderName(d), d.status].join(" ").toLowerCase();
        return okStatus && text.includes(term);
    });
    if ($("allRows"))
        $("allRows").innerHTML = filtered.length
            ? filtered.map(deliveryRow).join("")
            : '<tr><td colspan="8">No deliveries found.</td></tr>';
}
window.setDeliveryFilter = function (status, button) {
    deliveryFilter = status;
    document.querySelectorAll(".tabs button").forEach(i =>
        i.classList.toggle("selected", i === button));
    renderDeliveries();
};
$("search")?.addEventListener("input", renderDeliveries);

/* ================= TRACKING ================= */
function showTracking(delivery) {
    const r = $("trackingResult");
    if (!r) return;
    r.classList.remove("hidden");
    if (!delivery) {
        r.innerHTML = "<h3>Delivery not found</h3><p>Check the delivery ID and try again.</p>";
        return;
    }
    const history = Array.isArray(delivery.history) ? delivery.history : [];
    r.innerHTML = `
        <h2>Delivery ${escapeHTML(delivery.id)}</h2>
        <p><strong>Customer:</strong> ${escapeHTML(delivery.customer || "—")}</p>
        <p><strong>Pickup:</strong> ${escapeHTML(delivery.pickup || "—")}</p>
        <p><strong>Destination:</strong> ${escapeHTML(delivery.destination || "—")}</p>
        <p><strong>Rider:</strong> ${escapeHTML(deliveryRiderName(delivery))}</p>
        <p><strong>Status:</strong> ${statusBadge(delivery.status)}</p>
        <p><strong>Last updated:</strong> ${escapeHTML(dateTime(delivery.updatedAt || delivery.createdAt))}</p>
        <h3>Progress history</h3>
        ${history.length
            ? history.map(i => `<p>${escapeHTML(i.status)} — ${escapeHTML(dateTime(i.date))}</p>`).join("")
            : "<p>No status history recorded yet.</p>"}`;
}
$("track")?.addEventListener("click", () => {
    const id = ($("trackId")?.value || "").trim();
    if (!id) return alert("Enter a delivery ID.");
    showTracking(visibleDeliveries().find(d => String(d.id).toLowerCase() === id.toLowerCase()));
});
window.trackSpecificDelivery = function (id) {
    const d = visibleDeliveries().find(x => String(x.id) === String(id));
    goToPage("tracking");
    if ($("trackId")) $("trackId").value = id;
    showTracking(d);
};

/* ================= ATTENDANCE / GPS ================= */
function distanceMeters(lat1, lon1, lat2, lon2) {
    const rad = d => d * Math.PI / 180;
    const R = 6371000;
    const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function todayAttendance() {
    return getAttendance().find(r =>
        String(r.riderId) === currentRiderId() && r.date === todayKey());
}
function getRiderWeekEarnings(id) {
    const deliveries = getDeliveries().filter(d =>
        deliveryRiderId(d) === String(id) &&
        normaliseStatus(d.status) === "Delivered" &&
        isThisWeek(d.deliveredAt || d.updatedAt || d.createdAt));
    const deliveryEarnings = deliveries.reduce((t, d) => t + Number(d.riderEarning || 0), 0);
    const extraPayments = getPayments()
        .filter(p => String(p.riderId || p.rider) === String(id) && isThisWeek(p.date || p.createdAt))
        .reduce((t, p) => t + Number(p.amount || 0), 0);
    return {
        deliveryCount: deliveries.length,
        deliveryEarnings,
        extraPayments,
        total: deliveryEarnings + extraPayments
    };
}
function renderRiderDashboardCards() {
    const attCard = $("riderAttendanceCard");
    const earnCard = $("riderEarningsCard");
    if (!attCard || !earnCard) return;
    if (isAdmin()) { attCard.innerHTML = ""; earnCard.innerHTML = ""; return; }

    const record = todayAttendance();
    const week = getRiderWeekEarnings(currentRiderId());
    const checkedIn = !!record?.checkIn && !record?.checkOut;

    attCard.innerHTML = `
        <div class="card">
            <h2>Today's Attendance</h2>
            <p>${record?.checkIn ? `Checked in at ${escapeHTML(dateTime(record.checkIn))}` : "You have not checked in today."}</p>
            ${record?.checkOut ? `<p>Checked out at ${escapeHTML(dateTime(record.checkOut))}</p>` : ""}
            <button class="primary" id="attendanceActionButton">
                ${checkedIn ? "Check Out" : record?.checkOut ? "Checked Out Today" : "Check In"}
            </button>
            <p style="font-size:12px">Check-in is permitted within ${OFFICE.radiusMeters} metres of the office.</p>
        </div>`;
    earnCard.innerHTML = `
        <div class="card">
            <h2>This Week's Performance</h2>
            <div class="stats">
                <article><span>Delivered<strong>${week.deliveryCount}</strong></span></article>
                <article><span>Delivery Earnings<strong>${money(week.deliveryEarnings)}</strong></span></article>
                <article><span>Total Earnings<strong>${money(week.total)}</strong></span></article>
            </div>
        </div>`;

    $("attendanceActionButton")?.addEventListener("click", () => {
        if (checkedIn) riderCheckOut();
        else if (record?.checkOut) alert("You have already checked out today.");
        else riderCheckIn();
    });
}
function riderCheckIn() {
    if (!navigator.geolocation) return alert("Your browser does not support GPS location.");
    if (!window.isSecureContext)
        return alert("GPS requires HTTPS or localhost. Open the secure website and allow location access.");

    navigator.geolocation.getCurrentPosition(pos => {
        const distance = distanceMeters(pos.coords.latitude, pos.coords.longitude,
            OFFICE.latitude, OFFICE.longitude);
        if (distance > OFFICE.radiusMeters)
            return alert(`You are approximately ${Math.round(distance)} metres from the office. Move within ${OFFICE.radiusMeters} metres to check in.`);

        const records = getAttendance();
        const today = todayKey();
        let record = records.find(i => String(i.riderId) === currentRiderId() && i.date === today);
        if (record?.checkIn) return alert("You have already checked in today.");

        const now = new Date().toISOString();
        if (!record) {
            records.push({
                id: generateId("ATT"), riderId: currentRiderId(),
                riderName: getUser()?.name || "Rider", date: today,
                checkIn: now, checkOut: null,
                checkInDistanceMeters: Math.round(distance),
                dailyCheckinFee: DAILY_CHECKIN_FEE
            });
        } else {
            record.checkIn = now;
            record.checkOut = null;
            record.checkInDistanceMeters = Math.round(distance);
            record.dailyCheckinFee = DAILY_CHECKIN_FEE;
        }
        save(KEYS.attendance, records);
        renderAll();
        alert("Check-in recorded successfully.");
    }, err => alert("Unable to access your location. Enable location permissions and try again. " + err.message),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}
/* Check-out no longer requires being at the office. */
function riderCheckOut() {
    const records = getAttendance();
    const record = records.find(i => String(i.riderId) === currentRiderId() && i.date === todayKey());
    if (!record?.checkIn || record.checkOut)
        return alert("There is no active check-in to close.");

    const finish = distance => {
        record.checkOut = new Date().toISOString();
        if (distance !== null) record.checkOutDistanceMeters = Math.round(distance);
        save(KEYS.attendance, records);
        renderAll();
        alert("Check-out recorded successfully.");
    };
    if (!navigator.geolocation) return finish(null);
    navigator.geolocation.getCurrentPosition(
        pos => finish(distanceMeters(pos.coords.latitude, pos.coords.longitude,
            OFFICE.latitude, OFFICE.longitude)),
        () => finish(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
}
function renderAttendancePage() {
    const c = $("attendanceContent");
    if (!c) return;
    if (!isAdmin()) {
        const r = todayAttendance();
        c.innerHTML = `
            <div class="card">
                <h2>My Attendance</h2>
                <p>Date: ${todayKey()}</p>
                <p>Check in: ${escapeHTML(dateTime(r?.checkIn))}</p>
                <p>Check out: ${escapeHTML(dateTime(r?.checkOut))}</p>
                <p>Daily check-in fee recorded: ${r ? money(r.dailyCheckinFee || DAILY_CHECKIN_FEE) : money(0)}</p>
            </div>`;
        return;
    }
    const records = getAttendance().slice().sort((a, b) =>
        `${b.date || ""}${b.checkIn || ""}`.localeCompare(`${a.date || ""}${a.checkIn || ""}`));
    const riders = getRiders();
    const rows = records.map(rec => {
        const rider = riders.find(r => riderId(r) === String(rec.riderId));
        return `<tr>
            <td>${escapeHTML(rec.date || "—")}</td>
            <td>${escapeHTML(rec.riderName || (rider ? riderName(rider) : rec.riderId))}</td>
            <td>${escapeHTML(dateTime(rec.checkIn))}</td>
            <td>${escapeHTML(dateTime(rec.checkOut))}</td>
            <td>${rec.checkIn ? money(rec.dailyCheckinFee ?? DAILY_CHECKIN_FEE) : money(0)}</td>
            <td>${rec.checkOut ? "Completed" : rec.checkIn ? "Checked In" : "Absent"}</td>
        </tr>`;
    }).join("");
    c.innerHTML = `
        <div class="card">
            <h2>Rider Attendance</h2>
            <p>Daily check-in fee setting: ${money(DAILY_CHECKIN_FEE)} per recorded check-in.</p>
            <p>Office geofence: ${OFFICE.radiusMeters} metres.</p>
            <div class="table"><table>
                <thead><tr><th>Date</th><th>Rider</th><th>Check In</th><th>Check Out</th><th>Fee</th><th>Status</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6">No attendance records yet.</td></tr>'}</tbody>
            </table></div>
        </div>`;
}

/* ================= RIDERS (ADMIN) ================= */
/* NEW: approve / reject / disable / enable riders */
window.setRiderStatus = function (id, status) {
    if (!isAdmin()) return alert("Administrator access is required.");
    const riders = getRiders();
    const rider = riders.find(r => riderId(r) === String(id));
    if (!rider) return;
    if (status === "Disabled" || status === "Rejected") {
        if (!confirm(`${status === "Rejected" ? "Reject" : "Disable"} ${riderName(rider)}?`)) return;
    }
    rider.status = status;
    rider.active = status === "Active";
    rider.statusUpdatedAt = new Date().toISOString();
    save(KEYS.riders, riders);
    renderAll();
};
window.deleteRider = function (id) {
    if (!isAdmin()) return alert("Administrator access is required.");
    const rider = getRiders().find(r => riderId(r) === String(id));
    if (!rider) return;
    if (!confirm(`Permanently delete rider ${riderName(rider)}?`)) return;
    save(KEYS.riders, getRiders().filter(r => riderId(r) !== String(id)));
    renderAll();
};
function riderActionButtons(rider) {
    const id = escapeHTML(riderId(rider));
    const st = rider.status || "Active";
    const btn = (label, status) =>
        `<button type="button" class="link" onclick="setRiderStatus('${id}','${status}')">${label}</button>`;
    if (st === "Pending Approval" || st === "Pending")
        return btn("Approve", "Active") + btn("Reject", "Rejected");
    if (st === "Disabled" || st === "Rejected" || rider.active === false)
        return btn("Enable", "Active") +
            `<button type="button" class="link" onclick="deleteRider('${id}')">Delete</button>`;
    return btn("Disable", "Disabled");
}
function renderRiders() {
    const c = $("driverList");
    if (!c) return;
    if (!isAdmin()) { c.innerHTML = ""; return; }

    const riders = getRiders().slice().sort((a, b) => {
        const pa = /pending/i.test(a.status || "") ? 1 : 0;
        const pb = /pending/i.test(b.status || "") ? 1 : 0;
        if (pa !== pb) return pb - pa; // pending approvals first
        return getRiderWeekEarnings(riderId(b)).deliveryCount - getRiderWeekEarnings(riderId(a)).deliveryCount;
    });
    c.innerHTML = riders.length ? riders.map(rider => {
        const s = getRiderWeekEarnings(riderId(rider));
        return `
            <div class="person card">
                <h3>${escapeHTML(riderName(rider))}</h3>
                <p>${escapeHTML(rider.phone || "")}</p>
                <p>Status: <strong>${escapeHTML(rider.status || "Active")}</strong></p>
                <p>Deliveries this week: <strong>${s.deliveryCount}</strong></p>
                <p>Delivery earnings: <strong>${money(s.deliveryEarnings)}</strong></p>
                <p>Total earnings: <strong>${money(s.total)}</strong></p>
                <div>${riderActionButtons(rider)}</div>
            </div>`;
    }).join("") : "<p>No riders registered yet.</p>";
}
function renderCustomers() {
    const c = $("customerList");
    if (!c) return;
    const map = new Map();
    visibleDeliveries().forEach(d => {
        const key = `${d.phone || ""}-${d.customer || ""}`;
        if (!map.has(key))
            map.set(key, { name: d.customer || "Unknown", phone: d.phone || "—", count: 0, total: 0 });
        const cu = map.get(key);
        cu.count++;
        cu.total += Number(d.amount || 0);
    });
    c.innerHTML = map.size ? Array.from(map.values()).map(cu => `
        <div class="person card">
            <h3>${escapeHTML(cu.name)}</h3>
            <p>${escapeHTML(cu.phone)}</p>
            <p>Deliveries: ${cu.count}</p>
            <p>Total order value: ${money(cu.total)}</p>
        </div>`).join("") : "<p>No customer records yet.</p>";
}

/* ================= DASHBOARD METRICS ================= */
function countByStatus(deliveries) {
    const n = s => normaliseStatus(s);
    return {
        total: deliveries.length,
        delivered: deliveries.filter(d => n(d.status) === "Delivered").length,
        transit: deliveries.filter(d => n(d.status) === "In Transit").length,
        pending: deliveries.filter(d => ["Pending", "Assigned", "Picked Up"].includes(n(d.status))).length
    };
}
function renderStats() {
    const deliveries = visibleDeliveries();
    const { total, delivered, transit, pending } = countByStatus(deliveries);
    const pct = v => `${total ? Math.round(v / total * 100) : 0}%`;

    setText("totalDeliveriesStat", total);
    setText("inTransitStat", transit);
    setText("deliveredStat", delivered);
    setText("pendingStat", pending);
    setText("donutTotal", total);
    setText("deliveredPercent", pct(delivered));
    setText("transitPercent", pct(transit));
    setText("pendingPercent", pct(pending));
    setText("revenueStat", money(deliveries.reduce((s, d) => s + Number(d.amount || 0), 0)));
    setText("successRate", pct(delivered));
    renderRecent(deliveries);
}
function renderRecent(deliveries) {
    const c = $("recent");
    if (!c) return;
    const recent = deliveries.slice()
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 7);
    c.innerHTML = recent.length ? recent.map(deliveryRow).join("")
        : '<tr><td colspan="8">No deliveries recorded yet.</td></tr>';
}

/* ================= CHARTS ================= */
function createChart(id, config) {
    const canvas = $(id);
    if (!canvas || !window.Chart) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, config);
}
function renderCharts() {
    if (!window.Chart) return;
    const deliveries = visibleDeliveries();
    const labels = [], counts = [], revenue = [];

    for (let off = 6; off >= 0; off--) {
        const date = new Date();
        date.setDate(date.getDate() - off);
        const key = todayKey(date);
        labels.push(date.toLocaleDateString("en-NG", { weekday: "short" }));
        const onDay = deliveries.filter(d => {
            const stamp = d.createdAt || d.updatedAt;
            return stamp && todayKey(new Date(stamp)) === key;
        });
        counts.push(onDay.length);
        revenue.push(onDay.reduce((s, d) => s + Number(d.amount || 0), 0));
    }
    createChart("line", {
        type: "line",
        data: { labels, datasets: [{ label: "Deliveries", data: counts,
            borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.12)", fill: true, tension: 0.35 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
    const { delivered, transit, pending } = countByStatus(deliveries);
    createChart("donut", {
        type: "doughnut",
        data: { labels: ["Delivered", "In Transit", "Pending"],
            datasets: [{ data: [delivered, transit, pending],
                backgroundColor: ["#16a34a", "#2563eb", "#f59e0b"] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } }
    });
    createChart("bar", {
        type: "bar",
        data: { labels, datasets: [{ label: "Revenue (₦)", data: revenue, backgroundColor: "#2563eb" }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

/* ================= REFRESH ================= */
function renderAll() {
    if (!getUser()) return;
    renderStats();
    renderDeliveries();
    renderRiderDashboardCards();
    renderRiders();
    renderCustomers();
    renderAttendancePage();
    renderCharts();
}
window.refreshAllDeliveryViews = renderAll;
window.phase2Refresh = renderAll;

/* ================= STARTUP ================= */
function initialise() {
    const loggedIn = localStorage.getItem(KEYS.loggedIn) === "true";
    if (loggedIn && getUser()) {
        openApplication();
    } else {
        setVisible($("mainApp"), false);
        setVisible($("authScreen"), true);
        window.selectRole("rider");
    }
    window.addEventListener("storage", e => {
        if (Object.values(KEYS).includes(e.key)) renderAll();
    });
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
} else {
    initialise();
}

})();
