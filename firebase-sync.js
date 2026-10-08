/*
  Black Rabbit Logistics - Firebase Cloud Sync
  Shared data layer for deliveries, riders, attendance and rider payments.

  IMPORTANT:
  1. Put your Firebase web-app config in FIREBASE_CONFIG below.
  2. Load Firebase App + Firestore BEFORE this file.
  3. Load this file BEFORE your existing script.js.
*/

const FIREBASE_CONFIG = {
    apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};

(function(){
    "use strict";

    const SYNC_KEYS = [
        "blackRabbitRiders",
        "blackRabbitDeliveries",
        "blackRabbitAttendance",
        "blackRabbitRiderPayments"
    ];

    const CLOUD_DOC = "blackRabbit/main";
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;

    let cloudReady = false;
    let applyingCloud = false;
    let queuedWrites = {};

    function isSyncKey(key){
        return SYNC_KEYS.indexOf(key) !== -1;
    }

    function safeJson(value){
        try{
            return JSON.parse(value);
        }catch(e){
            return [];
        }
    }

    function getLocal(key){
        return originalGetItem.call(localStorage, key);
    }

    function setLocal(key, value){
        return originalSetItem.call(localStorage, key, value);
    }

    function removeLocal(key){
        return originalRemoveItem.call(localStorage, key);
    }

    function hasRealFirebaseConfig(){
        return FIREBASE_CONFIG.apiKey &&
            !FIREBASE_CONFIG.apiKey.startsWith("PASTE_") &&
            FIREBASE_CONFIG.projectId &&
            !FIREBASE_CONFIG.projectId.startsWith("PASTE_");
    }

    function setSyncStatus(text, type){
        window.blackRabbitCloudStatus = {
            text: text,
            type: type || "info"
        };

        const el = document.getElementById("cloudSyncStatus");
        if(el){
            el.textContent = text;
            el.dataset.status = type || "info";
        }
    }

    function refreshApp(){
        try{
            if(typeof window.refreshAllDeliveryViews === "function"){
                window.refreshAllDeliveryViews();
            }
        }catch(e){
            console.warn("Black Rabbit refresh failed:", e);
        }

        try{
            if(typeof window.phase2Refresh === "function"){
                window.phase2Refresh();
            }
        }catch(e){
            console.warn("Black Rabbit Phase 2 refresh failed:", e);
        }
    }

    if(!hasRealFirebaseConfig()){
        console.warn("Black Rabbit Cloud Sync: Firebase config has not been added yet.");
        setSyncStatus("Cloud sync not configured", "warning");
        return;
    }

    if(!window.firebase){
        console.error("Black Rabbit Cloud Sync: Firebase SDK is missing.");
        setSyncStatus("Firebase SDK missing", "error");
        return;
    }

    try{
        if(!firebase.apps.length){
            firebase.initializeApp(FIREBASE_CONFIG);
        }

        const db = firebase.firestore();
        const docRef = db.doc(CLOUD_DOC);

        window.blackRabbitCloudDB = db;
        window.blackRabbitCloudReady = false;

        /*
          Intercept the existing localStorage layer. Your current dashboard
          can keep using getRiders(), getDeliveries(), getAttendance(), etc.
          without rewriting all 6,000+ lines of business logic.
        */
        Storage.prototype.setItem = function(key, value){
            const result = originalSetItem.call(this, key, value);

            if(this === localStorage && isSyncKey(key) && !applyingCloud){
                queuedWrites[key] = safeJson(value);
                if(cloudReady){
                    flushKey(key);
                }
            }

            return result;
        };

        Storage.prototype.removeItem = function(key){
            const result = originalRemoveItem.call(this, key);

            if(this === localStorage && isSyncKey(key) && !applyingCloud){
                queuedWrites[key] = [];
                if(cloudReady){
                    flushKey(key);
                }
            }

            return result;
        };

        async function flushKey(key){
            if(!cloudReady || !isSyncKey(key)){
                return;
            }

            const data = Object.prototype.hasOwnProperty.call(queuedWrites, key)
                ? queuedWrites[key]
                : safeJson(getLocal(key) || "[]");

            delete queuedWrites[key];

            try{
                const payload = {};
                payload[key] = data;
                payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

                await docRef.set(payload, {merge:true});
            }catch(error){
                console.error("Black Rabbit cloud write failed:", error);
                queuedWrites[key] = data;
                setSyncStatus("Cloud sync error", "error");
            }
        }

        async function flushAll(){
            const jobs = SYNC_KEYS.map(function(key){
                return flushKey(key);
            });
            await Promise.all(jobs);
        }

        function applyCloudData(data){
            applyingCloud = true;

            try{
                SYNC_KEYS.forEach(function(key){
                    if(Object.prototype.hasOwnProperty.call(data, key)){
                        setLocal(key, JSON.stringify(data[key] || []));
                    }
                });
            }finally{
                applyingCloud = false;
            }

            refreshApp();
        }

        docRef.onSnapshot(async function(snapshot){
            try{
                if(!snapshot.exists){
                    /* First connected device becomes the initial data source. */
                    cloudReady = true;
                    window.blackRabbitCloudReady = true;
                    setSyncStatus("Cloud sync connected", "success");
                    await flushAll();
                    return;
                }

                const data = snapshot.data() || {};
                const hasAnyCloudData = SYNC_KEYS.some(function(key){
                    return Object.prototype.hasOwnProperty.call(data, key);
                });

                if(hasAnyCloudData){
                    applyCloudData(data);
                }

                cloudReady = true;
                window.blackRabbitCloudReady = true;
                setSyncStatus("Cloud sync connected", "success");

                await flushAll();
            }catch(error){
                console.error("Black Rabbit cloud sync error:", error);
                setSyncStatus("Cloud sync error", "error");
            }
        }, function(error){
            console.error("Black Rabbit Firestore listener error:", error);
            setSyncStatus("Cloud connection failed", "error");
        });

        window.blackRabbitCloudForceSync = flushAll;

    }catch(error){
        console.error("Black Rabbit Firebase initialization failed:", error);
        setSyncStatus("Firebase initialization failed", "error");
    }
})();
