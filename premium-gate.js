/**
 * DiabeteFood Premium Gate v3
 * Scans ILLIMITES pour tous. Incitation premium via notifications.
 * Verrouillage PremiumGate pour empecher ecrasement par le code original.
 */
(function() {
  'use strict';

  const LS_KEY_PREMIUM = 'diabetefood_premium';
  const LS_KEY_UNLOCKED = 'premiumUnlocked';
  const LS_KEY_VERIFIED = 'diabetefood_premium_verified';
  const LS_KEY_VERIFY_TIME = 'diabetefood_premium_verify_time';
  const LS_KEY_SCAN_COUNT = 'diabetefood_scan_count_total';
  const LS_KEY_LAST_PROMO = 'diabetefood_last_promo';
  const PREMIUM_CHECK_INTERVAL = 300000;
  const PROMO_AFTER_SCANS = 5;
  const PROMO_COOLDOWN = 86400000;

  let _isPremium = false;
  let _billingAvailable = false;
  let _totalScans = parseInt(localStorage.getItem(LS_KEY_SCAN_COUNT) || '0');

  // --- Init ---
  async function initPremiumGate() {
    console.log('[PremiumGate] Init v3 — scans illimites, verrouillage actif');
    _isPremium = false;

    if (typeof Billing !== 'undefined' && Billing.isAvailable()) {
      _billingAvailable = true;
      const ok = await Billing.init(onPremiumStatusChanged);
      if (ok) {
        const hasSub = await Billing.checkExistingPurchases();
        setPremiumStatus(hasSub);
      } else {
        checkCachedPremium();
      }
      setInterval(async () => {
        if (Billing.isAvailable()) {
          const hasSub = await Billing.checkExistingPurchases();
          setPremiumStatus(hasSub);
        }
      }, PREMIUM_CHECK_INTERVAL);
    } else {
      checkCachedPremium();
    }
    updateUI();
    hookScanCounter();
  }

  function onPremiumStatusChanged(isPremium) {
    setPremiumStatus(isPremium);
  }

  function checkCachedPremium() {
    try {
      const verified = localStorage.getItem(LS_KEY_VERIFIED);
      const verifyTime = parseInt(localStorage.getItem(LS_KEY_VERIFY_TIME) || '0');
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      if (verified === 'true' && (Date.now() - verifyTime) < SEVEN_DAYS) {
        setPremiumStatus(true);
      } else {
        setPremiumStatus(false);
      }
    } catch (e) { setPremiumStatus(false); }
  }

  function setPremiumStatus(isPremium) {
    _isPremium = isPremium;
    try {
      localStorage.setItem(LS_KEY_PREMIUM, isPremium ? 'true' : 'false');
      localStorage.setItem(LS_KEY_UNLOCKED, isPremium ? 'true' : 'false');
      if (isPremium) {
        localStorage.setItem(LS_KEY_VERIFIED, 'true');
        localStorage.setItem(LS_KEY_VERIFY_TIME, Date.now().toString());
      } else {
        localStorage.removeItem(LS_KEY_VERIFIED);
        localStorage.removeItem(LS_KEY_VERIFY_TIME);
      }
    } catch (e) {}
    updateUI();
  }

  // --- UI ---
  function updateUI() {
    const premiumPage = document.getElementById('page-premium');
    const scanCounter = document.getElementById('scan-counter');
    const overlay = document.getElementById('premium-overlay');

    if (_isPremium) {
      if (premiumPage) premiumPage.classList.add('prem-unlocked');
      if (scanCounter) {
        scanCounter.classList.add('premium-mode');
        scanCounter.innerHTML = '\u2605 Premium actif';
      }
      if (overlay) overlay.classList.add('hidden');
    } else {
      if (premiumPage) premiumPage.classList.remove('prem-unlocked');
      if (scanCounter) scanCounter.classList.remove('premium-mode');
      if (overlay) overlay.classList.remove('hidden');
    }
  }

  // --- Compteur de scans + incitation premium ---
  function hookScanCounter() {
    if (_isPremium) return;
    var original = window.lookupBarcode || window.fetchProductInfo || window.searchProduct;
    if (original) {
      var fnName = window.lookupBarcode ? 'lookupBarcode' : (window.fetchProductInfo ? 'fetchProductInfo' : 'searchProduct');
      window['_orig_' + fnName] = original;
      window[fnName] = function() {
        _totalScans++;
        try { localStorage.setItem(LS_KEY_SCAN_COUNT, _totalScans.toString()); } catch(e) {}
        if (!_isPremium && _totalScans > 0 && _totalScans % PROMO_AFTER_SCANS === 0) {
          showPromoNotif();
        }
        return window['_orig_' + fnName].apply(this, arguments);
      };
    }
  }

  // --- Notification incitative ---
  function showPromoNotif() {
    try {
      var lastPromo = parseInt(localStorage.getItem(LS_KEY_LAST_PROMO) || '0');
      if (Date.now() - lastPromo < PROMO_COOLDOWN) return;
      localStorage.setItem(LS_KEY_LAST_PROMO, Date.now().toString());
    } catch(e) {}

    var existing = document.getElementById('premium-promo');
    if (existing) existing.remove();

    var promo = document.createElement('div');
    promo.id = 'premium-promo';
    promo.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ff6b00,#e55d00);color:white;padding:16px 24px;border-radius:16px;box-shadow:0 8px 32px rgba(255,107,0,0.4);z-index:9998;max-width:340px;text-align:center;animation:slideUp 0.5s ease;';

    var style = document.createElement('style');
    style.textContent = '@keyframes slideUp{from{transform:translateX(-50%) translateY(100px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
    document.head.appendChild(style);

    promo.innerHTML = '<div style="font-size:20px;font-weight:700;margin-bottom:6px;">\u2728 Passez \u00e0 Premium !</div>' +
      '<div style="font-size:14px;opacity:0.9;margin-bottom:12px;">Acc\u00e9dez aux analyses d\u00e9taill\u00e9es, historique complet et recommandations personnalis\u00e9es.</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button onclick="window.location.href=\'premium.html\'" style="padding:10px 20px;background:white;color:#e55d00;border:none;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;">D\u00e9couvrir</button>' +
      '<button onclick="this.parentElement.parentElement.remove()" style="padding:10px 16px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:10px;font-size:14px;cursor:pointer;">Plus tard</button>' +
      '</div>';
    document.body.appendChild(promo);

    setTimeout(function() { if (promo.parentElement) promo.remove(); }, 10000);
  }

  // --- Remplacement des fonctions existantes ---
  window.unlockPremium = function() {
    if (_billingAvailable) {
      window.location.href = 'premium.html';
    } else {
      showNotInTWA();
    }
  };
  window.activatePremium = function() { window.unlockPremium(); };

  function showNotInTWA() {
    var existing = document.getElementById('not-twa-alert');
    if (existing) existing.remove();
    var alert = document.createElement('div');
    alert.id = 'not-twa-alert';
    alert.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    alert.innerHTML = '<div style="background:white;border-radius:20px;padding:32px 24px;max-width:360px;text-align:center;">' +
      '<div style="font-size:48px;margin-bottom:16px;">\ud83d\udcf1</div>' +
      '<h2 style="font-size:20px;margin-bottom:8px;color:#1a1a2e;">Abonnement via l\'app</h2>' +
      '<p style="color:#6b7280;font-size:14px;line-height:1.5;margin-bottom:20px;">Pour vous abonner \u00e0 Premium, ouvrez DiabeteFood depuis le Google Play Store.</p>' +
      '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,#ff6b00,#e55d00);color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;">Compris</button>' +
      '</div>';
    document.body.appendChild(alert);
  }

  // --- Anti-triche ---
  function setupAntiTamper() {
    var origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if ((key === LS_KEY_UNLOCKED || key === LS_KEY_PREMIUM || key === LS_KEY_VERIFIED) && value === 'true' && !_isPremium) {
        console.warn('[PremiumGate] Modification premium bloquee');
        return;
      }
      return origSet.call(this, key, value);
    };
    setInterval(function() {
      try {
        if (localStorage.getItem(LS_KEY_UNLOCKED) === 'true' && !_isPremium) {
          localStorage.setItem(LS_KEY_UNLOCKED, 'false');
          localStorage.setItem(LS_KEY_PREMIUM, 'false');
          updateUI();
        }
      } catch(e) {}
    }, 5000);
  }

  // --- API publique VERROUILLEE ---
  var _pgAPI = {
    isPremium: function() { return _isPremium; },
    canScan: function() { return true; },
    getRemainingScans: function() { return Infinity; },
    refresh: async function() {
      if (_billingAvailable && typeof Billing !== 'undefined') {
        var hasSub = await Billing.checkExistingPurchases();
        setPremiumStatus(hasSub);
      }
    }
  };
  Object.freeze(_pgAPI);

  // Verrouiller PremiumGate sur window
  function lockPremiumGate() {
    try {
      Object.defineProperty(window, 'PremiumGate', {
        value: _pgAPI,
        writable: false,
        configurable: false,
        enumerable: true
      });
    } catch(e) {
      // Si deja defini, ecraser puis re-tenter
      window.PremiumGate = _pgAPI;
    }
    console.log('[PremiumGate] API verrouillee — canScan:true, remaining:Infinity');
  }

  // Patch apres chargement complet pour contrer tout ecrasement
  function patchAfterLoad() {
    // Re-forcer les methodes meme si l'objet a ete ecrase
    if (!window.PremiumGate || window.PremiumGate.getRemainingScans() !== Infinity) {
      try { delete window.PremiumGate; } catch(e) {}
      try {
        Object.defineProperty(window, 'PremiumGate', {
          value: _pgAPI,
          writable: false,
          configurable: false,
          enumerable: true
        });
      } catch(e) {
        window.PremiumGate = _pgAPI;
      }
    }
    // Aussi patcher les fonctions scan existantes de l'app originale
    if (typeof window.canScan === 'function') {
      window.canScan = function() { return true; };
    }
    if (typeof window.getRemainingScans === 'function') {
      window.getRemainingScans = function() { return Infinity; };
    }
  }

  // --- Demarrage ---
  lockPremiumGate();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initPremiumGate();
      setupAntiTamper();
      patchAfterLoad();
    });
  } else {
    initPremiumGate();
    setupAntiTamper();
    patchAfterLoad();
  }

  // Re-patch apres load complet (quand tous les scripts ont fini)
  window.addEventListener('load', function() {
    setTimeout(patchAfterLoad, 100);
    setTimeout(patchAfterLoad, 500);
    setTimeout(patchAfterLoad, 2000);
  });

  console.log('[PremiumGate] v3 charge — scans illimites, verrouillage actif');
})();