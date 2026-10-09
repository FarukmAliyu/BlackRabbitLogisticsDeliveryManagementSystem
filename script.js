/* =========================================================
BLACK RABBIT LOGISTICS — MAIN DASHBOARD SCRIPT
Fixed authentication + existing dashboard functionality
========================================================= */

(() => {
“use strict”;

if (window.BlackRabbitDashboardLoaded) return;
window.BlackRabbitDashboardLoaded = true;
/* ================= CONFIGURATION ================= */
const KEYS = {
    riders: "blackRabbitRiders",
    deliveries: "blackRabbitDeliveries",
    attendance: "blackRabbitAttendance",
    payments: "blackRabbitRiderPayments",
    loggedIn: "blackRabbitLoggedIn",
    currentUser: "blackRabbitCurrentUser"
};
const SUPER_ADMIN = {
    phone: "08000000000",
    password: "Admin@123",
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
    id: "SUPER-ADMIN"
};
const OFFICE = {
    latitude: 10.5366473,
    longitude: 7.4682503,
    radiusMeters: 200
};
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
let deliveryFilter = "All";
let editingDeliveryId = null;
let charts = {};
let currentRole = "rider";
const $ = id => document.getElementById(id);
/* ================= DATA HELPERS ================= */
function read(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        console.error("Could not read:", key, error);
        return fallback;
    }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}
function getRiders() {
    const value = read(KEYS.riders, []);
    return Array.isArray(value) ? value : [];
}
function getDeliveries() {
    const value = read(KEYS.deliveries, []);
    return Array.isArray(value) ? value : [];
}
function getAttendance() {
    const value = read(KEYS.attendance, []);
    return Array.isArray(value) ? value : [];
}
function getPayments() {
    const value = read(KEYS.payments, []);
    return Array.isArray(value) ? value : [];
}
function getUser() {
    return read(KEYS.currentUser, null);
}
function isAdmin() {
    const user = getUser();
    return !!user && (
        user.role === "super_admin" ||
        user.role === "admin"
    );
}
function currentRiderId() {
    const user = getUser();
    return user ? String(user.id || user.phone) : "";
}
function riderId(rider) {
    return String(rider?.id || rider?.phone || "");
}
function deliveryRiderId(delivery) {
    return String(
        delivery.riderId ||
        delivery.assignedRiderId ||
        delivery.rider ||
        ""
    );
}
function riderName(rider) {
    if (!rider) return "Unassigned";
    return (
        rider.name ||
        [rider.firstName, rider.lastName].filter(Boolean).join(" ") ||
        rider.fullName ||
        rider.phone ||
        "Rider"
    );
}
function deliveryRiderName(delivery) {
    const riders = getRiders();
    const assignedId = deliveryRiderId(delivery);
    const rider = riders.find(r =>
        riderId(r) === assignedId ||
        r.name === assignedId ||
        [r.firstName, r.lastName].filter(Boolean).join(" ") === assignedId
    );
    return rider
        ? riderName(rider)
        : (delivery.riderName || (assignedId ? assignedId : "Unassigned"));
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
function money(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG", {
        maximumFractionDigits: 2
    });
}
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}
function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function weekStart(date = new Date()) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(
        result.getDate() - (day === 0 ? 6 : day - 1)
    );
    return result;
}
function isThisWeek(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return false;
    return date >= weekStart() && date <= new Date();
}
function dateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }
    return date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}
function showMessage(id, message, type = "error") {
    const element = $(id);
    if (!element) {
        alert(message);
        return;
    }
    element.textContent = message;
    element.style.color =
        type === "success" ? "#15803d" : "#dc2626";
}
function clearMessage(id) {
    const element = $(id);
    if (element) {
        element.textContent = "";
    }
}
function setVisible(element, visible) {
    if (!element) return;
    element.style.display = visible ? "" : "none";
}
function canSeeDelivery(delivery) {
    if (isAdmin()) return true;
    return deliveryRiderId(delivery) === currentRiderId();
}
function visibleDeliveries() {
    return getDeliveries().filter(canSeeDelivery);
}
function generateId(prefix = "BR") {
    return `${prefix}-${Date.now().toString().slice(-8)}`;
}
/* =====================================================
   AUTHENTICATION
   IMPORTANT FIX:
   Auth forms use the "hidden-auth" CSS class.
   We must remove/add that class instead of relying
   only on style.display.
===================================================== */
function showAuthPanel(panelId) {
    const panels = [
        "riderLoginForm",
        "adminLoginForm",
        "registerForm"
    ];
    panels.forEach(id => {
        const panel = $(id);
        if (!panel) return;
        const shouldShow = id === panelId;
        panel.classList.toggle("hidden-auth", !shouldShow);
        panel.style.display = shouldShow ? "" : "none";
    });
}
window.selectRole = function (role) {
    currentRole = role;
    const riderButton = $("riderRoleBtn");
    const adminButton = $("adminRoleBtn");
    riderButton?.classList.toggle(
        "active",
        role === "rider"
    );
    adminButton?.classList.toggle(
        "active",
        role === "admin"
    );
    if (role === "rider") {
        showAuthPanel("riderLoginForm");
    } else {
        showAuthPanel("adminLoginForm");
    }
    clearMessage("loginMessage");
    clearMessage("adminMessage");
    clearMessage("registerMessage");
};
window.showRegister = function () {
    showAuthPanel("registerForm");
    currentRole = "rider";
    $("riderRoleBtn")?.classList.add("active");
    $("adminRoleBtn")?.classList.remove("active");
    clearMessage("loginMessage");
    clearMessage("adminMessage");
    clearMessage("registerMessage");
};
window.showLogin = function () {
    showAuthPanel("riderLoginForm");
    currentRole = "rider";
    $("riderRoleBtn")?.classList.add("active");
    $("adminRoleBtn")?.classList.remove("active");
    clearMessage("registerMessage");
    clearMessage("loginMessage");
};
window.togglePassword = function (id, button) {
    const input = $(id);
    if (!input) return;
    input.type =
        input.type === "password"
            ? "text"
            : "password";
    if (button) {
        button.textContent =
            input.type === "password"
                ? "Show"
                : "Hide";
    }
};
/* ================= PHONE NORMALISATION ================= */
function normalisePhone(phone) {
    let value = String(phone || "")
        .trim()
        .replace(/\s+/g, "")
        .replace(/-/g, "");
    if (value.startsWith("+234")) {
        value = "0" + value.substring(4);
    }
    if (value.startsWith("234") && value.length === 13) {
        value = "0" + value.substring(3);
    }
    return value;
}
/* ================= RIDER LOGIN ================= */
window.riderLogin = function () {
    const phone = normalisePhone(
        $("loginPhone")?.value || ""
    );
    const password =
        $("loginPassword")?.value || "";
    if (!phone || !password) {
        return showMessage(
            "loginMessage",
            "Enter your phone number and password."
        );
    }
    const rider = getRiders().find(item =>
        normalisePhone(item.phone) === phone &&
        item.password === password
    );
    if (!rider) {
        return showMessage(
            "loginMessage",
            "Rider account not found or password is incorrect."
        );
    }
    if (
        rider.active === false ||
        rider.status === "Disabled"
    ) {
        return showMessage(
            "loginMessage",
            "Your rider account is disabled."
        );
    }
    /* Registration accounts require approval. */
    if (
        rider.status === "Pending Approval" ||
        rider.status === "Pending"
    ) {
        return showMessage(
            "loginMessage",
            "Your rider account is awaiting administrator approval."
        );
    }
    const user = {
        id: riderId(rider),
        phone: rider.phone,
        firstName: rider.firstName || rider.name || "",
        lastName: rider.lastName || "",
        name: riderName(rider),
        role: "rider"
    };
    save(KEYS.currentUser, user);
    localStorage.setItem(
        KEYS.loggedIn,
        "true"
    );
    openApplication();
};
/* ================= ADMIN LOGIN ================= */
window.adminLogin = function () {
    const phone = normalisePhone(
        $("adminPhone")?.value || ""
    );
    const password =
        $("adminPassword")?.value || "";
    if (!phone || !password) {
        return showMessage(
            "adminMessage",
            "Enter the admin phone number and password."
        );
    }
    if (
        phone !== normalisePhone(SUPER_ADMIN.phone) ||
        password !== SUPER_ADMIN.password
    ) {
        return showMessage(
            "adminMessage",
            "Incorrect admin credentials."
        );
    }
    save(KEYS.currentUser, SUPER_ADMIN);
    localStorage.setItem(
        KEYS.loggedIn,
        "true"
    );
    openApplication();
};
/* ================= RIDER REGISTRATION ================= */
window.registerRider = function () {
    const firstName =
        ($("regFirstName")?.value || "").trim();
    const lastName =
        ($("regLastName")?.value || "").trim();
    const phone =
        normalisePhone($("regPhone")?.value || "");
    const password =
        $("regPassword")?.value || "";
    const termsAccepted =
        $("regTerms")?.checked;
    if (
        !firstName ||
        !lastName ||
        !phone ||
        !password
    ) {
        return showMessage(
            "registerMessage",
            "Complete all required fields."
        );
    }
    if (password.length < 6) {
        return showMessage(
            "registerMessage",
            "Password must be at least 6 characters."
        );
    }
    if (!termsAccepted) {
        return showMessage(
            "registerMessage",
            "Please accept the rider terms."
        );
    }
    const riders = getRiders();
    if (
        riders.some(
            r => normalisePhone(r.phone) === phone
        )
    ) {
        return showMessage(
            "registerMessage",
            "This phone number is already registered."
        );
    }
    const rider = {
        id: generateId("RIDER"),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
        password,
        role: "rider",
        status: "Pending Approval",
        active: true,
        createdAt: new Date().toISOString()
    };
    riders.push(rider);
    save(KEYS.riders, riders);
    showMessage(
        "registerMessage",
        "Registration submitted successfully. Please wait for administrator approval.",
        "success"
    );
    if ($("regPassword")) {
        $("regPassword").value = "";
    }
    if ($("regTerms")) {
        $("regTerms").checked = false;
    }
};
/* ================= FORGOT PASSWORD ================= */
window.forgotPassword = function (event) {
    event?.preventDefault();
    alert(
        "Please contact your Black Rabbit Logistics administrator to reset your password."
    );
};
/* ================= LOGOUT ================= */
window.logout = function () {
    localStorage.removeItem(KEYS.loggedIn);
    localStorage.removeItem(KEYS.currentUser);
    setVisible($("mainApp"), false);
    setVisible($("authScreen"), true);
    showAuthPanel("riderLoginForm");
    currentRole = "rider";
    $("riderRoleBtn")?.classList.add("active");
    $("adminRoleBtn")?.classList.remove("active");
    clearMessage("loginMessage");
    clearMessage("adminMessage");
    clearMessage("registerMessage");
};
/* ================= OPEN APPLICATION ================= */
function openApplication() {
    const user = getUser();
    if (!user) return;
    setVisible($("authScreen"), false);
    setVisible($("mainApp"), true);
    const name =
        user.name ||
        [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ") ||
        "User";
    const initials =
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part =>
                part[0].toUpperCase()
            )
            .join("");
    if ($("sidebarAvatar")) {
        $("sidebarAvatar").textContent =
            initials || "BR";
    }
    if ($("headerAvatar")) {
        $("headerAvatar").textContent =
            initials || "BR";
    }
    if ($("sidebarUser")) {
        $("sidebarUser").innerHTML =
            `${escapeHTML(name)}<small>${escapeHTML(
                user.role === "rider"
                    ? "Rider"
                    : "Super Admin"
            )}</small>`;
    }
    if ($("dashboardGreeting")) {
        $("dashboardGreeting").textContent =
            `Welcome, ${name}`;
    }
    [
        "customersNav",
        "driversNav",
        "analyticsNav",
        "attendanceNav"
    ].forEach(id => {
        setVisible(
            $(id),
            isAdmin()
        );
    });
    document
        .querySelectorAll(".primary.new")
        .forEach(button => {
            setVisible(
                button,
                isAdmin()
            );
        });
    goToPage("dashboard");
    renderAll();
}
/* ================= PAGE NAVIGATION ================= */
function goToPage(page) {
    if (!PAGE_INFO[page]) {
        page = "dashboard";
    }
    if (
        !isAdmin() &&
        [
            "customers",
            "drivers",
            "analytics",
            "attendance",
            "settings"
        ].includes(page)
    ) {
        page = "dashboard";
    }
    document
        .querySelectorAll(".page")
        .forEach(section => {
            section.classList.toggle(
                "hidden",
                section.id !== page
            );
        });
    document
        .querySelectorAll("[data-page]")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.page === page
            );
        });
    if ($("title")) {
        $("title").textContent =
            PAGE_INFO[page][0];
    }
    if ($("sub")) {
        $("sub").textContent =
            PAGE_INFO[page][1];
    }
    if (page === "attendance") {
        renderAttendancePage();
    }
    if (page === "deliveries") {
        renderDeliveries();
    }
}
document
    .querySelectorAll("[data-page]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => goToPage(button.dataset.page)
        );
    });
document
    .querySelectorAll("[data-go]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => goToPage(button.dataset.go)
        );
    });
$("menu")?.addEventListener(
    "click",
    () => {
        document
            .querySelector(".side")
            ?.classList.toggle("open");
    }
);
/* ================= DELIVERY MODAL ================= */
function fillRiderOptions(selected = "") {
    const select = $("deliveryRider");
    if (!select) return;
    const riders = getRiders().filter(r =>
        r.active !== false &&
        r.status !== "Disabled"
    );
    select.innerHTML =
        '<option value="">Unassigned</option>' +
        riders.map(r => {
            const id = riderId(r);
            return `
                <option
                    value="${escapeHTML(id)}"
                    ${id === String(selected)
                        ? "selected"
                        : ""}
                >
                    ${escapeHTML(riderName(r))}
                </option>`;
        }).join("");
}
function openDeliveryModal(delivery = null) {
    if (!isAdmin()) {
        alert(
            "Only an administrator can create or edit deliveries."
        );
        return;
    }
    editingDeliveryId =
        delivery?.id || null;
    if ($("form")) {
        $("form").reset();
    }
    fillRiderOptions(
        delivery
            ? deliveryRiderId(delivery)
            : ""
    );
    if ($("deliveryEditId")) {
        $("deliveryEditId").value =
            editingDeliveryId || "";
    }
    if ($("modalTitle")) {
        $("modalTitle").textContent =
            delivery
                ? "Edit Delivery"
                : "Create New Delivery";
    }
    if ($("modalDescription")) {
        $("modalDescription").textContent =
            delivery
                ? "Update delivery details."
                : "Create and assign a delivery.";
    }
    if ($("saveDeliveryButton")) {
        $("saveDeliveryButton").textContent =
            delivery
                ? "Save Changes"
                : "Create Delivery";
    }
    if (delivery) {
        const fields = {
            deliveryCustomer:
                delivery.customer || "",
            deliveryPhone:
                delivery.phone || "",
            deliveryPickup:
                delivery.pickup || "",
            deliveryDestination:
                delivery.destination || "",
            deliveryPackage:
                delivery.packageDescription ||
                delivery.package ||
                "",
            deliveryAmount:
                delivery.amount ?? "",
            deliveryRiderEarning:
                delivery.riderEarning ?? "",
            deliveryStatus:
                normaliseStatus(
                    delivery.status
                ),
            deliveryNotes:
                delivery.notes || ""
        };
        Object.entries(fields).forEach(
            ([id, value]) => {
                if ($(id)) {
                    $(id).value = value;
                }
            }
        );
        renderDeliveryHistory(
            delivery
        );
    } else {
        if ($("deliveryStatus")) {
            $("deliveryStatus").value =
                "Pending";
        }
        if ($("deliveryHistory")) {
            $("deliveryHistory").innerHTML =
                "";
            $("deliveryHistory")
                .classList
                .add("hidden");
        }
    }
    $("modal")
        ?.classList
        .add("show");
    $("modal")
        ?.classList
        .remove("hidden");
}
window.closeDeliveryModal = function () {
    $("modal")
        ?.classList
        .remove("show");
    $("modal")
        ?.classList
        .add("hidden");
    editingDeliveryId = null;
};
document
    .querySelectorAll(".primary.new")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => openDeliveryModal()
        );
    });
$("close")?.addEventListener(
    "click",
    window.closeDeliveryModal
);
function renderDeliveryHistory(delivery) {
    const container =
        $("deliveryHistory");
    if (!container) return;
    const history =
        Array.isArray(delivery.history)
            ? delivery.history
            : [];
    container.classList.toggle(
        "hidden",
        history.length === 0
    );
    container.innerHTML =
        history.length
            ? `<strong>Delivery history</strong>` +
              history
                  .map(item =>
                      `<p>${escapeHTML(
                          item.status ||
                          "Updated"
                      )} — ${escapeHTML(
                          dateTime(
                              item.date ||
                              item.createdAt
                          )
                      )}</p>`
                  )
                  .join("")
            : "";
}
$("form")?.addEventListener(
    "submit",
    event => {
        event.preventDefault();
        if (!isAdmin()) {
            alert(
                "Only an administrator can save delivery changes."
            );
            return;
        }
        const customer =
            $("deliveryCustomer")
                ?.value.trim() || "";
        const phone =
            $("deliveryPhone")
                ?.value.trim() || "";
        const pickup =
            $("deliveryPickup")
                ?.value.trim() || "";
        const destination =
            $("deliveryDestination")
                ?.value.trim() || "";
        if (
            !customer ||
            !phone ||
            !pickup ||
            !destination
        ) {
            alert(
                "Complete the customer, phone, pickup and destination fields."
            );
            return;
        }
        const deliveries =
            getDeliveries();
        const now =
            new Date().toISOString();
        const existing =
            deliveries.find(
                d =>
                    String(d.id) ===
                    String(editingDeliveryId)
            );
        const assignedRider =
            $("deliveryRider")
                ?.value || "";
        const newStatus =
            normaliseStatus(
                $("deliveryStatus")
                    ?.value
            );
        const updated = {
            ...(existing || {}),
            id:
                existing?.id ||
                generateId(),
            customer,
            phone,
            pickup,
            destination,
            packageDescription:
                $("deliveryPackage")
                    ?.value.trim() || "",
            amount:
                Number(
                    $("deliveryAmount")
                        ?.value || 0
                ),
            riderEarning:
                Number(
                    $("deliveryRiderEarning")
                        ?.value || 0
                ),
            riderId:
                assignedRider,
            riderName:
                deliveryRiderName({
                    riderId:
                        assignedRider
                }),
            status:
                newStatus,
            notes:
                $("deliveryNotes")
                    ?.value.trim() || "",
            createdAt:
                existing?.createdAt ||
                now,
            updatedAt:
                now,
            history:
                Array.isArray(
                    existing?.history
                )
                    ? [
                        ...existing.history
                    ]
                    : []
        };
        if (
            !existing ||
            normaliseStatus(
                existing.status
            ) !== newStatus
        ) {
            updated.history.push({
                status: newStatus,
                date: now
            });
        }
        if (existing) {
            const index =
                deliveries.findIndex(
                    d =>
                        String(d.id) ===
                        String(existing.id)
                );
            deliveries[index] =
                updated;
        } else {
            deliveries.unshift(
                updated
            );
        }
        save(
            KEYS.deliveries,
            deliveries
        );
        window.closeDeliveryModal();
        renderAll();
    }
);
window.editDelivery = function (id) {
    const delivery =
        getDeliveries().find(
            d =>
                String(d.id) ===
                String(id)
        );
    if (delivery) {
        openDeliveryModal(
            delivery
        );
    }
};
window.deleteDelivery = function (id) {
    if (!isAdmin()) {
        return alert(
            "Administrator access is required."
        );
    }
    const delivery =
        getDeliveries().find(
            d =>
                String(d.id) ===
                String(id)
        );
    if (!delivery) return;
    if (
        !confirm(
            `Delete delivery ${delivery.id}? This cannot be undone.`
        )
    ) {
        return;
    }
    save(
        KEYS.deliveries,
        getDeliveries().filter(
            d =>
                String(d.id) !==
                String(id)
        )
    );
    renderAll();
};
/* ================= DELIVERY TABLES ================= */
function statusBadge(status) {
    const normal =
        normaliseStatus(status);
    return `
        <span class="status ${normal
            .toLowerCase()
            .replace(/\s+/g, "-")}">
            ${escapeHTML(normal)}
        </span>`;
}
function deliveryRow(delivery) {
    const actions = isAdmin()
        ? `
            <button
                type="button"
                class="link"
                onclick="editDelivery('${escapeHTML(delivery.id)}')">
                Edit
            </button>
            <button
                type="button"
                class="link"
                onclick="deleteDelivery('${escapeHTML(delivery.id)}')">
                Delete
            </button>
          `
        : `
            <button
                type="button"
                class="link"
                onclick="trackSpecificDelivery('${escapeHTML(delivery.id)}')">
                Track
            </button>
          `;
    return `
        <tr>
            <td>${escapeHTML(delivery.id)}</td>
            <td>${escapeHTML(delivery.customer || "—")}</td>
            <td>${escapeHTML(delivery.pickup || "—")}</td>
            <td>${escapeHTML(delivery.destination || "—")}</td>
            <td>${escapeHTML(deliveryRiderName(delivery))}</td>
            <td>${statusBadge(delivery.status)}</td>
            <td>${money(delivery.amount)}</td>
            <td>${actions}</td>
        </tr>`;
}
function renderDeliveries() {
    const all =
        visibleDeliveries();
    const searchTerm =
        ($("search")?.value || "")
            .trim()
            .toLowerCase();
    const filtered =
        all.filter(delivery => {
            const matchesStatus =
                deliveryFilter === "All" ||
                normaliseStatus(
                    delivery.status
                ) === deliveryFilter;
            const searchable = [
                delivery.id,
                delivery.customer,
                delivery.phone,
                delivery.pickup,
                delivery.destination,
                deliveryRiderName(
                    delivery
                ),
                delivery.status
            ]
                .join(" ")
                .toLowerCase();
            return (
                matchesStatus &&
                searchable.includes(
                    searchTerm
                )
            );
        });
    if ($("allRows")) {
        $("allRows").innerHTML =
            filtered.length
                ? filtered
                      .map(deliveryRow)
                      .join("")
                : `<tr><td colspan="8">No deliveries found.</td></tr>`;
    }
}
window.setDeliveryFilter =
    function (status, button) {
        deliveryFilter = status;
        document
            .querySelectorAll(
                ".tabs button"
            )
            .forEach(item => {
                item.classList.toggle(
                    "selected",
                    item === button
                );
            });
        renderDeliveries();
    };
$("search")?.addEventListener(
    "input",
    renderDeliveries
);
/* ================= TRACKING ================= */
function showTracking(delivery) {
    const result =
        $("trackingResult");
    if (!result) return;
    if (!delivery) {
        result.classList.remove(
            "hidden"
        );
        result.innerHTML =
            "<h3>Delivery not found</h3><p>Check the delivery ID and try again.</p>";
        return;
    }
    const history =
        Array.isArray(delivery.history)
            ? delivery.history
            : [];
    result.classList.remove(
        "hidden"
    );
    result.innerHTML = `
        <h2>Delivery ${escapeHTML(delivery.id)}</h2>
        <p>
            <strong>Customer:</strong>
            ${escapeHTML(delivery.customer || "—")}
        </p>
        <p>
            <strong>Pickup:</strong>
            ${escapeHTML(delivery.pickup || "—")}
        </p>
        <p>
            <strong>Destination:</strong>
            ${escapeHTML(delivery.destination || "—")}
        </p>
        <p>
            <strong>Rider:</strong>
            ${escapeHTML(deliveryRiderName(delivery))}
        </p>
        <p>
            <strong>Status:</strong>
            ${statusBadge(delivery.status)}
        </p>
        <p>
            <strong>Last updated:</strong>
            ${escapeHTML(
                dateTime(
                    delivery.updatedAt ||
                    delivery.createdAt
                )
            )}
        </p>
        <h3>Progress history</h3>
        ${
            history.length
                ? history
                      .map(
                          item =>
                              `<p>${escapeHTML(
                                  item.status
                              )} — ${escapeHTML(
                                  dateTime(
                                      item.date
                                  )
                              )}</p>`
                      )
                      .join("")
                : "<p>No status history recorded yet.</p>"
        }
    `;
}
$("track")?.addEventListener(
    "click",
    () => {
        const id =
            ($("trackId")?.value || "")
                .trim();
        if (!id) {
            return alert(
                "Enter a delivery ID."
            );
        }
        const delivery =
            visibleDeliveries().find(
                d =>
                    String(d.id)
                        .toLowerCase() ===
                    id.toLowerCase()
            );
        showTracking(delivery);
    }
);
window.trackSpecificDelivery =
    function (id) {
        const delivery =
            visibleDeliveries().find(
                d =>
                    String(d.id) ===
                    String(id)
            );
        goToPage("tracking");
        if ($("trackId")) {
            $("trackId").value = id;
        }
        showTracking(delivery);
    };
/* ================= ATTENDANCE / GPS ================= */
function distanceMeters(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const rad =
        degrees =>
            degrees *
            Math.PI /
            180;
    const earthRadius =
        6371000;
    const dLat =
        rad(lat2 - lat1);
    const dLon =
        rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) *
            Math.cos(rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
    return (
        earthRadius *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}
function todayAttendance() {
    return getAttendance().find(
        record =>
            String(record.riderId) ===
                currentRiderId() &&
            record.date ===
                todayKey()
    );
}
function getRiderWeekEarnings(id) {
    const deliveries =
        getDeliveries().filter(
            delivery =>
                deliveryRiderId(
                    delivery
                ) === String(id) &&
                normaliseStatus(
                    delivery.status
                ) === "Delivered" &&
                isThisWeek(
                    delivery.deliveredAt ||
                    delivery.updatedAt ||
                    delivery.createdAt
                )
        );
    const deliveryEarnings =
        deliveries.reduce(
            (total, delivery) =>
                total +
                Number(
                    delivery.riderEarning ||
                    0
                ),
            0
        );
    const payments =
        getPayments().filter(
            payment =>
                String(
                    payment.riderId ||
                    payment.rider
                ) === String(id) &&
                isThisWeek(
                    payment.date ||
                    payment.createdAt
                )
        );
    const extraPayments =
        payments.reduce(
            (total, payment) =>
                total +
                Number(
                    payment.amount || 0
                ),
            0
        );
    return {
        deliveryCount:
            deliveries.length,
        deliveryEarnings,
        extraPayments,
        total:
            deliveryEarnings +
            extraPayments
    };
}
function getRiderWeekAttendance(id) {
    const start =
        todayKey(
            weekStart()
        );
    return getAttendance().filter(
        record =>
            String(record.riderId) ===
                String(id) &&
            record.date >= start &&
            record.date <=
                todayKey() &&
            record.checkIn
    );
}
function renderRiderDashboardCards() {
    const attendanceCard =
        $("riderAttendanceCard");
    const earningsCard =
        $("riderEarningsCard");
    if (
        !attendanceCard ||
        !earningsCard
    ) {
        return;
    }
    if (isAdmin()) {
        attendanceCard.innerHTML =
            "";
        earningsCard.innerHTML =
            "";
        return;
    }
    const record =
        todayAttendance();
    const week =
        getRiderWeekEarnings(
            currentRiderId()
        );
    const checkedIn =
        !!record?.checkIn &&
        !record?.checkOut;
    attendanceCard.innerHTML = `
        <div class="card">
            <h2>Today's Attendance</h2>
            <p>
                ${
                    record?.checkIn
                        ? `Checked in at ${escapeHTML(
                              dateTime(
                                  record.checkIn
                              )
                          )}`
                        : "You have not checked in today."
                }
            </p>
            ${
                record?.checkOut
                    ? `<p>Checked out at ${escapeHTML(
                          dateTime(
                              record.checkOut
                          )
                      )}</p>`
                    : ""
            }
            <button
                class="primary"
                id="attendanceActionButton">
                ${
                    checkedIn
                        ? "Check Out"
                        : record?.checkOut
                            ? "Checked Out Today"
                            : "Check In"
                }
            </button>
            <p style="font-size:12px">
                Check-in is permitted within
                ${OFFICE.radiusMeters}
                metres of the office.
            </p>
        </div>`;
    earningsCard.innerHTML = `
        <div class="card">
            <h2>This Week's Performance</h2>
            <div class="stats">
                <article>
                    <span>
                        Delivered
                        <strong>
                            ${week.deliveryCount}
                        </strong>
                    </span>
                </article>
                <article>
                    <span>
                        Delivery Earnings
                        <strong>
                            ${money(
                                week.deliveryEarnings
                            )}
                        </strong>
                    </span>
                </article>
                <article>
                    <span>
                        Total Earnings
                        <strong>
                            ${money(
                                week.total
                            )}
                        </strong>
                    </span>
                </article>
            </div>
        </div>`;
    $("attendanceActionButton")
        ?.addEventListener(
            "click",
            () => {
                if (checkedIn) {
                    riderCheckOut();
                } else if (
                    record?.checkOut
                ) {
                    alert(
                        "You have already checked out today."
                    );
                } else {
                    riderCheckIn();
                }
            }
        );
}
function riderCheckIn() {
    if (!navigator.geolocation) {
        return alert(
            "Your browser does not support GPS location."
        );
    }
    if (!window.isSecureContext) {
        return alert(
            "GPS requires HTTPS or localhost. Open the secure website and allow location access."
        );
    }
    navigator.geolocation.getCurrentPosition(
        position => {
            const distance =
                distanceMeters(
                    position.coords
                        .latitude,
                    position.coords
                        .longitude,
                    OFFICE.latitude,
                    OFFICE.longitude
                );
            if (
                distance >
                OFFICE.radiusMeters
            ) {
                alert(
                    `You are approximately ${Math.round(
                        distance
                    )} metres from the office. Move within ${OFFICE.radiusMeters} metres to check in.`
                );
                return;
            }
            const records =
                getAttendance();
            const today =
                todayKey();
            let record =
                records.find(
                    item =>
                        String(
                            item.riderId
                        ) ===
                            currentRiderId() &&
                        item.date ===
                            today
                );
            if (record?.checkIn) {
                alert(
                    "You have already checked in today."
                );
                return;
            }
            const now =
                new Date().toISOString();
            if (!record) {
                record = {
                    id: generateId("ATT"),
                    riderId:
                        currentRiderId(),
                    riderName:
                        getUser()?.name ||
                        "Rider",
                    date: today,
                    checkIn: now,
                    checkOut: null,
                    checkInDistanceMeters:
                        Math.round(
                            distance
                        ),
                    dailyCheckinFee:
                        DAILY_CHECKIN_FEE
                };
                records.push(
                    record
                );
            } else {
                record.checkIn =
                    now;
                record.checkOut =
                    null;
                record.checkInDistanceMeters =
                    Math.round(
                        distance
                    );
                record.dailyCheckinFee =
                    DAILY_CHECKIN_FEE;
            }
            save(
                KEYS.attendance,
                records
            );
            renderAll();
            alert(
                "Check-in recorded successfully."
            );
        },
        error => {
            alert(
                "Unable to access your location. Enable location permissions and try again. " +
                error.message
            );
        },
        {
            enableHighAccuracy:
                true,
            timeout:
                15000,
            maximumAge:
                0
        }
    );
}
function riderCheckOut() {
    if (!navigator.geolocation) {
        return alert(
            "GPS is not available in this browser."
        );
    }
    navigator.geolocation.getCurrentPosition(
        position => {
            const distance =
                distanceMeters(
                    position.coords
                        .latitude,
                    position.coords
                        .longitude,
                    OFFICE.latitude,
                    OFFICE.longitude
                );
            if (
                distance >
                OFFICE.radiusMeters
            ) {
                return alert(
                    `You must be within ${OFFICE.radiusMeters} metres of the office to check out.`
                );
            }
            const records =
                getAttendance();
            const record =
                records.find(
                    item =>
                        String(
                            item.riderId
                        ) ===
                            currentRiderId() &&
                        item.date ===
                            todayKey()
                );
            if (
                !record?.checkIn ||
                record.checkOut
            ) {
                return alert(
                    "There is no active check-in to close."
                );
            }
            record.checkOut =
                new Date().toISOString();
            record.checkOutDistanceMeters =
                Math.round(
                    distance
                );
            save(
                KEYS.attendance,
                records
            );
            renderAll();
            alert(
                "Check-out recorded successfully."
            );
        },
        error => {
            alert(
                "Unable to access GPS location. " +
                error.message
            );
        },
        {
            enableHighAccuracy:
                true,
            timeout:
                15000,
            maximumAge:
                0
        }
    );
}
function renderAttendancePage() {
    const container =
        $("attendanceContent");
    if (!container) return;
    if (!isAdmin()) {
        const record =
            todayAttendance();
        container.innerHTML = `
            <div class="card">
                <h2>My Attendance</h2>
                <p>
                    Date:
                    ${todayKey()}
                </p>
                <p>
                    Check in:
                    ${escapeHTML(
                        dateTime(
                            record?.checkIn
                        )
                    )}
                </p>
                <p>
                    Check out:
                    ${escapeHTML(
                        dateTime(
                            record?.checkOut
                        )
                    )}
                </p>
                <p>
                    Daily check-in fee recorded:
                    ${
                        record
                            ? money(
                                  record.dailyCheckinFee ||
                                  DAILY_CHECKIN_FEE
                              )
                            : money(0)
                    }
                </p>
            </div>`;
        return;
    }
    const records =
        getAttendance()
            .slice()
            .sort(
                (a, b) =>
                    `${b.date || ""}${b.checkIn || ""}`
                        .localeCompare(
                            `${a.date || ""}${a.checkIn || ""}`
                        )
            );
    const riders =
        getRiders();
    const rows =
        records
            .map(record => {
                const rider =
                    riders.find(
                        r =>
                            riderId(r) ===
                            String(
                                record.riderId
                            )
                    );
                return `
                    <tr>
                        <td>
                            ${escapeHTML(
                                record.date ||
                                "—"
                            )}
                        </td>
                        <td>
                            ${escapeHTML(
                                record.riderName ||
                                (
                                    rider
                                        ? riderName(
                                              rider
                                          )
                                        : record.riderId
                                )
                            )}
                        </td>
                        <td>
                            ${escapeHTML(
                                dateTime(
                                    record.checkIn
                                )
                            )}
                        </td>
                        <td>
                            ${escapeHTML(
                                dateTime(
                                    record.checkOut
                                )
                            )}
                        </td>
                        <td>
                            ${
                                record.checkIn
                                    ? money(
                                          record.dailyCheckinFee ??
                                          DAILY_CHECKIN_FEE
                                      )
                                    : money(0)
                            }
                        </td>
                        <td>
                            ${
                                record.checkOut
                                    ? "Completed"
                                    : record.checkIn
                                        ? "Checked In"
                                        : "Absent"
                            }
                        </td>
                    </tr>`;
            })
            .join("");
    container.innerHTML = `
        <div class="card">
            <h2>Rider Attendance</h2>
            <p>
                Daily check-in fee setting:
                ${money(
                    DAILY_CHECKIN_FEE
                )}
                per recorded check-in.
            </p>
            <p>
                Office geofence:
                ${OFFICE.radiusMeters}
                metres.
            </p>
            <div class="table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Rider</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Fee</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                            rows ||
                            '<tr><td colspan="6">No attendance records yet.</td></tr>'
                        }
                    </tbody>
                </table>
            </div>
        </div>`;
}
/* ================= RIDER PERFORMANCE ================= */
function renderRiders() {
    const container =
        $("driverList");
    if (!container) return;
    if (!isAdmin()) {
        container.innerHTML = "";
        return;
    }
    const riders =
        getRiders()
            .slice()
            .sort(
                (a, b) =>
                    getRiderWeekEarnings(
                        riderId(b)
                    ).deliveryCount -
                    getRiderWeekEarnings(
                        riderId(a)
                    ).deliveryCount
            );
    container.innerHTML =
        riders.length
            ? riders
                  .map(rider => {
                      const stats =
                          getRiderWeekEarnings(
                              riderId(rider)
                          );
                      const status =
                          rider.status ||
                          "Active";
                      return `
                        <div class="person card">
                            <h3>
                                ${escapeHTML(
                                    riderName(
                                        rider
                                    )
                                )}
                            </h3>
                            <p>
                                ${escapeHTML(
                                    rider.phone ||
                                    ""
                                )}
                            </p>
                            <p>
                                Status:
                                ${escapeHTML(
                                    status
                                )}
                            </p>
                            <p>
                                Deliveries this week:
                                <strong>
                                    ${stats.deliveryCount}
                                </strong>
                            </p>
                            <p>
                                Delivery earnings:
                                <strong>
                                    ${money(
                                        stats.deliveryEarnings
                                    )}
                                </strong>
                            </p>
                            <p>
                                Total earnings:
                                <strong>
                                    ${money(
                                        stats.total
                                    )}
                                </strong>
                            </p>
                        </div>`;
                  })
                  .join("")
            : `<p>No riders registered yet.</p>`;
}
function renderCustomers() {
    const container =
        $("customerList");
    if (!container) return;
    const map =
        new Map();
    visibleDeliveries()
        .forEach(delivery => {
            const key =
                `${delivery.phone || ""}-${delivery.customer || ""}`;
            if (!map.has(key)) {
                map.set(key, {
                    name:
                        delivery.customer ||
                        "Unknown",
                    phone:
                        delivery.phone ||
                        "—",
                    count: 0,
                    total: 0
                });
            }
            const customer =
                map.get(key);
            customer.count++;
            customer.total +=
                Number(
                    delivery.amount ||
                    0
                );
        });
    container.innerHTML =
        map.size
            ? Array
                  .from(
                      map.values()
                  )
                  .map(
                      customer => `
                        <div class="person card">
                            <h3>
                                ${escapeHTML(
                                    customer.name
                                )}
                            </h3>
                            <p>
                                ${escapeHTML(
                                    customer.phone
                                )}
                            </p>
                            <p>
                                Deliveries:
                                ${customer.count}
                            </p>
                            <p>
                                Total order value:
                                ${money(
                                    customer.total
                                )}
                            </p>
                        </div>`
                  )
                  .join("")
            : "<p>No customer records yet.</p>";
}
/* ================= DASHBOARD METRICS ================= */
function setText(id, value) {
    if ($(id)) {
        $(id).textContent =
            value;
    }
}
function renderStats() {
    const deliveries =
        visibleDeliveries();
    const total =
        deliveries.length;
    const delivered =
        deliveries.filter(
            d =>
                normaliseStatus(
                    d.status
                ) === "Delivered"
        ).length;
    const transit =
        deliveries.filter(
            d =>
                normaliseStatus(
                    d.status
                ) === "In Transit"
        ).length;
    const pending =
        deliveries.filter(
            d =>
                [
                    "Pending",
                    "Assigned",
                    "Picked Up"
                ].includes(
                    normaliseStatus(
                        d.status
                    )
                )
        ).length;
    setText(
        "totalDeliveriesStat",
        total
    );
    setText(
        "inTransitStat",
        transit
    );
    setText(
        "deliveredStat",
        delivered
    );
    setText(
        "pendingStat",
        pending
    );
    setText(
        "donutTotal",
        total
    );
    setText(
        "deliveredPercent",
        `${total ? Math.round(
            delivered / total * 100
        ) : 0}%`
    );
    setText(
        "transitPercent",
        `${total ? Math.round(
            transit / total * 100
        ) : 0}%`
    );
    setText(
        "pendingPercent",
        `${total ? Math.round(
            pending / total * 100
        ) : 0}%`
    );
    const revenue =
        deliveries.reduce(
            (sum, d) =>
                sum +
                Number(
                    d.amount || 0
                ),
            0
        );
    setText(
        "revenueStat",
        money(revenue)
    );
    setText(
        "successRate",
        `${total ? Math.round(
            delivered / total * 100
        ) : 0}%`
    );
    renderRecent(
        deliveries
    );
}
function renderRecent(
    deliveries
) {
    const container =
        $("recent");
    if (!container) return;
    const recent =
        deliveries
            .slice()
            .sort(
                (a, b) =>
                    String(
                        b.createdAt || ""
                    ).localeCompare(
                        String(
                            a.createdAt ||
                            ""
                        )
                    )
            )
            .slice(0, 7);
    container.innerHTML =
        recent.length
            ? recent
                  .map(
                      deliveryRow
                  )
                  .join("")
            : `<tr><td colspan="8">No deliveries recorded yet.</td></tr>`;
}
/* ================= CHARTS ================= */
function createChart(
    id,
    config
) {
    const canvas =
        $(id);
    if (
        !canvas ||
        !window.Chart
    ) {
        return;
    }
    if (charts[id]) {
        charts[id].destroy();
    }
    charts[id] =
        new Chart(
            canvas,
            config
        );
}
function renderCharts() {
    if (!window.Chart) {
        return;
    }
    const deliveries =
        visibleDeliveries();
    const labels = [];
    const counts = [];
    for (
        let offset = 6;
        offset >= 0;
        offset--
    ) {
        const date =
            new Date();
        date.setDate(
            date.getDate() -
            offset
        );
        const key =
            todayKey(date);
        labels.push(
            date.toLocaleDateString(
                "en-NG",
                {
                    weekday:
                        "short"
                }
            )
        );
        counts.push(
            deliveries.filter(
                delivery => {
                    const stamp =
                        delivery.deliveredAt ||
                        delivery.createdAt ||
                        delivery.updatedAt;
                    return (
                        stamp &&
                        todayKey(
                            new Date(
                                stamp
                            )
                        ) ===
                            key
                    );
                }
            ).length
        );
    }
    createChart(
        "line",
        {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label:
                        "Deliveries",
                    data:
                        counts,
                    borderColor:
                        "#2563eb",
                    backgroundColor:
                        "rgba(37,99,235,.12)",
                    fill:
                        true,
                    tension:
                        0.35
                }]
            },
            options: {
                responsive:
                    true,
                maintainAspectRatio:
                    true,
                plugins: {
                    legend: {
                        display:
                            false
                    }
                }
            }
        }
    );
    const delivered =
        deliveries.filter(
            d =>
                normaliseStatus(
                    d.status
                ) === "Delivered"
        ).length;
    const transit =
        deliveries.filter(
            d =>
                normaliseStatus(
                    d.status
                ) === "In Transit"
        ).length;
    const pending =
        deliveries.filter(
            d =>
                [
                    "Pending",
                    "Assigned",
                    "Picked Up"
                ].includes(
                    normaliseStatus(
                        d.status
                    )
                )
        ).length;
    createChart(
        "donut",
        {
            type: "doughnut",
            data: {
                labels: [
                    "Delivered",
                    "In Transit",
                    "Pending"
                ],
                datasets: [{
                    data: [
                        delivered,
                        transit,
                        pending
                    ]
                }]
            },
            options: {
                responsive:
                    true,
                maintainAspectRatio:
                    true,
                plugins: {
                    legend: {
                        display:
                            false
                    }
                }
            }
        }
    );
    const revenueByDay =
        labels.map(
            (label, index) => {
                const date =
                    new Date();
                date.setDate(
                    date.getDate() -
                    (6 - index)
                );
                const key =
                    todayKey(
                        date
                    );
                return deliveries
                    .filter(
                        delivery => {
                            const stamp =
                                delivery.createdAt ||
                                delivery.updatedAt;
                            return (
                                stamp &&
                                todayKey(
                                    new Date(
                                        stamp
                                    )
                                ) ===
                                    key
                            );
                        }
                    )
                    .reduce(
                        (
                            sum,
                            delivery
                        ) =>
                            sum +
                            Number(
                                delivery.amount ||
                                0
                            ),
                        0
                    );
            }
        );
    createChart(
        "bar",
        {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label:
                        "Revenue (₦)",
                    data:
                        revenueByDay,
                    backgroundColor:
                        "#2563eb"
                }]
            },
            options: {
                responsive:
                    true,
                plugins: {
                    legend: {
                        display:
                            false
                    }
                }
            }
        }
    );
}
/* ================= REFRESH ALL VIEWS ================= */
function renderAll() {
    if (!getUser()) {
        return;
    }
    renderStats();
    renderDeliveries();
    renderRiderDashboardCards();
    renderRiders();
    renderCustomers();
    renderAttendancePage();
    renderCharts();
}
window.refreshAllDeliveryViews =
    renderAll;
window.phase2Refresh =
    renderAll;
/* ================= INITIAL STARTUP ================= */
function initialise() {
    const loggedIn =
        localStorage.getItem(
            KEYS.loggedIn
        ) === "true";
    const user =
        getUser();
    if (
        loggedIn &&
        user
    ) {
        openApplication();
    } else {
        setVisible(
            $("mainApp"),
            false
        );
        setVisible(
            $("authScreen"),
            true
        );
        window.selectRole(
            "rider"
        );
    }
    window.addEventListener(
        "storage",
        event => {
            if (
                Object.values(
                    KEYS
                ).includes(
                    event.key
                )
            ) {
                renderAll();
            }
        }
    );
}
if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialise
    );
} else {
    initialise();
}

})();