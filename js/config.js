    window.HOMEHUB_CONFIG = Object.freeze({
      // Firebase Console → Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config
      firebase: {
        apiKey:            'AIzaSyAEQsKUfMPkBL5IPP6k3tlj0z58M-IRrsk',
        authDomain:        'household-planner-59831.firebaseapp.com',
        databaseURL:       'https://household-planner-59831-default-rtdb.europe-west1.firebasedatabase.app',
        projectId:         'household-planner-59831',
        appId:             '1:515227335031:web:66a2b7ee1a70e20ed50972'
      },
      // Only these Google accounts can open the app (must match the Security Rules exactly, lower case)
      allowedEmails: ['rpstephens96@gmail.com', 'catherinevinecent1996@gmail.com'],
      // Optional: hard-code your shared household ID so both phones connect automatically after sign-in.
      // Leave '' to enter it in Settings instead. Letters, numbers, - and _ only (6–64 chars).
      defaultHouseholdId: ''
    });
