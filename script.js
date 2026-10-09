
/*
 * BLACK RABBIT LOGISTICS — DASHBOARD SCRIPT
 * Version: 2.0
 *
 * Firebase cloud sync remains in index.html.
 * This file handles the dashboard, local data, login,
 * deliveries, rider attendance, GPS geofencing, and reports.
 *
 * IMPORTANT:
 * 1. Load this file only once in index.html.
 * 2. Keep the existing Firebase sync block in index.html.
 * 3. Use Firestore security rules before production deployment.
 */

(function () {
    "use strict";

    // Prevent accidental double initialization.
    if (window.BlackRabbitDashboardLoaded) {
        console.warn("Black Rabbit dashboard script is already loaded.");
        return;
    }

    window.BlackRabbitDashboardLoaded = true;

    // --------------------------------------------------
    // CONFIGURATION
    // --------------------------------------------------

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

    // Preserve your existing localStorage keys.
    const STORAGE_KEYS = {
        riders: "blackRabbitRiders",
        deliveries: "blackRabbitDeliveries",
        attendance: "blackRabbitAttendance",
        payments: "blackRabbitRiderPayments",
        loggedIn: "blackRabbitLoggedIn",
        currentUser: "blackRabbitCurrentUser"
    };

    const $ = (id) => document.getElementById(id);

    const money = (amount) =>
        "₦" + Number(amount || 0).toLocaleString("en-NG", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

    const makeId = (prefix) =>
        prefix + "-" + Date.now().toString(36).toUpperCase() +
        "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

    const todayKey = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const dateTime = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleString("en-NG", {
                dateStyle: "medium",
                timeStyle: "short"
            });
    };

    const dateOnly = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleDateString("en-NG");
    };

    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return fallback;
            return JSON.parse(value);
        } catch (error) {
            console.error("Unable to read local data:", key, error);
            return fallback;
        }
    }

    /*
     * Save using the original keys. The custom event helps
     * compatible sync code in index.html detect changes.
     */
    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));

            window.dispatchEvent(new CustomEvent("blackrabbit:data-changed", {
                detail: {
                    key,
                    value,
                    timestamp: Date.now()
                }
            }));

            return true;
        } catch (error) {
            console.error("Unable to save local data:", key, error);
            alert("Your browser could not save this change. Check available storage.");
            return false;
        }
    }

    function getRiders() {
        const value = readJSON(STORAGE_KEYS.riders, []);
        return Array.isArray(value) ? value : [];
    }

    function saveRiders(value) {
        return saveJSON(STORAGE_KEYS.riders, value);
    }

    function getDeliveries() {
        const value = readJSON(STORAGE_KEYS.deliveries, []);
        return Array.isArray(value) ? value : [];
    }

    function saveDeliveries(value) {
        return saveJSON(STORAGE_KEYS.deliveries, value);
    }

    function getAttendance() {
        const value = readJSON(STORAGE_KEYS.attendance, []);
        return Array.isArray(value) ? value : [];
    }

    function saveAttendance(value) {
        return saveJSON(STORAGE_KEYS.attendance, value);
    }

    function getPayments() {
        const value = readJSON(STORAGE_KEYS.payments, []);
        return Array.isArray(value) ? value : [];
    }

    function savePayments(value) {
        return saveJSON(STORAGE_KEYS.payments, value);
    }

    function getCurrentUser() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEYS.currentUser) ||
                localStorage.getItem(STORAGE_KEYS.currentUser);

            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function setCurrentUser(user) {
        const serialized = JSON.stringify(user);

        sessionStorage.setItem(STORAGE_KEYS.currentUser, serialized);
        localStorage.setItem(STORAGE_KEYS.currentUser, serialized);
        localStorage.setItem(STORAGE_KEYS.loggedIn, "true");
    }

    function clearCurrentUser() {
        sessionStorage.removeItem(STORAGE_KEYS.currentUser);
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        localStorage.setItem(STORAGE_KEYS.loggedIn, "false");
    }

    function isAdmin(user = getCurrentUser()) {
        return Boolean(user && (
            user.role === "super_admin" ||
            user.role === "admin"
        ));
    }

    function currentRiderId() {
        const user = getCurrentUser();
        return user ? String(user.id || user.riderId || user.phone || "") : "";
    }

    function riderName(rider) {
        return [
            rider.firstName || rider.firstname || "",
            rider.lastName || rider.lastname || ""
        ].join(" ").trim() ||
            rider.name ||
            rider.fullName ||
            rider.phone ||
            "Unnamed rider";
    }

    function findRider(id) {
        return getRiders().find((rider) =>
            String(rider.id || rider.phone) === String(id)
        );
    }

    function normalizeStatus(status) {
        const value = String(status || "Pending").trim().toLowerCase();

        if (["delivered", "complete", "completed"].includes(value)) {
            return "Delivered";
        }

        if (["in transit", "in-transit", "on the way", "on-the-way"].includes(value)) {
            return "In Transit";
        }

        if (["picked up", "picked-up", "pickup"].includes(value)) {
            return "Picked Up";
        }

        if (["cancelled", "canceled"].includes(value)) {
            return "Cancelled";
        }

        return "Pending";
    }

    function statusBadge(status) {
        const normalized = normalizeStatus(status);
        const css = normalized.toLowerCase().replace(/\s+/g, "-");

        return `<span class="status-badge status-${css}">${escapeHTML(normalized)}</span>`;
    }

    function notify(message) {
        // Use an existing notification area if one is available.
        const target = $("toast") || $("notification") || $("message");

        if (target) {
            target.textContent = message;
            target.style.display = "block";
            target.setAttribute("role", "status");

            window.setTimeout(() => {
                target.style.display = "none";
            }, 3500);
        } else {
            alert(message);
        }
    }

    // --------------------------------------------------
    // LOGIN AND REGISTRATION
    // --------------------------------------------------

    function showAuthScreen() {
        if ($("authScreen")) $("authScreen").style.display = "";
        if ($("mainApp")) $("mainApp").style.display = "none";
    }

    function showMainApp() {
        if ($("authScreen")) $("authScreen").style.display = "none";
        if ($("mainApp")) $("mainApp").style.display = "";
    }

    function login(phone, password) {
        phone = String(phone ?? $("loginPhone")?.value ??
            $("phone")?.value ?? "").trim();

        password = String(password ?? $("loginPassword")?.value ??
            $("password")?.value ?? "");

        if (!phone || !password) {
            notify("Enter your phone number and password.");
            return false;
        }

        if (phone === SUPER_ADMIN.phone && password === SUPER_ADMIN.password) {
            const admin = { ...SUPER_ADMIN };
            setCurrentUser(admin);
            showMainApp();
            initializeDashboard();
            notify("Welcome, Super Admin.");
            return true;
        }

        const rider = getRiders().find((item) =>
            String(item.phone || "").trim() === phone
        );

        if (!rider) {
            notify("Account not found. Please register or contact your administrator.");
            return false;
        }

        if (String(rider.password || "") !== password) {
            notify("Incorrect phone number or password.");
            return false;
        }

        if (rider.active === false || rider.status === "disabled") {
            notify("This account has been disabled. Contact your administrator.");
            return false;
        }

        const user = {
            ...rider,
            id: rider.id || rider.phone,
            role: rider.role || "rider"
        };

        setCurrentUser(user);
        showMainApp();
        initializeDashboard();
        notify("Login successful.");
        return true;
    }

    function registerRider(data) {
        data = data || {};

        const firstName = String(
            data.firstName ?? $("registerFirstName")?.value ??
            $("firstName")?.value ?? ""
        ).trim();

        const lastName = String(
            data.lastName ?? $("registerLastName")?.value ??
            $("lastName")?.value ?? ""
        ).trim();

        const phone = String(
            data.phone ?? $("registerPhone")?.value ??
            $("phone")?.value ?? ""
        ).trim();

        const password = String(
            data.password ?? $("registerPassword")?.value ??
            $("password")?.value ?? ""
        );

        if (!firstName || !lastName || !phone || !password) {
            notify("Complete all required registration fields.");
            return false;
        }

        if (phone === SUPER_ADMIN.phone) {
            notify("This phone number cannot be used for rider registration.");
            return false;
        }

        if (getRiders().some((rider) =>
            String(rider.phone).trim() === phone
        )) {
            notify("A rider account with this phone number already exists.");
            return false;
        }

        const rider = {
            id: makeId("RIDER"),
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            phone,
            password,
            role: "rider",
            active: true,
            status: "active",
            createdAt: new Date().toISOString()
        };

        const riders = getRiders();
        riders.push(rider);
        saveRiders(riders);

        notify("Registration successful. You can now log in.");
        return true;
    }

    function logout() {
        clearCurrentUser();
        showAuthScreen();
        notify("You have logged out.");
    }

    // --------------------------------------------------
    // OFFICE GPS / GEOFENCING
    // --------------------------------------------------

    function distanceInMeters(lat1, lon1, lat2, lon2) {
        const radians = (degrees) => degrees * Math.PI / 180;
        const earthRadius = 6371000;

        const dLat = radians(lat2 - lat1);
        const dLon = radians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(radians(lat1)) *
            Math.cos(radians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        return 2 * earthRadius *
            Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function getOfficePosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("This browser does not support GPS location."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    let message = "Unable to get your location.";

                    if (error.code === 1) {
                        message = "Location permission denied. Allow location access and try again.";
                    } else if (error.code === 2) {
                        message = "Your location is unavailable. Check your GPS.";
                    } else if (error.code === 3) {
                        message = "Getting your location timed out. Try again.";
                    }

                    reject(new Error(message));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        });
    }

    async function verifyOfficeLocation() {
        const position = await getOfficePosition();

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const distance = distanceInMeters(
            latitude,
            longitude,
            OFFICE.latitude,
            OFFICE.longitude
        );

        return {
            allowed: distance <= OFFICE.radiusMeters,
            distance: Math.round(distance),
            latitude,
            longitude,
            accuracy: Math.round(position.coords.accuracy || 0)
        };
    }

    // --------------------------------------------------
    // RIDER ATTENDANCE
    // --------------------------------------------------

    function getTodayAttendance(riderId) {
        return getAttendance().find((record) =>
            String(record.riderId) === String(riderId) &&
            record.date === todayKey()
        );
    }

    async function checkIn() {
        const user = getCurrentUser();

        if (!user || isAdmin(user)) {
            notify("Log in as a rider to check in.");
            return false;
        }

        const existing = getTodayAttendance(currentRiderId());

        if (existing && existing.checkInTime && !existing.checkOutTime) {
            notify("You have already checked in today.");
            return false;
        }

        try {
            notify("Checking your location...");

            const location = await verifyOfficeLocation();

            if (!location.allowed) {
                notify(
                    `You are approximately ${location.distance}m from the office. ` +
                    `You must be within ${OFFICE.radiusMeters}m to check in.`
                );
                return false;
            }

            const now = new Date().toISOString();
            const records = getAttendance();

            let record = records.find((item) =>
                String(item.riderId) === currentRiderId() &&
                item.date === todayKey()
            );

            if (record && record.checkInTime && !record.checkOutTime) {
                notify("You have already checked in today.");
                return false;
            }

            if (record) {
                record.checkInTime = now;
                record.checkOutTime = null;
                record.checkInLatitude = location.latitude;
                record.checkInLongitude = location.longitude;
                record.checkInDistance = location.distance;
                record.checkInFee = DAILY_CHECKIN_FEE;
            } else {
                record = {
                    id: makeId("ATT"),
                    riderId: currentRiderId(),
                    riderName: riderName(user),
                    date: todayKey(),
                    checkInTime: now,
                    checkOutTime: null,
                    checkInLatitude: location.latitude,
                    checkInLongitude: location.longitude,
                    checkInDistance: location.distance,
                    checkInFee: DAILY_CHECKIN_FEE
                };

                records.push(record);
            }

            saveAttendance(records);
            renderAttendance();
            renderRiderAttendance();
            renderDashboard();
            notify("Check-in successful. Your attendance has been recorded.");
            return true;
        } catch (error) {
            notify(error.message || "Unable to verify your office location.");
            return false;
        }
    }

    async function checkOut() {
        const user = getCurrentUser();

        if (!user || isAdmin(user)) {
            notify("Log in as a rider to check out.");
            return false;
        }

        const record = getTodayAttendance(currentRiderId());

        if (!record || !record.checkInTime) {
            notify("You must check in before checking out.");
            return false;
        }

        if (record.checkOutTime) {
            notify("You have already checked out today.");
            return false;
        }

        try {
            notify("Checking your location...");

            const location = await verifyOfficeLocation();

            if (!location.allowed) {
                notify(
                    `You are approximately ${location.distance}m from the office. ` +
                    `You must be within ${OFFICE.radiusMeters}m to check out.`
                );
                return false;
            }

            const records = getAttendance();
            const index = records.findIndex((item) =>
                item.id === record.id
            );

            if (index === -1) {
                notify("Attendance record not found.");
                return false;
            }

            records[index].checkOutTime = new Date().toISOString();
            records[index].checkOutLatitude = location.latitude;
            records[index].checkOutLongitude = location.longitude;
            records[index].checkOutDistance = location.distance;

            saveAttendance(records);
            renderAttendance();
            renderRiderAttendance();
            renderDashboard();
            notify("Check-out successful.");
            return true;
        } catch (error) {
            notify(error.message || "Unable to verify your office location.");
            return false;
        }
    }

    function renderRiderAttendance() {
        const user = getCurrentUser();
        if (!user || isAdmin(user)) return;

        const record = getTodayAttendance(currentRiderId());

        const statusElement = $("riderAttendanceStatus");
        const checkInElement = $("riderCheckInTime");
        const checkOutElement = $("riderCheckOutTime");
        const feeElement = $("riderCheckInFee");
        const checkInButton = $("checkInButton");
        const checkOutButton = $("checkOutButton");

        if (statusElement) {
            statusElement.textContent = !record || !record.checkInTime
                ? "Not checked in"
                : record.checkOutTime
                    ? "Checked out"
                    : "Checked in";
        }

        if (checkInElement) {
            checkInElement.textContent = record
                ? dateTime(record.checkInTime)
                : "—";
        }

        if (checkOutElement) {
            checkOutElement.textContent = record
                ? dateTime(record.checkOutTime)
                : "—";
        }

        if (feeElement) {
            feeElement.textContent = money(record?.checkInFee || 0);
        }

        if (checkInButton) {
            checkInButton.disabled = Boolean(
                record && record.checkInTime && !record.checkOutTime
            );
        }

        if (checkOutButton) {
            checkOutButton.disabled = !(
                record && record.checkInTime && !record.checkOutTime
            );
        }
    }

    function renderAttendance() {
        const tbody = $("attendanceRows");
        if (!tbody) return;

        const searchTerm = String($("attendanceSearch")?.value || "")
            .trim().toLowerCase();

        const records = getAttendance()
            .filter((record) => {
                const name = record.riderName ||
                    riderName(findRider(record.riderId) || {});
                const phone = findRider(record.riderId)?.phone || "";

                return `${name} ${phone} ${record.date}`
                    .toLowerCase().includes(searchTerm);
            })
            .sort((a, b) =>
                String(b.date || "").localeCompare(String(a.date || ""))
            );

        if (!records.length) {
            tbody.innerHTML = `<tr><td colspan="7">No attendance records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = records.map((record) => {
            const rider = findRider(record.riderId);
            const name = record.riderName || riderName(rider || {});
            const status = record.checkOutTime
                ? "Checked Out"
                : record.checkInTime
                    ? "Checked In"
                    : "Absent";

            return `
                <tr>
                    <td>${escapeHTML(name)}</td>
                    <td>${escapeHTML(rider?.phone || "—")}</td>
                    <td>${escapeHTML(dateOnly(record.date))}</td>
                    <td>${escapeHTML(dateTime(record.checkInTime))}</td>
                    <td>${escapeHTML(dateTime(record.checkOutTime))}</td>
                    <td>${money(record.checkInFee || 0)}</td>
                    <td>${escapeHTML(status)}</td>
                </tr>`;
        }).join("");
    }

    // --------------------------------------------------
    // WEEKLY RIDER PERFORMANCE AND EARNINGS
    // --------------------------------------------------

    function getWeekStart(date = new Date()) {
        const start = new Date(date);
        const day = start.getDay();
        const daysSinceMonday = (day + 6) % 7;

        start.setDate(start.getDate() - daysSinceMonday);
        start.setHours(0, 0, 0, 0);

        return start;
    }

    function isThisWeek(dateString) {
        if (!dateString) return false;

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return false;

        const start = getWeekStart();
        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        return date >= start && date < end;
    }

    function getDeliveryEarning(delivery) {
        return Number(
            delivery.riderEarning ??
            delivery.riderFee ??
            delivery.driverEarning ??
            0
        ) || 0;
    }

    function getDeliveryDate(delivery) {
        return delivery.deliveredAt ||
            delivery.completedAt ||
            delivery.createdAt ||
            delivery.date ||
            "";
    }

    function getWeeklyRiderStats(rider) {
        const riderId = String(rider.id || rider.phone);
        const deliveries = getDeliveries().filter((delivery) => {
            const assignedRider = String(
                delivery.riderId ??
                delivery.rider ??
                delivery.driverId ??
                ""
            );

            const status = normalizeStatus(delivery.status);

            return assignedRider === riderId &&
                status === "Delivered" &&
                isThisWeek(getDeliveryDate(delivery));
        });

        const deliveryEarnings = deliveries.reduce(
            (sum, delivery) => sum + getDeliveryEarning(delivery), 0
        );

        const attendanceFees = getAttendance()
            .filter((record) =>
                String(record.riderId) === riderId &&
                isThisWeek(record.date)
            )
            .reduce((sum, record) =>
                sum + Number(record.checkInFee || 0), 0
            );

        const payments = getPayments()
            .filter((payment) =>
                String(payment.riderId || payment.rider || "") === riderId &&
                isThisWeek(payment.date || payment.createdAt)
            )
            .reduce((sum, payment) =>
                sum + Number(payment.amount || 0), 0
            );

        return {
            deliveries: deliveries.length,
            deliveryEarnings,
            attendanceFees,
            payments,
            netEarnings: deliveryEarnings - payments
        };
    }

    function renderWeeklyEarnings() {
        const tbody =
            $("weeklyEarningsRows") ||
            $("riderEarningsRows") ||
            $("earningsRows");

        if (!tbody) return;

        const riders = getRiders();

        if (!riders.length) {
            tbody.innerHTML = `<tr><td colspan="6">No riders registered.</td></tr>`;
            return;
        }

        const stats = riders.map((rider) => ({
            rider,
            ...getWeeklyRiderStats(rider)
        })).sort((a, b) =>
            b.deliveries - a.deliveries ||
            b.deliveryEarnings - a.deliveryEarnings
        );

        tbody.innerHTML = stats.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(riderName(item.rider))}</td>
                <td>${escapeHTML(item.rider.phone || "—")}</td>
                <td>${item.deliveries}</td>
                <td>${money(item.deliveryEarnings)}</td>
                <td>${money(item.netEarnings)}</td>
            </tr>
        `).join("");

        const topRider = stats[0];

        if ($("topRiderName")) {
            $("topRiderName").textContent =
                topRider ? riderName(topRider.rider) : "—";
        }

        if ($("topRiderDeliveries")) {
            $("topRiderDeliveries").textContent =
                topRider ? String(topRider.deliveries) : "0";
        }

        if ($("topRiderRevenue")) {
            $("topRiderRevenue").textContent =
                topRider ? money(topRider.deliveryEarnings) : money(0);
        }
    }

    // --------------------------------------------------
    // DELIVERY MANAGEMENT
    // --------------------------------------------------

    function getFormValue(id) {
        return String($(id)?.value ?? "").trim();
    }

    function getDeliveryFormData() {
        const riderId = getFormValue("deliveryRider");

        const existingRider = findRider(riderId);

        return {
            customer: getFormValue("deliveryCustomer"),
            customerName: getFormValue("deliveryCustomer"),
            phone: getFormValue("deliveryPhone"),
            pickup: getFormValue("deliveryPickup"),
            destination: getFormValue("deliveryDestination"),
            package: getFormValue("deliveryPackage"),
            amount: Number(getFormValue("deliveryAmount") || 0),
            riderEarning: Number(getFormValue("deliveryRiderEarning") || 0),
            status: normalizeStatus(getFormValue("deliveryStatus")),
            riderId: riderId,
            riderName: existingRider ? riderName(existingRider) : "",
            notes: getFormValue("deliveryNotes")
        };
    }

    function resetDeliveryForm() {
        if ($("form")) $("form").reset();
        if ($("deliveryEditId")) $("deliveryEditId").value = "";
        if ($("modalTitle")) $("modalTitle").textContent = "New Delivery";
        if ($("modalDescription")) {
            $("modalDescription").textContent = "Enter the delivery details below.";
        }
        if ($("saveDeliveryButton")) {
            $("saveDeliveryButton").textContent = "Save Delivery";
        }
        if ($("deliveryHistory")) $("deliveryHistory").innerHTML = "";
    }

    function openDeliveryModal(deliveryId) {
        if (!isAdmin()) {
            notify("Only an administrator can create or edit deliveries.");
            return;
        }

        resetDeliveryForm();

        const modal = $("modal");
        if (!modal) {
            notify("Delivery form modal was not found in the HTML.");
            return;
        }

        if (deliveryId) {
            const delivery = getDeliveries().find((item) =>
                String(item.id) === String(deliveryId)
            );

            if (!delivery) {
                notify("Delivery not found.");
                return;
            }

            if ($("deliveryEditId")) $("deliveryEditId").value = delivery.id;
            if ($("deliveryCustomer")) {
                $("deliveryCustomer").value =
                    delivery.customer ?? delivery.customerName ?? "";
            }
            if ($("deliveryPhone")) $("deliveryPhone").value = delivery.phone || "";
            if ($("deliveryPickup")) $("deliveryPickup").value = delivery.pickup || "";
            if ($("deliveryDestination")) {
                $("deliveryDestination").value = delivery.destination || "";
            }
            if ($("deliveryPackage")) $("deliveryPackage").value = delivery.package || "";
            if ($("deliveryAmount")) $("deliveryAmount").value = delivery.amount || 0;
            if ($("deliveryRiderEarning")) {
                $("deliveryRiderEarning").value = getDeliveryEarning(delivery);
            }
            if ($("deliveryStatus")) {
                $("deliveryStatus").value = normalizeStatus(delivery.status);
            }
            if ($("deliveryRider")) {
                $("deliveryRider").value =
                    delivery.riderId ?? delivery.rider ?? "";
            }
            if ($("deliveryNotes")) $("deliveryNotes").value = delivery.notes || "";

            if ($("modalTitle")) $("modalTitle").textContent = "Edit Delivery";
            if ($("saveDeliveryButton")) {
                $("saveDeliveryButton").textContent = "Update Delivery";
            }

            renderDeliveryHistory(delivery);
        }

        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
    }

    function closeDeliveryModal() {
        const modal = $("modal");
        if (modal) {
            modal.style.display = "none";
            modal.setAttribute("aria-hidden", "true");
        }
        resetDeliveryForm();
    }

    function saveDelivery(event) {
        if (event) event.preventDefault();

        if (!isAdmin()) {
            notify("Only an administrator can save deliveries.");
            return false;
        }

        const data = getDeliveryFormData();

        if (!data.customer || !data.phone || !data.pickup || !data.destination) {
            notify("Complete the customer, phone, pickup, and destination fields.");
            return false;
        }

        if (data.amount < 0 || data.riderEarning < 0) {
            notify("Amounts cannot be negative.");
            return false;
        }

        const deliveries = getDeliveries();
        const editId = getFormValue("deliveryEditId");
        const now = new Date().toISOString();

        if (editId) {
            const index = deliveries.findIndex((item) =>
                String(item.id) === String(editId)
            );

            if (index === -1) {
                notify("The delivery you are editing could not be found.");
                return false;
            }

            const previous = deliveries[index];

            deliveries[index] = {
                ...previous,
                ...data,
                id: previous.id,
                createdAt: previous.createdAt || now,
                updatedAt: now,
                history: [
                    ...(Array.isArray(previous.history) ? previous.history : []),
                    {
                        status: data.status,
                        timestamp: now,
                        note: "Delivery updated"
                    }
                ]
            };

            if (data.status === "Delivered" && !previous.deliveredAt) {
                deliveries[index].deliveredAt = now;
            }
        } else {
            const id = makeId("BRL");

            deliveries.unshift({
                ...data,
                id,
                trackingId: id,
                createdAt: now,
                updatedAt: now,
                deliveredAt: data.status === "Delivered" ? now : null,
                history: [{
                    status: data.status,
                    timestamp: now,
                    note: "Delivery created"
                }]
            });
        }

        if (!saveDeliveries(deliveries)) return false;

        closeDeliveryModal();
        renderAll();
        notify(editId ? "Delivery updated successfully." : "Delivery created successfully.");
        return true;
    }

    function updateDeliveryStatus(deliveryId, newStatus) {
        if (!isAdmin()) {
            notify("Only an administrator can update delivery status.");
            return false;
        }

        const deliveries = getDeliveries();
        const index = deliveries.findIndex((item) =>
            String(item.id) === String(deliveryId)
        );

        if (index === -1) {
            notify("Delivery not found.");
            return false;
        }

        const now = new Date().toISOString();
        const status = normalizeStatus(newStatus);
        const delivery = deliveries[index];

        delivery.status = status;
        delivery.updatedAt = now;

        if (status === "Delivered") {
            delivery.deliveredAt = delivery.deliveredAt || now;
        }

        if (!Array.isArray(delivery.history)) delivery.history = [];

        delivery.history.push({
            status,
            timestamp: now,
            note: `Status changed to ${status}`
        });

        saveDeliveries(deliveries);
        renderAll();
        notify("Delivery status updated.");
        return true;
    }

    function deleteDelivery(deliveryId) {
        if (!isAdmin()) {
            notify("Only an administrator can delete deliveries.");
            return false;
        }

        if (!confirm("Are you sure you want to delete this delivery?")) {
            return false;
        }

        const deliveries = getDeliveries().filter((item) =>
            String(item.id) !== String(deliveryId)
        );

        saveDeliveries(deliveries);
        renderAll();
        notify("Delivery deleted.");
        return true;
    }

    function renderDeliveryHistory(delivery) {
        const target = $("deliveryHistory");
        if (!target) return;

        const history = Array.isArray(delivery.history)
            ? delivery.history
            : [];

        if (!history.length) {
            target.innerHTML = "<p>No delivery history available.</p>";
            return;
        }

        target.innerHTML = history.map((entry) => `
            <div class="history-item">
                <strong>${escapeHTML(entry.status || "Update")}</strong>
                <small>${escapeHTML(dateTime(entry.timestamp))}</small>
                <p>${escapeHTML(entry.note || "")}</p>
            </div>
        `).join("");
    }

    function renderDeliveryRiderOptions() {
        const select = $("deliveryRider");
        if (!select) return;

        const selected = select.value;
        const riders = getRiders();

        select.innerHTML =
            `<option value="">Select rider</option>` +
            riders.filter((rider) =>
                rider.active !== false && rider.status !== "disabled"
            ).map((rider) => `
                <option value="${escapeHTML(rider.id || rider.phone)}">
                    ${escapeHTML(riderName(rider))}
                </option>
            `).join("");

        if (selected) select.value = selected;
    }

    function renderDeliveries() {
        const tbody = $("allRows");
        if (!tbody) return;

        const search = String($("search")?.value || "")
            .trim().toLowerCase();

        const deliveries = getDeliveries().filter((delivery) => {
            const rider = findRider(
                delivery.riderId ?? delivery.rider ?? ""
            );

            const content = [
                delivery.id,
                delivery.trackingId,
                delivery.customer,
                delivery.customerName,
                delivery.phone,
                delivery.pickup,
                delivery.destination,
                delivery.package,
                delivery.status,
                delivery.riderName,
                rider ? riderName(rider) : ""
            ].join(" ").toLowerCase();

            return content.includes(search);
        });

        if (!deliveries.length) {
            tbody.innerHTML = `<tr><td colspan="9">No deliveries found.</td></tr>`;
            return;
        }

        tbody.innerHTML = deliveries.map((delivery) => {
            const rider = findRider(
                delivery.riderId ?? delivery.rider ?? ""
            );

            const name = delivery.riderName ||
                (rider ? riderName(rider) : "Unassigned");

            const actions = isAdmin()
                ? `
                    <button type="button" onclick="editDelivery('${escapeHTML(delivery.id)}')">Edit</button>
                    <button type="button" onclick="removeDelivery('${escapeHTML(delivery.id)}')">Delete</button>
                `
                : "";

            return `
                <tr>
                    <td>${escapeHTML(delivery.id || delivery.trackingId || "—")}</td>
                    <td>${escapeHTML(delivery.customer || delivery.customerName || "—")}</td>
                    <td>${escapeHTML(delivery.phone || "—")}</td>
                    <td>${escapeHTML(delivery.pickup || "—")}</td>
                    <td>${escapeHTML(delivery.destination || "—")}</td>
                    <td>${escapeHTML(name)}</td>
                    <td>${money(delivery.amount)}</td>
                    <td>${statusBadge(delivery.status)}</td>
                    <td>${actions}</td>
                </tr>`;
        }).join("");
    }

    // --------------------------------------------------
    // TRACKING
    // --------------------------------------------------

    function trackDelivery() {
        const input = $("trackId");
        const result = $("trackingResult") || $("track");

        const trackingId = String(input?.value || "").trim().toLowerCase();

        if (!trackingId) {
            notify("Enter a tracking ID.");
            return;
        }

        const delivery = getDeliveries().find((item) =>
            String(item.trackingId || item.id || "").toLowerCase() === trackingId
        );

        if (!delivery) {
            if (result) {
                result.innerHTML = "<p>No delivery found with that tracking ID.</p>";
            } else {
                notify("No delivery found with that tracking ID.");
            }
            return;
        }

        const rider = findRider(
            delivery.riderId ?? delivery.rider ?? ""
        );

        const history = Array.isArray(delivery.history)
            ? delivery.history
            : [];

        const historyHTML = history.map((entry) => `
            <li>
                <strong>${escapeHTML(entry.status || "Update")}</strong>
                <span>${escapeHTML(dateTime(entry.timestamp))}</span>
                <p>${escapeHTML(entry.note || "")}</p>
            </li>
        `).join("");

        const html = `
            <div class="tracking-card">
                <h3>Tracking: ${escapeHTML(delivery.trackingId || delivery.id)}</h3>
                <p><strong>Customer:</strong> ${escapeHTML(delivery.customer || delivery.customerName || "—")}</p>
                <p><strong>Pickup:</strong> ${escapeHTML(delivery.pickup || "—")}</p>
                <p><strong>Destination:</strong> ${escapeHTML(delivery.destination || "—")}</p>
                <p><strong>Rider:</strong> ${escapeHTML(delivery.riderName || (rider ? riderName(rider) : "Not assigned"))}</p>
                <p><strong>Status:</strong> ${statusBadge(delivery.status)}</p>
                <h4>Delivery history</h4>
                <ul>${historyHTML || "<li>No history available.</li>"}</ul>
            </div>`;

        if (result) result.innerHTML = html;
    }

    // --------------------------------------------------
    // CUSTOMERS AND RIDERS LISTS
    // --------------------------------------------------

    function renderCustomers() {
        const target = $("customerList");
        if (!target) return;

        const customers = new Map();

        getDeliveries().forEach((delivery) => {
            const phone = String(delivery.phone || "").trim();
            if (!phone) return;

            if (!customers.has(phone)) {
                customers.set(phone, {
                    name: delivery.customer || delivery.customerName || "Customer",
                    phone,
                    deliveries: 0,
                    totalSpent: 0
                });
            }

            const customer = customers.get(phone);
            customer.deliveries += 1;
            customer.totalSpent += Number(delivery.amount || 0);
        });

        const values = Array.from(customers.values());

        if (!values.length) {
            target.innerHTML = "<p>No customers recorded yet.</p>";
            return;
        }

        target.innerHTML = values.map((customer) => `
            <div class="customer-card">
                <h3>${escapeHTML(customer.name)}</h3>
                <p>${escapeHTML(customer.phone)}</p>
                <p>Deliveries: ${customer.deliveries}</p>
                <p>Total delivery value: ${money(customer.totalSpent)}</p>
            </div>
        `).join("");
    }

    function renderDrivers() {
        const target = $("driverList");
        if (!target) return;

        const riders = getRiders();

        if (!riders.length) {
            target.innerHTML = "<p>No riders registered yet.</p>";
            return;
        }

        target.innerHTML = riders.map((rider) => {
            const weekly = getWeeklyRiderStats(rider);

            return `
                <div class="driver-card">
                    <h3>${escapeHTML(riderName(rider))}</h3>
                    <p>Phone: ${escapeHTML(rider.phone || "—")}</p>
                    <p>Status: ${escapeHTML(rider.status || "active")}</p>
                    <p>Deliveries this week: ${weekly.deliveries}</p>
                    <p>Earnings this week: ${money(weekly.deliveryEarnings)}</p>
                    ${isAdmin() ? `
                        <button type="button"
                            onclick="toggleRiderStatus('${escapeHTML(rider.id || rider.phone)}')">
                            ${rider.active === false || rider.status === "disabled"
                                ? "Enable rider"
                                : "Disable rider"}
                        </button>
                    ` : ""}
                </div>`;
        }).join("");
    }

    function toggleRiderStatus(riderId) {
        if (!isAdmin()) {
            notify("Only an administrator can change rider status.");
            return;
        }

        const riders = getRiders();
        const index = riders.findIndex((rider) =>
            String(rider.id || rider.phone) === String(riderId)
        );

        if (index === -1) {
            notify("Rider not found.");
            return;
        }

        const disabled = riders[index].active === false ||
            riders[index].status === "disabled";

        riders[index].active = disabled;
        riders[index].status = disabled ? "active" : "disabled";

        saveRiders(riders);
        renderAll();
        notify(disabled ? "Rider enabled." : "Rider disabled.");
    }

    // --------------------------------------------------
    // DASHBOARD STATISTICS AND CHARTS
    // --------------------------------------------------

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = String(value);
    }

    function renderDashboard() {
        const deliveries = getDeliveries();

        const total = deliveries.length;
        const delivered = deliveries.filter((item) =>
            normalizeStatus(item.status) === "Delivered"
        ).length;
        const transit = deliveries.filter((item) =>
            normalizeStatus(item.status) === "In Transit" ||
            normalizeStatus(item.status) === "Picked Up"
        ).length;
        const pending = deliveries.filter((item) =>
            normalizeStatus(item.status) === "Pending"
        ).length;

        const revenue = deliveries
            .filter((item) => normalizeStatus(item.status) === "Delivered")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const successRate = total ? Math.round((delivered / total) * 100) : 0;
        const deliveredPercent = total ? Math.round((delivered / total) * 100) : 0;
        const transitPercent = total ? Math.round((transit / total) * 100) : 0;
        const pendingPercent = total ? Math.round((pending / total) * 100) : 0;

        setText("totalDeliveriesStat", total);
        setText("inTransitStat", transit);
        setText("deliveredStat", delivered);
        setText("pendingStat", pending);
        setText("donutTotal", total);
        setText("revenueStat", money(revenue));
        setText("successRate", `${successRate}%`);
        setText("deliveredPercent", `${deliveredPercent}%`);
        setText("transitPercent", `${transitPercent}%`);
        setText("pendingPercent", `${pendingPercent}%`);

        renderRecentDeliveries();
        renderCharts();
    }

    function renderRecentDeliveries() {
        const tbody = $("recent");
        if (!tbody) return;

        const deliveries = getDeliveries()
            .slice()
            .sort((a, b) =>
                String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
            )
            .slice(0, 6);

        if (!deliveries.length) {
            tbody.innerHTML = `<tr><td colspan="6">No recent deliveries.</td></tr>`;
            return;
        }

        tbody.innerHTML = deliveries.map((delivery) => `
            <tr>
                <td>${escapeHTML(delivery.id || delivery.trackingId || "—")}</td>
                <td>${escapeHTML(delivery.customer || delivery.customerName || "—")}</td>
                <td>${escapeHTML(delivery.destination || "—")}</td>
                <td>${money(delivery.amount)}</td>
                <td>${statusBadge(delivery.status)}</td>
                <td>${escapeHTML(dateOnly(delivery.createdAt))}</td>
            </tr>
        `).join("");
    }

    const chartInstances = {};

    function destroyChart(name) {
        if (chartInstances[name]) {
            chartInstances[name].destroy();
            delete chartInstances[name];
        }
    }

    function renderCharts() {
        if (typeof window.Chart !== "function") return;

        const deliveries = getDeliveries();

        const lineCanvas = $("line");
        if (lineCanvas) {
            destroyChart("line");

            const labels = [];
            const totals = [];
            const revenue = [];

            for (let offset = 6; offset >= 0; offset--) {
                const date = new Date();
                date.setDate(date.getDate() - offset);

                const key = [
                    date.getFullYear(),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    String(date.getDate()).padStart(2, "0")
                ].join("-");

                const dayDeliveries = deliveries.filter((delivery) => {
                    const value = delivery.createdAt || delivery.date || "";
                    return value && todayKeyForDate(new Date(value)) === key;
                });

                labels.push(date.toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short"
                }));

                totals.push(dayDeliveries.length);

                revenue.push(dayDeliveries
                    .filter((delivery) => normalizeStatus(delivery.status) === "Delivered")
                    .reduce((sum, delivery) => sum + Number(delivery.amount || 0), 0));
            }

            chartInstances.line = new Chart(lineCanvas, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Deliveries",
                            data: totals,
                            tension: 0.35
                        },
                        {
                            label: "Revenue (₦)",
                            data: revenue,
                            tension: 0.35
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        const donutCanvas = $("donut");
        if (donutCanvas) {
            destroyChart("donut");

            chartInstances.donut = new Chart(donutCanvas, {
                type: "doughnut",
                data: {
                    labels: ["Delivered", "In Transit", "Pending"],
                    datasets: [{
                        data: [
                            deliveries.filter((item) =>
                                normalizeStatus(item.status) === "Delivered"
                            ).length,
                            deliveries.filter((item) =>
                                ["In Transit", "Picked Up"].includes(normalizeStatus(item.status))
                            ).length,
                            deliveries.filter((item) =>
                                normalizeStatus(item.status) === "Pending"
                            ).length
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        const barCanvas = $("bar");
        if (barCanvas) {
            destroyChart("bar");

            const stats = getRiders().map((rider) => ({
                name: riderName(rider),
                deliveries: getWeeklyRiderStats(rider).deliveries
            })).sort((a, b) => b.deliveries - a.deliveries).slice(0, 8);

            chartInstances.bar = new Chart(barCanvas, {
                type: "bar",
                data: {
                    labels: stats.map((item) => item.name),
                    datasets: [{
                        label: "Deliveries this week",
                        data: stats.map((item) => item.deliveries)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: "y"
                }
            });
        }
    }

    function todayKeyForDate(date) {
        if (Number.isNaN(date.getTime())) return "";

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    // --------------------------------------------------
    // NAVIGATION AND ACCESS CONTROL
    // --------------------------------------------------

    function showSection(sectionName) {
        const targetName = String(sectionName || "").trim();
        if (!targetName) return;

        const sections = document.querySelectorAll(
            "[data-section], .page-section, .dashboard-section"
        );

        let matched = false;

        sections.forEach((section) => {
            const name = section.dataset.section ||
                section.id ||
                section.dataset.page;

            const visible = name === targetName ||
                section.id === targetName ||
                section.id === `${targetName}Section`;

            section.style.display = visible ? "" : "none";
            if (visible) matched = true;
        });

        if (!matched && $(targetName)) {
            $(targetName).style.display = "";
        }

        document.querySelectorAll("[data-nav]").forEach((item) => {
            item.classList.toggle(
                "active",
                item.dataset.nav === targetName
            );
        });

        if ($("title")) {
            const activeItem = document.querySelector(
                `[data-nav="${CSS.escape(targetName)}"]`
            );

            if (activeItem) {
                $("title").textContent =
                    activeItem.textContent.trim() || targetName;
            }
        }

        if ($("sub")) {
            $("sub").textContent = "";
        }

        if (targetName.toLowerCase().includes("attendance")) {
            renderAttendance();
            renderRiderAttendance();
        }

        if (targetName.toLowerCase().includes("earning") ||
            targetName.toLowerCase().includes("performance")) {
            renderWeeklyEarnings();
        }

        if (targetName.toLowerCase().includes("rider") ||
            targetName.toLowerCase().includes("driver")) {
            renderDrivers();
        }

        if (targetName.toLowerCase().includes("customer")) {
            renderCustomers();
        }

        if (targetName.toLowerCase().includes("deliver")) {
            renderDeliveries();
        }
    }

    function applyRolePermissions() {
        const user = getCurrentUser();
        const admin = isAdmin(user);

        document.querySelectorAll("[data-admin-only]").forEach((element) => {
            element.style.display = admin ? "" : "none";
        });

        document.querySelectorAll("[data-rider-only]").forEach((element) => {
            element.style.display = user && !admin ? "" : "none";
        });

        if ($("menu")) {
            $("menu").dataset.role = admin ? "admin" : "rider";
        }
    }

    // --------------------------------------------------
    // RENDERING
    // --------------------------------------------------

    function renderAll() {
        renderDashboard();
        renderDeliveries();
        renderAttendance();
        renderRiderAttendance();
        renderWeeklyEarnings();
        renderCustomers();
        renderDrivers();
        renderDeliveryRiderOptions();
        applyRolePermissions();
    }

    function initializeDashboard() {
        const user = getCurrentUser();

        if (!user) {
            showAuthScreen();
            return;
        }

        showMainApp();
        applyRolePermissions();
        renderAll();

        if ($("menu")) {
            $("menu").setAttribute("aria-label", "Dashboard navigation");
        }
    }

    // --------------------------------------------------
    // EVENT LISTENERS
    // --------------------------------------------------

    function bindEvents() {
        // Login form: support common existing IDs.
        const loginForm = $("loginForm");
        if (loginForm) {
            loginForm.addEventListener("submit", (event) => {
                event.preventDefault();
                login();
            });
        }

        const loginButton = $("loginButton") || $("loginBtn");
        if (loginButton && !loginForm) {
            loginButton.addEventListener("click", (event) => {
                event.preventDefault();
                login();
            });
        }

        // Registration form.
        const registrationForm = $("registerForm") || $("registrationForm");
        if (registrationForm) {
            registrationForm.addEventListener("submit", (event) => {
                event.preventDefault();

                if (registerRider()) {
                    registrationForm.reset();
                }
            });
        }

        const registerButton = $("registerButton") || $("registerBtn");
        if (registerButton && !registrationForm) {
            registerButton.addEventListener("click", (event) => {
                event.preventDefault();
                registerRider();
            });
        }

        // Delivery form and modal.
        const deliveryForm = $("form");
        if (deliveryForm) {
            deliveryForm.addEventListener("submit", saveDelivery);
        }

        const closeButton = $("close");
        if (closeButton) {
            closeButton.addEventListener("click", closeDeliveryModal);
        }

        const saveButton = $("saveDeliveryButton");
        if (saveButton && !deliveryForm) {
            saveButton.addEventListener("click", saveDelivery);
        }

        const search = $("search");
        if (search) {
            search.addEventListener("input", renderDeliveries);
        }

        const attendanceSearch = $("attendanceSearch");
        if (attendanceSearch) {
            attendanceSearch.addEventListener("input", renderAttendance);
        }

        const trackingButton = $("track");
        if (trackingButton && trackingButton.tagName === "BUTTON") {
            trackingButton.addEventListener("click", trackDelivery);
        }

        const trackingForm = $("trackingForm");
        if (trackingForm) {
            trackingForm.addEventListener("submit", (event) => {
                event.preventDefault();
                trackDelivery();
            });
        }

        const checkInButton = $("checkInButton");
        if (checkInButton) {
            checkInButton.addEventListener("click", checkIn);
        }

        const checkOutButton = $("checkOutButton");
        if (checkOutButton) {
            checkOutButton.addEventListener("click", checkOut);
        }

        const logoutButton = $("logoutButton") || $("logoutBtn");
        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }

        // Generic navigation links.
        document.querySelectorAll("[data-nav]").forEach((element) => {
            element.addEventListener("click", (event) => {
                event.preventDefault();
                showSection(element.dataset.nav);
            });
        });

        // Optional menu toggle.
        const menuButton = $("menuButton") || $("menuToggle");
        if (menuButton && $("sidebar")) {
            menuButton.addEventListener("click", () => {
                $("sidebar").classList.toggle("open");
            });
        }

        // Click outside the modal to close it.
        const modal = $("modal");
        if (modal) {
            modal.addEventListener("click", (event) => {
                if (event.target === modal) closeDeliveryModal();
            });
        }

        // Refresh this tab when another tab changes local storage.
        window.addEventListener("storage", (event) => {
            if (Object.values(STORAGE_KEYS).includes(event.key)) {
                renderAll();
            }
        });

        // Sync code in index.html may dispatch this event.
        window.addEventListener("blackrabbit:data-changed", (event) => {
            const key = event.detail?.key;

            if (!key || Object.values(STORAGE_KEYS).includes(key)) {
                renderAll();
            }
        });

        // Support legacy HTML elements with inline onclick handlers.
        document.addEventListener("click", (event) => {
            const element = event.target.closest("[data-action]");
            if (!element) return;

            const action = element.dataset.action;

            if (action === "new-delivery") openDeliveryModal();
            if (action === "logout") logout();
            if (action === "check-in") checkIn();
            if (action === "check-out") checkOut();
            if (action === "track") trackDelivery();
        });
    }

    // --------------------------------------------------
    // GLOBAL FUNCTIONS FOR EXISTING HTML BUTTONS
    // --------------------------------------------------

    window.login = login;
    window.registerRider = registerRider;
    window.logout = logout;

    window.checkIn = checkIn;
    window.checkOut = checkOut;

    window.openDeliveryModal = openDeliveryModal;
    window.closeDeliveryModal = closeDeliveryModal;
    window.saveDelivery = saveDelivery;
    window.editDelivery = (id) => openDeliveryModal(id);
    window.removeDelivery = deleteDelivery;
    window.deleteDelivery = deleteDelivery;
    window.updateDeliveryStatus = updateDeliveryStatus;

    window.trackDelivery = trackDelivery;
    window.showSection = showSection;
    window.renderAll = renderAll;
    window.renderDashboard = renderDashboard;
    window.renderDeliveries = renderDeliveries;
    window.renderAttendance = renderAttendance;
    window.renderWeeklyEarnings = renderWeeklyEarnings;
    window.renderCustomers = renderCustomers;
    window.renderDrivers = renderDrivers;
    window.toggleRiderStatus = toggleRiderStatus;

    // Optional compatibility aliases.
    window.openModal = openDeliveryModal;
    window.closeModal = closeDeliveryModal;

    // --------------------------------------------------
    // STARTUP
    // --------------------------------------------------

    function start() {
        bindEvents();

        // Initialize missing data keys without replacing existing records.
        if (localStorage.getItem(STORAGE_KEYS.riders) === null) {
            saveRiders([]);
        }

        if (localStorage.getItem(STORAGE_KEYS.deliveries) === null) {
            saveDeliveries([]);
        }

        if (localStorage.getItem(STORAGE_KEYS.attendance) === null) {
            saveAttendance([]);
        }

        if (localStorage.getItem(STORAGE_KEYS.payments) === null) {
            savePayments([]);
        }

        initializeDashboard();
        console.info("Black Rabbit Logistics dashboard initialized.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
