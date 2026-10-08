  Black Rabbit Logistics - Firebase Cloud Sync
  Shared data layer for deliveries, riders, attendance and rider payments.

  This file must load AFTER:
  1. firebase-app-compat.js
  2. firebase-firestore-compat.js

  And BEFORE:
  3. script.js
*/

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAY2GTNQg1SJIFccGj4fb34kbHlnnaIylI",
    authDomain: "black-rabbit-logistics.firebaseapp.com",
    projectId: "black-rabbit-logistics",
    storageBucket: "black-rabbit-logistics.firebasestorage.app",
    messagingSenderId: "859935511447",
    appId: "1:859935511447:web:b2b2bf09f1d6d692406ad2"
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
        }catch(error){
            return [];
        }
    }

    function getLocal(key){
        return originalGetItem.call(localStorage, key);
    }

    function setLocal(key, value){
        return originalSetItem.call(localStorage, key, value);
    }

    function hasRealFirebaseConfig(){
        return FIREBASE_CONFIG.apiKey &&
            FIREBASE_CONFIG.projectId &&
            FIREBASE_CONFIG.authDomain &&
            !FIREBASE_CONFIG.apiKey.startsWith("PASTE_") &&
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

        console.log("[Black Rabbit Cloud]", text);
    }

    function refreshApp(){
        try{
            if(typeof window.refreshAllDeliveryViews === "function"){
                window.refreshAllDeliveryViews();
            }
        }catch(error){
            console.warn(
                "Black Rabbit delivery view refresh failed:",
                error
            );
        }

        try{
            if(typeof window.phase2Refresh === "function"){
                window.phase2Refresh();
            }
        }catch(error){
            console.warn(
                "Black Rabbit Phase 2 refresh failed:",
                error
            );
        }
    }

    /*
      Check Firebase configuration.
    */
    if(!hasRealFirebaseConfig()){
        console.warn(
            "Black Rabbit Cloud Sync: Firebase configuration is missing."
        );

        setSyncStatus(
            "Cloud sync not configured",
            "warning"
        );

        return;
    }

    /*
      Check Firebase SDK.
    */
    if(!window.firebase){
        console.error(
            "Black Rabbit Cloud Sync: Firebase SDK is missing."
        );

        setSyncStatus(
            "Firebase SDK missing",
            "error"
        );

        return;
    }

    try{

        /*
          Initialize Firebase only once.
        */
        if(!firebase.apps.length){
            firebase.initializeApp(FIREBASE_CONFIG);
        }

        /*
          Connect to Firestore.
        */
        const db = firebase.firestore();

        const docRef = db.doc(CLOUD_DOC);

        window.blackRabbitCloudDB = db;
        window.blackRabbitCloudReady = false;

        /*
          INTERCEPT LOCALSTORAGE SAVES

          Your existing dashboard already uses:

          saveRiders()
          saveDeliveries()
          saveAttendance()

          We don't need to rewrite those functions.
        */

        Storage.prototype.setItem = function(key, value){

            const result =
                originalSetItem.call(
                    this,
                    key,
                    value
                );

            if(
                this === localStorage &&
                isSyncKey(key) &&
                !applyingCloud
            ){

                queuedWrites[key] = safeJson(value);

                if(cloudReady){
                    flushKey(key);
                }
            }

            return result;
        };

        /*
          INTERCEPT LOCALSTORAGE DELETE
        */

        Storage.prototype.removeItem = function(key){

            const result =
                originalRemoveItem.call(
                    this,
                    key
                );

            if(
                this === localStorage &&
                isSyncKey(key) &&
                !applyingCloud
            ){

                queuedWrites[key] = [];

                if(cloudReady){
                    flushKey(key);
                }
            }

            return result;
        };

        /*
          SEND ONE DATA CATEGORY TO FIRESTORE
        */

        async function flushKey(key){

            if(
                !cloudReady ||
                !isSyncKey(key)
            ){
                return;
            }

            const data =
                Object.prototype.hasOwnProperty.call(
                    queuedWrites,
                    key
                )
                ? queuedWrites[key]
                : safeJson(
                    getLocal(key) || "[]"
                );

            delete queuedWrites[key];

            try{

                const payload = {};

                payload[key] = data;

                payload.updatedAt =
                    firebase.firestore.FieldValue.serverTimestamp();

                await docRef.set(
                    payload,
                    {
                        merge: true
                    }
                );

                setSyncStatus(
                    "Cloud sync connected",
                    "success"
                );

            }catch(error){

                console.error(
                    "Black Rabbit cloud write failed:",
                    error
                );

                queuedWrites[key] = data;

                setSyncStatus(
                    "Cloud sync error",
                    "error"
                );
            }
        }

        /*
          SEND ALL LOCAL DATA TO FIRESTORE
        */

        async function flushAll(){

            const jobs =
                SYNC_KEYS.map(function(key){
                    return flushKey(key);
                });

            await Promise.all(jobs);
        }

        /*
          APPLY FIRESTORE DATA TO THIS DEVICE
        */

        function applyCloudData(data){

            applyingCloud = true;

            try{

                SYNC_KEYS.forEach(function(key){

                    if(
                        Object.prototype.hasOwnProperty.call(
                            data,
                            key
                        )
                    ){

                        setLocal(
                            key,
                            JSON.stringify(
                                data[key] || []
                            )
                        );
                    }
                });

            }finally{

                applyingCloud = false;
            }

            /*
              Refresh dashboard after cloud data arrives.
            */

            refreshApp();
        }

        /*
          REALTIME FIRESTORE LISTENER
        */

        docRef.onSnapshot(

            async function(snapshot){

                try{

                    /*
                      No cloud document yet.

                      The first device that connects will
                      upload its current local data.
                    */

                    if(!snapshot.exists){

                        console.log(
                            "Black Rabbit: Creating initial cloud database..."
                        );

                        cloudReady = true;

                        window.blackRabbitCloudReady =
                            true;

                        setSyncStatus(
                            "Cloud sync connected",
                            "success"
                        );

                        await flushAll();

                        return;
                    }

                    /*
                      Cloud document already exists.
                    */

                    const data =
                        snapshot.data() || {};

                    const hasAnyCloudData =
                        SYNC_KEYS.some(function(key){

                            return Object.prototype.hasOwnProperty.call(
                                data,
                                key
                            );
                        });

                    /*
                      Download cloud data to this device.
                    */

                    if(hasAnyCloudData){

                        applyCloudData(data);
                    }

                    cloudReady = true;

                    window.blackRabbitCloudReady =
                        true;

                    setSyncStatus(
                        "Cloud sync connected",
                        "success"
                    );

                    /*
                      Send any local categories that have
                      not yet been uploaded.
                    */

                    await flushAll();

                }catch(error){

                    console.error(
                        "Black Rabbit cloud sync error:",
                        error
                    );

                    setSyncStatus(
                        "Cloud sync error",
                        "error"
                    );
                }

            },

            function(error){

                console.error(
                    "Black Rabbit Firestore listener error:",
                    error
                );

                setSyncStatus(
                    "Cloud connection failed",
                    "error"
                );
            }
        );

        /*
          Make manual synchronization available
          from the browser console if needed.
        */

        window.blackRabbitCloudForceSync =
            flushAll;

        console.log(
            "Black Rabbit Firebase Cloud Sync initialized."
        );

    }catch(error){

        console.error(
            "Black Rabbit Firebase initialization failed:",
            error
        );

        setSyncStatus(
            "Firebase initialization failed",
            "error"
        );
    }

})();
