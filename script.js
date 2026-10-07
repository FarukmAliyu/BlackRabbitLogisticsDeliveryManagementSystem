/* =====================================================
   SUPER ADMIN
===================================================== */

const SUPER_ADMIN = {

    phone:"08000000000",

    password:"Admin@123",

    firstName:"Super",

    lastName:"Admin",

    role:"super_admin",

    id:"SUPER-ADMIN"

};


/* =====================================================
   CURRENT ROLE
===================================================== */

let currentRole = "rider";

let editingDeliveryId = null;

/* =====================================================
   OFFICE GEO-FENCE / CHECK-IN FEE
===================================================== */

const OFFICE_LATITUDE = 10.5366473;
const OFFICE_LONGITUDE = 7.4682503;
const CHECK_IN_RADIUS_METERS = 200;
const DAILY_CHECK_IN_FEE = 1000;

let deliveryFilter = "All";


/* =====================================================
   AUTH HELPERS
===================================================== */

function selectRole(role){

    currentRole = role;

    document
        .getElementById("riderRoleBtn")
        .classList.toggle(
            "active",
            role === "rider"
        );

    document
        .getElementById("adminRoleBtn")
        .classList.toggle(
            "active",
            role === "admin"
        );

    document
        .getElementById("riderLoginForm")
        .classList.toggle(
            "hidden-auth",
            role !== "rider"
        );

    document
        .getElementById("adminLoginForm")
        .classList.toggle(
            "hidden-auth",
            role !== "admin"
        );

    document
        .getElementById("registerForm")
        .classList.add(
            "hidden-auth"
        );

    clearMessages();

}


function clearMessages(){

    document
        .querySelectorAll(".auth-message")
        .forEach(function(element){

            element.className =
                "auth-message";

            element.textContent = "";

        });

}


function togglePassword(id,button){

    const input =
        document.getElementById(id);

    if(input.type === "password"){

        input.type = "text";

        button.textContent = "Hide";

    }else{

        input.type = "password";

        button.textContent = "Show";

    }

}


function showAuthMessage(
    id,
    message,
    type
){

    const element =
        document.getElementById(id);

    if(!element){
        return;
    }

    element.textContent =
        message;

    element.className =
        "auth-message show " +
        type;

}


/* =====================================================
   PHONE
===================================================== */

function normalizePhone(phone){

    let value =
        String(phone || "")
            .replace(/\D/g,"");

    if(value.startsWith("234")){

        value =
            "0" +
            value.substring(3);

    }

    return value;

}


/* =====================================================
   RIDER REGISTRATION
===================================================== */

function showRegister(){

    selectRole("rider");

    document
        .getElementById("riderLoginForm")
        .classList.add(
            "hidden-auth"
        );

    document
        .getElementById("registerForm")
        .classList.remove(
            "hidden-auth"
        );

}


function showLogin(){

    document
        .getElementById("registerForm")
        .classList.add(
            "hidden-auth"
        );

    document
        .getElementById("riderLoginForm")
        .classList.remove(
            "hidden-auth"
        );

    document
        .getElementById("adminLoginForm")
        .classList.add(
            "hidden-auth"
        );

    document
        .getElementById("riderRoleBtn")
        .classList.add(
            "active"
        );

    document
        .getElementById("adminRoleBtn")
        .classList.remove(
            "active"
        );

    currentRole = "rider";

    clearMessages();

}


function getRiders(){

    return JSON.parse(
        localStorage.getItem(
            "blackRabbitRiders"
        ) || "[]"
    );

}


function saveRiders(riders){

    localStorage.setItem(
        "blackRabbitRiders",
        JSON.stringify(riders)
    );

}


function registerRider(){

    const firstName =
        document
            .getElementById("regFirstName")
            .value
            .trim();

    const lastName =
        document
            .getElementById("regLastName")
            .value
            .trim();

    const phone =
        normalizePhone(
            document
                .getElementById("regPhone")
                .value
        );

    const password =
        document
            .getElementById("regPassword")
            .value;

    const terms =
        document
            .getElementById("regTerms")
            .checked;


    if(
        !firstName ||
        !lastName ||
        !phone ||
        !password
    ){

        showAuthMessage(
            "registerMessage",
            "Please complete all required fields.",
            "error"
        );

        return;

    }


    if(phone.length !== 11){

        showAuthMessage(
            "registerMessage",
            "Please enter a valid Nigerian phone number.",
            "error"
        );

        return;

    }


    if(password.length < 6){

        showAuthMessage(
            "registerMessage",
            "Password must contain at least 6 characters.",
            "error"
        );

        return;

    }


    if(!terms){

        showAuthMessage(
            "registerMessage",
            "Please agree to the rider terms and conditions.",
            "error"
        );

        return;

    }


    const existing =
        getRiders();


    const phoneExists =
        existing.some(function(rider){

            return normalizePhone(
                rider.phone
            ) === phone;

        });


    if(phoneExists){

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
            String(
                existing.length + 1
            ).padStart(4,"0"),

        firstName,

        lastName,

        phone,

        password,

        role:"rider",

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


    setTimeout(function(){

        showLogin();

        document
            .getElementById("loginPhone")
            .value = phone;

    },1500);

}


/* =====================================================
   LOGIN
===================================================== */

function riderLogin(){

    const phone =
        normalizePhone(
            document
                .getElementById("loginPhone")
                .value
        );

    const password =
        document
            .getElementById("loginPassword")
            .value;


    const riders =
        getRiders();


    const rider =
        riders.find(function(user){

            return (
                normalizePhone(user.phone) === phone &&
                user.password === password
            );

        });


    if(!rider){

        showAuthMessage(
            "loginMessage",
            "Invalid rider phone number or password.",
            "error"
        );

        return;

    }


    loginSuccess(rider);

}


function adminLogin(){

    const phone =
        normalizePhone(
            document
                .getElementById("adminPhone")
                .value
        );

    const password =
        document
            .getElementById("adminPassword")
            .value;


    if(
        phone !== SUPER_ADMIN.phone ||
        password !== SUPER_ADMIN.password
    ){

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

function loginSuccess(user){

    sessionStorage.setItem(
        "blackRabbitLoggedIn",
        "true"
    );

    sessionStorage.setItem(
        "blackRabbitCurrentUser",
        JSON.stringify(user)
    );


    document
        .getElementById("authScreen")
        .style.display = "none";


    document
        .getElementById("mainApp")
        .style.display = "flex";


    updateUserInformation(user);

    configureRoleInterface(user);

    refreshAllDeliveryViews();

    renderRiderAttendanceCard();

    openPage("dashboard");

}


/* =====================================================
   USER INFORMATION
===================================================== */

function updateUserInformation(user){

    const first =
        user.firstName || "User";

    const last =
        user.lastName || "";


    const initials =
        (
            first.charAt(0) +
            last.charAt(0)
        ).toUpperCase();


    document
        .getElementById("sidebarAvatar")
        .textContent =
            initials || "U";


    document
        .getElementById("headerAvatar")
        .textContent =
            initials || "U";


    const roleText =
        user.role === "super_admin"
            ? "Super Admin"
            : "Rider";


    document
        .getElementById("sidebarUser")
        .innerHTML =
            first +
            " " +
            last +
            "<small>" +
            roleText +
            "</small>";


    document
        .getElementById("sub")
        .textContent =
            "Welcome back, " +
            first +
            ". Here's what's happening today.";

}


function configureRoleInterface(user){

    const adminOnlyPages = [
        "customers",
        "drivers",
        "analytics"
    ];


    adminOnlyPages.forEach(function(pageName){

        const button =
            document.querySelector(
                `[data-page="${pageName}"]`
            );

        if(button){

            button.style.display =
                user.role === "rider"
                    ? "none"
                    : "";

        }

    });

}


function forgotPassword(event){

    event.preventDefault();

    showAuthMessage(
        "loginMessage",
        "Password recovery will be connected to the backend later.",
        "success"
    );

}


function logout(){

    sessionStorage.removeItem(
        "blackRabbitLoggedIn"
    );

    sessionStorage.removeItem(
        "blackRabbitCurrentUser"
    );


    document
        .getElementById("mainApp")
        .style.display = "none";


    document
        .getElementById("authScreen")
        .style.display = "flex";


    document
        .getElementById("loginPhone")
        .value = "";

    document
        .getElementById("loginPassword")
        .value = "";


    showLogin();

}


/* =====================================================
   CURRENT USER
===================================================== */

function getCurrentUser(){

    return JSON.parse(
        sessionStorage.getItem(
            "blackRabbitCurrentUser"
        ) || "null"
    );

}


/* =====================================================
   ATTENDANCE
===================================================== */

function getAttendance(){

    return JSON.parse(
        localStorage.getItem(
            "blackRabbitAttendance"
        ) || "[]"
    );

}


function saveAttendance(records){

    localStorage.setItem(
        "blackRabbitAttendance",
        JSON.stringify(records)
    );

}


function getToday(){

    const now =
        new Date();

    return (
        now.getFullYear() +
        "-" +
        String(
            now.getMonth() + 1
        ).padStart(2,"0") +
        "-" +
        String(
            now.getDate()
        ).padStart(2,"0")
    );

}


function getCurrentTime(){

    return new Date()
        .toLocaleTimeString(
            "en-NG",
            {
                hour:"2-digit",
                minute:"2-digit",
                hour12:true
            }
        );

}


function getRiderTodayAttendance(){

    const user =
        getCurrentUser();


    if(
        !user ||
        user.role !== "rider"
    ){

        return null;

    }


    const records =
        getAttendance();


    return records.find(function(record){

        return (
            record.riderId === user.id &&
            record.date === getToday()
        );

    }) || null;

}


function getDistanceInMeters(lat1, lon1, lat2, lon2){

    const earthRadius = 6371000;

    const toRadians = function(value){
        return value * Math.PI / 180;
    };

    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadius * c;
}


function riderCheckIn(){

    const user =
        getCurrentUser();

    if(
        !user ||
        user.role !== "rider"
    ){

        alert(
            "Only riders can check in."
        );

        return;

    }

    const records =
        getAttendance();

    const today =
        getToday();

    const existing =
        records.find(function(record){

            return (
                record.riderId === user.id &&
                record.date === today
            );

        });

    if(existing){

        alert(
            "You have already checked in today."
        );

        return;

    }

    if(!navigator.geolocation){

        alert(
            "Location services are not available on this device. Please enable GPS/location services."
        );

        return;

    }

    const button =
        document.querySelector(
            "#riderAttendanceCard .attendance-btn"
        );

    if(button){

        button.disabled = true;
        button.textContent = "Checking location...";

    }

    navigator.geolocation.getCurrentPosition(

        function(position){

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

            if(
                distance >
                CHECK_IN_RADIUS_METERS
            ){

                if(button){

                    button.disabled = false;
                    button.textContent = "✓ Check In";

                }

                alert(
                    "Check-in denied. You are approximately " +
                    Math.round(distance) +
                    " meters from the office. You must be within " +
                    CHECK_IN_RADIUS_METERS +
                    " meters of the office to check in."
                );

                return;

            }

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

                checkOut:"",

                status:"Present",

                checkInFee:
                    DAILY_CHECK_IN_FEE,

                feeApplied:true,

                latitude:
                    latitude,

                longitude:
                    longitude,

                locationAccuracy:
                    Math.round(accuracy),

                distanceFromOffice:
                    Math.round(distance)

            };

            records.push(
                attendance
            );

            saveAttendance(records);

            renderRiderAttendanceCard();

            renderRiderEarningsCard();

            renderAttendancePage();

            alert(
                "Check-in successful at " +
                attendance.checkIn +
                ". Daily check-in fee: ₦" +
                formatMoney(DAILY_CHECK_IN_FEE)
            );

        },

        function(error){

            if(button){

                button.disabled = false;
                button.textContent = "✓ Check In";

            }

            let message =
                "Unable to verify your location.";

            if(error.code === 1){

                message =
                    "Location permission was denied. Please allow location access for this website and try again.";

            }else if(error.code === 2){

                message =
                    "Your location could not be determined. Make sure GPS/location services are enabled.";

            }else if(error.code === 3){

                message =
                    "Location request timed out. Move to an area with better GPS/network reception and try again.";

            }

            alert(message);

        },

        {
            enableHighAccuracy:true,
            timeout:15000,
            maximumAge:0
        }

    );

}

function riderCheckOut(){

    const user =
        getCurrentUser();


    if(
        !user ||
        user.role !== "rider"
    ){

        alert(
            "Only riders can check out."
        );

        return;

    }


    const records =
        getAttendance();


    const attendance =
        records.find(function(record){

            return (
                record.riderId === user.id &&
                record.date === getToday()
            );

        });


    if(!attendance){

        alert(
            "You must check in before checking out."
        );

        return;

    }


    if(attendance.checkOut){

        alert(
            "You have already checked out today."
        );

        return;

    }


    attendance.checkOut =
        getCurrentTime();

    attendance.status =
        "Checked Out";


    saveAttendance(records);

    renderRiderAttendanceCard();

    renderRiderEarningsCard();

    renderAttendancePage();


    alert(
        "Check-out successful at " +
        attendance.checkOut
    );

}


/* =====================================================
   WEEKLY EARNINGS
===================================================== */

function getWeekStart(dateValue){

    const date =
        new Date(dateValue || new Date());

    date.setHours(0,0,0,0);

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


function getWeekEnd(dateValue){

    const start =
        getWeekStart(dateValue);

    const end =
        new Date(start);

    end.setDate(
        end.getDate() + 6
    );

    end.setHours(
        23,59,59,999
    );

    return end;
}


function getWeekLabel(){

    const start =
        getWeekStart();

    const end =
        getWeekEnd();

    return (
        start.toLocaleDateString(
            "en-NG",
            {
                day:"numeric",
                month:"short"
            }
        ) +
        " - " +
        end.toLocaleDateString(
            "en-NG",
            {
                day:"numeric",
                month:"short",
                year:"numeric"
            }
        )
    );
}


function getRiderWeeklyFinancials(riderId){

    const start =
        getWeekStart();

    const end =
        getWeekEnd();

    const deliveries =
        getDeliveries().filter(function(delivery){

            if(
                delivery.riderId !== riderId ||
                delivery.status !== "Delivered"
            ){

                return false;

            }

            const date =
                new Date(
                    delivery.updatedAt ||
                    delivery.createdAt
                );

            return (
                date >= start &&
                date <= end
            );

        });

    const grossEarnings =
        deliveries.reduce(
            function(total,delivery){

                return total +
                    Number(
                        delivery.riderEarning || 0
                    );

            },
            0
        );

    const attendance =
        getAttendance().filter(function(record){

            if(
                record.riderId !== riderId ||
                !record.date
            ){

                return false;

            }

            const date =
                new Date(
                    record.date + "T00:00:00"
                );

            return (
                date >= start &&
                date <= end &&
                record.feeApplied !== false
            );

        });

    const checkInFees =
        attendance.reduce(
            function(total,record){

                return total +
                    Number(
                        record.checkInFee ||
                        DAILY_CHECK_IN_FEE
                    );

            },
            0
        );

    return {

        grossEarnings:grossEarnings,

        checkInFees:checkInFees,

        netEarnings:
            grossEarnings -
            checkInFees,

        deliveryCount:
            deliveries.length,

        checkInCount:
            attendance.length

    };

}


function renderRiderEarningsCard(){

    const container =
        document.getElementById(
            "riderEarningsCard"
        );

    if(!container){
        return;
    }

    const user =
        getCurrentUser();

    if(
        !user ||
        user.role !== "rider"
    ){

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
                        Monday - Sunday · ${getWeekLabel()}
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
                <strong>₦${formatMoney(
                    DAILY_CHECK_IN_FEE
                )}</strong>.
                A fee is recorded once per successful check-in day.

            </div>

        </div>

    `;

}


/* =====================================================
   RIDER ATTENDANCE CARD
===================================================== */

function renderRiderAttendanceCard(){

    const container =
        document.getElementById(
            "riderAttendanceCard"
        );


    if(!container){
        return;
    }


    const user =
        getCurrentUser();


    if(
        !user ||
        user.role !== "rider"
    ){

        container.innerHTML = "";

        return;

    }


    const attendance =
        getRiderTodayAttendance();


    if(!attendance){

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
                            Check in when you start your duty. You must be within 200 meters of the office. A successful check-in records a ₦1,000 daily fee.
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


    if(attendance.checkOut){

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
                            Your attendance for today has been completed.
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

                        <small>STATUS</small>

                        <strong>
                            Checked Out
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

                    <small>STATUS</small>

                    <strong>
                        Present
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

function renderAttendancePage(){

    const user =
        getCurrentUser();


    if(!user){
        return;
    }


    if(user.role === "super_admin"){

        renderAdminAttendancePage();

    }else{

        renderRiderAttendancePage();

    }

}


function renderRiderAttendancePage(){

    const container =
        document.getElementById(
            "attendanceContent"
        );


    if(!container){
        return;
    }


    const attendance =
        getRiderTodayAttendance();


    if(!attendance){

        container.innerHTML = `

            <div class="card rider-attendance-card">

                <div class="attendance-top">

                    <div>

                        <div class="attendance-label">
                            MY ATTENDANCE
                        </div>

                        <div class="attendance-title">
                            Not Checked In
                        </div>

                        <div class="attendance-description">
                            You have not checked in today. GPS must confirm you are within 200 meters of the office. A ₦1,000 daily fee is recorded after successful check-in.
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

        `;

        return;

    }


    container.innerHTML = `

        <div class="card rider-attendance-card">

            <div class="attendance-top">

                <div>

                    <div class="attendance-label">
                        MY ATTENDANCE
                    </div>

                    <div class="attendance-title">
                        ${attendance.status}
                    </div>

                    <div class="attendance-description">
                        Your attendance record for today.
                    </div>

                </div>

                <span class="attendance-status">
                    ${attendance.status}
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
                        ${attendance.checkOut || "Not Checked Out"}
                    </strong>

                </div>

                <div class="attendance-detail">

                    <small>STATUS</small>

                    <strong>
                        ${attendance.status}
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

            ${
                attendance.checkOut
                ?
                `
                    <button
                        class="attendance-btn disabled"
                        disabled
                    >
                        Attendance Complete
                    </button>
                `
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

    `;

}


function renderAdminAttendancePage(){

    const container =
        document.getElementById(
            "attendanceContent"
        );


    if(!container){
        return;
    }


    const records =
        getAttendance();


    const riders =
        getRiders();


    const today =
        getToday();


    const todayRecords =
        records.filter(function(record){

            return record.date === today;

        });


    const presentCount =
        todayRecords.filter(function(record){

            return (
                record.status === "Present" ||
                record.status === "Checked Out"
            );

        }).length;


    const checkedOutCount =
        todayRecords.filter(function(record){

            return record.status === "Checked Out";

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
                    Monitor rider check-in and check-out records.
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
                            <th>Status</th>

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
                        Monday - Sunday · ${getWeekLabel()}
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


function weeklyRiderEarningsRows(){

    const riders =
        getRiders();

    if(!riders.length){

        return `

            <tr>

                <td colspan="6">
                    No registered riders yet.
                </td>

            </tr>

        `;

    }

    return riders.map(function(rider){

        const financials =
            getRiderWeeklyFinancials(
                rider.id
            );

        return `

            <tr
                data-earnings-rider="${escapeHtml(
                    (
                        rider.firstName +
                        " " +
                        rider.lastName
                    ).toLowerCase()
                )}"
            >

                <td>
                    <strong>
                        ${escapeHtml(
                            rider.firstName +
                            " " +
                            rider.lastName
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(rider.id)}
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
                    <strong class="green">
                        ₦${formatMoney(
                            financials.netEarnings
                        )}
                    </strong>
                </td>

            </tr>

        `;

    }).join("");

}


function attendanceRows(records){

    const riders =
        getRiders();


    const today =
        getToday();


    const todayRecords =
        records.filter(function(record){

            return record.date === today;

        });


    if(!riders.length && !records.length){

        return `

            <tr>

                <td colspan="9">
                    No registered riders yet.
                </td>

            </tr>

        `;

    }


    const rows = riders.map(function(rider){

        const record =
            todayRecords.find(function(item){

                return item.riderId === rider.id;

            });


        const status =
            record
            ? record.status
            : "Absent";


        const statusClass =
            status === "Checked Out"
            ? "checked-out"
            : status === "Absent"
            ? "absent"
            : "present";


        return `

            <tr
                data-rider-name="${(
                    rider.firstName +
                    " " +
                    rider.lastName
                ).toLowerCase()}"

                data-rider-id="${(
                    rider.id
                ).toLowerCase()}"
            >

                <td>
                    ${rider.firstName} ${rider.lastName}
                </td>

                <td>
                    ${rider.id}
                </td>

                <td>
                    ${rider.phone}
                </td>

                <td>
                    ${today}
                </td>

                <td>
                    ${record?.checkIn || "-"}
                </td>

                <td>
                    ${record?.checkOut || "-"}
                </td>

                <td>

                    <span class="status ${statusClass}">
                        ${status}
                    </span>

                </td>

                <td>
                    ${
                        record
                        ? "₦" + formatMoney(
                            record.checkInFee ||
                            DAILY_CHECK_IN_FEE
                        )
                        : "₦0"
                    }
                </td>

                <td>
                    ${
                        record?.distanceFromOffice !== undefined
                        ? record.distanceFromOffice + " m"
                        : "-"
                    }
                </td>

            </tr>

        `;

    });


    return rows.join("");

}


function filterAttendance(){

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
        .forEach(function(row){

            const name =
                row.dataset.riderName || "";

            const id =
                row.dataset.riderId || "";


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

function getDeliveries(){

    const records =
        JSON.parse(
            localStorage.getItem(
                "blackRabbitDeliveries"
            ) || "[]"
        );

    let changed = false;

    records.forEach(function(delivery){

        if(
            delivery.riderEarning === undefined ||
            delivery.riderEarning === null
        ){

            delivery.riderEarning = 0;
            changed = true;

        }

    });

    if(changed){

        localStorage.setItem(
            "blackRabbitDeliveries",
            JSON.stringify(records)
        );

    }

    return records;

}


function saveDeliveries(records){

    localStorage.setItem(
        "blackRabbitDeliveries",
        JSON.stringify(records)
    );

}


/* =====================================================
   INITIAL DELIVERY DATA
===================================================== */

function initializeDeliveries(){

    const existing =
        localStorage.getItem(
            "blackRabbitDeliveries"
        );


    if(existing){
        return;
    }


    const initialDeliveries = [

        {
            id:"BR-10482",
            customerName:"Amina Musa",
            customerPhone:"08012345001",
            pickupAddress:"Barnawa",
            destination:"Kaduna South",
            packageDescription:"Documents",
            amount:8500,
            notes:"",
            riderId:"",
            status:"In Transit",
            createdAt:new Date().toISOString(),
            updatedAt:new Date().toISOString(),
            createdBy:"System",
            updatedBy:"System",
            history:[
                {
                    status:"Pending",
                    timestamp:new Date().toISOString(),
                    by:"System"
                },
                {
                    status:"In Transit",
                    timestamp:new Date().toISOString(),
                    by:"System"
                }
            ]
        },

        {
            id:"BR-10481",
            customerName:"Yusuf Kabir",
            customerPhone:"08012345002",
            pickupAddress:"Kawo",
            destination:"Ungwan Rimi",
            packageDescription:"Parcel",
            amount:5200,
            notes:"",
            riderId:"",
            status:"Delivered",
            createdAt:new Date().toISOString(),
            updatedAt:new Date().toISOString(),
            createdBy:"System",
            updatedBy:"System",
            history:[
                {
                    status:"Pending",
                    timestamp:new Date().toISOString(),
                    by:"System"
                },
                {
                    status:"Delivered",
                    timestamp:new Date().toISOString(),
                    by:"System"
                }
            ]
        },

        {
            id:"BR-10480",
            customerName:"Safiya Ahmed",
            customerPhone:"08012345003",
            pickupAddress:"Malali",
            destination:"Tafawa Balewa",
            packageDescription:"Food package",
            amount:7800,
            notes:"",
            riderId:"",
            status:"Pending",
            createdAt:new Date().toISOString(),
            updatedAt:new Date().toISOString(),
            createdBy:"System",
            updatedBy:"System",
            history:[
                {
                    status:"Pending",
                    timestamp:new Date().toISOString(),
                    by:"System"
                }
            ]
        },

        {
            id:"BR-10479",
            customerName:"Maryam Bello",
            customerPhone:"08012345004",
            pickupAddress:"Kaduna North",
            destination:"Barnawa",
            packageDescription:"Clothing",
            amount:6400,
            notes:"",
            riderId:"",
            status:"Delivered",
            createdAt:new Date().toISOString(),
            updatedAt:new Date().toISOString(),
            createdBy:"System",
            updatedBy:"System",
            history:[
                {
                    status:"Pending",
                    timestamp:new Date().toISOString(),
                    by:"System"
                },
                {
                    status:"Delivered",
                    timestamp:new Date().toISOString(),
                    by:"System"
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

function generateDeliveryId(){

    const deliveries =
        getDeliveries();


    let id;


    do{

        const now =
            new Date();


        const date =
            now.getFullYear() +
            String(
                now.getMonth() + 1
            ).padStart(2,"0") +
            String(
                now.getDate()
            ).padStart(2,"0");


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

    }while(
        deliveries.some(function(item){
            return item.id === id;
        })
    );


    return id;

}


/* =====================================================
   DELIVERY PERMISSIONS
===================================================== */

function canEditDelivery(delivery){

    const user =
        getCurrentUser();


    if(!user || !delivery){
        return false;
    }


    if(user.role === "super_admin"){
        return true;
    }


    return delivery.riderId === user.id;

}


function canUpdateDeliveryStatus(delivery){

    return canEditDelivery(
        delivery
    );

}


/* =====================================================
   RIDER NAME
===================================================== */

function getRiderName(riderId){

    if(!riderId){
        return "Unassigned";
    }


    const rider =
        getRiders().find(function(item){

            return item.id === riderId;

        });


    if(!rider){
        return "Unknown Rider";
    }


    return (
        rider.firstName +
        " " +
        rider.lastName
    );

}


/* =====================================================
   DELIVERY STATUS CLASS
===================================================== */

function getStatusClass(status){

    return String(status)
        .toLowerCase()
        .replace(/\s+/g,"-");

}


/* =====================================================
   FILTER DELIVERIES BY ROLE
===================================================== */

function getVisibleDeliveries(){

    const all =
        getDeliveries();


    const user =
        getCurrentUser();


    if(!user){
        return [];
    }


    if(user.role === "super_admin"){

        return all;

    }


    return all.filter(function(delivery){

        return delivery.riderId === user.id;

    });

}


/* =====================================================
   DELIVERY TABLE
===================================================== */

function deliveryRows(records){

    const user =
        getCurrentUser();


    if(!records.length){

        return `

            <tr>

                <td colspan="8">

                    No deliveries found.

                </td>

            </tr>

        `;

    }


    return records.map(function(delivery){

        const canEdit =
            canEditDelivery(delivery);


        let actions = "";


        if(user?.role === "super_admin"){

            actions = `

                <button
                    class="small-btn yellow"
                    onclick="openEditDelivery('${delivery.id}')"
                >
                    Edit
                </button>

            `;

        }else{

            actions = `

                ${
                    canEdit
                    ?
                    `
                        <button
                            class="small-btn blue"
                            onclick="openEditDelivery('${delivery.id}')"
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
                    <strong>${delivery.id}</strong>
                </td>

                <td>

                    <strong>
                        ${escapeHtml(delivery.customerName)}
                    </strong>

                    <br>

                    <small>
                        ${escapeHtml(delivery.customerPhone || "")}
                    </small>

                </td>

                <td>
                    ${escapeHtml(delivery.pickupAddress)}
                </td>

                <td>
                    ${escapeHtml(delivery.destination)}
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
                        ${delivery.status}
                    </span>

                </td>

                <td>
                    ₦${formatMoney(delivery.amount)}
                </td>

                <td>

                    <div class="action-group">

                        ${actions}

                    </div>

                </td>

            </tr>

        `;

    }).join("");

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value){

    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


/* =====================================================
   MONEY
===================================================== */

function formatMoney(value){

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-NG"
    );

}


/* =====================================================
   RENDER DELIVERIES
===================================================== */

function renderDeliveries(){

    const rows =
        document.getElementById(
            "allRows"
        );


    if(!rows){
        return;
    }


    let records =
        getVisibleDeliveries();


    const search =
        String(
            document
                .getElementById("search")
                ?.value || ""
        )
        .toLowerCase()
        .trim();


    if(search){

        records =
            records.filter(function(delivery){

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

                ].some(function(value){

                    return String(value || "")
                        .toLowerCase()
                        .includes(search);

                });

            });

    }


    if(deliveryFilter !== "All"){

        records =
            records.filter(function(delivery){

                return (
                    delivery.status ===
                    deliveryFilter
                );

            });

    }


    records =
        records.slice().reverse();


    rows.innerHTML =
        deliveryRows(records);


    updateDeliveryTabs();

}


/* =====================================================
   DELIVERY TABS
===================================================== */

function setDeliveryFilter(
    filter,
    button
){

    deliveryFilter =
        filter;


    document
        .querySelectorAll(
            "#deliveries .tabs button"
        )
        .forEach(function(item){

            item.classList.remove(
                "selected"
            );

        });


    button.classList.add(
        "selected"
    );


    renderDeliveries();

}


function updateDeliveryTabs(){

    const deliveries =
        getVisibleDeliveries();


    const counts = {

        All:deliveries.length,

        Pending:0,

        Assigned:0,

        "Picked Up":0,

        "In Transit":0,

        Delivered:0

    };


    deliveries.forEach(function(delivery){

        if(
            Object.prototype.hasOwnProperty.call(
                counts,
                delivery.status
            )
        ){

            counts[delivery.status]++;

        }

    });


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


    buttons.forEach(function(button,index){

        const label =
            labels[index];


        if(label){

            button.textContent =
                label +
                " " +
                counts[label];

        }

    });

}


/* =====================================================
   RECENT DELIVERIES
===================================================== */

function renderRecentDeliveries(){

    const container =
        document.getElementById(
            "recent"
        );


    if(!container){
        return;
    }


    const deliveries =
        getVisibleDeliveries()
            .slice()
            .reverse()
            .slice(0,5);


    const user =
        getCurrentUser();


    if(!deliveries.length){

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
   DASHBOARD STATISTICS
===================================================== */

function updateDashboardStats(){

    const deliveries =
        getVisibleDeliveries();


    const total =
        deliveries.length;


    const inTransit =
        deliveries.filter(function(item){

            return item.status === "In Transit";

        }).length;


    const delivered =
        deliveries.filter(function(item){

            return item.status === "Delivered";

        }).length;


    const pending =
        deliveries.filter(function(item){

            return (
                item.status === "Pending" ||
                item.status === "Assigned" ||
                item.status === "Picked Up"
            );

        }).length;


    document
        .getElementById(
            "totalDeliveriesStat"
        )
        .textContent =
            total;


    document
        .getElementById(
            "inTransitStat"
        )
        .textContent =
            inTransit;


    document
        .getElementById(
            "deliveredStat"
        )
        .textContent =
            delivered;


    document
        .getElementById(
            "pendingStat"
        )
        .textContent =
            pending;


    document
        .getElementById(
            "donutTotal"
        )
        .innerHTML =
            total +
            "<small>Total</small>";


    const deliveredPercent =
        total
        ? ((delivered / total) * 100).toFixed(1)
        : 0;


    const transitPercent =
        total
        ? ((inTransit / total) * 100).toFixed(1)
        : 0;


    const pendingPercent =
        total
        ? ((pending / total) * 100).toFixed(1)
        : 0;


    document
        .getElementById(
            "deliveredPercent"
        )
        .textContent =
            deliveredPercent + "%";


    document
        .getElementById(
            "transitPercent"
        )
        .textContent =
            transitPercent + "%";


    document
        .getElementById(
            "pendingPercent"
        )
        .textContent =
            pendingPercent + "%";


    if(window.deliveryDonut){

        window.deliveryDonut.data.datasets[0].data = [

            delivered,

            inTransit,

            pending

        ];


        window.deliveryDonut.update();

    }


    if(window.deliveryBar){

        const revenue =
            deliveries.reduce(
                function(total,item){

                    return total +
                        Number(
                            item.amount || 0
                        );

                },
                0
            );


        document
            .getElementById(
                "revenueStat"
            )
            .textContent =
                "₦" +
                formatMoney(revenue);


        window.deliveryBar.data.datasets[0].data = [

            revenue / 1000000

        ];


        window.deliveryBar.update();

    }


    updateSuccessRate(
        deliveries
    );

}


function updateSuccessRate(deliveries){

    const completed =
        deliveries.filter(function(item){

            return item.status === "Delivered";

        }).length;


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


    if(element){

        element.textContent =
            success + "%";

    }

}


/* =====================================================
   REFRESH ALL DELIVERY VIEWS
===================================================== */

function refreshAllDeliveryViews(){

    renderDeliveries();

    renderRecentDeliveries();

    updateDashboardStats();

    renderCustomers();

    renderDrivers();

    renderRiderEarningsCard();

    renderAttendancePage();

}


/* =====================================================
   MODAL RIDER OPTIONS
===================================================== */

function populateRiderOptions(
    selectedId,
    lockToCurrentRider
){

    const select =
        document.getElementById(
            "deliveryRider"
        );


    const riders =
        getRiders();


    const user =
        getCurrentUser();


    select.innerHTML = `

        <option value="">
            Unassigned
        </option>

    `;


    riders.forEach(function(rider){

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


        if(
            selectedId &&
            selectedId === rider.id
        ){

            option.selected =
                true;

        }


        select.appendChild(
            option
        );

    });


    if(
        lockToCurrentRider &&
        user &&
        user.role === "rider"
    ){

        select.value =
            user.id;


        select.disabled =
            true;

    }else{

        select.disabled =
            false;

    }

}


/* =====================================================
   OPEN NEW DELIVERY
===================================================== */

function openNewDelivery(){

    editingDeliveryId =
        null;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
            "Create New Delivery";


    document
        .getElementById(
            "modalDescription"
        )
        .textContent =
            "Log a real delivery into the system.";


    document
        .getElementById(
            "saveDeliveryButton"
        )
        .textContent =
            "Create Delivery";


    document
        .getElementById(
            "deliveryEditId"
        )
        .value = "";


    document
        .getElementById(
            "form"
        )
        .reset();


    const user =
        getCurrentUser();


    const isRider =
        user &&
        user.role === "rider";


    populateRiderOptions(
        isRider ? user.id : "",
        isRider
    );

    document
        .getElementById(
            "deliveryRiderEarning"
        )
        .disabled =
            isRider;


    document
        .getElementById(
            "deliveryStatus"
        )
        .value =
            isRider
            ? "Assigned"
            : "Pending";


    document
        .getElementById(
            "deliveryHistory"
        )
        .innerHTML = "";


    document
        .getElementById(
            "deliveryHistory"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "modal"
        )
        .style.display =
            "flex";

}


/* =====================================================
   OPEN EDIT DELIVERY
===================================================== */

function openEditDelivery(id){

    const delivery =
        getDeliveries().find(function(item){

            return item.id === id;

        });


    if(!delivery){

        alert(
            "Delivery not found."
        );

        return;

    }


    if(!canEditDelivery(delivery)){

        alert(
            "You do not have permission to update this delivery."
        );

        return;

    }


    editingDeliveryId =
        id;


    document
        .getElementById(
            "modalTitle"
        )
        .textContent =
            "Update Delivery " +
            delivery.id;


    document
        .getElementById(
            "modalDescription"
        )
        .textContent =
            "Update delivery details, assignment or status.";


    document
        .getElementById(
            "saveDeliveryButton"
        )
        .textContent =
            "Save Changes";


    document
        .getElementById(
            "deliveryEditId"
        )
        .value =
            delivery.id;


    document
        .getElementById(
            "deliveryCustomer"
        )
        .value =
            delivery.customerName || "";


    document
        .getElementById(
            "deliveryPhone"
        )
        .value =
            delivery.customerPhone || "";


    document
        .getElementById(
            "deliveryPickup"
        )
        .value =
            delivery.pickupAddress || "";


    document
        .getElementById(
            "deliveryDestination"
        )
        .value =
            delivery.destination || "";


    document
        .getElementById(
            "deliveryPackage"
        )
        .value =
            delivery.packageDescription || "";


    document
        .getElementById(
            "deliveryAmount"
        )
        .value =
            delivery.amount || "";

    document
        .getElementById(
            "deliveryRiderEarning"
        )
        .value =
            delivery.riderEarning || "";


    document
        .getElementById(
            "deliveryStatus"
        )
        .value =
            delivery.status;


    document
        .getElementById(
            "deliveryNotes"
        )
        .value =
            delivery.notes || "";


    const user =
        getCurrentUser();


    populateRiderOptions(
        delivery.riderId || "",
        user?.role === "rider"
    );


    if(user?.role === "rider"){

        document
            .getElementById(
                "deliveryRider"
            )
            .disabled = true;

        document
            .getElementById(
                "deliveryRiderEarning"
            )
            .disabled = true;

    }else{

        document
            .getElementById(
                "deliveryRiderEarning"
            )
            .disabled = false;

    }


    renderDeliveryHistory(
        delivery
    );


    document
        .getElementById(
            "modal"
        )
        .style.display =
            "flex";

}


/* =====================================================
   DELIVERY HISTORY
===================================================== */

function renderDeliveryHistory(
    delivery
){

    const container =
        document.getElementById(
            "deliveryHistory"
        );


    if(
        !delivery.history ||
        !delivery.history.length
    ){

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
                .map(function(item){

                    return `

                        <div class="history-item">

                            <div class="history-dot"></div>

                            <div>

                                <strong>
                                    ${escapeHtml(item.status)}
                                </strong>

                                <small>
                                    ${escapeHtml(
                                        formatDateTime(
                                            item.timestamp
                                        )
                                    )}
                                    ·
                                    ${escapeHtml(
                                        item.by || "System"
                                    )}
                                </small>

                            </div>

                        </div>

                    `;

                })
                .join("")
        }

    `;

}


/* =====================================================
   DATE/TIME FORMAT
===================================================== */

function formatDateTime(value){

    if(!value){
        return "";
    }


    const date =
        new Date(value);


    if(Number.isNaN(date.getTime())){

        return String(value);

    }


    return date.toLocaleString(
        "en-NG",
        {
            dateStyle:"medium",
            timeStyle:"short"
        }
    );

}


/* =====================================================
   SAVE DELIVERY
===================================================== */

function saveDelivery(event){

    event.preventDefault();


    const user =
        getCurrentUser();


    if(!user){

        alert(
            "Please login first."
        );

        return;

    }


    const customerName =
        document
            .getElementById(
                "deliveryCustomer"
            )
            .value
            .trim();


    const customerPhone =
        normalizePhone(
            document
                .getElementById(
                    "deliveryPhone"
                )
                .value
        );


    const pickupAddress =
        document
            .getElementById(
                "deliveryPickup"
            )
            .value
            .trim();


    const destination =
        document
            .getElementById(
                "deliveryDestination"
            )
            .value
            .trim();


    const packageDescription =
        document
            .getElementById(
                "deliveryPackage"
            )
            .value
            .trim();


    const amount =
        Number(
            document
                .getElementById(
                    "deliveryAmount"
                )
                .value || 0
        );

    const riderEarning =
        Number(
            document
                .getElementById(
                    "deliveryRiderEarning"
                )
                .value || 0
        );


    const notes =
        document
            .getElementById(
                "deliveryNotes"
            )
            .value
            .trim();


    const status =
        document
            .getElementById(
                "deliveryStatus"
            )
            .value;


    const riderSelect =
        document
            .getElementById(
                "deliveryRider"
            );


    const riderId =
        riderSelect.value;


    if(
        !customerName ||
        !customerPhone ||
        !pickupAddress ||
        !destination
    ){

        alert(
            "Please complete the customer, phone, pickup and destination fields."
        );

        return;

    }


    if(customerPhone.length !== 11){

        alert(
            "Please enter a valid Nigerian phone number."
        );

        return;

    }


    let deliveries =
        getDeliveries();


    /* -------------------------------------------------
       UPDATE EXISTING DELIVERY
    ------------------------------------------------- */

    if(editingDeliveryId){

        const index =
            deliveries.findIndex(function(item){

                return item.id === editingDeliveryId;

            });


        if(index === -1){

            alert(
                "Delivery no longer exists."
            );

            return;

        }


        const delivery =
            deliveries[index];


        if(!canEditDelivery(delivery)){

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

        delivery.riderEarning =
            user.role === "super_admin"
            ? riderEarning
            : Number(
                delivery.riderEarning || 0
            );

        delivery.notes =
            notes;


        if(user.role === "super_admin"){

            delivery.riderId =
                riderId || "";

        }else{

            delivery.riderId =
                user.id;

        }


        delivery.status =
            status;


        delivery.updatedAt =
            new Date().toISOString();


        delivery.updatedBy =
            getUserDisplayName(user);


        if(oldStatus !== status){

            if(!delivery.history){
                delivery.history = [];
            }


            delivery.history.push({

                status:status,

                timestamp:
                    new Date().toISOString(),

                by:
                    getUserDisplayName(user)

            });

        }


        if(
            oldRider !== delivery.riderId &&
            user.role === "super_admin"
        ){

            if(!delivery.history){
                delivery.history = [];
            }


            delivery.history.push({

                status:
                    "Assigned to " +
                    getRiderName(
                        delivery.riderId
                    ),

                timestamp:
                    new Date().toISOString(),

                by:
                    getUserDisplayName(user)

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


    /* -------------------------------------------------
       CREATE NEW DELIVERY
    ------------------------------------------------- */

    else{

        let assignedRider =
            riderId || "";


        if(user.role === "rider"){

            assignedRider =
                user.id;


            if(status === "Pending"){

                // Rider-created deliveries
                // automatically become Assigned
                // to the logged-in rider.

            }

        }


        let finalStatus =
            status;


        if(
            user.role === "rider" &&
            finalStatus === "Pending"
        ){

            finalStatus =
                "Assigned";

        }


        const now =
            new Date().toISOString();


        const delivery = {

            id:
                generateDeliveryId(),

            customerName,

            customerPhone,

            pickupAddress,

            destination,

            packageDescription,

            amount,

            riderEarning:
                user.role === "super_admin"
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

            createdBy:
                getUserDisplayName(user),

            updatedBy:
                getUserDisplayName(user),

            history:[

                {

                    status:
                        finalStatus,

                    timestamp:
                        now,

                    by:
                        getUserDisplayName(user)

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

function getUserDisplayName(user){

    if(!user){
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

function closeDeliveryModal(){

    document
        .getElementById(
            "modal"
        )
        .style.display =
            "none";


    document
        .getElementById(
            "form"
        )
        .reset();


    document
        .getElementById(
            "deliveryHistory"
        )
        .innerHTML = "";


    document
        .getElementById(
            "deliveryHistory"
        )
        .classList.add(
            "hidden"
        );


    editingDeliveryId =
        null;

}


/* =====================================================
   UPDATE RIDER STATUS QUICKLY
===================================================== */

function updateDeliveryStatus(
    id,
    newStatus
){

    const user =
        getCurrentUser();


    if(!user){
        return;
    }


    const deliveries =
        getDeliveries();


    const delivery =
        deliveries.find(function(item){

            return item.id === id;

        });


    if(!delivery){

        alert(
            "Delivery not found."
        );

        return;

    }


    if(
        !canUpdateDeliveryStatus(
            delivery
        )
    ){

        alert(
            "You do not have permission to update this delivery."
        );

        return;

    }


    if(
        delivery.status === newStatus
    ){

        return;

    }


    delivery.status =
        newStatus;


    delivery.updatedAt =
        new Date().toISOString();


    delivery.updatedBy =
        getUserDisplayName(user);


    if(!delivery.history){

        delivery.history = [];

    }


    delivery.history.push({

        status:newStatus,

        timestamp:
            new Date().toISOString(),

        by:
            getUserDisplayName(user)

    });


    saveDeliveries(
        deliveries
    );


    refreshAllDeliveryViews();

}


/* =====================================================
   CUSTOMERS
===================================================== */

function renderCustomers(){

    const container =
        document.getElementById(
            "customerList"
        );


    if(!container){
        return;
    }


    const deliveries =
        getDeliveries();


    const visible =
        getVisibleDeliveries();


    const customers = {};


    visible.forEach(function(delivery){

        const key =
            delivery.customerPhone ||
            delivery.customerName;


        if(!customers[key]){

            customers[key] = {

                name:
                    delivery.customerName,

                phone:
                    delivery.customerPhone,

                count:0

            };

        }


        customers[key].count++;

    });


    const list =
        Object.values(
            customers
        );


    if(!list.length){

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
        list.map(function(customer){

            const initials =
                customer.name
                    .split(" ")
                    .map(function(word){
                        return word.charAt(0);
                    })
                    .join("")
                    .substring(0,2)
                    .toUpperCase();


            return `

                <div>

                    <b>
                        ${escapeHtml(initials)}
                    </b>

                    <strong>
                        ${escapeHtml(customer.name)}
                    </strong>

                    <small>
                        ${customer.count}
                        delivery
                        ${customer.count === 1 ? "" : "ies"}
                    </small>

                    <small>
                        ${escapeHtml(customer.phone || "")}
                    </small>

                </div>

            `;

        }).join("");

}


/* =====================================================
   DRIVERS
===================================================== */

function renderDrivers(){

    const container =
        document.getElementById(
            "driverList"
        );


    if(!container){
        return;
    }


    const riders =
        getRiders();


    if(!riders.length){

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
        riders.map(function(rider){

            const assigned =
                deliveries.filter(function(delivery){

                    return (
                        delivery.riderId === rider.id &&
                        delivery.status !== "Delivered" &&
                        delivery.status !== "Cancelled"
                    );

                }).length;


            return `

                <div>

                    <b>
                        ${
                            (
                                rider.firstName.charAt(0) +
                                rider.lastName.charAt(0)
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
                        ${escapeHtml(rider.id)}
                    </small>

                    <small class="green">
                        ${assigned}
                        active deliveries
                    </small>

                </div>

            `;

        }).join("");

}


/* =====================================================
   TRACKING
===================================================== */

function trackDelivery(){

    const id =
        document
            .getElementById(
                "trackId"
            )
            .value
            .trim()
            .toLowerCase();


    if(!id){

        alert(
            "Enter a delivery ID."
        );

        return;

    }


    const visible =
        getVisibleDeliveries();


    const delivery =
        visible.find(function(item){

            return (
                item.id.toLowerCase() ===
                id
            );

        });


    const result =
        document.getElementById(
            "trackingResult"
        );


    if(!delivery){

        result.classList.remove(
            "hidden"
        );


        result.innerHTML = `

            <h2>
                Delivery Not Found
            </h2>

            <p>
                No delivery with this ID was found in your available deliveries.
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
                    ${escapeHtml(delivery.id)}
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
                ${escapeHtml(delivery.status)}
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
                history.map(function(item){

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
                                        item.by || "System"
                                    )}
                                </small>

                            </span>

                        </div>

                    `;

                }).join("")
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

const navButtons =
    document.querySelectorAll(
        ".side nav button,.bottom button"
    );


const pageInfo = {

    dashboard:[
        "Dashboard",
        "Welcome back."
    ],

    deliveries:[
        "Deliveries",
        "Manage delivery orders."
    ],

    tracking:[
        "Tracking",
        "Track deliveries."
    ],

    customers:[
        "Customers",
        "Manage customer profiles."
    ],

    drivers:[
        "Drivers",
        "Manage your riders and fleet."
    ],

    analytics:[
        "Analytics",
        "Monitor logistics performance."
    ],

    attendance:[
        "Attendance",
        "Monitor rider attendance, location verification and weekly earnings."
    ],

    settings:[
        "Settings",
        "Configure your delivery management system."
    ]

};


function openPage(name){

    document
        .querySelectorAll(".page")
        .forEach(function(page){

            page.classList.toggle(
                "hidden",
                page.id !== name
            );

        });


    document
        .querySelectorAll(
            ".side nav button,.bottom button"
        )
        .forEach(function(button){

            button.classList.toggle(
                "active",
                button.dataset.page === name
            );

        });


    if(pageInfo[name]){

        document
            .getElementById("title")
            .textContent =
                pageInfo[name][0];


        document
            .getElementById("sub")
            .textContent =
                pageInfo[name][1];

    }


    if(name === "attendance"){

        renderAttendancePage();

    }


    if(name === "deliveries"){

        renderDeliveries();

    }


    if(name === "customers"){

        renderCustomers();

    }


    if(name === "drivers"){

        renderDrivers();

    }

}


navButtons.forEach(function(button){

    button.addEventListener(
        "click",
        function(){

            openPage(
                button.dataset.page
            );


            document
                .querySelector(".side")
                .classList.remove(
                    "open"
                );

        }
    );

});


document
    .querySelectorAll("[data-go]")
    .forEach(function(button){

        button.addEventListener(
            "click",
            function(){

                openPage(
                    button.dataset.go
                );

            }
        );

    });


document
    .getElementById("menu")
    .addEventListener(
        "click",
        function(){

            document
                .querySelector(".side")
                .classList.toggle(
                    "open"
                );

        }
    );


/* =====================================================
   DELIVERY SEARCH
===================================================== */

document
    .getElementById("search")
    .addEventListener(
        "input",
        function(){

            renderDeliveries();

        }
    );


/* =====================================================
   MODAL BUTTONS
===================================================== */

document
    .querySelectorAll(".new")
    .forEach(function(button){

        button.addEventListener(
            "click",
            function(){

                openNewDelivery();

            }
        );

    });


document
    .getElementById("close")
    .addEventListener(
        "click",
        function(){

            closeDeliveryModal();

        }
    );


document
    .getElementById("form")
    .addEventListener(
        "submit",
        saveDelivery
    );


document
    .getElementById("modal")
    .addEventListener(
        "click",
        function(event){

            if(event.target === this){

                closeDeliveryModal();

            }

        }
    );


/* =====================================================
   TRACK BUTTON
===================================================== */

document
    .getElementById("track")
    .addEventListener(
        "click",
        trackDelivery
    );


/* =====================================================
   CHARTS
===================================================== */

let deliveryLineChart = null;

let deliveryDonut = null;

let deliveryBar = null;


function initializeCharts(){

    const lineCanvas =
        document.getElementById(
            "line"
        );


    if(lineCanvas){

        deliveryLineChart =
            new Chart(
                lineCanvas,
                {

                    type:"line",

                    data:{

                        labels:[
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun"
                        ],

                        datasets:[{

                            label:"Deliveries",

                            data:[
                                0,
                                0,
                                0,
                                0,
                                0,
                                0,
                                0
                            ],

                            borderColor:"#e7b31a",

                            backgroundColor:
                                "rgba(231,179,26,.12)",

                            fill:true,

                            tension:.4

                        }]

                    },

                    options:{

                        responsive:true,

                        plugins:{
                            legend:{
                                display:false
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


    if(donutCanvas){

        deliveryDonut =
            new Chart(
                donutCanvas,
                {

                    type:"doughnut",

                    data:{

                        labels:[
                            "Delivered",
                            "In Transit",
                            "Pending"
                        ],

                        datasets:[{

                            data:[
                                0,
                                0,
                                0
                            ],

                            backgroundColor:[
                                "#e7b31a",
                                "#344054",
                                "#d9dee6"
                            ],

                            borderWidth:0

                        }]

                    },

                    options:{

                        cutout:"72%",

                        plugins:{
                            legend:{
                                display:false
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


    if(barCanvas){

        deliveryBar =
            new Chart(
                barCanvas,
                {

                    type:"bar",

                    data:{

                        labels:[
                            "Current"
                        ],

                        datasets:[{

                            label:"Revenue ₦m",

                            data:[
                                0
                            ],

                            backgroundColor:"#e7b31a",

                            borderRadius:6

                        }]

                    },

                    options:{

                        responsive:true,

                        plugins:{
                            legend:{
                                display:false
                            }
                        }

                    }

                }
            );

    }

}


/* =====================================================
   RESTORE SESSION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        initializeDeliveries();

        initializeCharts();


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


        if(
            loggedIn === "true" &&
            savedUser
        ){

            document
                .getElementById("authScreen")
                .style.display =
                    "none";


            document
                .getElementById("mainApp")
                .style.display =
                    "flex";


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


/* =========================================================
   BLACK RABBIT LOGISTICS - PHASE 2 MONEY FEATURES
   Rider Wallet • Revenue/Profit • Receipts • Performance
   Revenue is recognized ONLY when status === "Delivered".
========================================================= */

(function(){

    const PHASE2_PAYMENTS_KEY = "blackRabbitRiderPayments";

    function phase2Delivered(records){
        return (records || []).filter(function(item){
            return item && item.status === "Delivered";
        });
    }

    function phase2Payments(){
        try{
            const value = JSON.parse(
                localStorage.getItem(PHASE2_PAYMENTS_KEY) || "[]"
            );
            return Array.isArray(value) ? value : [];
        }catch(error){
            return [];
        }
    }

    function phase2SavePayments(records){
        localStorage.setItem(
            PHASE2_PAYMENTS_KEY,
            JSON.stringify(records || [])
        );
    }

    function phase2Revenue(records){
        return phase2Delivered(records).reduce(function(total,item){
            return total + Number(item.amount || 0);
        },0);
    }

    function phase2RiderEarnings(records){
        return phase2Delivered(records).reduce(function(total,item){
            return total + Number(item.riderEarning || 0);
        },0);
    }

    function phase2Profit(records){
        return phase2Revenue(records) - phase2RiderEarnings(records);
    }

    function phase2RiderFee(riderId){
        return getAttendance().filter(function(record){
            return (
                record.riderId === riderId &&
                record.feeApplied !== false
            );
        }).reduce(function(total,record){
            return total + Number(
                record.checkInFee || DAILY_CHECK_IN_FEE
            );
        },0);
    }

    function phase2RiderData(records){
        const delivered = phase2Delivered(records);
        const map = {};

        delivered.forEach(function(item){
            const riderId = item.riderId || "unassigned";
            if(!map[riderId]){
                map[riderId] = {
                    riderId:riderId,
                    rider:getRiderName(riderId) || "Unassigned",
                    deliveries:0,
                    moneyGenerated:0,
                    riderEarnings:0
                };
            }

            map[riderId].deliveries += 1;
            map[riderId].moneyGenerated += Number(item.amount || 0);
            map[riderId].riderEarnings += Number(item.riderEarning || 0);
        });

        return Object.keys(map).map(function(key){
            return map[key];
        }).sort(function(a,b){
            if(b.moneyGenerated !== a.moneyGenerated){
                return b.moneyGenerated - a.moneyGenerated;
            }
            return b.deliveries - a.deliveries;
        });
    }

    function phase2WeekDelivered(records,riderId){
        const start = getWeekStart();
        const end = getWeekEnd();

        return phase2Delivered(records).filter(function(item){
            if(riderId && item.riderId !== riderId){
                return false;
            }

            const date = new Date(
                item.deliveredAt ||
                item.updatedAt ||
                item.createdAt
            );

            return date >= start && date <= end;
        });
    }

    function phase2ReceiptNumber(delivery){
        if(!delivery.receiptNumber){
            const stamp = new Date(
                delivery.deliveredAt ||
                delivery.updatedAt ||
                delivery.createdAt ||
                Date.now()
            );

            const datePart =
                stamp.getFullYear() +
                String(stamp.getMonth()+1).padStart(2,"0") +
                String(stamp.getDate()).padStart(2,"0");

            const randomPart = String(
                Math.floor(1000 + Math.random() * 9000)
            );

            delivery.receiptNumber =
                "BR-RCP-" + datePart + "-" + randomPart;

            return true;
        }

        return false;
    }

    function phase2EnsureReceipts(){
        const records = getDeliveries();
        let changed = false;

        records.forEach(function(item){
            if(item.status === "Delivered"){
                if(phase2ReceiptNumber(item)){
                    changed = true;
                }
            }
        });

        if(changed){
            saveDeliveries(records);
        }

        return records;
    }

    function phase2MoneyStyles(){
        if(document.getElementById("blackRabbitPhase2Styles")){
            return;
        }

        const style = document.createElement("style");
        style.id = "blackRabbitPhase2Styles";
        style.textContent = `
            .br2-wrap{
                display:grid;
                gap:18px;
            }
            .br2-cards{
                display:grid;
                grid-template-columns:repeat(4,minmax(0,1fr));
                gap:14px;
            }
            .br2-card{
                background:#fff;
                border:1px solid #e7e9ee;
                border-radius:14px;
                padding:18px;
                box-shadow:0 4px 16px rgba(16,24,40,.05);
            }
            .br2-card small{
                display:block;
                color:#667085;
                font-size:11px;
                font-weight:700;
                letter-spacing:.05em;
                margin-bottom:8px;
            }
            .br2-card strong{
                font-size:24px;
                line-height:1.2;
            }
            .br2-card p{
                margin:7px 0 0;
                color:#667085;
                font-size:12px;
            }
            .br2-section{
                background:#fff;
                border:1px solid #e7e9ee;
                border-radius:14px;
                overflow:hidden;
            }
            .br2-head{
                padding:17px 18px;
                border-bottom:1px solid #eef0f3;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:12px;
            }
            .br2-head h3{
                margin:0;
                font-size:17px;
            }
            .br2-head p{
                margin:4px 0 0;
                color:#667085;
                font-size:12px;
            }
            .br2-table{
                width:100%;
                border-collapse:collapse;
            }
            .br2-table th,
            .br2-table td{
                padding:12px 14px;
                border-bottom:1px solid #f0f1f3;
                text-align:left;
                font-size:13px;
            }
            .br2-table th{
                color:#667085;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.04em;
            }
            .br2-table tr:last-child td{
                border-bottom:0;
            }
            .br2-btn{
                border:0;
                border-radius:8px;
                padding:8px 11px;
                cursor:pointer;
                font-weight:700;
                background:#e7b31a;
                color:#111;
            }
            .br2-btn.secondary{
                background:#f2f4f7;
                color:#344054;
            }
            .br2-wallet{
                display:grid;
                grid-template-columns:repeat(4,minmax(0,1fr));
                gap:12px;
            }
            .br2-empty{
                padding:24px;
                color:#667085;
                text-align:center;
            }
            .br2-positive{
                color:#087443;
            }
            .br2-negative{
                color:#b42318;
            }
            @media(max-width:900px){
                .br2-cards,.br2-wallet{
                    grid-template-columns:repeat(2,minmax(0,1fr));
                }
            }
            @media(max-width:600px){
                .br2-cards,.br2-wallet{
                    grid-template-columns:1fr;
                }
                .br2-table{
                    min-width:720px;
                }
                .br2-section{
                    overflow-x:auto;
                }
                .br2-head{
                    min-width:720px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function phase2PrintReceipt(id){
        const delivery = getDeliveries().find(function(item){
            return item.id === id;
        });

        if(!delivery || delivery.status !== "Delivered"){
            alert("A receipt is available only for a delivered order.");
            return;
        }

        phase2EnsureReceipts();

        const refreshed = getDeliveries().find(function(item){
            return item.id === id;
        }) || delivery;

        const receipt = window.open(
            "",
            "_blank",
            "width=700,height=800"
        );

        if(!receipt){
            alert("Please allow pop-ups to print the receipt.");
            return;
        }

        const deliveredTime =
            refreshed.deliveredAt ||
            refreshed.updatedAt ||
            refreshed.createdAt;

        receipt.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(refreshed.receiptNumber || "Receipt")}</title>
                <style>
                    body{
                        font-family:Arial,sans-serif;
                        margin:0;
                        padding:30px;
                        color:#101828;
                    }
                    .receipt{
                        max-width:620px;
                        margin:auto;
                        border:1px solid #ddd;
                        padding:28px;
                    }
                    h1{margin:0 0 5px;}
                    .muted{color:#667085;font-size:13px;}
                    .line{
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        padding:9px 0;
                        border-bottom:1px solid #eee;
                    }
                    .total{
                        font-size:22px;
                        font-weight:700;
                        margin-top:18px;
                    }
                    .footer{
                        margin-top:25px;
                        text-align:center;
                        color:#667085;
                        font-size:12px;
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <h1>BLACK RABBIT LOGISTICS</h1>
                    <div class="muted">Delivery Receipt</div>
                    <br>
                    <div class="line"><strong>Receipt</strong><span>${escapeHtml(refreshed.receiptNumber || "")}</span></div>
                    <div class="line"><strong>Delivery ID</strong><span>${escapeHtml(refreshed.id || "")}</span></div>
                    <div class="line"><strong>Customer</strong><span>${escapeHtml(refreshed.customerName || "")}</span></div>
                    <div class="line"><strong>Phone</strong><span>${escapeHtml(refreshed.customerPhone || "")}</span></div>
                    <div class="line"><strong>Pickup</strong><span>${escapeHtml(refreshed.pickupAddress || "")}</span></div>
                    <div class="line"><strong>Destination</strong><span>${escapeHtml(refreshed.destination || "")}</span></div>
                    <div class="line"><strong>Package</strong><span>${escapeHtml(refreshed.packageDescription || "")}</span></div>
                    <div class="line"><strong>Rider</strong><span>${escapeHtml(getRiderName(refreshed.riderId) || "Unassigned")}</span></div>
                    <div class="line"><strong>Delivered</strong><span>${escapeHtml(formatDateTime(deliveredTime))}</span></div>
                    <div class="line"><strong>Status</strong><span>Delivered</span></div>
                    <div class="total">Delivery Amount: ₦${formatMoney(refreshed.amount || 0)}</div>
                    <div class="footer">Thank you for using Black Rabbit Logistics.</div>
                </div>
                <script>
                    window.onload = function(){
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);

        receipt.document.close();
    }

    window.phase2PrintReceipt = phase2PrintReceipt;

    function phase2RecordPayment(riderId){
        const rider = getRiders().find(function(item){
            return item.id === riderId;
        });

        if(!rider){
            return;
        }

        const amountText = prompt(
            "Enter payment amount for " +
            getRiderName(riderId) +
            " (₦):"
        );

        if(amountText === null){
            return;
        }

        const amount = Number(
            String(amountText).replace(/,/g,"").trim()
        );

        if(!Number.isFinite(amount) || amount <= 0){
            alert("Please enter a valid payment amount.");
            return;
        }

        const note = prompt(
            "Payment note (optional):",
            "Rider earnings payment"
        );

        const payments = phase2Payments();

        payments.push({
            id:
                "PAY-" +
                Date.now() +
                "-" +
                Math.floor(Math.random()*1000),
            riderId:riderId,
            amount:amount,
            note:note || "",
            date:new Date().toISOString(),
            createdBy:getUserDisplayName(getCurrentUser())
        });

        phase2SavePayments(payments);
        phase2RenderMoneyPage();
    }

    window.phase2RecordPayment = phase2RecordPayment;

    function phase2RiderPaid(riderId){
        return phase2Payments().filter(function(item){
            return item.riderId === riderId;
        }).reduce(function(total,item){
            return total + Number(item.amount || 0);
        },0);
    }

    function phase2RenderAdmin(){
        const records = phase2EnsureReceipts();
        const delivered = phase2Delivered(records);
        const revenue = phase2Revenue(records);
        const riderEarnings = phase2RiderEarnings(records);
        const profit = phase2Profit(records);
        const performance = phase2RiderData(records);
        const payments = phase2Payments();

        const paymentByRider = {};
        payments.forEach(function(item){
            paymentByRider[item.riderId] =
                (paymentByRider[item.riderId] || 0) +
                Number(item.amount || 0);
        });

        return `
            <div class="br2-wrap">
                <div class="br2-cards">
                    <div class="br2-card">
                        <small>DELIVERED REVENUE</small>
                        <strong>₦${formatMoney(revenue)}</strong>
                        <p>Only completed deliveries count.</p>
                    </div>
                    <div class="br2-card">
                        <small>RIDER EARNINGS</small>
                        <strong>₦${formatMoney(riderEarnings)}</strong>
                        <p>Only delivered orders count.</p>
                    </div>
                    <div class="br2-card">
                        <small>COMPANY PROFIT</small>
                        <strong class="${profit < 0 ? "br2-negative" : "br2-positive"}">₦${formatMoney(profit)}</strong>
                        <p>Revenue minus delivered rider earnings.</p>
                    </div>
                    <div class="br2-card">
                        <small>COMPLETED DELIVERIES</small>
                        <strong>${delivered.length}</strong>
                        <p>Pending orders generate ₦0 revenue.</p>
                    </div>
                </div>

                <div class="br2-section">
                    <div class="br2-head">
                        <div>
                            <h3>Rider Performance & Top Riders</h3>
                            <p>Ranked by money generated from delivered orders.</p>
                        </div>
                    </div>
                    ${
                        performance.length
                        ? `
                            <table class="br2-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Rider</th>
                                        <th>Deliveries</th>
                                        <th>Money Generated</th>
                                        <th>Rider Earnings</th>
                                        <th>Wallet Balance</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${performance.map(function(item,index){
                                        const paid = paymentByRider[item.riderId] || 0;
                                        const fees = phase2RiderFee(item.riderId);
                                        const net = item.riderEarnings - fees;
                                        const balance = net - paid;

                                        return `
                                            <tr>
                                                <td><strong>${index+1}</strong></td>
                                                <td>${escapeHtml(item.rider)}</td>
                                                <td>${item.deliveries}</td>
                                                <td>₦${formatMoney(item.moneyGenerated)}</td>
                                                <td>₦${formatMoney(item.riderEarnings)}</td>
                                                <td class="${balance < 0 ? "br2-negative" : "br2-positive"}">₦${formatMoney(balance)}</td>
                                                <td>
                                                    <button class="br2-btn" onclick="phase2RecordPayment('${escapeHtml(item.riderId)}')">
                                                        Record Payment
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        `
                        : `<div class="br2-empty">No delivered orders yet. Rider performance will appear here after deliveries are marked Delivered.</div>`
                    }
                </div>

                <div class="br2-section">
                    <div class="br2-head">
                        <div>
                            <h3>Automatic Delivery Receipts</h3>
                            <p>Every delivered order receives a unique receipt number automatically.</p>
                        </div>
                    </div>
                    ${
                        delivered.length
                        ? `
                            <table class="br2-table">
                                <thead>
                                    <tr>
                                        <th>Receipt</th>
                                        <th>Delivery</th>
                                        <th>Customer</th>
                                        <th>Rider</th>
                                        <th>Amount</th>
                                        <th>Delivered</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${delivered.slice().reverse().map(function(item){
                                        return `
                                            <tr>
                                                <td><strong>${escapeHtml(item.receiptNumber || "")}</strong></td>
                                                <td>${escapeHtml(item.id || "")}</td>
                                                <td>${escapeHtml(item.customerName || "")}</td>
                                                <td>${escapeHtml(getRiderName(item.riderId) || "Unassigned")}</td>
                                                <td>₦${formatMoney(item.amount || 0)}</td>
                                                <td>${escapeHtml(formatDateTime(item.deliveredAt || item.updatedAt || item.createdAt))}</td>
                                                <td>
                                                    <button class="br2-btn secondary" onclick="phase2PrintReceipt('${escapeHtml(item.id)}')">
                                                        Print Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        `
                        : `<div class="br2-empty">No receipts yet. A receipt is created automatically when an order is Delivered.</div>`
                    }
                </div>
            </div>
        `;
    }

    function phase2RenderRider(user){
        const records = phase2EnsureReceipts();
        const delivered = phase2Delivered(records).filter(function(item){
            return item.riderId === user.id;
        });

        const revenueGenerated = delivered.reduce(function(total,item){
            return total + Number(item.amount || 0);
        },0);

        const gross = delivered.reduce(function(total,item){
            return total + Number(item.riderEarning || 0);
        },0);

        const fees = phase2RiderFee(user.id);
        const paid = phase2RiderPaid(user.id);
        const net = gross - fees;
        const balance = net - paid;
        const week = phase2WeekDelivered(records,user.id);

        const weekGross = week.reduce(function(total,item){
            return total + Number(item.riderEarning || 0);
        },0);

        return `
            <div class="br2-wrap">
                <div class="br2-cards">
                    <div class="br2-card">
                        <small>AVAILABLE WALLET BALANCE</small>
                        <strong class="${balance < 0 ? "br2-negative" : "br2-positive"}">₦${formatMoney(balance)}</strong>
                        <p>Delivered earnings minus check-in fees and payments.</p>
                    </div>
                    <div class="br2-card">
                        <small>TOTAL DELIVERED EARNINGS</small>
                        <strong>₦${formatMoney(gross)}</strong>
                        <p>${delivered.length} completed deliveries.</p>
                    </div>
                    <div class="br2-card">
                        <small>CHECK-IN FEES</small>
                        <strong>₦${formatMoney(fees)}</strong>
                        <p>Attendance charge is separate from company revenue.</p>
                    </div>
                    <div class="br2-card">
                        <small>THIS WEEK</small>
                        <strong>₦${formatMoney(weekGross)}</strong>
                        <p>Rider earnings from Monday to Sunday.</p>
                    </div>
                </div>

                <div class="br2-section">
                    <div class="br2-head">
                        <div>
                            <h3>My Wallet</h3>
                            <p>Customer revenue is not added to your wallet. Your wallet uses your rider earnings from delivered orders.</p>
                        </div>
                    </div>
                    <table class="br2-table">
                        <tbody>
                            <tr><td>Money generated for company</td><td><strong>₦${formatMoney(revenueGenerated)}</strong></td></tr>
                            <tr><td>Your delivered-order earnings</td><td><strong>₦${formatMoney(gross)}</strong></td></tr>
                            <tr><td>Check-in fees</td><td><strong>₦${formatMoney(fees)}</strong></td></tr>
                            <tr><td>Payments already received</td><td><strong>₦${formatMoney(paid)}</strong></td></tr>
                            <tr><td><strong>Available wallet balance</strong></td><td><strong class="${balance < 0 ? "br2-negative" : "br2-positive"}">₦${formatMoney(balance)}</strong></td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="br2-section">
                    <div class="br2-head">
                        <div>
                            <h3>My Delivery Receipts</h3>
                            <p>Receipts are generated automatically for completed deliveries.</p>
                        </div>
                    </div>
                    ${
                        delivered.length
                        ? `
                            <table class="br2-table">
                                <thead>
                                    <tr>
                                        <th>Receipt</th>
                                        <th>Delivery</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Delivered</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${delivered.slice().reverse().map(function(item){
                                        return `
                                            <tr>
                                                <td><strong>${escapeHtml(item.receiptNumber || "")}</strong></td>
                                                <td>${escapeHtml(item.id || "")}</td>
                                                <td>${escapeHtml(item.customerName || "")}</td>
                                                <td>₦${formatMoney(item.amount || 0)}</td>
                                                <td>${escapeHtml(formatDateTime(item.deliveredAt || item.updatedAt || item.createdAt))}</td>
                                                <td>
                                                    <button class="br2-btn secondary" onclick="phase2PrintReceipt('${escapeHtml(item.id)}')">
                                                        Print Receipt
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join("")}
                                </tbody>
                            </table>
                        `
                        : `<div class="br2-empty">No completed deliveries yet.</div>`
                    }
                </div>
            </div>
        `;
    }

    function phase2RenderMoneyPage(){
        const page = document.getElementById("money");
        if(!page){
            return;
        }

        phase2MoneyStyles();

        const user = getCurrentUser();

        if(!user){
            page.innerHTML = "";
            return;
        }

        page.innerHTML = `
            <div class="page-inner">
                ${user.role === "super_admin"
                    ? phase2RenderAdmin()
                    : phase2RenderRider(user)}
            </div>
        `;
    }

    window.phase2RenderMoneyPage = phase2RenderMoneyPage;

    function phase2InstallPage(){
        if(document.getElementById("money")){
            return;
        }

        const analyticsPage =
            document.getElementById("analytics");

        const settingsPage =
            document.getElementById("settings");

        const page = document.createElement("section");
        page.id = "money";
        page.className = "page hidden";

        if(settingsPage && settingsPage.parentElement){
            settingsPage.parentElement.insertBefore(page,settingsPage);
        }else if(analyticsPage && analyticsPage.parentElement){
            analyticsPage.parentElement.appendChild(page);
        }else{
            const main =
                document.querySelector("main") ||
                document.body;
            main.appendChild(page);
        }

        if(typeof pageInfo === "object"){
            pageInfo.money = [
                "Money",
                "Wallet, revenue, profit, rider performance and receipts."
            ];
        }

        const nav =
            document.querySelector(".side nav");

        if(nav && !nav.querySelector('[data-page="money"]')){
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.page = "money";
            button.innerHTML = "<span>💰</span><span>Money</span>";
            button.onclick = function(){
                openPage("money");
                phase2RenderMoneyPage();
            };
            nav.appendChild(button);
        }

        phase2RenderMoneyPage();
    }

    function phase2UpdateRevenueStat(){
        const records = getDeliveries();
        const deliveredRevenue = phase2Revenue(records);

        const revenueElement =
            document.getElementById("revenueStat");

        if(revenueElement){
            revenueElement.textContent =
                "₦" + formatMoney(deliveredRevenue);
        }

        if(window.deliveryBar){
            window.deliveryBar.data.datasets[0].data = [
                deliveredRevenue / 1000000
            ];
            window.deliveryBar.update();
        }
    }

    function phase2Refresh(){
        phase2EnsureReceipts();
        phase2UpdateRevenueStat();
        phase2RenderMoneyPage();
    }

    /* Wrap the existing refresh so the Phase 2 data stays live
       whenever deliveries, attendance or login state changes. */
    if(typeof window.refreshAllDeliveryViews === "function"){
        const originalRefresh =
            window.refreshAllDeliveryViews;

        window.refreshAllDeliveryViews = function(){
            originalRefresh();
            phase2Refresh();
        };
    }

    document.addEventListener(
        "DOMContentLoaded",
        function(){
            phase2InstallPage();
            phase2Refresh();

            const form =
                document.getElementById("form");

            if(form){
                form.addEventListener(
                    "submit",
                    function(){
                        setTimeout(function(){
                            phase2Refresh();
                        },100);
                    },
                    true
                );
            }
        }
    );

    /* If this script is ever loaded after DOMContentLoaded. */
    if(document.readyState !== "loading"){
        setTimeout(function(){
            phase2InstallPage();
            phase2Refresh();
        },50);
    }

})();
