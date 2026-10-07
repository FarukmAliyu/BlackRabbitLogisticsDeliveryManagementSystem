/* =========================================================
   BLACK RABBIT LOGISTICS
   COMPLETE DELIVERY MANAGEMENT SYSTEM
   ========================================================= */

/* =========================================================
   GLOBAL CONFIGURATION
   ========================================================= */

const SUPER_ADMIN = {
    phone: "08000000000",
    password: "Admin@123",
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
    id: "SUPER-ADMIN"
};

const OFFICE_LATITUDE = 10.5366473;
const OFFICE_LONGITUDE = 7.4682503;
const CHECK_IN_RADIUS_METERS = 200;
const DAILY_CHECK_IN_FEE = 1000;

let currentRole = "rider";
let editingDeliveryId = null;
let deliveryFilter = "All";

let deliveryDonut = null;
let deliveryBar = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function normalizePhone(phone) {
    return String(phone || "")
        .replace(/\s+/g, "")
        .replace(/-/g, "")
        .trim();
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

function formatCurrency(amount) {
    return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
}

function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentTime() {
    return new Date().toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getCurrentDateTime() {
    return new Date().toISOString();
}

function formatDate(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDuration(minutes) {
    const totalMinutes = Number(minutes || 0);

    if (totalMinutes <= 0) {
        return "0 min";
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }

    return `${mins} min`;
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getRiders() {
    try {
        return JSON.parse(
            localStorage.getItem("blackRabbitRiders") || "[]"
        );
    } catch (error) {
        console.error("Unable to load riders:", error);
        return [];
    }
}

function saveRiders(riders) {
    localStorage.setItem(
        "blackRabbitRiders",
        JSON.stringify(riders)
    );
}

function getDeliveries() {
    try {
        const deliveries = JSON.parse(
            localStorage.getItem("blackRabbitDeliveries") || "[]"
        );

        return deliveries.map(delivery => ({
            ...delivery,
            riderEarning: Number(delivery.riderEarning || 0)
        }));
    } catch (error) {
        console.error("Unable to load deliveries:", error);
        return [];
    }
}

function saveDeliveries(deliveries) {
    localStorage.setItem(
        "blackRabbitDeliveries",
        JSON.stringify(deliveries)
    );
}

function getAttendance() {
    try {
        return JSON.parse(
            localStorage.getItem("blackRabbitAttendance") || "[]"
        );
    } catch (error) {
        console.error("Unable to load attendance:", error);
        return [];
    }
}

function saveAttendance(attendance) {
    localStorage.setItem(
        "blackRabbitAttendance",
        JSON.stringify(attendance)
    );
}


/* =========================================================
   DELIVERY INITIALIZATION
   NO DEMO DATA
   ========================================================= */

function initializeDeliveries() {
    const existing = localStorage.getItem("blackRabbitDeliveries");

    /*
     * IMPORTANT:
     * Do NOT create demo/sample deliveries.
     * Deliveries will only be created by actual users/admin.
     */

    if (!existing) {
        localStorage.setItem(
            "blackRabbitDeliveries",
            JSON.stringify([])
        );
    }
}


/* =========================================================
   CURRENT USER / SESSION
   ========================================================= */

function getCurrentUser() {
    try {
        return JSON.parse(
            sessionStorage.getItem("blackRabbitCurrentUser") || "null"
        );
    } catch (error) {
        return null;
    }
}

function setCurrentUser(user) {
    sessionStorage.setItem(
        "blackRabbitCurrentUser",
        JSON.stringify(user)
    );
}

function isSuperAdmin() {
    const user = getCurrentUser();
    return user && user.role === "super_admin";
}

function isRider() {
    const user = getCurrentUser();
    return user && user.role === "rider";
}


/* =========================================================
   AUTH UI
   ========================================================= */

function selectRole(role) {
    currentRole = role;

    const riderLoginBox = document.getElementById("riderLoginBox");
    const adminLoginBox = document.getElementById("adminLoginBox");
    const riderRegisterBox = document.getElementById("riderRegisterBox");

    const riderTab = document.getElementById("riderRoleBtn");
    const adminTab = document.getElementById("adminRoleBtn");

    if (role === "rider") {
        if (riderLoginBox) riderLoginBox.style.display = "block";
        if (adminLoginBox) adminLoginBox.style.display = "none";
        if (riderRegisterBox) riderRegisterBox.style.display = "block";

        if (riderTab) riderTab.classList.add("active");
        if (adminTab) adminTab.classList.remove("active");
    } else {
        if (riderLoginBox) riderLoginBox.style.display = "none";
        if (adminLoginBox) adminLoginBox.style.display = "block";
        if (riderRegisterBox) riderRegisterBox.style.display = "none";

        if (riderTab) riderTab.classList.remove("active");
        if (adminTab) adminTab.classList.add("active");
    }
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {
        input.type = "text";

        if (button) {
            button.textContent = "Hide";
        }
    } else {
        input.type = "password";

        if (button) {
            button.textContent = "Show";
        }
    }
}

function showAuthMessage(message, type = "error") {
    const element = document.getElementById("authMessage");

    if (!element) {
        alert(message);
        return;
    }

    element.textContent = message;
    element.className = `auth-message ${type}`;
}


/* =========================================================
   RIDER REGISTRATION
   ========================================================= */

function registerRider() {
    const firstName = document.getElementById("registerFirstName")?.value.trim();
    const lastName = document.getElementById("registerLastName")?.value.trim();
    const phone = normalizePhone(
        document.getElementById("registerPhone")?.value
    );
    const password = document.getElementById("registerPassword")?.value;
    const terms = document.getElementById("registerTerms");

    if (!firstName || !lastName || !phone || !password) {
        showAuthMessage(
            "Please complete all registration fields.",
            "error"
        );
        return;
    }

    if (password.length < 6) {
        showAuthMessage(
            "Password must contain at least 6 characters.",
            "error"
        );
        return;
    }

    if (terms && !terms.checked) {
        showAuthMessage(
            "Please accept the terms and conditions.",
            "error"
        );
        return;
    }

    const riders = getRiders();

    const existing = riders.find(
        rider => normalizePhone(rider.phone) === phone
    );

    if (existing) {
        showAuthMessage(
            "A rider account with this phone number already exists.",
            "error"
        );
        return;
    }

    const riderNumber = String(riders.length + 1).padStart(4, "0");

    const rider = {
        id: `BR-RDR-${riderNumber}`,
        firstName,
        lastName,
        phone,
        password,
        role: "rider",
        createdAt: getCurrentDateTime()
    };

    riders.push(rider);
    saveRiders(riders);

    showAuthMessage(
        `Registration successful. Your Rider ID is ${rider.id}.`,
        "success"
    );

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.reset();
    }
}


/* =========================================================
   RIDER LOGIN
   ========================================================= */

function riderLogin() {
    const phone = normalizePhone(
        document.getElementById("loginPhone")?.value
    );

    const password =
        document.getElementById("loginPassword")?.value || "";

    if (!phone || !password) {
        showAuthMessage(
            "Enter your phone number and password.",
            "error"
        );
        return;
    }

    const riders = getRiders();

    const rider = riders.find(
        item =>
            normalizePhone(item.phone) === phone &&
            item.password === password
    );

    if (!rider) {
        showAuthMessage(
            "Invalid rider phone number or password.",
            "error"
        );
        return;
    }

    loginSuccess(rider);
}


/* =========================================================
   SUPER ADMIN LOGIN
   ========================================================= */

function adminLogin() {
    const phone = normalizePhone(
        document.getElementById("adminPhone")?.value
    );

    const password =
        document.getElementById("adminPassword")?.value || "";

    if (
        phone === normalizePhone(SUPER_ADMIN.phone) &&
        password === SUPER_ADMIN.password
    ) {
        loginSuccess(SUPER_ADMIN);
        return;
    }

    showAuthMessage(
        "Invalid Super Admin credentials.",
        "error"
    );
}


/* =========================================================
   LOGIN SUCCESS
   ========================================================= */

function loginSuccess(user) {
    setCurrentUser(user);

    sessionStorage.setItem(
        "blackRabbitLoggedIn",
        "true"
    );

    const authScreen = document.getElementById("authScreen");
    const mainApp = document.getElementById("mainApp");

    if (authScreen) {
        authScreen.style.display = "none";
    }

    if (mainApp) {
        mainApp.style.display = "block";
    }

    updateUserInterface();
    configureRoleInterface();

    refreshAllDeliveryViews();
    renderRiderAttendanceCard();
    renderRiderEarningsCard();

    openPage("dashboard");
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {
    sessionStorage.removeItem("blackRabbitLoggedIn");
    sessionStorage.removeItem("blackRabbitCurrentUser");

    const authScreen = document.getElementById("authScreen");
    const mainApp = document.getElementById("mainApp");

    if (mainApp) {
        mainApp.style.display = "none";
    }

    if (authScreen) {
        authScreen.style.display = "flex";
    }

    currentRole = "rider";

    selectRole("rider");
}


/* =========================================================
   USER INTERFACE
   ========================================================= */

function updateUserInterface() {
    const user = getCurrentUser();

    if (!user) return;

    const name =
        user.role === "super_admin"
            ? "Super Admin"
            : `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const userNameElements = document.querySelectorAll(
        "#userName, #headerUserName, .user-name"
    );

    userNameElements.forEach(element => {
        element.textContent = name;
    });

    const avatarElements = document.querySelectorAll(
        "#userAvatar, .user-avatar"
    );

    avatarElements.forEach(element => {
        element.textContent =
            name.charAt(0).toUpperCase() || "U";
    });

    const title = document.getElementById("pageTitle");

    if (title) {
        title.textContent =
            user.role === "super_admin"
                ? "Super Admin Dashboard"
                : "Rider Dashboard";
    }
}


/* =========================================================
   ROLE-BASED INTERFACE
   ========================================================= */

function configureRoleInterface() {
    const adminOnlyPages = [
        "customers",
        "drivers",
        "analytics"
    ];

    adminOnlyPages.forEach(page => {
        const nav = document.querySelector(
            `[data-page="${page}"]`
        );

        if (nav) {
            nav.style.display = isSuperAdmin()
                ? ""
                : "none";
        }
    });

    const attendanceNav = document.querySelector(
        '[data-page="attendance"]'
    );

    if (attendanceNav) {
        attendanceNav.style.display = "";
    }

    const deliveryNav = document.querySelector(
        '[data-page="deliveries"]'
    );

    if (deliveryNav) {
        deliveryNav.style.display = "";
    }

    const trackingNav = document.querySelector(
        '[data-page="tracking"]'
    );

    if (trackingNav) {
        trackingNav.style.display = "";
    }
}


/* =========================================================
   ATTENDANCE HELPERS
   ========================================================= */

function getRiderTodayAttendance() {
    const user = getCurrentUser();

    if (!user || user.role !== "rider") {
        return null;
    }

    const today = getToday();

    return getAttendance().find(
        record =>
            record.riderId === user.id &&
            record.date === today
    ) || null;
}

function getDistanceInMeters(
    lat1,
    lon1,
    lat2,
    lon2
) {
    const earthRadius = 6371000;

    const toRadians = value =>
        value * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}

function calculateAttendanceDuration(record) {
    if (!record || !record.checkInTimestamp) {
        return 0;
    }

    const start = new Date(
        record.checkInTimestamp
    ).getTime();

    let end;

    if (record.checkOutTimestamp) {
        end = new Date(
            record.checkOutTimestamp
        ).getTime();
    } else {
        end = Date.now();
    }

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor((end - start) / 60000)
    );
}


/* =========================================================
   RIDER CHECK-IN
   ========================================================= */

function riderCheckIn() {
    const user = getCurrentUser();

    if (!user || user.role !== "rider") {
        alert("Only riders can check in.");
        return;
    }

    const todayAttendance =
        getRiderTodayAttendance();

    if (todayAttendance) {
        alert(
            "You have already checked in today."
        );
        return;
    }

    if (!navigator.geolocation) {
        alert(
            "GPS is not available in this browser."
        );
        return;
    }

    const button =
        document.getElementById("checkInBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Checking location...";
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;

            const distance =
                getDistanceInMeters(
                    OFFICE_LATITUDE,
                    OFFICE_LONGITUDE,
                    latitude,
                    longitude
                );

            if (distance > CHECK_IN_RADIUS_METERS) {
                if (button) {
                    button.disabled = false;
                    button.textContent = "Check In";
                }

                alert(
                    `Check-in denied.\n\nYou are approximately ${Math.round(distance)} meters from the office.\n\nYou must be within ${CHECK_IN_RADIUS_METERS} meters of the office.`
                );

                return;
            }

            const now = new Date();

            const attendance = getAttendance();

            const record = {
                id: `ATT-${Date.now()}`,
                riderId: user.id,
                riderName:
                    `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                phone: user.phone,

                date: getToday(),

                checkIn: getCurrentTime(),
                checkOut: "",

                checkInTimestamp:
                    now.toISOString(),

                checkOutTimestamp: "",

                durationMinutes: 0,

                status: "Present",

                checkInFee: DAILY_CHECK_IN_FEE,
                feeApplied: true,

                latitude,
                longitude,

                locationAccuracy: accuracy,
                distanceFromOffice: Math.round(distance),

                createdAt:
                    now.toISOString()
            };

            attendance.push(record);
            saveAttendance(attendance);

            if (button) {
                button.disabled = false;
            }

            renderRiderAttendanceCard();
            renderAttendancePage();
            renderRiderEarningsCard();

            alert(
                `Check-in successful.\n\nDistance from office: ${Math.round(distance)} meters.\nDaily attendance fee: ${formatCurrency(DAILY_CHECK_IN_FEE)}`
            );
        },

        error => {
            if (button) {
                button.disabled = false;
                button.textContent = "Check In";
            }

            let message =
                "Unable to get your location.";

            if (error.code === 1) {
                message =
                    "Location permission was denied. Please allow location access and try again.";
            } else if (error.code === 2) {
                message =
                    "Your location could not be determined. Please enable GPS/location services.";
            } else if (error.code === 3) {
                message =
                    "Location request timed out. Please try again.";
            }

            alert(message);
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


/* =========================================================
   RIDER CHECK-OUT
   ========================================================= */

function riderCheckOut() {
    const user = getCurrentUser();

    if (!user || user.role !== "rider") {
        alert("Only riders can check out.");
        return;
    }

    const attendance =
        getAttendance();

    const index =
        attendance.findIndex(
            record =>
                record.riderId === user.id &&
                record.date === getToday()
        );

    if (index === -1) {
        alert(
            "You must check in before checking out."
        );
        return;
    }

    if (attendance[index].checkOut) {
        alert(
            "You have already checked out today."
        );
        return;
    }

    const now = new Date();

    attendance[index].checkOut =
        now.toLocaleTimeString("en-NG", {
            hour: "2-digit",
            minute: "2-digit"
        });

    attendance[index].checkOutTimestamp =
        now.toISOString();

    attendance[index].status =
        "Checked Out";

    attendance[index].durationMinutes =
        calculateAttendanceDuration(
            attendance[index]
        );

    saveAttendance(attendance);

    renderRiderAttendanceCard();
    renderAttendancePage();
    renderRiderEarningsCard();

    alert(
        `Check-out successful.\n\nAttendance duration: ${formatDuration(attendance[index].durationMinutes)}`
    );
}


/* =========================================================
   RIDER ATTENDANCE CARD
   ========================================================= */

function renderRiderAttendanceCard() {
    const container =
        document.getElementById(
            "riderAttendanceCard"
        );

    if (!container) return;

    if (!isRider()) {
        container.innerHTML = "";
        return;
    }

    const attendance =
        getRiderTodayAttendance();

    if (!attendance) {
        container.innerHTML = `
            <div class="attendance-card-content">
                <h3>Today's Attendance</h3>

                <p class="attendance-status">
                    Not Checked In
                </p>

                <p>
                    You must be within
                    <strong>${CHECK_IN_RADIUS_METERS} meters</strong>
                    of the office to check in.
                </p>

                <p>
                    Daily attendance fee:
                    <strong>${formatCurrency(DAILY_CHECK_IN_FEE)}</strong>
                </p>

                <button
                    id="checkInBtn"
                    class="btn btn-primary"
                    onclick="riderCheckIn()"
                >
                    Check In
                </button>
            </div>
        `;

        return;
    }

    const duration =
        calculateAttendanceDuration(attendance);

    const checkedOut =
        Boolean(attendance.checkOut);

    container.innerHTML = `
        <div class="attendance-card-content">
            <h3>Today's Attendance</h3>

            <p>
                <strong>Date:</strong>
                ${escapeHtml(attendance.date)}
            </p>

            <p>
                <strong>Check In:</strong>
                ${escapeHtml(attendance.checkIn)}
            </p>

            <p>
                <strong>Check Out:</strong>
                ${attendance.checkOut
                    ? escapeHtml(attendance.checkOut)
                    : "Not Checked Out"}
            </p>

            <p>
                <strong>Duration:</strong>
                ${formatDuration(duration)}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHtml(attendance.status)}
            </p>

            <p>
                <strong>Attendance Fee:</strong>
                ${formatCurrency(attendance.checkInFee)}
            </p>

            <p>
                <strong>Distance:</strong>
                ${Number(attendance.distanceFromOffice || 0)} meters
            </p>

            ${
                !checkedOut
                    ? `
                        <button
                            class="btn btn-secondary"
                            onclick="riderCheckOut()"
                        >
                            Check Out
                        </button>
                    `
                    : `
                        <p class="attendance-complete">
                            Attendance completed for today.
                        </p>
                    `
            }
        </div>
    `;
}


/* =========================================================
   WEEK CALCULATIONS
   ========================================================= */

function getWeekStart(dateValue = new Date()) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const day = date.getDay();

    const difference =
        day === 0 ? -6 : 1 - day;

    const start = new Date(date);

    start.setDate(
        date.getDate() + difference
    );

    start.setHours(0, 0, 0, 0);

    return start;
}

function getWeekEnd(dateValue = new Date()) {
    const start = getWeekStart(dateValue);

    if (!start) return null;

    const end = new Date(start);

    end.setDate(
        start.getDate() + 6
    );

    end.setHours(
        23,
        59,
        59,
        999
    );

    return end;
}

function getWeekLabel(dateValue = new Date()) {
    const start =
        getWeekStart(dateValue);

    const end =
        getWeekEnd(dateValue);

    if (!start || !end) {
        return "";
    }

    return `${start.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short"
        }
    )} - ${end.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    )}`;
}


/* =========================================================
   WEEKLY RIDER FINANCIALS
   ========================================================= */

function getRiderWeeklyFinancials(riderId) {
    const start =
        getWeekStart(new Date());

    const end =
        getWeekEnd(new Date());

    const deliveries =
        getDeliveries();

    const attendance =
        getAttendance();

    const riderDeliveries =
        deliveries.filter(delivery => {
            if (
                delivery.riderId !== riderId ||
                delivery.status !== "Delivered"
            ) {
                return false;
            }

            const deliveryDate =
                delivery.deliveredAt ||
                delivery.updatedAt ||
                delivery.createdAt;

            if (!deliveryDate) {
                return false;
            }

            const date =
                new Date(deliveryDate);

            return (
                date >= start &&
                date <= end
            );
        });

    const grossEarnings =
        riderDeliveries.reduce(
            (total, delivery) =>
                total +
                Number(
                    delivery.riderEarning || 0
                ),
            0
        );

    const riderAttendance =
        attendance.filter(record => {
            if (
                record.riderId !== riderId
            ) {
                return false;
            }

            const date =
                new Date(
                    `${record.date}T00:00:00`
                );

            return (
                date >= start &&
                date <= end &&
                record.feeApplied !== false
            );
        });

    const checkInFees =
        riderAttendance.reduce(
            (total, record) =>
                total +
                Number(
                    record.checkInFee ||
                    DAILY_CHECK_IN_FEE
                ),
            0
        );

    const netEarnings =
        grossEarnings -
        checkInFees;

    return {
        grossEarnings,
        checkInFees,
        netEarnings,
        deliveryCount:
            riderDeliveries.length,
        checkInCount:
            riderAttendance.length
    };
}


/* =========================================================
   RIDER EARNINGS CARD
   ========================================================= */

function renderRiderEarningsCard() {
    const container =
        document.getElementById(
            "riderEarningsCard"
        );

    if (!container) return;

    if (!isRider()) {
        container.innerHTML = "";
        return;
    }

    const user =
        getCurrentUser();

    const financials =
        getRiderWeeklyFinancials(
            user.id
        );

    container.innerHTML = `
        <div class="earnings-card-content">
            <h3>Weekly Earnings</h3>

            <p>
                <strong>
                    ${escapeHtml(
                        getWeekLabel()
                    )}
                </strong>
            </p>

            <div class="earnings-grid">

                <div>
                    <span>Delivered Orders</span>
                    <strong>
                        ${financials.deliveryCount}
                    </strong>
                </div>

                <div>
                    <span>Delivery Earnings</span>
                    <strong>
                        ${formatCurrency(
                            financials.grossEarnings
                        )}
                    </strong>
                </div>

                <div>
                    <span>Check-In Fees</span>
                    <strong>
                        ${formatCurrency(
                            financials.checkInFees
                        )}
                    </strong>
                </div>

                <div>
                    <span>Net Earnings</span>
                    <strong>
                        ${formatCurrency(
                            financials.netEarnings
                        )}
                    </strong>
                </div>

            </div>
        </div>
    `;
}


/* =========================================================
   ATTENDANCE PAGE
   ========================================================= */

function renderAttendancePage() {
    const container =
        document.getElementById(
            "attendanceContent"
        );

    if (!container) return;

    if (isSuperAdmin()) {
        renderAdminAttendancePage(container);
    } else {
        renderRiderAttendancePage(container);
    }
}


/* =========================================================
   RIDER ATTENDANCE PAGE
   ========================================================= */

function renderRiderAttendancePage(container) {
    const user =
        getCurrentUser();

    const records =
        getAttendance()
            .filter(
                record =>
                    record.riderId === user.id
            )
            .sort(
                (a, b) =>
                    `${b.date} ${b.checkIn}`.localeCompare(
                        `${a.date} ${a.checkIn}`
                    )
            );

    const financials =
        getRiderWeeklyFinancials(
            user.id
        );

    let rows = "";

    if (records.length === 0) {
        rows = `
            <tr>
                <td colspan="8">
                    No attendance records found.
                </td>
            </tr>
        `;
    } else {
        rows = records.map(record => {
            const duration =
                calculateAttendanceDuration(
                    record
                );

            return `
                <tr>
                    <td>
                        ${escapeHtml(record.date)}
                    </td>

                    <td>
                        ${escapeHtml(record.checkIn || "-")}
                    </td>

                    <td>
                        ${escapeHtml(
                            record.checkOut || "-"
                        )}
                    </td>

                    <td>
                        ${formatDuration(duration)}
                    </td>

                    <td>
                        ${escapeHtml(
                            record.status || "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            record.checkInFee || 0
                        )}
                    </td>

                    <td>
                        ${Number(
                            record.distanceFromOffice || 0
                        )} m
                    </td>

                    <td>
                        ${record.latitude && record.longitude
                            ? `${Number(record.latitude).toFixed(6)}, ${Number(record.longitude).toFixed(6)}`
                            : "-"
                        }
                    </td>
                </tr>
            `;
        }).join("");
    }

    container.innerHTML = `
        <div class="attendance-page">

            <h2>My Attendance</h2>

            <div class="attendance-summary">

                <div>
                    <span>This Week's Check-Ins</span>
                    <strong>
                        ${financials.checkInCount}
                    </strong>
                </div>

                <div>
                    <span>Check-In Fees</span>
                    <strong>
                        ${formatCurrency(
                            financials.checkInFees
                        )}
                    </strong>
                </div>

                <div>
                    <span>Delivery Earnings</span>
                    <strong>
                        ${formatCurrency(
                            financials.grossEarnings
                        )}
                    </strong>
                </div>

                <div>
                    <span>Net Earnings</span>
                    <strong>
                        ${formatCurrency(
                            financials.netEarnings
                        )}
                    </strong>
                </div>

            </div>

            <div class="table-container">

                <table>

                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Fee</th>
                            <th>Distance</th>
                            <th>Location</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>

        </div>
    `;
}


/* =========================================================
   ADMIN ATTENDANCE PAGE
   ========================================================= */

function renderAdminAttendancePage(container) {
    const attendance =
        getAttendance();

    const riders =
        getRiders();

    const today =
        getToday();

    const todayRecords =
        attendance.filter(
            record =>
                record.date === today
        );

    const presentCount =
        todayRecords.filter(
            record =>
                record.status === "Present" ||
                record.status === "Checked Out"
        ).length;

    const checkedOutCount =
        todayRecords.filter(
            record =>
                record.status === "Checked Out"
        ).length;

    const absentCount =
        Math.max(
            0,
            riders.length -
            todayRecords.length
        );

    const totalFeesToday =
        todayRecords.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.checkInFee || 0
                ),
            0
        );

    const rows =
        attendance
            .slice()
            .sort((a, b) =>
                `${b.date} ${b.checkIn}`.localeCompare(
                    `${a.date} ${a.checkIn}`
                )
            )
            .map(record => {
                const duration =
                    calculateAttendanceDuration(
                        record
                    );

                return `
                    <tr>
                        <td>
                            ${escapeHtml(
                                record.riderName || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.riderId || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.phone || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.date || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.checkIn || "-"
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.checkOut || "-"
                            )}
                        </td>

                        <td>
                            ${formatDuration(
                                duration
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                record.status || "-"
                            )}
                        </td>

                        <td>
                            ${formatCurrency(
                                record.checkInFee || 0
                            )}
                        </td>

                        <td>
                            ${Number(
                                record.distanceFromOffice || 0
                            )} m
                        </td>

                        <td>
                            ${
                                record.latitude &&
                                record.longitude
                                    ? `
                                        ${Number(record.latitude).toFixed(6)},
                                        ${Number(record.longitude).toFixed(6)}
                                    `
                                    : "-"
                            }
                        </td>
                    </tr>
                `;
            })
            .join("");

    const safeRows =
        rows ||
        `
            <tr>
                <td colspan="11">
                    No attendance records found.
                </td>
            </tr>
        `;

    container.innerHTML = `
        <div class="attendance-page">

            <h2>Rider Attendance</h2>

            <div class="attendance-summary">

                <div>
                    <span>Present Today</span>
                    <strong>
                        ${presentCount}
                    </strong>
                </div>

                <div>
                    <span>Checked Out</span>
                    <strong>
                        ${checkedOutCount}
                    </strong>
                </div>

                <div>
                    <span>Absent Today</span>
                    <strong>
                        ${absentCount}
                    </strong>
                </div>

                <div>
                    <span>Today's Fees</span>
                    <strong>
                        ${formatCurrency(
                            totalFeesToday
                        )}
                    </strong>
                </div>

            </div>

            <div class="attendance-filter">
                <input
                    type="text"
                    id="attendanceSearch"
                    placeholder="Search rider name or ID..."
                    oninput="filterAttendance()"
                >
            </div>

            <div class="table-container">

                <table id="attendanceTable">

                    <thead>
                        <tr>
                            <th>Rider</th>
                            <th>Rider ID</th>
                            <th>Phone</th>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Fee</th>
                            <th>Distance</th>
                            <th>Location</th>
                        </tr>
                    </thead>

                    <tbody id="attendanceRows">
                        ${safeRows}
                    </tbody>

                </table>

            </div>

            <div class="weekly-earnings-section">

                <h2>
                    Weekly Rider Earnings
                </h2>

                <p>
                    ${escapeHtml(
                        getWeekLabel()
                    )}
                </p>

                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Rider</th>
                                <th>Rider ID</th>
                                <th>Delivered Orders</th>
                                <th>Delivery Earnings</th>
                                <th>Check-In Fees</th>
                                <th>Net Earnings</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${weeklyRiderEarningsRows()}
                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   ATTENDANCE SEARCH
   ========================================================= */

function filterAttendance() {
    const input =
        document.getElementById(
            "attendanceSearch"
        );

    const search =
        input?.value
            .toLowerCase()
            .trim() || "";

    const rows =
        document.querySelectorAll(
            "#attendanceRows tr"
        );

    rows.forEach(row => {
        const text =
            row.textContent
                .toLowerCase();

        row.style.display =
            text.includes(search)
                ? ""
                : "none";
    });
}


/* =========================================================
   WEEKLY RIDER EARNINGS TABLE
   ========================================================= */

function weeklyRiderEarningsRows() {
    const riders =
        getRiders();

    if (riders.length === 0) {
        return `
            <tr>
                <td colspan="6">
                    No registered riders found.
                </td>
            </tr>
        `;
    }

    return riders.map(rider => {
        const financials =
            getRiderWeeklyFinancials(
                rider.id
            );

        return `
            <tr>
                <td>
                    ${escapeHtml(
                        `${rider.firstName || ""} ${rider.lastName || ""}`.trim()
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        rider.id
                    )}
                </td>

                <td>
                    ${financials.deliveryCount}
                </td>

                <td>
                    ${formatCurrency(
                        financials.grossEarnings
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        financials.checkInFees
                    )}
                </td>

                <td>
                    <strong>
                        ${formatCurrency(
                            financials.netEarnings
                        )}
                    </strong>
                </td>
            </tr>
        `;
    }).join("");
}


/* =========================================================
   DELIVERY HELPERS
   ========================================================= */

function getRiderName(riderId) {
    if (!riderId) {
        return "Unassigned";
    }

    const rider =
        getRiders().find(
            item =>
                item.id === riderId
        );

    if (!rider) {
        return "Unknown Rider";
    }

    return (
        `${rider.firstName || ""} ${rider.lastName || ""}`
            .trim() ||
        rider.id
    );
}

function canEditDelivery(delivery) {
    const user =
        getCurrentUser();

    if (!user) {
        return false;
    }

    if (user.role === "super_admin") {
        return true;
    }

    return (
        user.role === "rider" &&
        delivery.riderId === user.id
    );
}

function canUpdateDeliveryStatus(delivery) {
    return canEditDelivery(delivery);
}

function getVisibleDeliveries() {
    const deliveries =
        getDeliveries();

    const user =
        getCurrentUser();

    if (!user) {
        return [];
    }

    if (user.role === "super_admin") {
        return deliveries;
    }

    return deliveries.filter(
        delivery =>
            delivery.riderId === user.id
    );
}


/* =========================================================
   DELIVERY FILTERING
   ========================================================= */

function setDeliveryFilter(filter) {
    deliveryFilter = filter;

    document
        .querySelectorAll(
            "[data-delivery-filter]"
        )
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.deliveryFilter === filter
            );
        });

    renderDeliveries();
}

function getFilteredDeliveries() {
    const search =
        document.getElementById(
            "search"
        )?.value
            .toLowerCase()
            .trim() || "";

    let deliveries =
        getVisibleDeliveries();

    if (deliveryFilter !== "All") {
        deliveries =
            deliveries.filter(
                delivery =>
                    delivery.status ===
                    deliveryFilter
            );
    }

    if (search) {
        deliveries =
            deliveries.filter(
                delivery =>
                    String(
                        delivery.id || ""
                    )
                        .toLowerCase()
                        .includes(search) ||

                    String(
                        delivery.customer || ""
                    )
                        .toLowerCase()
                        .includes(search) ||

                    String(
                        delivery.pickup || ""
                    )
                        .toLowerCase()
                        .includes(search) ||

                    String(
                        delivery.destination || ""
                    )
                        .toLowerCase()
                        .includes(search) ||

                    String(
                        getRiderName(
                            delivery.riderId
                        )
                    )
                        .toLowerCase()
                        .includes(search)
            );
    }

    return deliveries;
}


/* =========================================================
   DELIVERY TABLE
   ========================================================= */

function deliveryRows(deliveries) {
    if (!deliveries.length) {
        return `
            <tr>
                <td colspan="9">
                    No deliveries found.
                </td>
            </tr>
        `;
    }

    return deliveries.map(delivery => {
        const editable =
            canEditDelivery(
                delivery
            );

        return `
            <tr>

                <td>
                    ${escapeHtml(
                        delivery.id
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        delivery.customer || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        delivery.pickup || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        delivery.destination || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        getRiderName(
                            delivery.riderId
                        )
                    )}
                </td>

                <td>
                    <span class="status-badge">
                        ${escapeHtml(
                            delivery.status || "Pending"
                        )}
                    </span>
                </td>

                <td>
                    ${formatCurrency(
                        delivery.amount || 0
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        delivery.riderEarning || 0
                    )}
                </td>

                <td>

                    ${
                        editable
                            ? `
                                <button
                                    class="btn btn-sm"
                                    onclick="openEditDelivery('${delivery.id}')"
                                >
                                    Edit
                                </button>
                            `
                            : ""
                    }

                </td>

            </tr>
        `;
    }).join("");
}


/* =========================================================
   RENDER DELIVERIES
   ========================================================= */

function renderDeliveries() {
    const tableBody =
        document.getElementById(
            "allRows"
        );

    if (!tableBody) return;

    const deliveries =
        getFilteredDeliveries();

    tableBody.innerHTML =
        deliveryRows(
            deliveries
        );
}


/* =========================================================
   RECENT DELIVERIES
   ========================================================= */

function renderRecentDeliveries() {
    const container =
        document.getElementById(
            "recent"
        );

    if (!container) return;

    const deliveries =
        getVisibleDeliveries()
            .slice()
            .sort(
                (a, b) =>
                    new Date(
                        b.updatedAt ||
                        b.createdAt ||
                        0
                    ) -
                    new Date(
                        a.updatedAt ||
                        a.createdAt ||
                        0
                    )
            )
            .slice(0, 5);

    if (!deliveries.length) {
        container.innerHTML = `
            <tr>
                <td colspan="7">
                    No deliveries yet.
                </td>
            </tr>
        `;

        return;
    }

    container.innerHTML =
        deliveries.map(
            delivery => `
                <tr>
                    <td>
                        ${escapeHtml(
                            delivery.id
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            delivery.customer || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            delivery.pickup || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            delivery.destination || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            getRiderName(
                                delivery.riderId
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            delivery.status || "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            delivery.amount || 0
                        )}
                    </td>
                </tr>
            `
        ).join("");
}


/* =========================================================
   POPULATE RIDER OPTIONS
   ========================================================= */

function populateRiderOptions() {
    const select =
        document.getElementById(
            "deliveryRider"
        );

    if (!select) return;

    const riders =
        getRiders();

    const user =
        getCurrentUser();

    select.innerHTML = "";

    if (user?.role === "rider") {
        select.innerHTML = `
            <option value="${escapeHtml(user.id)}">
                ${escapeHtml(
                    `${user.firstName || ""} ${user.lastName || ""}`.trim()
                )}
            </option>
        `;

        select.value = user.id;
        select.disabled = true;

        return;
    }

    select.disabled = false;

    select.innerHTML = `
        <option value="">
            Select Rider
        </option>

        ${riders.map(rider => `
            <option value="${escapeHtml(rider.id)}">
                ${escapeHtml(
                    `${rider.firstName || ""} ${rider.lastName || ""}`.trim()
                )}
                (${escapeHtml(rider.id)})
            </option>
        `).join("")}
    `;
}


/* =========================================================
   NEW DELIVERY
   ========================================================= */

function openNewDelivery() {
    editingDeliveryId = null;

    const form =
        document.getElementById(
            "form"
        );

    if (form) {
        form.reset();
    }

    const modal =
        document.getElementById(
            "deliveryModal"
        );

    if (modal) {
        modal.style.display = "flex";
    }

    const earningInput =
        document.getElementById(
            "deliveryRiderEarning"
        );

    const riderSelect =
        document.getElementById(
            "deliveryRider"
        );

    if (earningInput) {
        earningInput.value = "0";
        earningInput.disabled =
            !isSuperAdmin();
    }

    populateRiderOptions();

    if (isRider()) {
        const user =
            getCurrentUser();

        if (riderSelect) {
            riderSelect.value =
                user.id;
            riderSelect.disabled =
                true;
        }

        const status =
            document.getElementById(
                "deliveryStatus"
            );

        if (status) {
            status.value =
                "Assigned";
        }
    }
}


/* =========================================================
   EDIT DELIVERY
   ========================================================= */

function openEditDelivery(id) {
    const delivery =
        getDeliveries().find(
            item =>
                item.id === id
        );

    if (!delivery) {
        alert("Delivery not found.");
        return;
    }

    if (!canEditDelivery(delivery)) {
        alert(
            "You do not have permission to edit this delivery."
        );
        return;
    }

    editingDeliveryId = id;

    const modal =
        document.getElementById(
            "deliveryModal"
        );

    if (modal) {
        modal.style.display = "flex";
    }

    const fields = {
        deliveryCustomer: delivery.customer || "",
        deliveryPhone: delivery.phone || "",
        deliveryPickup: delivery.pickup || "",
        deliveryDestination:
            delivery.destination || "",
        deliveryPackage:
            delivery.package || "",
        deliveryAmount:
            delivery.amount || 0,
        deliveryRiderEarning:
            delivery.riderEarning || 0,
        deliveryStatus:
            delivery.status || "Pending",
        deliveryNotes:
            delivery.notes || ""
    };

    Object.entries(fields).forEach(
        ([id, value]) => {
            const element =
                document.getElementById(id);

            if (element) {
                element.value = value;
            }
        }
    );

    populateRiderOptions();

    const riderSelect =
        document.getElementById(
            "deliveryRider"
        );

    if (riderSelect) {
        riderSelect.value =
            delivery.riderId || "";

        riderSelect.disabled =
            isRider();
    }

    const earningInput =
        document.getElementById(
            "deliveryRiderEarning"
        );

    if (earningInput) {
        earningInput.disabled =
            !isSuperAdmin();
    }

    const history =
        document.getElementById(
            "deliveryHistory"
        );

    if (history) {
        history.value =
            Array.isArray(
                delivery.history
            )
                ? delivery.history
                    .map(item =>
                        `${item.status} - ${item.time}`
                    )
                    .join("\n")
                : "";
    }
}


/* =========================================================
   CLOSE DELIVERY MODAL
   ========================================================= */

function closeDeliveryModal() {
    const modal =
        document.getElementById(
            "deliveryModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

    editingDeliveryId = null;
}


/* =========================================================
   CREATE / UPDATE DELIVERY
   ========================================================= */

function saveDelivery(event) {
    if (event) {
        event.preventDefault();
    }

    const user =
        getCurrentUser();

    if (!user) {
        alert("Please log in.");
        return;
    }

    const customer =
        document.getElementById(
            "deliveryCustomer"
        )?.value.trim() || "";

    const phone =
        document.getElementById(
            "deliveryPhone"
        )?.value.trim() || "";

    const pickup =
        document.getElementById(
            "deliveryPickup"
        )?.value.trim() || "";

    const destination =
        document.getElementById(
            "deliveryDestination"
        )?.value.trim() || "";

    const packageDescription =
        document.getElementById(
            "deliveryPackage"
        )?.value.trim() || "";

    const amount =
        Number(
            document.getElementById(
                "deliveryAmount"
            )?.value || 0
        );

    const riderSelect =
        document.getElementById(
            "deliveryRider"
        );

    let riderId =
        riderSelect?.value || "";

    const status =
        document.getElementById(
            "deliveryStatus"
        )?.value || "Pending";

    const notes =
        document.getElementById(
            "deliveryNotes"
        )?.value.trim() || "";

    const riderEarningInput =
        document.getElementById(
            "deliveryRiderEarning"
        );

    let riderEarning =
        Number(
            riderEarningInput?.value || 0
        );

    if (!customer || !pickup || !destination) {
        alert(
            "Please enter the customer, pickup and destination."
        );
        return;
    }

    if (user.role === "rider") {
        riderId =
            user.id;

        /*
         * Riders cannot modify their own
         * earning.
         */
        if (editingDeliveryId) {
            const existing =
                getDeliveries().find(
                    item =>
                        item.id ===
                        editingDeliveryId
                );

            if (existing) {
                riderEarning =
                    Number(
                        existing.riderEarning || 0
                    );
            }
        } else {
            riderEarning = 0;
        }
    }

    if (user.role === "super_admin") {
        riderEarning =
            Math.max(
                0,
                riderEarning
            );
    }

    const deliveries =
        getDeliveries();

    const now =
        new Date();

    if (editingDeliveryId) {
        const index =
            deliveries.findIndex(
                item =>
                    item.id ===
                    editingDeliveryId
            );

        if (index === -1) {
            alert(
                "Delivery not found."
            );
            return;
        }

        const existing =
            deliveries[index];

        if (!canEditDelivery(existing)) {
            alert(
                "You do not have permission to edit this delivery."
            );
            return;
        }

        const oldStatus =
            existing.status;

        const oldRiderId =
            existing.riderId;

        const updated = {
            ...existing,

            customer,
            phone,
            pickup,
            destination,
            package:
                packageDescription,

            amount,

            riderId,

            status,

            notes,

            updatedAt:
                now.toISOString()
        };

        /*
         * Only Super Admin can change
         * rider earnings.
         */
        if (user.role === "super_admin") {
            updated.riderEarning =
                riderEarning;
        } else {
            updated.riderEarning =
                existing.riderEarning || 0;
        }

        if (!Array.isArray(updated.history)) {
            updated.history = [];
        }

        if (oldStatus !== status) {
            updated.history.push({
                status,
                time:
                    now.toISOString(),
                updatedBy:
                    user.id
            });
        }

        if (oldRiderId !== riderId) {
            updated.history.push({
                status:
                    `Rider assigned: ${getRiderName(riderId)}`,
                time:
                    now.toISOString(),
                updatedBy:
                    user.id
            });
        }

        if (
            status === "Delivered" &&
            oldStatus !== "Delivered"
        ) {
            updated.deliveredAt =
                now.toISOString();
        }

        deliveries[index] =
            updated;

        saveDeliveries(
            deliveries
        );

        alert(
            "Delivery updated successfully."
        );
    } else {
        const nextNumber =
            getNextDeliveryNumber();

        const delivery = {
            id:
                `BR-${nextNumber}`,

            customer,
            phone,

            pickup,
            destination,

            package:
                packageDescription,

            amount,

            riderEarning,

            riderId,

            status,

            notes,

            createdAt:
                now.toISOString(),

            updatedAt:
                now.toISOString(),

            deliveredAt:
                status === "Delivered"
                    ? now.toISOString()
                    : "",

            history: [
                {
                    status,
                    time:
                        now.toISOString(),
                    updatedBy:
                        user.id
                }
            ]
        };

        deliveries.push(
            delivery
        );

        saveDeliveries(
            deliveries
        );

        alert(
            "Delivery created successfully."
        );
    }

    closeDeliveryModal();

    refreshAllDeliveryViews();
}


/* =========================================================
   NEXT DELIVERY NUMBER
   ========================================================= */

function getNextDeliveryNumber() {
    const deliveries =
        getDeliveries();

    let highest =
        10478;

    deliveries.forEach(
        delivery => {
            const match =
                String(
                    delivery.id || ""
                ).match(
                    /^BR-(\d+)$/
                );

            if (match) {
                highest =
                    Math.max(
                        highest,
                        Number(match[1])
                    );
            }
        }
    );

    return highest + 1;
}


/* =========================================================
   UPDATE DELIVERY STATUS
   ========================================================= */

function updateDeliveryStatus(
    deliveryId,
    newStatus
) {
    const deliveries =
        getDeliveries();

    const index =
        deliveries.findIndex(
            delivery =>
                delivery.id ===
                deliveryId
        );

    if (index === -1) {
        alert(
            "Delivery not found."
        );
        return;
    }

    const delivery =
        deliveries[index];

    if (!canUpdateDeliveryStatus(delivery)) {
        alert(
            "You do not have permission to update this delivery."
        );
        return;
    }

    const oldStatus =
        delivery.status;

    const now =
        new Date();

    delivery.status =
        newStatus;

    delivery.updatedAt =
        now.toISOString();

    if (!Array.isArray(delivery.history)) {
        delivery.history = [];
    }

    if (oldStatus !== newStatus) {
        delivery.history.push({
            status: newStatus,
            time:
                now.toISOString(),
            updatedBy:
                getCurrentUser()?.id || ""
        });
    }

    if (
        newStatus === "Delivered" &&
        oldStatus !== "Delivered"
    ) {
        delivery.deliveredAt =
            now.toISOString();
    }

    saveDeliveries(
        deliveries
    );

    refreshAllDeliveryViews();
}


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

function updateDashboardStats() {
    const deliveries =
        getVisibleDeliveries();

    const total =
        deliveries.length;

    const delivered =
        deliveries.filter(
            item =>
                item.status ===
                "Delivered"
        ).length;

    const inTransit =
        deliveries.filter(
            item =>
                item.status ===
                    "In Transit" ||
                item.status ===
                    "Picked Up"
        ).length;

    const pending =
        deliveries.filter(
            item =>
                item.status ===
                "Pending"
        ).length;

    const totalElement =
        document.getElementById(
            "totalDeliveriesStat"
        );

    const inTransitElement =
        document.getElementById(
            "inTransitStat"
        );

    const deliveredElement =
        document.getElementById(
            "deliveredStat"
        );

    const pendingElement =
        document.getElementById(
            "pendingStat"
        );

    if (totalElement) {
        totalElement.textContent =
            total;
    }

    if (inTransitElement) {
        inTransitElement.textContent =
            inTransit;
    }

    if (deliveredElement) {
        deliveredElement.textContent =
            delivered;
    }

    if (pendingElement) {
        pendingElement.textContent =
            pending;
    }

    updateCharts(
        deliveries
    );
}


/* =========================================================
   CHARTS
   ========================================================= */

function updateCharts(deliveries) {
    if (
        typeof Chart === "undefined"
    ) {
        return;
    }

    const donutCanvas =
        document.getElementById(
            "deliveryDonut"
        );

    const barCanvas =
        document.getElementById(
            "deliveryBar"
        );

    if (donutCanvas) {
        const data = [
            deliveries.filter(
                d => d.status === "Pending"
            ).length,

            deliveries.filter(
                d => d.status === "Assigned"
            ).length,

            deliveries.filter(
                d => d.status === "Picked Up"
            ).length,

            deliveries.filter(
                d => d.status === "In Transit"
            ).length,

            deliveries.filter(
                d => d.status === "Delivered"
            ).length
        ];

        if (deliveryDonut) {
            deliveryDonut.destroy();
        }

        deliveryDonut =
            new Chart(
                donutCanvas,
                {
                    type: "doughnut",

                    data: {
                        labels: [
                            "Pending",
                            "Assigned",
                            "Picked Up",
                            "In Transit",
                            "Delivered"
                        ],

                        datasets: [
                            {
                                data
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );

        window.deliveryDonut =
            deliveryDonut;
    }

    if (barCanvas) {
        const dailyData =
            getLastSevenDaysDeliveryData(
                deliveries
            );

        if (deliveryBar) {
            deliveryBar.destroy();
        }

        deliveryBar =
            new Chart(
                barCanvas,
                {
                    type: "bar",

                    data: {
                        labels:
                            dailyData.labels,

                        datasets: [
                            {
                                label:
                                    "Deliveries",

                                data:
                                    dailyData.data
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );

        window.deliveryBar =
            deliveryBar;
    }
}

function getLastSevenDaysDeliveryData(
    deliveries
) {
    const labels = [];
    const data = [];

    for (
        let i = 6;
        i >= 0;
        i--
    ) {
        const date =
            new Date();

        date.setDate(
            date.getDate() - i
        );

        const key =
            date.toISOString()
                .slice(0, 10);

        labels.push(
            date.toLocaleDateString(
                "en-NG",
                {
                    weekday: "short"
                }
            )
        );

        const count =
            deliveries.filter(
                delivery => {
                    const dateValue =
                        delivery.updatedAt ||
                        delivery.createdAt;

                    if (!dateValue) {
                        return false;
                    }

                    return (
                        new Date(
                            dateValue
                        )
                            .toISOString()
                            .slice(0, 10) ===
                        key
                    );
                }
            ).length;

        data.push(count);
    }

    return {
        labels,
        data
    };
}


/* =========================================================
   CUSTOMERS
   ========================================================= */

function renderCustomers() {
    const container =
        document.getElementById(
            "customerList"
        );

    if (!container) return;

    const deliveries =
        getVisibleDeliveries();

    const customers = {};

    deliveries.forEach(
        delivery => {
            const key =
                delivery.phone ||
                delivery.customer ||
                "Unknown";

            if (!customers[key]) {
                customers[key] = {
                    name:
                        delivery.customer ||
                        "Unknown",
                    phone:
                        delivery.phone ||
                        "-",
                    orders: 0
                };
            }

            customers[key].orders++;
        }
    );

    const entries =
        Object.values(
            customers
        );

    if (!entries.length) {
        container.innerHTML = `
            <p>No customers yet.</p>
        `;
        return;
    }

    container.innerHTML =
        entries.map(
            customer => `
                <div class="customer-item">

                    <strong>
                        ${escapeHtml(
                            customer.name
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            customer.phone
                        )}
                    </span>

                    <span>
                        ${customer.orders}
                        order(s)
                    </span>

                </div>
            `
        ).join("");
}


/* =========================================================
   RIDERS / DRIVERS
   ========================================================= */

function renderDrivers() {
    const container =
        document.getElementById(
            "driverList"
        );

    if (!container) return;

    const riders =
        getRiders();

    if (!riders.length) {
        container.innerHTML = `
            <p>No riders registered.</p>
        `;
        return;
    }

    container.innerHTML =
        riders.map(
            rider => {
                const financials =
                    getRiderWeeklyFinancials(
                        rider.id
                    );

                return `
                    <div class="driver-item">

                        <strong>
                            ${escapeHtml(
                                `${rider.firstName || ""} ${rider.lastName || ""}`.trim()
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                rider.id
                            )}
                        </span>

                        <span>
                            ${escapeHtml(
                                rider.phone
                            )}
                        </span>

                        <span>
                            Weekly:
                            ${formatCurrency(
                                financials.netEarnings
                            )}
                        </span>

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   TRACKING
   ========================================================= */

function track() {
    const input =
        document.getElementById(
            "trackId"
        );

    const result =
        document.getElementById(
            "trackingResult"
        );

    if (!input || !result) {
        return;
    }

    const id =
        input.value
            .trim()
            .toUpperCase();

    if (!id) {
        result.innerHTML = `
            <p>
                Enter a delivery ID.
            </p>
        `;
        return;
    }

    const delivery =
        getDeliveries().find(
            item =>
                String(
                    item.id
                ).toUpperCase() ===
                id
        );

    if (!delivery) {
        result.innerHTML = `
            <p>
                Delivery not found.
            </p>
        `;
        return;
    }

    if (
        isRider() &&
        delivery.riderId !==
            getCurrentUser().id
    ) {
        result.innerHTML = `
            <p>
                You do not have access to this delivery.
            </p>
        `;
        return;
    }

    const history =
        Array.isArray(
            delivery.history
        )
            ? delivery.history
            : [];

    result.innerHTML = `
        <div class="tracking-card">

            <h3>
                ${escapeHtml(
                    delivery.id
                )}
            </h3>

            <p>
                <strong>Customer:</strong>
                ${escapeHtml(
                    delivery.customer || "-"
                )}
            </p>

            <p>
                <strong>Status:</strong>
                ${escapeHtml(
                    delivery.status || "-"
                )}
            </p>

            <p>
                <strong>Pickup:</strong>
                ${escapeHtml(
                    delivery.pickup || "-"
                )}
            </p>

            <p>
                <strong>Destination:</strong>
                ${escapeHtml(
                    delivery.destination || "-"
                )}
            </p>

            <p>
                <strong>Rider:</strong>
                ${escapeHtml(
                    getRiderName(
                        delivery.riderId
                    )
                )}
            </p>

            <h4>
                Delivery History
            </h4>

            <div class="tracking-history">

                ${
                    history.length
                        ? history.map(
                            item => `
                                <div>
                                    <strong>
                                        ${escapeHtml(
                                            item.status
                                        )}
                                    </strong>

                                    <span>
                                        ${formatDateTime(
                                            item.time
                                        )}
                                    </span>
                                </div>
                            `
                        ).join("")
                        : `
                            <p>
                                No history available.
                            </p>
                        `
                }

            </div>

        </div>
    `;
}


/* =========================================================
   ANALYTICS
   ========================================================= */

function renderAnalytics() {
    if (!isSuperAdmin()) {
        return;
    }

    const deliveries =
        getDeliveries();

    const delivered =
        deliveries.filter(
            d =>
                d.status ===
                "Delivered"
        ).length;

    const total =
        deliveries.length;

    const successRate =
        total > 0
            ? Math.round(
                (
                    delivered /
                    total
                ) * 100
            )
            : 0;

    const revenue =
        deliveries.reduce(
            (sum, delivery) =>
                sum +
                Number(
                    delivery.amount || 0
                ),
            0
        );

    const successElement =
        document.getElementById(
            "successRate"
        );

    const revenueElement =
        document.getElementById(
            "revenueStat"
        );

    if (successElement) {
        successElement.textContent =
            `${successRate}%`;
    }

    if (revenueElement) {
        revenueElement.textContent =
            formatCurrency(
                revenue
            );
    }
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function openPage(page) {
    const pages =
        document.querySelectorAll(
            ".page, section[data-page-section]"
        );

    pages.forEach(
        element => {
            const id =
                element.id;

            element.style.display =
                id === page
                    ? ""
                    : "none";
        }
    );

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            nav => {
                nav.classList.toggle(
                    "active",
                    nav.dataset.page ===
                        page
                );
            }
        );

    const pageInfo = {
        dashboard: {
            title:
                isSuperAdmin()
                    ? "Super Admin Dashboard"
                    : "Rider Dashboard",

            subtitle:
                "Overview of your delivery operations"
        },

        deliveries: {
            title:
                "Deliveries",

            subtitle:
                "Manage delivery orders"
        },

        tracking: {
            title:
                "Tracking",

            subtitle:
                "Track delivery status"
        },

        customers: {
            title:
                "Customers",

            subtitle:
                "View customer information"
        },

        drivers: {
            title:
                "Riders",

            subtitle:
                "Manage registered riders"
        },

        analytics: {
            title:
                "Analytics",

            subtitle:
                "View delivery performance"
        },

        attendance: {
            title:
                "Attendance",

            subtitle:
                "Monitor rider attendance"
        },

        settings: {
            title:
                "Settings",

            subtitle:
                "System settings"
        }
    };

    const info =
        pageInfo[page];

    if (info) {
        const title =
            document.getElementById(
                "pageTitle"
            );

        const subtitle =
            document.getElementById(
                "pageSubtitle"
            );

        if (title) {
            title.textContent =
                info.title;
        }

        if (subtitle) {
            subtitle.textContent =
                info.subtitle;
        }
    }

    if (page === "attendance") {
        renderAttendancePage();
    }

    if (page === "analytics") {
        renderAnalytics();
    }

    if (page === "dashboard") {
        renderRiderAttendanceCard();
        renderRiderEarningsCard();
        updateDashboardStats();
    }
}


/* =========================================================
   REFRESH EVERYTHING
   ========================================================= */

function refreshAllDeliveryViews() {
    renderDeliveries();
    renderRecentDeliveries();
    updateDashboardStats();
    renderCustomers();
    renderDrivers();
    renderAnalytics();
    renderRiderAttendanceCard();
    renderRiderEarningsCard();
    renderAttendancePage();
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {
    const search =
        document.getElementById(
            "search"
        );

    if (!search) return;

    search.addEventListener(
        "input",
        renderDeliveries
    );
}


/* =========================================================
   MODAL CLICK OUTSIDE
   ========================================================= */

function setupModalEvents() {
    const modal =
        document.getElementById(
            "deliveryModal"
        );

    if (!modal) return;

    modal.addEventListener(
        "click",
        event => {
            if (
                event.target ===
                modal
            ) {
                closeDeliveryModal();
            }
        }
    );
}


/* =========================================================
   FORM SUBMISSION
   ========================================================= */

function setupDeliveryForm() {
    const form =
        document.getElementById(
            "form"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        saveDelivery
    );
}


/* =========================================================
   NAVIGATION EVENT SETUP
   ========================================================= */

function setupNavigation() {
    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(
            element => {
                element.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        const page =
                            element.dataset.page;

                        if (!page) {
                            return;
                        }

                        openPage(page);
                    }
                );
            }
        );
}


/* =========================================================
   DELIVERY FILTER BUTTONS
   ========================================================= */

function setupDeliveryFilters() {
    document
        .querySelectorAll(
            "[data-delivery-filter]"
        )
        .forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        setDeliveryFilter(
                            button.dataset
                                .deliveryFilter
                        );
                    }
                );
            }
        );
}


/* =========================================================
   CLEAN OLD DEMO DATA
   =========================================================

   IMPORTANT:
   This removes the four old sample deliveries
   if they still exist in the browser's localStorage.

   It does NOT remove real deliveries.

   ========================================================= */

function removeOldDemoDeliveriesOnce() {
    const deliveries =
        getDeliveries();

    const demoIds = [
        "BR-10482",
        "BR-10481",
        "BR-10480",
        "BR-10479"
    ];

    const cleaned =
        deliveries.filter(
            delivery =>
                !demoIds.includes(
                    delivery.id
                )
        );

    if (
        cleaned.length !==
        deliveries.length
    ) {
        saveDeliveries(
            cleaned
        );
    }
}


/* =========================================================
   MIGRATE DELIVERY DATA
   ========================================================= */

function migrateDeliveryData() {
    const deliveries =
        getDeliveries();

    let changed = false;

    const migrated =
        deliveries.map(
            delivery => {
                const updated = {
                    ...delivery
                };

                if (
                    typeof updated.riderEarning !==
                    "number"
                ) {
                    updated.riderEarning =
                        Number(
                            updated.riderEarning ||
                            0
                        );

                    changed = true;
                }

                /*
                 * Older delivered orders may not
                 * have deliveredAt.
                 *
                 * Use the previous updatedAt /
                 * createdAt as a fallback.
                 */
                if (
                    updated.status ===
                        "Delivered" &&
                    !updated.deliveredAt
                ) {
                    updated.deliveredAt =
                        updated.updatedAt ||
                        updated.createdAt ||
                        "";

                    changed = true;
                }

                if (
                    !Array.isArray(
                        updated.history
                    )
                ) {
                    updated.history = [];

                    changed = true;
                }

                return updated;
            }
        );

    if (changed) {
        saveDeliveries(
            migrated
        );
    }
}


/* =========================================================
   MIGRATE ATTENDANCE DATA
   ========================================================= */

function migrateAttendanceData() {
    const records =
        getAttendance();

    let changed = false;

    const migrated =
        records.map(
            record => {
                const updated = {
                    ...record
                };

                if (
                    updated.checkIn &&
                    !updated.checkInTimestamp
                ) {
                    /*
                     * Older records may only contain
                     * the date/time strings. We keep
                     * them intact and use 0 duration
                     * until a proper timestamp exists.
                     */
                    updated.durationMinutes =
                        Number(
                            updated.durationMinutes ||
                            0
                        );

                    changed = true;
                }

                if (
                    updated.checkOut &&
                    !updated.checkOutTimestamp
                ) {
                    updated.durationMinutes =
                        Number(
                            updated.durationMinutes ||
                            0
                        );

                    changed = true;
                }

                if (
                    updated.checkInFee ===
                    undefined
                ) {
                    updated.checkInFee =
                        DAILY_CHECK_IN_FEE;

                    updated.feeApplied =
                        true;

                    changed = true;
                }

                return updated;
            }
        );

    if (changed) {
        saveAttendance(
            migrated
        );
    }
}


/* =========================================================
   SESSION RESTORE
   ========================================================= */

function restoreSession() {
    const loggedIn =
        sessionStorage.getItem(
            "blackRabbitLoggedIn"
        );

    const user =
        getCurrentUser();

    const authScreen =
        document.getElementById(
            "authScreen"
        );

    const mainApp =
        document.getElementById(
            "mainApp"
        );

    if (
        loggedIn === "true" &&
        user
    ) {
        currentRole =
            user.role === "super_admin"
                ? "admin"
                : "rider";

        if (authScreen) {
            authScreen.style.display =
                "none";
        }

        if (mainApp) {
            mainApp.style.display =
                "block";
        }

        updateUserInterface();
        configureRoleInterface();
        refreshAllDeliveryViews();
        openPage("dashboard");
    } else {
        if (authScreen) {
            authScreen.style.display =
                "flex";
        }

        if (mainApp) {
            mainApp.style.display =
                "none";
        }

        selectRole("rider");
    }
}


/* =========================================================
   KEYBOARD SUPPORT
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Escape"
        ) {
            closeDeliveryModal();
        }
    }
);


/* =========================================================
   DOM CONTENT LOADED
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        /*
         * IMPORTANT:
         * This only creates an empty delivery
         * array when no delivery data exists.
         *
         * It does NOT seed demo deliveries.
         */
        initializeDeliveries();

        /*
         * Remove the old four demo records
         * if they were created by an older
         * version of the system.
         */
        removeOldDemoDeliveriesOnce();

        /*
         * Update older records to support
         * deliveredAt and other fields.
         */
        migrateDeliveryData();
        migrateAttendanceData();

        setupSearch();
        setupModalEvents();
        setupDeliveryForm();
        setupNavigation();
        setupDeliveryFilters();

        const form =
            document.getElementById(
                "form"
            );

        if (form) {
            form.addEventListener(
                "submit",
                saveDelivery
            );
        }

        /*
         * Make sure the default page
         * starts correctly.
         */
        restoreSession();
    }
);


/* =========================================================
   WINDOW FUNCTIONS
   Make functions available to inline
   onclick handlers in index.html.
   ========================================================= */

window.selectRole =
    selectRole;

window.togglePassword =
    togglePassword;

window.registerRider =
    registerRider;

window.riderLogin =
    riderLogin;

window.adminLogin =
    adminLogin;

window.logout =
    logout;

window.riderCheckIn =
    riderCheckIn;

window.riderCheckOut =
    riderCheckOut;

window.openPage =
    openPage;

window.openNewDelivery =
    openNewDelivery;

window.openEditDelivery =
    openEditDelivery;

window.closeDeliveryModal =
    closeDeliveryModal;

window.saveDelivery =
    saveDelivery;

window.updateDeliveryStatus =
    updateDeliveryStatus;

window.setDeliveryFilter =
    setDeliveryFilter;

window.filterAttendance =
    filterAttendance;

window.track =
    track;

window.renderAttendancePage =
    renderAttendancePage;

window.renderDeliveries =
    renderDeliveries;

window.refreshAllDeliveryViews =
    refreshAllDeliveryViews;


/* =========================================================
   END OF SCRIPT
   ========================================================= */
