
const SUPER_ADMIN = {
    phone: "08000000000",
    password: "Admin@123",
    firstName: "Super",
    lastName: "Admin",
    role: "super_admin",
    id: "SUPER-ADMIN"
};

let currentRole = "rider";
let editingDeliveryId = null;
let deliveryFilter = "All";

let deliveryLineChart = null;
let deliveryDonut = null;
let deliveryBar = null;




const OFFICE_LATITUDE = 10.5366473;
const OFFICE_LONGITUDE = 7.4682503;

const CHECK_IN_RADIUS_METERS = 200;

const DAILY_CHECK_IN_FEE = 1000;


function selectRole(role) {

    currentRole = role;

    const riderRoleBtn = document.getElementById("riderRoleBtn");
    const adminRoleBtn = document.getElementById("adminRoleBtn");
    const riderLoginForm = document.getElementById("riderLoginForm");
    const adminLoginForm = document.getElementById("adminLoginForm");
    const registerForm = document.getElementById("registerForm");

    if (riderRoleBtn) {
        riderRoleBtn.classList.toggle("active", role === "rider");
    }

    if (adminRoleBtn) {
        adminRoleBtn.classList.toggle("active", role === "admin");
    }

    if (riderLoginForm) {
        riderLoginForm.classList.toggle(
            "hidden-auth",
            role !== "rider"
        );
    }

    if (adminLoginForm) {
        adminLoginForm.classList.toggle(
            "hidden-auth",
            role !== "admin"
        );
    }

    if (registerForm) {
        registerForm.classList.add("hidden-auth");
    }

    clearMessages();
}


function clearMessages() {

    document
        .querySelectorAll(".auth-message")
        .forEach(function (element) {

            element.className = "auth-message";
            element.textContent = "";

        });

}


function togglePassword(id, button) {

    const input = document.getElementById(id);

    if (!input) {
        return;
    }

    if (input.type === "password") {

        input.type = "text";

        button.textContent = "Hide";

    } else {

        input.type = "password";

        button.textContent = "Show";

    }

}


function showAuthMessage(id, message, type) {

    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        "auth-message show " + type;
}


function normalizePhone(phone) {

    let value = String(phone || "")
        .replace(/\D/g, "");

    if (value.startsWith("234")) {

        value =
            "0" +
            value.substring(3);

    }

    return value;
}



function showRegister() {

    selectRole("rider");

    const loginForm =
        document.getElementById("riderLoginForm");

    const registerForm =
        document.getElementById("registerForm");

    if (loginForm) {
        loginForm.classList.add("hidden-auth");
    }

    if (registerForm) {
        registerForm.classList.remove("hidden-auth");
    }
}


function showLogin() {

    const registerForm =
        document.getElementById("registerForm");

    const riderLoginForm =
        document.getElementById("riderLoginForm");

    const adminLoginForm =
        document.getElementById("adminLoginForm");

    if (registerForm) {
        registerForm.classList.add("hidden-auth");
    }

    if (riderLoginForm) {
        riderLoginForm.classList.remove("hidden-auth");
    }

    if (adminLoginForm) {
        adminLoginForm.classList.add("hidden-auth");
    }

    const riderRoleBtn =
        document.getElementById("riderRoleBtn");

    const adminRoleBtn =
        document.getElementById("adminRoleBtn");

    if (riderRoleBtn) {
        riderRoleBtn.classList.add("active");
    }

    if (adminRoleBtn) {
        adminRoleBtn.classList.remove("active");
    }

    currentRole = "rider";

    clearMessages();
}


function getRiders() {

    return JSON.parse(
        localStorage.getItem(
            "blackRabbitRiders"
        ) || "[]"
    );
}


function saveRiders(riders) {

    localStorage.setItem(
        "blackRabbitRiders",
        JSON.stringify(riders)
    );
}


function registerRider() {

    const firstName =
        document.getElementById("regFirstName")?.value.trim();

    const lastName =
        document.getElementById("regLastName")?.value.trim();

    const phone =
        normalizePhone(
            document.getElementById("regPhone")?.value
        );

    const password =
        document.getElementById("regPassword")?.value;

    const terms =
        document.getElementById("regTerms")?.checked;


    if (
        !firstName ||
        !lastName ||
        !phone ||
        !password
    ) {

        showAuthMessage(
            "registerMessage",
            "Please complete all required fields.",
            "error"
        );

        return;
    }


    if (phone.length !== 11) {

        showAuthMessage(
            "registerMessage",
            "Please enter a valid Nigerian phone number.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showAuthMessage(
            "registerMessage",
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (!terms) {

        showAuthMessage(
            "registerMessage",
            "Please agree to the rider terms and conditions.",
            "error"
        );

        return;
    }


    const existing = getRiders();

    const phoneExists =
        existing.some(function (rider) {

            return normalizePhone(rider.phone) === phone;

        });


    if (phoneExists) {

        showAuthMessage(
            "registerMessage",
            "A rider with this phone number already exists.",
            "error"
        );

        return;
    }


    const rider = {

        id:
            "BR-RDR-" +
            String(existing.length + 1).padStart(4, "0"),

        firstName,
        lastName,
        phone,
        password,

        role: "rider",

        createdAt:
            new Date().toISOString()

    };


    existing.push(rider);

    saveRiders(existing);


    showAuthMessage(
        "registerMessage",

        "Registration successful! Your Rider ID is " +
        rider.id +
        ". You can now login.",

        "success"
    );


    setTimeout(function () {

        showLogin();

        const loginPhone =
            document.getElementById("loginPhone");

        if (loginPhone) {
            loginPhone.value = phone;
        }

    }, 1500);
}



function riderLogin() {

    const phone =
        normalizePhone(
            document.getElementById("loginPhone")?.value
        );

    const password =
        document.getElementById("loginPassword")?.value;

    const riders = getRiders();

    const rider =
        riders.find(function (user) {

            return (
                normalizePhone(user.phone) === phone &&
                user.password === password
            );

        });


    if (!rider) {

        showAuthMessage(
            "loginMessage",
            "Invalid rider phone number or password.",
            "error"
        );

        return;
    }


    loginSuccess(rider);
}


function adminLogin() {

    const phone =
        normalizePhone(
            document.getElementById("adminPhone")?.value
        );

    const password =
        document.getElementById("adminPassword")?.value;


    if (
        phone !== SUPER_ADMIN.phone ||
        password !== SUPER_ADMIN.password
    ) {

        showAuthMessage(
            "adminMessage",
            "Invalid Super Admin credentials.",
            "error"
        );

        return;
    }


    loginSuccess(SUPER_ADMIN);
}


/* =====================================================
   LOGIN SUCCESS
===================================================== */

function loginSuccess(user) {

    sessionStorage.setItem(
        "blackRabbitLoggedIn",
        "true"
    );

    sessionStorage.setItem(
        "blackRabbitCurrentUser",
        JSON.stringify(user)
    );


    const authScreen =
        document.getElementById("authScreen");

    const mainApp =
        document.getElementById("mainApp");

    if (authScreen) {
        authScreen.style.display = "none";
    }

    if (mainApp) {
        mainApp.style.display = "flex";
    }


    updateUserInformation(user);
    configureRoleInterface(user);

    refreshAllDeliveryViews();

    renderRiderAttendanceCard();
    renderRiderEarningsCard();

    openPage("dashboard");
}


/* =====================================================
   USER INFORMATION
===================================================== */

function updateUserInformation(user) {

    const first =
        user.firstName || "User";

    const last =
        user.lastName || "";


    const initials =
        (
            first.charAt(0) +
            last.charAt(0)
        ).toUpperCase();


    const sidebarAvatar =
        document.getElementById("sidebarAvatar");

    const headerAvatar =
        document.getElementById("headerAvatar");

    if (sidebarAvatar) {
        sidebarAvatar.textContent =
            initials || "U";
    }

    if (headerAvatar) {
        headerAvatar.textContent =
            initials || "U";
    }


    const roleText =
        user.role === "super_admin"
            ? "Super Admin"
            : "Rider";


    const sidebarUser =
        document.getElementById("sidebarUser");

    if (sidebarUser) {

        sidebarUser.innerHTML =
            escapeHtml(first) +
            " " +
            escapeHtml(last) +
            "<small>" +
            roleText +
            "</small>";

    }


    const sub =
        document.getElementById("sub");

    if (sub) {

        sub.textContent =
            "Welcome back, " +
            first +
            ". Here's what's happening today.";

    }
}


function configureRoleInterface(user) {

    const adminOnlyPages = [
        "customers",
        "drivers",
        "analytics"
    ];


    adminOnlyPages.forEach(function (pageName) {

        const button =
            document.querySelector(
                `[data-page="${pageName}"]`
            );

        if (button) {

            button.style.display =
                user.role === "rider"
                    ? "none"
                    : "";

        }

    });
}


function forgotPassword(event) {

    if (event) {
        event.preventDefault();
    }

    showAuthMessage(
        "loginMessage",
        "Password recovery will be connected to the backend later.",
        "success"
    );
}


function logout() {

    sessionStorage.removeItem(
        "blackRabbitLoggedIn"
    );

    sessionStorage.removeItem(
        "blackRabbitCurrentUser"
    );


    const mainApp =
        document.getElementById("mainApp");

    const authScreen =
        document.getElementById("authScreen");

    if (mainApp) {
        mainApp.style.display = "none";
    }

    if (authScreen) {
        authScreen.style.display = "flex";
    }


    const loginPhone =
        document.getElementById("loginPhone");

    const loginPassword =
        document.getElementById("loginPassword");

    if (loginPhone) {
        loginPhone.value = "";
    }

    if (loginPassword) {
        loginPassword.value = "";
    }


    showLogin();
}




function getCurrentUser() {

    return JSON.parse(
        sessionStorage.getItem(
            "blackRabbitCurrentUser"
        ) || "null"
    );
}


function getAttendance() {

    return JSON.parse(
        localStorage.getItem(
            "blackRabbitAttendance"
        ) || "[]"
    );
}


function saveAttendance(records) {

    localStorage.setItem(
        "blackRabbitAttendance",
        JSON.stringify(records)
    );
}




function getToday() {

    const now = new Date();

    return (
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0")
    );
}


function getCurrentTime() {

    return new Date().toLocaleTimeString(
        "en-NG",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );
}


function getCurrentTimestamp() {

    return new Date().toISOString();
}


function getRiderTodayAttendance() {

    const user = getCurrentUser();

    if (
        !user ||
        user.role !== "rider"
    ) {
        return null;
    }

    const records = getAttendance();

    return records.find(function (record) {

        return (
            record.riderId === user.id &&
            record.date === getToday()
        );

    }) || null;
}


/* =====================================================
   ATTENDANCE DURATION
===================================================== */

function calculateDurationMinutes(
    checkInTimestamp,
    checkOutTimestamp
) {

    if (
        !checkInTimestamp ||
        !checkOutTimestamp
    ) {
        return 0;
    }


    const start =
        new Date(checkInTimestamp);

    const end =
        new Date(checkOutTimestamp);


    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {
        return 0;
    }


    return Math.max(
        0,
        Math.round(
            (end.getTime() - start.getTime()) /
            60000
        )
    );
}


function formatDuration(minutes) {

    const value =
        Number(minutes || 0);

    if (value <= 0) {
        return "-";
    }


    const hours =
        Math.floor(value / 60);

    const mins =
        value % 60;


    if (hours === 0) {
        return mins + " min";
    }


    if (mins === 0) {
        return hours + " hr";
    }


    return (
        hours +
        " hr " +
        mins +
        " min"
    );
}



function getDistanceInMeters(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadius = 6371000;

    const toRadians = function (value) {
        return value * Math.PI / 180;
    };

    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);


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



function riderCheckIn() {

    const user = getCurrentUser();


    if (
        !user ||
        user.role !== "rider"
    ) {

        alert(
            "Only riders can check in."
        );

        return;
    }


    const records = getAttendance();

    const today = getToday();


    const existing =
        records.find(function (record) {

            return (
                record.riderId === user.id &&
                record.date === today
            );

        });


    if (existing) {

        alert(
            "You have already checked in today."
        );

        return;
    }


    if (!navigator.geolocation) {

        alert(
            "Location services are not available on this device. Please enable GPS/location services."
        );

        return;
    }


    const button =
        document.querySelector(
            "#riderAttendanceCard .attendance-btn"
        );


    if (button) {

        button.disabled = true;
        button.textContent =
            "Checking location...";

    }


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;


            const distance =
                getDistanceInMeters(
                    latitude,
                    longitude,
                    OFFICE_LATITUDE,
                    OFFICE_LONGITUDE
                );


            if (
                distance >
                CHECK_IN_RADIUS_METERS
            ) {

                if (button) {

                    button.disabled = false;

                    button.textContent =
                        "✓ Check In";

                }


                alert(
                    "Check-in denied.\n\n" +
                    "You are approximately " +
                    Math.round(distance) +
                    " meters from the office.\n\n" +
                    "You must be within " +
                    CHECK_IN_RADIUS_METERS +
                    " meters of the office."
                );

                return;
            }


            const timestamp =
                getCurrentTimestamp();


            const attendance = {

                id:
                    "ATT-" +
                    Date.now(),

                riderId:
                    user.id,

                riderName:
                    user.firstName +
                    " " +
                    user.lastName,

                phone:
                    user.phone,

                date:
                    today,

                checkIn:
                    getCurrentTime(),

                checkInTimestamp:
                    timestamp,

                checkOut:
                    "",

                checkOutTimestamp:
                    "",

                durationMinutes:
                    0,

                status:
                    "Present",

                checkInFee:
                    DAILY_CHECK_IN_FEE,

                feeApplied:
                    true,

                latitude:
                    latitude,

                longitude:
                    longitude,

                locationAccuracy:
                    Math.round(accuracy),

                distanceFromOffice:
                    Math.round(distance)

            };


            records.push(attendance);

            saveAttendance(records);


            renderRiderAttendanceCard();
            renderRiderEarningsCard();
            renderAttendancePage();


            alert(
                "Check-in successful at " +
                attendance.checkIn +
                ".\n\n" +
                "Distance from office: " +
                Math.round(distance) +
                " meters.\n\n" +
                "Daily check-in fee: ₦" +
                formatMoney(
                    DAILY_CHECK_IN_FEE
                )
            );

        },


        function (error) {

            if (button) {

                button.disabled = false;

                button.textContent =
                    "✓ Check In";

            }


            let message =
                "Unable to verify your location.";


            if (error.code === 1) {

                message =
                    "Location permission was denied. Please allow location access for this website and try again.";

            } else if (error.code === 2) {

                message =
                    "Your location could not be determined. Make sure GPS/location services are enabled.";

            } else if (error.code === 3) {

                message =
                    "Location request timed out. Move to an area with better GPS/network reception and try again.";

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




function riderCheckOut() {

    const user = getCurrentUser();


    if (
        !user ||
        user.role !== "rider"
    ) {

        alert(
            "Only riders can check out."
        );

        return;
    }


    const records = getAttendance();


    const attendance =
        records.find(function (record) {

            return (
                record.riderId === user.id &&
                record.date === getToday()
            );

        });


    if (!attendance) {

        alert(
            "You must check in before checking out."
        );

        return;
    }


    if (attendance.checkOut) {

        alert(
            "You have already checked out today."
        );

        return;
    }


    const checkoutTimestamp =
        getCurrentTimestamp();


    attendance.checkOut =
        getCurrentTime();

    attendance.checkOutTimestamp =
        checkoutTimestamp;

    attendance.durationMinutes =
        calculateDurationMinutes(
            attendance.checkInTimestamp,
            checkoutTimestamp
        );

    attendance.status =
        "Checked Out";


    saveAttendance(records);


    renderRiderAttendanceCard();
    renderRiderEarningsCard();
    renderAttendancePage();


    alert(
        "Check-out successful at " +
        attendance.checkOut +
        ".\n\n" +
        "Attendance duration: " +
        formatDuration(
            attendance.durationMinutes
        )
    );
}



function getWeekStart(dateValue) {

    const date =
        new Date(
            dateValue || new Date()
        );

    date.setHours(
        0,
        0,
        0,
        0
    );


    const day =
        date.getDay();


    const diff =
        day === 0
            ? -6
            : 1 - day;


    date.setDate(
        date.getDate() + diff
    );


    return date;
}


function getWeekEnd(dateValue) {

    const start =
        getWeekStart(dateValue);


    const end =
        new Date(start);


    end.setDate(
        end.getDate() + 6
    );


    end.setHours(
        23,
        59,
        59,
        999
    );


    return end;
}


function getWeekLabel() {

    const start =
        getWeekStart();

    const end =
        getWeekEnd();


    return (
        start.toLocaleDateString(
            "en-NG",
            {
                day: "numeric",
                month: "short"
            }
        ) +
        " - " +
        end.toLocaleDateString(
            "en-NG",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        )
    );
}


/* =====================================================
   DELIVERY DATE FOR WEEKLY EARNINGS
===================================================== */

function getDeliveryCompletionDate(delivery) {

    return new Date(
        delivery.deliveredAt ||
        delivery.updatedAt ||
        delivery.createdAt
    );
}


function getRiderWeeklyFinancials(riderId) {

    const start =
        getWeekStart();

    const end =
        getWeekEnd();


    const deliveries =
        getDeliveries().filter(
            function (delivery) {

                if (
                    delivery.riderId !== riderId ||
                    delivery.status !== "Delivered"
                ) {

                    return false;
                }


                const date =
                    getDeliveryCompletionDate(
                        delivery
                    );


                return (
                    date >= start &&
                    date <= end
                );

            }
        );


    const grossEarnings =
        deliveries.reduce(
            function (total, delivery) {

                return (
                    total +
                    Number(
                        delivery.riderEarning || 0
                    )
                );

            },
            0
        );


    const attendance =
        getAttendance().filter(
            function (record) {

                if (
                    record.riderId !== riderId ||
                    !record.date
                ) {

                    return false;
                }


                const date =
                    new Date(
                        record.date +
                        "T00:00:00"
                    );


                return (
                    date >= start &&
                    date <= end &&
                    record.feeApplied !== false
                );

            }
        );


    const checkInFees =
        attendance.reduce(
            function (total, record) {

                return (
                    total +
                    Number(
                        record.checkInFee ||
                        DAILY_CHECK_IN_FEE
                    )
                );

            },
            0
        );


    return {

        grossEarnings,

        checkInFees,

        netEarnings:
            grossEarnings -
            checkInFees,

        deliveryCount:
            deliveries.length,

        checkInCount:
            attendance.length

    };
}


function renderRiderEarningsCard() {

    const container =
        document.getElementById(
            "riderEarningsCard"
        );


    if (!container) {
        return;
    }


    const user =
        getCurrentUser();


    if (
        !user ||
        user.role !== "rider"
    ) {

        container.innerHTML = "";

        return;
    }


    const financials =
        getRiderWeeklyFinancials(
            user.id
        );


    container.innerHTML = `

        <div class="card">

            <div class="head">

                <div>

                    <h2>
                        My Weekly Earnings
                    </h2>

                    <p>
                        Monday - Sunday ·
                        ${getWeekLabel()}
                    </p>

                </div>

                <span class="status present">
                    ${financials.deliveryCount}
                    delivered
                </span>

            </div>


            <div class="earnings-grid">

                <div class="earning-box">

                    <small>
                        TOTAL EARNINGS
                    </small>

                    <strong>
                        ₦${formatMoney(
                            financials.grossEarnings
                        )}
                    </strong>

                </div>


                <div class="earning-box">

                    <small>
                        CHECK-IN FEES
                    </small>

                    <strong>
                        ₦${formatMoney(
                            financials.checkInFees
                        )}
                    </strong>

                </div>


                <div class="earning-box net">

                    <small>
                        NET EARNINGS
                    </small>

                    <strong>
                        ₦${formatMoney(
                            financials.netEarnings
                        )}
                    </strong>

                </div>

            </div>


            <div class="location-note">

                Daily office check-in fee:
                <strong>
                    ₦${formatMoney(
                        DAILY_CHECK_IN_FEE
                    )}
                </strong>.

                A fee is recorded once per successful
                check-in day.

            </div>

        </div>

    `;
}


/* =====================================================
   RIDER ATTENDANCE CARD
===================================================== */

function renderRiderAttendanceCard() {

    const container =
        document.getElementById(
            "riderAttendanceCard"
        );


    if (!container) {
        return;
    }


    const user =
        getCurrentUser();


    if (
        !user ||
        user.role !== "rider"
    ) {

        container.innerHTML = "";

        return;
    }


    const attendance =
        getRiderTodayAttendance();


    if (!attendance) {

        container.innerHTML = `

            <div class="card rider-attendance-card">

                <div class="attendance-top">

                    <div>

                        <div class="attendance-label">
                            TODAY'S ATTENDANCE
                        </div>

                        <div class="attendance-title">
                            Not Checked In
                        </div>

                        <div class="attendance-description">
                            Check in when you start your duty.
                            You must be within 200 meters
                            of the office. A successful
                            check-in records a ₦1,000
                            daily fee.
                        </div>

                    </div>

                    <span class="attendance-status">
                        Not Checked In
                    </span>

                </div>


                <div class="attendance-actions">

                    <button
                        type="button"
                        class="attendance-btn"
                        onclick="riderCheckIn()"
                    >
                        ✓ Check In
                    </button>

                </div>

            </div>

        `;

        return;
    }


    const duration =
        attendance.checkOut
            ? formatDuration(
                attendance.durationMinutes
            )
            : "In Progress";


    if (attendance.checkOut) {

        container.innerHTML = `

            <div class="card rider-attendance-card">

                <div class="attendance-top">

                    <div>

                        <div class="attendance-label">
                            TODAY'S ATTENDANCE
                        </div>

                        <div class="attendance-title">
                            Attendance Complete
                        </div>

                        <div class="attendance-description">
                            Your attendance for today
                            has been completed.
                        </div>

                    </div>

                    <span class="attendance-status">
                        Checked Out
                    </span>

                </div>


                <div class="attendance-details">

                    <div class="attendance-detail">

                        <small>DATE</small>

                        <strong>
                            ${attendance.date}
                        </strong>

                    </div>


                    <div class="attendance-detail">

                        <small>CHECK IN</small>

                        <strong>
                            ${attendance.checkIn}
                        </strong>

                    </div>


                    <div class="attendance-detail">

                        <small>CHECK OUT</small>

                        <strong>
                            ${attendance.checkOut}
                        </strong>

                    </div>


                    <div class="attendance-detail">

                        <small>DURATION</small>

                        <strong>
                            ${duration}
                        </strong>

                    </div>


                    <div class="attendance-detail">

                        <small>CHECK-IN FEE</small>

                        <strong>
                            ₦${formatMoney(
                                attendance.checkInFee ||
                                DAILY_CHECK_IN_FEE
                            )}
                        </strong>

                    </div>

                </div>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="card rider-attendance-card">

            <div class="attendance-top">

                <div>

                    <div class="attendance-label">
                        TODAY'S ATTENDANCE
                    </div>

                    <div class="attendance-title">
                        You Are Present
                    </div>

                    <div class="attendance-description">
                        You are currently checked in.
                    </div>

                </div>

                <span class="attendance-status">
                    Present
                </span>

            </div>


            <div class="attendance-details">

                <div class="attendance-detail">

                    <small>DATE</small>

                    <strong>
                        ${attendance.date}
                    </strong>

                </div>


                <div class="attendance-detail">

                    <small>CHECK IN</small>

                    <strong>
                        ${attendance.checkIn}
                    </strong>

                </div>


                <div class="attendance-detail">

                    <small>CHECK OUT</small>

                    <strong>
                        Not Checked Out
                    </strong>

                </div>


                <div class="attendance-detail">

                    <small>DURATION</small>

                    <strong>
                        In Progress
                    </strong>

                </div>


                <div class="attendance-detail">

                    <small>CHECK-IN FEE</small>

                    <strong>
                        ₦${formatMoney(
                            attendance.checkInFee ||
                            DAILY_CHECK_IN_FEE
                        )}
                    </strong>

                </div>

            </div>


            <div class="attendance-actions">

                <button
                    type="button"
                    class="attendance-btn"
                    onclick="riderCheckOut()"
                >
                    ↪ Check Out
                </button>

            </div>

        </div>

    `;
}


/* =====================================================
   ATTENDANCE PAGE
===================================================== */

function renderAttendancePage() {

    const user =
        getCurrentUser();


    if (!user) {
        return;
    }


    if (
        user.role === "super_admin"
    ) {

        renderAdminAttendancePage();

    } else {

        renderRiderAttendancePage();

    }
}


/* =====================================================
   RIDER ATTENDANCE HISTORY
===================================================== */

function renderRiderAttendancePage() {

    const container =
        document.getElementById(
            "attendanceContent"
        );


    if (!container) {
        return;
    }


    const user =
        getCurrentUser();


    const records =
        getAttendance()
            .filter(function (record) {

                return (
                    record.riderId === user.id
                );

            })
            .sort(function (a, b) {

                return (
                    new Date(
                        (b.checkInTimestamp ||
                        b.date)
                    ) -
                    new Date(
                        (a.checkInTimestamp ||
                        a.date)
                    )
                );

            });


    const today =
        getRiderTodayAttendance();


    container.innerHTML = `

        <div class="head">

            <div>

                <h2>
                    My Attendance
                </h2>

                <p>
                    Your attendance and
                    check-in history.
                </p>

            </div>

        </div>


        ${
            !today
            ?
            `
                <div class="card rider-attendance-card">

                    <div class="attendance-top">

                        <div>

                            <div class="attendance-label">
                                TODAY
                            </div>

                            <div class="attendance-title">
                                Not Checked In
                            </div>

                            <div class="attendance-description">
                                GPS must confirm that
                                you are within 200 meters
                                of the office.
                            </div>

                        </div>

                    </div>

                    <div class="attendance-actions">

                        <button
                            class="attendance-btn"
                            onclick="riderCheckIn()"
                        >
                            ✓ Check In
                        </button>

                    </div>

                </div>
            `
            :
            `
                <div class="card rider-attendance-card">

                    <div class="attendance-top">

                        <div>

                            <div class="attendance-label">
                                TODAY
                            </div>

                            <div class="attendance-title">
                                ${escapeHtml(
                                    today.status
                                )}
                            </div>

                            <div class="attendance-description">
                                Today's attendance
                                record.
                            </div>

                        </div>

                        <span class="attendance-status">
                            ${escapeHtml(
                                today.status
                            )}
                        </span>

                    </div>

                    <div class="attendance-details">

                        <div class="attendance-detail">

                            <small>
                                CHECK IN
                            </small>

                            <strong>
                                ${today.checkIn}
                            </strong>

                        </div>

                        <div class="attendance-detail">

                            <small>
                                CHECK OUT
                            </small>

                            <strong>
                                ${
                                    today.checkOut ||
                                    "Not Checked Out"
                                }
                            </strong>

                        </div>

                        <div class="attendance-detail">

                            <small>
                                DURATION
                            </small>

                            <strong>
                                ${
                                    today.checkOut
                                    ? formatDuration(
                                        today.durationMinutes
                                    )
                                    : "In Progress"
                                }
                            </strong>

                        </div>

                        <div class="attendance-detail">

                            <small>
                                DISTANCE
                            </small>

                            <strong>
                                ${
                                    today.distanceFromOffice !== undefined
                                    ? today.distanceFromOffice + " m"
                                    : "-"
                                }
                            </strong>

                        </div>

                        <div class="attendance-detail">

                            <small>
                                FEE
                            </small>

                            <strong>
                                ₦${formatMoney(
                                    today.checkInFee ||
                                    DAILY_CHECK_IN_FEE
                                )}
                            </strong>

                        </div>

                    </div>


                    ${
                        today.checkOut
                        ?
                        ""
                        :
                        `
                            <button
                                class="attendance-btn"
                                onclick="riderCheckOut()"
                            >
                                ↪ Check Out
                            </button>
                        `
                    }

                </div>
            `
        }


        <div class="card">

            <div class="head">

                <div>

                    <h2>
                        Attendance History
                    </h2>

                    <p>
                        Previous check-in and
                        check-out records.
                    </p>

                </div>

            </div>


            <div class="table">

                <table>

                    <thead>

                        <tr>

                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Distance</th>
                            <th>Fee</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            records.length
                            ?
                            records.map(function (record) {

                                return `

                                    <tr>

                                        <td>
                                            ${record.date}
                                        </td>

                                        <td>
                                            ${record.checkIn || "-"}
                                        </td>

                                        <td>
                                            ${record.checkOut || "-"}
                                        </td>

                                        <td>
                                            ${
                                                record.checkOut
                                                ? formatDuration(
                                                    record.durationMinutes
                                                )
                                                : "In Progress"
                                            }
                                        </td>

                                        <td>

                                            <span class="status ${
                                                record.status ===
                                                "Checked Out"
                                                    ? "checked-out"
                                                    : "present"
                                            }">

                                                ${escapeHtml(
                                                    record.status
                                                )}

                                            </span>

                                        </td>

                                        <td>
                                            ${
                                                record.distanceFromOffice !== undefined
                                                ? record.distanceFromOffice + " m"
                                                : "-"
                                            }
                                        </td>

                                        <td>
                                            ₦${formatMoney(
                                                record.checkInFee ||
                                                DAILY_CHECK_IN_FEE
                                            )}
                                        </td>

                                    </tr>

                                `;

                            }).join("")
                            :
                            `
                                <tr>

                                    <td colspan="7">
                                        No attendance records yet.
                                    </td>

                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>

    `;
}


/* =====================================================
   ADMIN ATTENDANCE PAGE
===================================================== */

function renderAdminAttendancePage() {

    const container =
        document.getElementById(
            "attendanceContent"
        );


    if (!container) {
        return;
    }


    const records =
        getAttendance();


    const riders =
        getRiders();


    const today =
        getToday();


    const todayRecords =
        records.filter(function (record) {

            return record.date === today;

        });


    const presentCount =
        todayRecords.filter(function (record) {

            return (
                record.status === "Present" ||
                record.status === "Checked Out"
            );

        }).length;


    const checkedOutCount =
        todayRecords.filter(function (record) {

            return (
                record.status === "Checked Out"
            );

        }).length;


    const absentCount =
        Math.max(
            riders.length -
            todayRecords.length,
            0
        );


    container.innerHTML = `

        <div class="head">

            <div>

                <h2>
                    Rider Attendance
                </h2>

                <p>
                    Monitor rider check-in,
                    check-out, GPS location
                    and attendance duration.
                </p>

            </div>

            <input
                id="attendanceSearch"
                class="attendance-search"
                placeholder="Search rider..."
                oninput="filterAttendance()"
            >

        </div>


        <div class="attendance-stats">

            <div class="attendance-stat">

                <small>
                    PRESENT TODAY
                </small>

                <strong>
                    ${presentCount}
                </strong>

            </div>


            <div class="attendance-stat">

                <small>
                    CHECKED OUT
                </small>

                <strong>
                    ${checkedOutCount}
                </strong>

            </div>


            <div class="attendance-stat">

                <small>
                    ABSENT
                </small>

                <strong>
                    ${absentCount}
                </strong>

            </div>

        </div>


        <div class="card">

            <div class="table">

                <table>

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

                        ${attendanceRows(records)}

                    </tbody>

                </table>

            </div>

        </div>


        <div class="card">

            <div class="head">

                <div>

                    <h2>
                        Weekly Rider Earnings
                    </h2>

                    <p>
                        Monday - Sunday ·
                        ${getWeekLabel()}
                    </p>

                </div>

            </div>


            <div class="table">

                <table>

                    <thead>

                        <tr>

                            <th>Rider</th>
                            <th>Rider ID</th>
                            <th>Deliveries</th>
                            <th>Total Earnings</th>
                            <th>Check-in Fees</th>
                            <th>Net Earnings</th>

                        </tr>

                    </thead>

                    <tbody id="riderEarningsRows">

                        ${weeklyRiderEarningsRows()}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}


/* =====================================================
   ADMIN WEEKLY EARNINGS
===================================================== */

function weeklyRiderEarningsRows() {

    const riders =
        getRiders();


    if (!riders.length) {

        return `

            <tr>

                <td colspan="6">
                    No registered riders yet.
                </td>

            </tr>

        `;
    }


    return riders.map(function (rider) {

        const financials =
            getRiderWeeklyFinancials(
                rider.id
            );


        const riderName =
            rider.firstName +
            " " +
            rider.lastName;


        return `

            <tr
                data-earnings-rider="${escapeHtml(
                    riderName.toLowerCase()
                )}"
            >

                <td>

                    <strong>
                        ${escapeHtml(
                            riderName
                        )}
                    </strong>

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

                    <strong>
                        ₦${formatMoney(
                            financials.grossEarnings
                        )}
                    </strong>

                </td>

                <td>
                    ₦${formatMoney(
                        financials.checkInFees
                    )}
                </td>

                <td>

                    <strong class="${
                        financials.netEarnings >= 0
                            ? "green"
                            : ""
                    }">

                        ₦${formatMoney(
                            financials.netEarnings
                        )}

                    </strong>

                </td>

            </tr>

        `;

    }).join("");
}


/* =====================================================
   ADMIN ATTENDANCE ROWS
===================================================== */

function attendanceRows(records) {

    const riders =
        getRiders();


    if (
        !riders.length &&
        !records.length
    ) {

        return `

            <tr>

                <td colspan="11">
                    No registered riders yet.
                </td>

            </tr>

        `;
    }


    const sortedRecords =
        records
            .slice()
            .sort(function (a, b) {

                return (
                    new Date(
                        b.checkInTimestamp ||
                        b.date
                    ) -
                    new Date(
                        a.checkInTimestamp ||
                        a.date
                    )
                );

            });


    /*
       Show every historical attendance record.
       Riders without a record today are also
       displayed as Absent.
    */


    const rows = [];


    sortedRecords.forEach(function (record) {

        const rider =
            riders.find(function (item) {

                return item.id === record.riderId;

            });


        const riderName =
            record.riderName ||
            (
                rider
                    ? rider.firstName +
                      " " +
                      rider.lastName
                    : "Unknown Rider"
            );


        const statusClass =
            record.status === "Checked Out"
                ? "checked-out"
                : "present";


        rows.push(`

            <tr
                data-rider-name="${escapeHtml(
                    riderName.toLowerCase()
                )}"

                data-rider-id="${escapeHtml(
                    String(
                        record.riderId || ""
                    ).toLowerCase()
                )}"
            >

                <td>
                    ${escapeHtml(
                        riderName
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.riderId || "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.phone ||
                        rider?.phone ||
                        "-"
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
                    ${
                        record.checkOut
                        ? formatDuration(
                            record.durationMinutes
                        )
                        : "In Progress"
                    }
                </td>

                <td>

                    <span class="status ${statusClass}">
                        ${escapeHtml(
                            record.status ||
                            "Present"
                        )}
                    </span>

                </td>

                <td>
                    ₦${formatMoney(
                        record.checkInFee ||
                        DAILY_CHECK_IN_FEE
                    )}
                </td>

                <td>
                    ${
                        record.distanceFromOffice !== undefined
                        ? record.distanceFromOffice +
                          " m"
                        : "-"
                    }
                </td>

                <td>

                    ${
                        record.latitude !== undefined &&
                        record.longitude !== undefined
                        ?
                        `
                            ${Number(
                                record.latitude
                            ).toFixed(6)},
                            ${Number(
                                record.longitude
                            ).toFixed(6)}
                        `
                        :
                        "-"
                    }

                </td>

            </tr>

        `);

    });


    /*
       Add today's absent riders.
    */

    const today =
        getToday();


    riders.forEach(function (rider) {

        const hasTodayRecord =
            records.some(function (record) {

                return (
                    record.riderId === rider.id &&
                    record.date === today
                );

            });


        if (hasTodayRecord) {
            return;
        }


        rows.push(`

            <tr
                data-rider-name="${escapeHtml(
                    (
                        rider.firstName +
                        " " +
                        rider.lastName
                    ).toLowerCase()
                )}"

                data-rider-id="${escapeHtml(
                    rider.id.toLowerCase()
                )}"
            >

                <td>

                    ${escapeHtml(
                        rider.firstName +
                        " " +
                        rider.lastName
                    )}

                </td>

                <td>
                    ${escapeHtml(
                        rider.id
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        rider.phone
                    )}
                </td>

                <td>
                    ${today}
                </td>

                <td>
                    -
                </td>

                <td>
                    -
                </td>

                <td>
                    -
                </td>

                <td>

                    <span class="status absent">
                        Absent
                    </span>

                </td>

                <td>
                    ₦0
                </td>

                <td>
                    -
                </td>

                <td>
                    -
                </td>

            </tr>

        `);

    });


    return rows.join("");
}


/* =====================================================
   ATTENDANCE SEARCH
===================================================== */

function filterAttendance() {

    const input =
        document.getElementById(
            "attendanceSearch"
        );


    const search =
        String(
            input?.value || ""
        ).toLowerCase();


    document
        .querySelectorAll(
            "#attendanceRows tr"
        )
        .forEach(function (row) {

            const name =
                row.dataset.riderName ||
                "";

            const id =
                row.dataset.riderId ||
                "";


            row.style.display =
                name.includes(search) ||
                id.includes(search)
                    ? ""
                    : "none";

        });
}


/* =====================================================
   DELIVERY STORAGE
===================================================== */

function getDeliveries() {

    const records =
        JSON.parse(
            localStorage.getItem(
                "blackRabbitDeliveries"
            ) || "[]"
        );


    let changed = false;


    records.forEach(function (delivery) {

        if (
            delivery.riderEarning === undefined ||
            delivery.riderEarning === null
        ) {

            delivery.riderEarning = 0;

            changed = true;

        }


        /*
           Existing delivered orders may not have
           deliveredAt. Use updatedAt/createdAt once
           for migration.
        */

        if (
            delivery.status === "Delivered" &&
            !delivery.deliveredAt
        ) {

            delivery.deliveredAt =
                delivery.updatedAt ||
                delivery.createdAt ||
                new Date().toISOString();

            changed = true;

        }

    });


    if (changed) {

        localStorage.setItem(
            "blackRabbitDeliveries",
            JSON.stringify(records)
        );

    }


    return records;
}


function saveDeliveries(records) {

    localStorage.setItem(
        "blackRabbitDeliveries",
        JSON.stringify(records)
    );
}


/* =====================================================
   INITIAL DELIVERY DATA
===================================================== */

function initializeDeliveries() {

    const existing =
        localStorage.getItem(
            "blackRabbitDeliveries"
        );


    if (existing) {
        return;
    }


    const now =
        new Date().toISOString();


    const initialDeliveries = [

        {
            id: "BR-10482",

            customerName: "Amina Musa",
            customerPhone: "08012345001",

            pickupAddress: "Barnawa",
            destination: "Kaduna South",

            packageDescription: "Documents",

            amount: 8500,

            riderEarning: 0,

            notes: "",

            riderId: "",

            status: "In Transit",

            createdAt: now,
            updatedAt: now,

            deliveredAt: "",

            createdBy: "System",
            updatedBy: "System",

            history: [

                {
                    status: "Pending",
                    timestamp: now,
                    by: "System"
                },

                {
                    status: "In Transit",
                    timestamp: now,
                    by: "System"
                }

            ]

        },


        {
            id: "BR-10481",

            customerName: "Yusuf Kabir",
            customerPhone: "08012345002",

            pickupAddress: "Kawo",
            destination: "Ungwan Rimi",

            packageDescription: "Parcel",

            amount: 5200,

            riderEarning: 0,

            notes: "",

            riderId: "",

            status: "Delivered",

            createdAt: now,
            updatedAt: now,

            deliveredAt: now,

            createdBy: "System",
            updatedBy: "System",

            history: [

                {
                    status: "Pending",
                    timestamp: now,
                    by: "System"
                },

                {
                    status: "Delivered",
                    timestamp: now,
                    by: "System"
                }

            ]

        },


        {
            id: "BR-10480",

            customerName: "Safiya Ahmed",
            customerPhone: "08012345003",

            pickupAddress: "Malali",
            destination: "Tafawa Balewa",

            packageDescription: "Food package",

            amount: 7800,

            riderEarning: 0,

            notes: "",

            riderId: "",

            status: "Pending",

            createdAt: now,
            updatedAt: now,

            deliveredAt: "",

            createdBy: "System",
            updatedBy: "System",

            history: [

                {
                    status: "Pending",
                    timestamp: now,
                    by: "System"
                }

            ]

        },


        {
            id: "BR-10479",

            customerName: "Maryam Bello",
            customerPhone: "08012345004",

            pickupAddress: "Kaduna North",
            destination: "Barnawa",

            packageDescription: "Clothing",

            amount: 6400,

            riderEarning: 0,

            notes: "",

            riderId: "",

            status: "Delivered",

            createdAt: now,
            updatedAt: now,

            deliveredAt: now,

            createdBy: "System",
            updatedBy: "System",

            history: [

                {
                    status: "Pending",
                    timestamp: now,
                    by: "System"
                },

                {
                    status: "Delivered",
                    timestamp: now,
                    by: "System"
                }

            ]

        }

    ];


    saveDeliveries(
        initialDeliveries
    );
}


/* =====================================================
   DELIVERY ID
===================================================== */

function generateDeliveryId() {

    const deliveries =
        getDeliveries();


    let id;


    do {

        const now =
            new Date();


        const date =
            now.getFullYear() +
            String(
                now.getMonth() + 1
            ).padStart(2, "0") +
            String(
                now.getDate()
            ).padStart(2, "0");


        const random =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        id =
            "BR-" +
            date +
            "-" +
            random;


    } while (
        deliveries.some(function (item) {

            return item.id === id;

        })
    );


    return id;
}


/* =====================================================
   DELIVERY PERMISSIONS
===================================================== */

function canEditDelivery(delivery) {

    const user =
        getCurrentUser();


    if (!user || !delivery) {
        return false;
    }


    if (
        user.role === "super_admin"
    ) {
        return true;
    }


    return (
        delivery.riderId === user.id
    );
}


function canUpdateDeliveryStatus(delivery) {

    return canEditDelivery(
        delivery
    );
}


/* =====================================================
   RIDER NAME
===================================================== */

function getRiderName(riderId) {

    if (!riderId) {
        return "Unassigned";
    }


    const rider =
        getRiders().find(
            function (item) {

                return item.id === riderId;

            }
        );


    if (!rider) {
        return "Unknown Rider";
    }


    return (
        rider.firstName +
        " " +
        rider.lastName
    );
}


/* =====================================================
   STATUS CLASS
===================================================== */

function getStatusClass(status) {

    return String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");
}


/* =====================================================
   VISIBLE DELIVERIES
===================================================== */

function getVisibleDeliveries() {

    const all =
        getDeliveries();


    const user =
        getCurrentUser();


    if (!user) {
        return [];
    }


    if (
        user.role === "super_admin"
    ) {

        return all;

    }


    return all.filter(
        function (delivery) {

            return (
                delivery.riderId ===
                user.id
            );

        }
    );
}


/* =====================================================
   DELIVERY TABLE
===================================================== */

function deliveryRows(records) {

    const user =
        getCurrentUser();


    if (!records.length) {

        return `

            <tr>

                <td colspan="8">
                    No deliveries found.
                </td>

            </tr>

        `;
    }


    return records.map(
        function (delivery) {

            const canEdit =
                canEditDelivery(
                    delivery
                );


            let actions = "";


            if (
                user?.role ===
                "super_admin"
            ) {

                actions = `

                    <button
                        class="small-btn yellow"
                        onclick="openEditDelivery('${escapeHtml(
                            delivery.id
                        )}')"
                    >
                        Edit
                    </button>

                `;

            } else {

                actions = `

                    ${
                        canEdit
                        ?
                        `
                            <button
                                class="small-btn blue"
                                onclick="openEditDelivery('${escapeHtml(
                                    delivery.id
                                )}')"
                            >
                                Update
                            </button>
                        `
                        :
                        ""
                    }

                `;

            }


            return `

                <tr>

                    <td>

                        <strong>
                            ${escapeHtml(
                                delivery.id
                            )}
                        </strong>

                    </td>


                    <td>

                        <strong>
                            ${escapeHtml(
                                delivery.customerName
                            )}
                        </strong>

                        <br>

                        <small>
                            ${escapeHtml(
                                delivery.customerPhone ||
                                ""
                            )}
                        </small>

                    </td>


                    <td>
                        ${escapeHtml(
                            delivery.pickupAddress
                        )}
                    </td>


                    <td>
                        ${escapeHtml(
                            delivery.destination
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

                        <span
                            class="status ${getStatusClass(
                                delivery.status
                            )}"
                        >
                            ${escapeHtml(
                                delivery.status
                            )}
                        </span>

                    </td>


                    <td>
                        ₦${formatMoney(
                            delivery.amount
                        )}
                    </td>


                    <td>

                        <div class="action-group">

                            ${actions}

                        </div>

                    </td>

                </tr>

            `;

        }
    ).join("");
}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   MONEY
===================================================== */

function formatMoney(value) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-NG"
    );
}


/* =====================================================
   RENDER DELIVERIES
===================================================== */

function renderDeliveries() {

    const rows =
        document.getElementById(
            "allRows"
        );


    if (!rows) {
        return;
    }


    let records =
        getVisibleDeliveries();


    const search =
        String(
            document.getElementById(
                "search"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    if (search) {

        records =
            records.filter(
                function (delivery) {

                    const riderName =
                        getRiderName(
                            delivery.riderId
                        );


                    return [

                        delivery.id,
                        delivery.customerName,
                        delivery.customerPhone,
                        delivery.pickupAddress,
                        delivery.destination,
                        delivery.packageDescription,
                        delivery.status,
                        riderName

                    ].some(
                        function (value) {

                            return String(
                                value || ""
                            )
                            .toLowerCase()
                            .includes(search);

                        }
                    );

                }
            );
    }


    if (
        deliveryFilter !== "All"
    ) {

        records =
            records.filter(
                function (delivery) {

                    return (
                        delivery.status ===
                        deliveryFilter
                    );

                }
            );
    }


    records =
        records
            .slice()
            .reverse();


    rows.innerHTML =
        deliveryRows(records);


    updateDeliveryTabs();
}


/* =====================================================
   DELIVERY FILTER
===================================================== */

function setDeliveryFilter(
    filter,
    button
) {

    deliveryFilter =
        filter;


    document
        .querySelectorAll(
            "#deliveries .tabs button"
        )
        .forEach(
            function (item) {

                item.classList.remove(
                    "selected"
                );

            }
        );


    if (button) {

        button.classList.add(
            "selected"
        );

    }


    renderDeliveries();
}


function updateDeliveryTabs() {

    const deliveries =
        getVisibleDeliveries();


    const counts = {

        All:
            deliveries.length,

        Pending:
            0,

        Assigned:
            0,

        "Picked Up":
            0,

        "In Transit":
            0,

        Delivered:
            0

    };


    deliveries.forEach(
        function (delivery) {

            if (
                Object.prototype.hasOwnProperty.call(
                    counts,
                    delivery.status
                )
            ) {

                counts[
                    delivery.status
                ]++;

            }

        }
    );


    const buttons =
        document.querySelectorAll(
            "#deliveries .tabs button"
        );


    const labels = [

        "All",
        "Pending",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered"

    ];


    buttons.forEach(
        function (button, index) {

            const label =
                labels[index];


            if (label) {

                button.textContent =
                    label +
                    " " +
                    counts[label];

            }

        }
    );
}


/* =====================================================
   RECENT DELIVERIES
===================================================== */

function renderRecentDeliveries() {

    const container =
        document.getElementById(
            "recent"
        );


    if (!container) {
        return;
    }


    const deliveries =
        getVisibleDeliveries()
            .slice()
            .reverse()
            .slice(0, 5);


    if (!deliveries.length) {

        container.innerHTML = `

            <tr>

                <td colspan="8">
                    No deliveries yet.
                </td>

            </tr>

        `;

        return;
    }


    container.innerHTML =
        deliveryRows(
            deliveries
        );
}


/* =====================================================
   DASHBOARD STATS
===================================================== */

function updateDashboardStats() {

    const deliveries =
        getVisibleDeliveries();


    const total =
        deliveries.length;


    const inTransit =
        deliveries.filter(
            function (item) {

                return (
                    item.status ===
                    "In Transit"
                );

            }
        ).length;


    const delivered =
        deliveries.filter(
            function (item) {

                return (
                    item.status ===
                    "Delivered"
                );

            }
        ).length;


    const pending =
        deliveries.filter(
            function (item) {

                return (
                    item.status ===
                    "Pending" ||
                    item.status ===
                    "Assigned" ||
                    item.status ===
                    "Picked Up"
                );

            }
        ).length;


    const totalElement =
        document.getElementById(
            "totalDeliveriesStat"
        );

    const transitElement =
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

    if (transitElement) {
        transitElement.textContent =
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


    const donutTotal =
        document.getElementById(
            "donutTotal"
        );


    if (donutTotal) {

        donutTotal.innerHTML =
            total +
            "<small>Total</small>";

    }


    const deliveredPercent =
        total
            ? (
                delivered /
                total *
                100
            ).toFixed(1)
            : 0;


    const transitPercent =
        total
            ? (
                inTransit /
                total *
                100
            ).toFixed(1)
            : 0;


    const pendingPercent =
        total
            ? (
                pending /
                total *
                100
            ).toFixed(1)
            : 0;


    const deliveredPercentElement =
        document.getElementById(
            "deliveredPercent"
        );

    const transitPercentElement =
        document.getElementById(
            "transitPercent"
        );

    const pendingPercentElement =
        document.getElementById(
            "pendingPercent"
        );


    if (deliveredPercentElement) {
        deliveredPercentElement.textContent =
            deliveredPercent + "%";
    }

    if (transitPercentElement) {
        transitPercentElement.textContent =
            transitPercent + "%";
    }

    if (pendingPercentElement) {
        pendingPercentElement.textContent =
            pendingPercent + "%";
    }


    if (deliveryDonut) {

        deliveryDonut.data.datasets[0].data = [

            delivered,
            inTransit,
            pending

        ];

        deliveryDonut.update();

    }


    const revenue =
        deliveries.reduce(
            function (total, item) {

                return (
                    total +
                    Number(
                        item.amount || 0
                    )
                );

            },
            0
        );


    const revenueElement =
        document.getElementById(
            "revenueStat"
        );


    if (revenueElement) {

        revenueElement.textContent =
            "₦" +
            formatMoney(revenue);

    }


    if (deliveryBar) {

        deliveryBar.data.datasets[0].data = [

            revenue / 1000000

        ];

        deliveryBar.update();

    }


    updateSuccessRate(
        deliveries
    );
}


function updateSuccessRate(
    deliveries
) {

    const completed =
        deliveries.filter(
            function (item) {

                return (
                    item.status ===
                    "Delivered"
                );

            }
        ).length;


    const success =
        deliveries.length
            ? (
                completed /
                deliveries.length *
                100
            ).toFixed(1)
            : 0;


    const element =
        document.getElementById(
            "successRate"
        );


    if (element) {

        element.textContent =
            success + "%";

    }
}


/* =====================================================
   REFRESH
===================================================== */

function refreshAllDeliveryViews() {

    renderDeliveries();

    renderRecentDeliveries();

    updateDashboardStats();

    renderCustomers();

    renderDrivers();

    renderRiderEarningsCard();

    renderAttendancePage();

    renderRiderAttendanceCard();
}


/* =====================================================
   RIDER OPTIONS
===================================================== */

function populateRiderOptions(
    selectedId,
    lockToCurrentRider
) {

    const select =
        document.getElementById(
            "deliveryRider"
        );


    if (!select) {
        return;
    }


    const riders =
        getRiders();


    const user =
        getCurrentUser();


    select.innerHTML = `

        <option value="">
            Unassigned
        </option>

    `;


    riders.forEach(
        function (rider) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                rider.id;


            option.textContent =
                rider.firstName +
                " " +
                rider.lastName +
                " (" +
                rider.id +
                ")";


            if (
                selectedId &&
                selectedId ===
                rider.id
            ) {

                option.selected =
                    true;

            }


            select.appendChild(
                option
            );

        }
    );


    if (
        lockToCurrentRider &&
        user &&
        user.role === "rider"
    ) {

        select.value =
            user.id;

        select.disabled =
            true;

    } else {

        select.disabled =
            false;

    }
}


/* =====================================================
   OPEN NEW DELIVERY
===================================================== */

function openNewDelivery() {

    editingDeliveryId =
        null;


    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalDescription =
        document.getElementById(
            "modalDescription"
        );

    const saveButton =
        document.getElementById(
            "saveDeliveryButton"
        );

    const editId =
        document.getElementById(
            "deliveryEditId"
        );

    const form =
        document.getElementById(
            "form"
        );


    if (modalTitle) {
        modalTitle.textContent =
            "Create New Delivery";
    }

    if (modalDescription) {
        modalDescription.textContent =
            "Log a real delivery into the system.";
    }

    if (saveButton) {
        saveButton.textContent =
            "Create Delivery";
    }

    if (editId) {
        editId.value = "";
    }

    if (form) {
        form.reset();
    }


    const user =
        getCurrentUser();


    const isRider =
        user &&
        user.role === "rider";


    populateRiderOptions(
        isRider
            ? user.id
            : "",
        isRider
    );


    const earning =
        document.getElementById(
            "deliveryRiderEarning"
        );


    if (earning) {
        earning.disabled =
            isRider;
    }


    const status =
        document.getElementById(
            "deliveryStatus"
        );


    if (status) {

        status.value =
            isRider
                ? "Assigned"
                : "Pending";

    }


    const history =
        document.getElementById(
            "deliveryHistory"
        );


    if (history) {

        history.innerHTML = "";

        history.classList.add(
            "hidden"
        );

    }


    const modal =
        document.getElementById(
            "modal"
        );


    if (modal) {
        modal.style.display =
            "flex";
    }
}


/* =====================================================
   OPEN EDIT DELIVERY
===================================================== */

function openEditDelivery(id) {

    const delivery =
        getDeliveries().find(
            function (item) {

                return item.id === id;

            }
        );


    if (!delivery) {

        alert(
            "Delivery not found."
        );

        return;
    }


    if (
        !canEditDelivery(
            delivery
        )
    ) {

        alert(
            "You do not have permission to update this delivery."
        );

        return;
    }


    editingDeliveryId =
        id;


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Update Delivery " +
        delivery.id;


    document.getElementById(
        "modalDescription"
    ).textContent =
        "Update delivery details, assignment or status.";


    document.getElementById(
        "saveDeliveryButton"
    ).textContent =
        "Save Changes";


    document.getElementById(
        "deliveryEditId"
    ).value =
        delivery.id;


    document.getElementById(
        "deliveryCustomer"
    ).value =
        delivery.customerName || "";


    document.getElementById(
        "deliveryPhone"
    ).value =
        delivery.customerPhone || "";


    document.getElementById(
        "deliveryPickup"
    ).value =
        delivery.pickupAddress || "";


    document.getElementById(
        "deliveryDestination"
    ).value =
        delivery.destination || "";


    document.getElementById(
        "deliveryPackage"
    ).value =
        delivery.packageDescription || "";


    document.getElementById(
        "deliveryAmount"
    ).value =
        delivery.amount || "";


    document.getElementById(
        "deliveryRiderEarning"
    ).value =
        delivery.riderEarning || "";


    document.getElementById(
        "deliveryStatus"
    ).value =
        delivery.status;


    document.getElementById(
        "deliveryNotes"
    ).value =
        delivery.notes || "";


    const user =
        getCurrentUser();


    populateRiderOptions(
        delivery.riderId || "",
        user?.role === "rider"
    );


    const riderSelect =
        document.getElementById(
            "deliveryRider"
        );


    const riderEarning =
        document.getElementById(
            "deliveryRiderEarning"
        );


    if (
        user?.role === "rider"
    ) {

        if (riderSelect) {
            riderSelect.disabled =
                true;
        }

        if (riderEarning) {
            riderEarning.disabled =
                true;
        }

    } else {

        if (riderEarning) {
            riderEarning.disabled =
                false;
        }

    }


    renderDeliveryHistory(
        delivery
    );


    document.getElementById(
        "modal"
    ).style.display =
        "flex";
}


/* =====================================================
   DELIVERY HISTORY
===================================================== */

function renderDeliveryHistory(
    delivery
) {

    const container =
        document.getElementById(
            "deliveryHistory"
        );


    if (!container) {
        return;
    }


    if (
        !delivery.history ||
        !delivery.history.length
    ) {

        container.innerHTML = "";

        container.classList.add(
            "hidden"
        );

        return;
    }


    container.classList.remove(
        "hidden"
    );


    container.innerHTML = `

        <h3>
            Delivery History
        </h3>

        ${
            delivery.history
                .slice()
                .reverse()
                .map(
                    function (item) {

                        return `

                            <div class="history-item">

                                <div class="history-dot"></div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            item.status
                                        )}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            formatDateTime(
                                                item.timestamp
                                            )
                                        )}
                                        ·
                                        ${escapeHtml(
                                            item.by ||
                                            "System"
                                        )}
                                    </small>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("")
        }

    `;
}


/* =====================================================
   DATE TIME FORMAT
===================================================== */

function formatDateTime(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        "en-NG",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


/* =====================================================
   SAVE DELIVERY
===================================================== */

function saveDelivery(event) {

    event.preventDefault();


    const user =
        getCurrentUser();


    if (!user) {

        alert(
            "Please login first."
        );

        return;
    }


    const customerName =
        document.getElementById(
            "deliveryCustomer"
        ).value.trim();


    const customerPhone =
        normalizePhone(
            document.getElementById(
                "deliveryPhone"
            ).value
        );


    const pickupAddress =
        document.getElementById(
            "deliveryPickup"
        ).value.trim();


    const destination =
        document.getElementById(
            "deliveryDestination"
        ).value.trim();


    const packageDescription =
        document.getElementById(
            "deliveryPackage"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "deliveryAmount"
            ).value || 0
        );


    const riderEarning =
        Number(
            document.getElementById(
                "deliveryRiderEarning"
            ).value || 0
        );


    const notes =
        document.getElementById(
            "deliveryNotes"
        ).value.trim();


    const status =
        document.getElementById(
            "deliveryStatus"
        ).value;


    const riderSelect =
        document.getElementById(
            "deliveryRider"
        );


    const riderId =
        riderSelect?.value || "";


    if (
        !customerName ||
        !customerPhone ||
        !pickupAddress ||
        !destination
    ) {

        alert(
            "Please complete the customer, phone, pickup and destination fields."
        );

        return;
    }


    if (
        customerPhone.length !== 11
    ) {

        alert(
            "Please enter a valid Nigerian phone number."
        );

        return;
    }


    let deliveries =
        getDeliveries();


    /* =================================================
       UPDATE
    ================================================= */

    if (editingDeliveryId) {

        const index =
            deliveries.findIndex(
                function (item) {

                    return (
                        item.id ===
                        editingDeliveryId
                    );

                }
            );


        if (index === -1) {

            alert(
                "Delivery no longer exists."
            );

            return;
        }


        const delivery =
            deliveries[index];


        if (
            !canEditDelivery(
                delivery
            )
        ) {

            alert(
                "You do not have permission to update this delivery."
            );

            return;
        }


        const oldStatus =
            delivery.status;


        const oldRider =
            delivery.riderId;


        delivery.customerName =
            customerName;

        delivery.customerPhone =
            customerPhone;

        delivery.pickupAddress =
            pickupAddress;

        delivery.destination =
            destination;

        delivery.packageDescription =
            packageDescription;

        delivery.amount =
            amount;


        /*
           Only Super Admin can set/edit
           rider earnings.
        */

        delivery.riderEarning =
            user.role === "super_admin"
                ? riderEarning
                : Number(
                    delivery.riderEarning ||
                    0
                );


        delivery.notes =
            notes;


        if (
            user.role ===
            "super_admin"
        ) {

            delivery.riderId =
                riderId || "";

        } else {

            delivery.riderId =
                user.id;

        }


        delivery.status =
            status;


        delivery.updatedAt =
            getCurrentTimestamp();


        delivery.updatedBy =
            getUserDisplayName(
                user
            );


        if (
            oldStatus !==
            status
        ) {

            if (!delivery.history) {
                delivery.history = [];
            }


            const statusTimestamp =
                getCurrentTimestamp();


            delivery.history.push({

                status,

                timestamp:
                    statusTimestamp,

                by:
                    getUserDisplayName(
                        user
                    )

            });


            if (
                status ===
                "Delivered"
            ) {

                delivery.deliveredAt =
                    statusTimestamp;

            }


            if (
                oldStatus ===
                "Delivered" &&
                status !==
                "Delivered"
            ) {

                delivery.deliveredAt =
                    "";

            }

        }


        if (
            oldRider !==
            delivery.riderId &&
            user.role ===
            "super_admin"
        ) {

            if (!delivery.history) {
                delivery.history = [];
            }


            delivery.history.push({

                status:
                    "Assigned to " +
                    getRiderName(
                        delivery.riderId
                    ),

                timestamp:
                    getCurrentTimestamp(),

                by:
                    getUserDisplayName(
                        user
                    )

            });

        }


        saveDeliveries(
            deliveries
        );


        alert(
            "Delivery " +
            delivery.id +
            " updated successfully."
        );

    }


    /* =================================================
       CREATE
    ================================================= */

    else {

        let assignedRider =
            riderId || "";


        if (
            user.role ===
            "rider"
        ) {

            assignedRider =
                user.id;

        }


        let finalStatus =
            status;


        if (
            user.role ===
            "rider" &&
            finalStatus ===
            "Pending"
        ) {

            finalStatus =
                "Assigned";

        }


        const now =
            getCurrentTimestamp();


        const delivery = {

            id:
                generateDeliveryId(),

            customerName,

            customerPhone,

            pickupAddress,

            destination,

            packageDescription,

            amount,

            /*
               Rider cannot assign own
               earnings.
            */

            riderEarning:
                user.role ===
                "super_admin"
                    ? riderEarning
                    : 0,

            notes,

            riderId:
                assignedRider,

            status:
                finalStatus,

            createdAt:
                now,

            updatedAt:
                now,

            deliveredAt:
                finalStatus ===
                "Delivered"
                    ? now
                    : "",

            createdBy:
                getUserDisplayName(
                    user
                ),

            updatedBy:
                getUserDisplayName(
                    user
                ),

            history: [

                {

                    status:
                        finalStatus,

                    timestamp:
                        now,

                    by:
                        getUserDisplayName(
                            user
                        )

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
            "Delivery " +
            delivery.id +
            " created successfully."
        );

    }


    closeDeliveryModal();

    refreshAllDeliveryViews();
}


/* =====================================================
   USER DISPLAY NAME
===================================================== */

function getUserDisplayName(user) {

    if (!user) {
        return "System";
    }


    return (
        user.firstName ||
        "User"
    ) +
    " " +
    (
        user.lastName ||
        ""
    );
}


/* =====================================================
   CLOSE MODAL
===================================================== */

function closeDeliveryModal() {

    const modal =
        document.getElementById(
            "modal"
        );


    const form =
        document.getElementById(
            "form"
        );


    const history =
        document.getElementById(
            "deliveryHistory"
        );


    if (modal) {
        modal.style.display =
            "none";
    }


    if (form) {
        form.reset();
    }


    if (history) {

        history.innerHTML = "";

        history.classList.add(
            "hidden"
        );

    }


    editingDeliveryId =
        null;
}


/* =====================================================
   QUICK STATUS UPDATE
===================================================== */

function updateDeliveryStatus(
    id,
    newStatus
) {

    const user =
        getCurrentUser();


    if (!user) {
        return;
    }


    const deliveries =
        getDeliveries();


    const delivery =
        deliveries.find(
            function (item) {

                return (
                    item.id === id
                );

            }
        );


    if (!delivery) {

        alert(
            "Delivery not found."
        );

        return;
    }


    if (
        !canUpdateDeliveryStatus(
            delivery
        )
    ) {

        alert(
            "You do not have permission to update this delivery."
        );

        return;
    }


    if (
        delivery.status ===
        newStatus
    ) {

        return;
    }


    const timestamp =
        getCurrentTimestamp();


    delivery.status =
        newStatus;


    delivery.updatedAt =
        timestamp;


    delivery.updatedBy =
        getUserDisplayName(
            user
        );


    if (
        newStatus ===
        "Delivered"
    ) {

        delivery.deliveredAt =
            timestamp;

    } else if (
        delivery.status !==
        "Delivered"
    ) {

        /*
           Do not retain an old delivery
           completion date when it is moved
           away from Delivered.
        */

        if (
            newStatus !==
            "Delivered"
        ) {

            delivery.deliveredAt =
                "";

        }

    }


    if (!delivery.history) {
        delivery.history = [];
    }


    delivery.history.push({

        status:
            newStatus,

        timestamp,

        by:
            getUserDisplayName(
                user
            )

    });


    saveDeliveries(
        deliveries
    );


    refreshAllDeliveryViews();
}


/* =====================================================
   CUSTOMERS
===================================================== */

function renderCustomers() {

    const container =
        document.getElementById(
            "customerList"
        );


    if (!container) {
        return;
    }


    const visible =
        getVisibleDeliveries();


    const customers = {};


    visible.forEach(
        function (delivery) {

            const key =
                delivery.customerPhone ||
                delivery.customerName;


            if (!customers[key]) {

                customers[key] = {

                    name:
                        delivery.customerName,

                    phone:
                        delivery.customerPhone,

                    count:
                        0

                };

            }


            customers[key].count++;

        }
    );


    const list =
        Object.values(
            customers
        );


    if (!list.length) {

        container.innerHTML = `

            <div>

                <b>—</b>

                <strong>
                    No customers yet
                </strong>

                <small>
                    Customer records will appear here.
                </small>

            </div>

        `;

        return;
    }


    container.innerHTML =
        list.map(
            function (customer) {

                const initials =
                    customer.name
                        .split(" ")
                        .map(
                            function (word) {

                                return word.charAt(0);

                            }
                        )
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();


                return `

                    <div>

                        <b>
                            ${escapeHtml(
                                initials
                            )}
                        </b>

                        <strong>
                            ${escapeHtml(
                                customer.name
                            )}
                        </strong>

                        <small>
                            ${customer.count}
                            delivery
                            ${
                                customer.count === 1
                                    ? ""
                                    : "ies"
                            }
                        </small>

                        <small>
                            ${escapeHtml(
                                customer.phone ||
                                ""
                            )}
                        </small>

                    </div>

                `;

            }
        ).join("");
}


/* =====================================================
   DRIVERS
===================================================== */

function renderDrivers() {

    const container =
        document.getElementById(
            "driverList"
        );


    if (!container) {
        return;
    }


    const riders =
        getRiders();


    if (!riders.length) {

        container.innerHTML = `

            <div>

                <b>—</b>

                <strong>
                    No riders registered
                </strong>

                <small>
                    Riders will appear here after registration.
                </small>

            </div>

        `;

        return;
    }


    const deliveries =
        getDeliveries();


    container.innerHTML =
        riders.map(
            function (rider) {

                const assigned =
                    deliveries.filter(
                        function (delivery) {

                            return (
                                delivery.riderId ===
                                rider.id &&
                                delivery.status !==
                                "Delivered" &&
                                delivery.status !==
                                "Cancelled"
                            );

                        }
                    ).length;


                return `

                    <div>

                        <b>

                            ${
                                (
                                    rider.firstName
                                        .charAt(0) +
                                    rider.lastName
                                        .charAt(0)
                                ).toUpperCase()
                            }

                        </b>

                        <strong>

                            ${escapeHtml(
                                rider.firstName +
                                " " +
                                rider.lastName
                            )}

                        </strong>

                        <small>
                            ${escapeHtml(
                                rider.id
                            )}
                        </small>

                        <small class="green">
                            ${assigned}
                            active deliveries
                        </small>

                    </div>

                `;

            }
        ).join("");
}


/* =====================================================
   TRACKING
===================================================== */

function trackDelivery() {

    const id =
        document.getElementById(
            "trackId"
        )?.value
        .trim()
        .toLowerCase();


    if (!id) {

        alert(
            "Enter a delivery ID."
        );

        return;
    }


    const visible =
        getVisibleDeliveries();


    const delivery =
        visible.find(
            function (item) {

                return (
                    item.id.toLowerCase() ===
                    id
                );

            }
        );


    const result =
        document.getElementById(
            "trackingResult"
        );


    if (!result) {
        return;
    }


    if (!delivery) {

        result.classList.remove(
            "hidden"
        );


        result.innerHTML = `

            <h2>
                Delivery Not Found
            </h2>

            <p>
                No delivery with this ID was found
                in your available deliveries.
            </p>

        `;

        return;
    }


    result.classList.remove(
        "hidden"
    );


    const history =
        delivery.history || [];


    result.innerHTML = `

        <div class="head">

            <div>

                <h2>
                    ${escapeHtml(
                        delivery.id
                    )}
                </h2>

                <p>
                    ${escapeHtml(
                        delivery.customerName
                    )}
                </p>

            </div>

            <span class="status ${getStatusClass(
                delivery.status
            )}">

                ${escapeHtml(
                    delivery.status
                )}

            </span>

        </div>


        <div class="delivery-info">

            <div>

                <small>
                    CUSTOMER
                </small>

                <strong>
                    ${escapeHtml(
                        delivery.customerName
                    )}
                </strong>

            </div>


            <div>

                <small>
                    PHONE
                </small>

                <strong>
                    ${escapeHtml(
                        delivery.customerPhone
                    )}
                </strong>

            </div>


            <div>

                <small>
                    PICKUP
                </small>

                <strong>
                    ${escapeHtml(
                        delivery.pickupAddress
                    )}
                </strong>

            </div>


            <div>

                <small>
                    DESTINATION
                </small>

                <strong>
                    ${escapeHtml(
                        delivery.destination
                    )}
                </strong>

            </div>


            <div>

                <small>
                    RIDER
                </small>

                <strong>
                    ${escapeHtml(
                        getRiderName(
                            delivery.riderId
                        )
                    )}
                </strong>

            </div>


            <div>

                <small>
                    AMOUNT
                </small>

                <strong>
                    ₦${formatMoney(
                        delivery.amount
                    )}
                </strong>

            </div>

        </div>


        <div class="timeline">

            ${
                history.length
                ?
                history.map(
                    function (item) {

                        return `

                            <div>

                                ✓

                                <span>

                                    <b>
                                        ${escapeHtml(
                                            item.status
                                        )}
                                    </b>

                                    <small>
                                        ${escapeHtml(
                                            formatDateTime(
                                                item.timestamp
                                            )
                                        )}
                                        ·
                                        ${escapeHtml(
                                            item.by ||
                                            "System"
                                        )}
                                    </small>

                                </span>

                            </div>

                        `;

                    }
                ).join("")
                :
                `
                    <div>

                        ●

                        <span>

                            <b>
                                ${escapeHtml(
                                    delivery.status
                                )}
                            </b>

                        </span>

                    </div>
                `
            }

        </div>

    `;
}


/* =====================================================
   NAVIGATION
===================================================== */

const pageInfo = {

    dashboard: [
        "Dashboard",
        "Welcome back."
    ],

    deliveries: [
        "Deliveries",
        "Manage delivery orders."
    ],

    tracking: [
        "Tracking",
        "Track deliveries."
    ],

    customers: [
        "Customers",
        "Manage customer profiles."
    ],

    drivers: [
        "Drivers",
        "Manage your riders and fleet."
    ],

    analytics: [
        "Analytics",
        "Monitor logistics performance."
    ],

    attendance: [
        "Attendance",
        "Monitor rider attendance, location verification and weekly earnings."
    ],

    settings: [
        "Settings",
        "Configure your delivery management system."
    ]

};


function openPage(name) {

    document
        .querySelectorAll(".page")
        .forEach(
            function (page) {

                page.classList.toggle(
                    "hidden",
                    page.id !== name
                );

            }
        );


    document
        .querySelectorAll(
            ".side nav button,.bottom button"
        )
        .forEach(
            function (button) {

                button.classList.toggle(
                    "active",
                    button.dataset.page ===
                    name
                );

            }
        );


    if (pageInfo[name]) {

        const title =
            document.getElementById(
                "title"
            );

        const sub =
            document.getElementById(
                "sub"
            );


        if (title) {
            title.textContent =
                pageInfo[name][0];
        }

        if (sub) {
            sub.textContent =
                pageInfo[name][1];
        }

    }


    if (
        name === "attendance"
    ) {

        renderAttendancePage();

    }


    if (
        name === "deliveries"
    ) {

        renderDeliveries();

    }


    if (
        name === "customers"
    ) {

        renderCustomers();

    }


    if (
        name === "drivers"
    ) {

        renderDrivers();

    }
}


/* =====================================================
   CHARTS
===================================================== */

function initializeCharts() {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.warn(
            "Chart.js is not loaded."
        );

        return;
    }


    const lineCanvas =
        document.getElementById(
            "line"
        );


    if (
        lineCanvas &&
        !deliveryLineChart
    ) {

        deliveryLineChart =
            new Chart(
                lineCanvas,
                {

                    type: "line",

                    data: {

                        labels: [
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun"
                        ],

                        datasets: [

                            {

                                label:
                                    "Deliveries",

                                data: [
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    0
                                ],

                                borderColor:
                                    "#e7b31a",

                                backgroundColor:
                                    "rgba(231,179,26,.12)",

                                fill: true,

                                tension: .4

                            }

                        ]

                    },

                    options: {

                        responsive: true,

                        plugins: {

                            legend: {

                                display: false

                            }

                        }

                    }

                }
            );

    }


    const donutCanvas =
        document.getElementById(
            "donut"
        );


    if (
        donutCanvas &&
        !deliveryDonut
    ) {

        deliveryDonut =
            new Chart(
                donutCanvas,
                {

                    type:
                        "doughnut",

                    data: {

                        labels: [
                            "Delivered",
                            "In Transit",
                            "Pending"
                        ],

                        datasets: [

                            {

                                data: [
                                    0,
                                    0,
                                    0
                                ],

                                backgroundColor: [
                                    "#e7b31a",
                                    "#344054",
                                    "#d9dee6"
                                ],

                                borderWidth:
                                    0

                            }

                        ]

                    },

                    options: {

                        cutout:
                            "72%",

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


    const barCanvas =
        document.getElementById(
            "bar"
        );


    if (
        barCanvas &&
        !deliveryBar
    ) {

        deliveryBar =
            new Chart(
                barCanvas,
                {

                    type:
                        "bar",

                    data: {

                        labels: [
                            "Current"
                        ],

                        datasets: [

                            {

                                label:
                                    "Revenue ₦m",

                                data: [
                                    0
                                ],

                                backgroundColor:
                                    "#e7b31a",

                                borderRadius:
                                    6

                            }

                        ]

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
}


/* =====================================================
   DOM EVENT SETUP
===================================================== */

function initializeEventListeners() {

    const navButtons =
        document.querySelectorAll(
            ".side nav button,.bottom button"
        );


    navButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    openPage(
                        button.dataset.page
                    );


                    document
                        .querySelector(
                            ".side"
                        )
                        ?.classList.remove(
                            "open"
                        );

                }
            );

        }
    );


    document
        .querySelectorAll(
            "[data-go]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openPage(
                            button.dataset.go
                        );

                    }
                );

            }
        );


    const menu =
        document.getElementById(
            "menu"
        );


    if (menu) {

        menu.addEventListener(
            "click",
            function () {

                document
                    .querySelector(
                        ".side"
                    )
                    ?.classList.toggle(
                        "open"
                    );

            }
        );

    }


    const search =
        document.getElementById(
            "search"
        );


    if (search) {

        search.addEventListener(
            "input",
            function () {

                renderDeliveries();

            }
        );

    }


    document
        .querySelectorAll(
            ".new"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openNewDelivery();

                    }
                );

            }
        );


    const closeButton =
        document.getElementById(
            "close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                closeDeliveryModal();

            }
        );

    }


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


    const modal =
        document.getElementById(
            "modal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    this
                ) {

                    closeDeliveryModal();

                }

            }
        );

    }


    const trackButton =
        document.getElementById(
            "track"
        );


    if (trackButton) {

        trackButton.addEventListener(
            "click",
            trackDelivery
        );

    }
}


/* =====================================================
   RESTORE SESSION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeDeliveries();

        initializeCharts();

        initializeEventListeners();


        const loggedIn =
            sessionStorage.getItem(
                "blackRabbitLoggedIn"
            );


        const savedUser =
            JSON.parse(
                sessionStorage.getItem(
                    "blackRabbitCurrentUser"
                ) || "null"
            );


        if (
            loggedIn === "true" &&
            savedUser
        ) {

            const authScreen =
                document.getElementById(
                    "authScreen"
                );

            const mainApp =
                document.getElementById(
                    "mainApp"
                );


            if (authScreen) {
                authScreen.style.display =
                    "none";
            }

            if (mainApp) {
                mainApp.style.display =
                    "flex";
            }


            updateUserInformation(
                savedUser
            );

            configureRoleInterface(
                savedUser
            );

            refreshAllDeliveryViews();

            renderRiderAttendanceCard();

            renderRiderEarningsCard();

        }

    }
);
