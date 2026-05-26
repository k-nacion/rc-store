/**
 * Miruro Domain Scraper for AnimeTV
 * Scrapes https://www.miruro.com/ in the background to keep the
 * list of official Miruro proxy domains up-to-date.
 */
var miruroDomains = (function(){
  'use strict';

  var MIRURO_HUB = "https://www.miruro.com/";
  var SCRAPE_INTERVAL = 6 * 60 * 60 * 1000; /* 6 hours */
  var _timer = null;
  var _lastFetch = 0;

  /* Default/fallback domains */
  var _domains = ['miruro.tv','miruro.to','miruro.bz','miruro.ru'];

  /**
   * Parse domain list from miruro.com HTML
   * 
   * The actual HTML structure on miruro.com is:
   *   <a href="https://miruro.tv" ... class="domain"><span>miruro.tv</span>...</a>
   * 
   * Also checks ld+json sameAs array for miruro.* domains as fallback.
   */
  function parseDomains(html){
    var domains = [];
    var match;

    /* Method 1: Parse <a class="domain" href="https://miruro.xx"> links */
    var domainLinkRegex = /<a[^>]*href="https?:\/\/((?:www\.)?miruro\.[a-z]+)\/?"/gi;
    while ((match = domainLinkRegex.exec(html)) !== null){
      /* Only match links inside the domains nav (they have class="domain") */
      var fullTag = html.substring(match.index, match.index + 300);
      if (fullTag.indexOf('class="domain"') !== -1 || fullTag.indexOf("class='domain'") !== -1){
        var d = match[1].replace(/\/+$/, '');
        if (d && d.indexOf('miruro.com') === -1 && domains.indexOf(d) === -1){
          domains.push(d);
        }
      }
    }

    /* Method 2: Parse from ld+json sameAs array as fallback */
    if (domains.length === 0){
      var sameAsRegex = /"sameAs"\s*:\s*\[([^\]]+)\]/g;
      while ((match = sameAsRegex.exec(html)) !== null){
        var urls = match[1].match(/https?:\/\/(?:www\.)?miruro\.[a-z]+/gi);
        if (urls){
          for (var i = 0; i < urls.length; i++){
            var u = urls[i].replace(/^https?:\/\//, '').replace(/\/+$/, '');
            if (u.indexOf('miruro.com') === -1 && domains.indexOf(u) === -1){
              domains.push(u);
            }
          }
        }
      }
    }

    /* Method 3: Parse <span> text inside domain links as last resort */
    if (domains.length === 0){
      var spanRegex = /class="domain"[^>]*>[\s\S]*?<span>(miruro\.[a-z]+)<\/span>/gi;
      while ((match = spanRegex.exec(html)) !== null){
        var sd = match[1].replace(/\/+$/, '');
        if (sd && sd.indexOf('miruro.com') === -1 && domains.indexOf(sd) === -1){
          domains.push(sd);
        }
      }
    }

    return domains;
  }

  /**
   * Fetch miruro.com and update domain list
   */
  function fetchDomains(callback){
    var cb = callback || function(){};
    console.log("[MIRURO-DOMAINS] Fetching domain list from " + MIRURO_HUB);

    try {
      $ap(MIRURO_HUB, function(r){
        if (r.ok && r.responseText){
          var newDomains = parseDomains(r.responseText);
          if (newDomains.length > 0){
            console.log("[MIRURO-DOMAINS] Found domains:", JSON.stringify(newDomains));
            _domains = newDomains;
            _lastFetch = Date.now();

            /* Update __SOURCE_DOMAINS[7] (miruro index) if available - Phase 8c bridge compatible */
            if (typeof __SOURCE_DOMAINS !== 'undefined' && __SOURCE_DOMAINS.length > 7){
              __SOURCE_DOMAINS[7] = newDomains;
              console.log("[MIRURO-DOMAINS] Updated __SOURCE_DOMAINS[7]");
            }

            /* Persist to storage */
            try {
              _JSAPI.storeSet('miruro_domains', JSON.stringify(newDomains));
              _JSAPI.storeSet('miruro_domains_ts', _lastFetch + '');
            } catch(e){}

            cb(newDomains);
          } else {
            console.warn("[MIRURO-DOMAINS] No domains found in response, keeping defaults");
            cb(_domains);
          }
        } else {
          console.warn("[MIRURO-DOMAINS] Failed to fetch miruro.com, status=" + r.status);
          cb(_domains);
        }
      });
    } catch(e){
      console.error("[MIRURO-DOMAINS] Error fetching:", e);
      cb(_domains);
    }
  }

  /**
   * Load cached domains from storage
   */
  function loadCached(){
    try {
      var cached = _JSAPI.storeGet('miruro_domains', '');
      var ts = parseInt(_JSAPI.storeGet('miruro_domains_ts', '0'));
      if (cached){
        var parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0){
          _domains = parsed;
          _lastFetch = ts || 0;
          console.log("[MIRURO-DOMAINS] Loaded cached domains:", JSON.stringify(_domains));

          /* Update __SOURCE_DOMAINS[7] - Phase 8c bridge compatible */
          if (typeof __SOURCE_DOMAINS !== 'undefined' && __SOURCE_DOMAINS.length > 7){
            __SOURCE_DOMAINS[7] = _domains;
          }
        }
      }
    } catch(e){}
  }

  /**
   * Start background scraping
   */
  function startBackground(){
    /* Load cached first */
    loadCached();

    /* Fetch fresh if cache is stale or empty */
    var age = Date.now() - _lastFetch;
    if (age > SCRAPE_INTERVAL || _lastFetch === 0){
      fetchDomains();
    }

    /* Set up periodic refresh */
    if (_timer){
      clearInterval(_timer);
    }
    _timer = setInterval(function(){
      fetchDomains();
    }, SCRAPE_INTERVAL);

    console.log("[MIRURO-DOMAINS] Background scraper started (interval: " + (SCRAPE_INTERVAL/3600000) + "h)");
  }

  /**
   * Stop background scraping
   */
  function stopBackground(){
    if (_timer){
      clearInterval(_timer);
      _timer = null;
    }
  }

  /**
   * Get current domain list
   */
  function getDomains(){
    return _domains.slice();
  }

  /**
   * Get the primary (first) domain
   */
  function getPrimary(){
    return _domains[0] || 'www.miruro.tv';
  }

  /* Auto-start on load */
  try {
    startBackground();
  } catch(e){
    console.warn("[MIRURO-DOMAINS] Auto-start failed, will retry later:", e);
  }

  return {
    fetchDomains: fetchDomains,
    getDomains: getDomains,
    getPrimary: getPrimary,
    parseDomains: parseDomains,
    startBackground: startBackground,
    stopBackground: stopBackground
  };
})();
