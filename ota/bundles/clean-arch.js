"use strict";
var __CleanArch = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/domain/entities/source.ts
  function getSourceByIndex(sdIndex) {
    if (sdIndex < 1 || sdIndex > SOURCES.length) return null;
    return SOURCES[sdIndex - 1] ?? null;
  }
  function getPrimaryDomain(source) {
    return source.domains[0] ?? "";
  }
  function getDnsArray() {
    return SOURCES.map((s) => s.domains[0] ?? "");
  }
  function getSourceNames() {
    return SOURCES.map((s) => s.name);
  }
  function getSourceCount() {
    return SOURCES.length;
  }
  function getActiveSources() {
    return SOURCES.filter((s) => s.status === "active");
  }
  var SOURCES;
  var init_source = __esm({
    "src/domain/entities/source.ts"() {
      "use strict";
      SOURCES = [
        {
          id: "aniwave",
          name: "Aniwave",
          domains: ["aniwave.to", "aniwavetv.to"],
          status: "dead",
          streamType: "vidplay",
          features: { proxy: true, inject: true }
        },
        {
          id: "anix",
          name: "Anix",
          domains: ["anix.to", "anix.ac", "anix.vc", "anixtv.to"],
          status: "dead",
          streamType: "vidplay",
          features: { proxy: true, inject: true }
        },
        {
          id: "hianime",
          name: "Hianime",
          domains: ["hianime.to", "hianime.sx", "hianime.mn", "hianime.nz"],
          status: "active",
          streamType: "megacloud",
          features: { proxy: true, inject: false }
        },
        {
          id: "aniwatch",
          name: "Aniwatch",
          domains: ["aniwatchtv.to", "aniwatch.se"],
          status: "active",
          streamType: "megacloud",
          features: { proxy: true, inject: false }
        },
        {
          id: "animeflix",
          name: "Animeflix",
          domains: ["animeflix.live", "animeflix.gg", "animeflix.li"],
          status: "dead",
          streamType: "custom",
          features: { proxy: true, inject: false }
        },
        {
          id: "kickass",
          name: "KickAss",
          domains: ["kaas.to", "kickassanimes.io", "kaas.ro", "www1.kickassanime.mx"],
          status: "active",
          streamType: "custom",
          features: { proxy: true, inject: false },
          domainCheck: { url: "/api/home_data", jsonKey: "recent_update" }
        },
        {
          id: "gojo",
          name: "Gojo",
          domains: ["api.gojo.live", "api.gojotv.xyz", "api.gojo.wtf"],
          status: "active",
          streamType: "custom",
          features: { proxy: true, inject: false },
          domainCheck: { url: "/", jsonKey: "home" }
        },
        {
          id: "miruro",
          name: "Miruro",
          domains: ["www.miruro.tv", "www.miruro.to", "www.miruro.bz", "www.miruro.ru"],
          status: "active",
          streamType: "direct",
          features: { proxy: true, inject: false, anilistIds: true },
          domainCheck: { url: "/api/config", jsonKey: "error" },
          domainScrapeUrl: "https://www.miruro.com/"
        },
        {
          id: "anikoto",
          name: "Anikoto",
          domains: ["anikototv.to", "anikoto.cz", "anikoto.me", "anikoto.net", "anikototv.se"],
          status: "active",
          streamType: "direct",
          features: { proxy: true, inject: false, anilistIds: true },
          domainCheck: { url: "/anikoto/manifest.json", jsonKey: "name" },
          domainScrapeUrl: "https://anikoto.site/"
        }
      ];
    }
  });

  // src/data/datasources/jikan-datasource-impl.ts
  function processQueue() {
    if (_queue.length === 0) {
      _processing = false;
      return;
    }
    _processing = true;
    const now = Date.now();
    const wait = Math.max(0, RATE_DELAY - (now - _lastReq));
    setTimeout(() => {
      const item = _queue.shift();
      if (!item) {
        _processing = false;
        return;
      }
      _lastReq = Date.now();
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          item.resolve(data);
        } catch {
          item.resolve(null);
        }
      };
      xhr.onerror = () => item.resolve(null);
      xhr.ontimeout = () => item.resolve(null);
      xhr.open("GET", `/__proxy/${item.url}`, true);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("X-Org-Prox", "https://jikan.moe");
      xhr.timeout = 15e3;
      xhr.send();
      processQueue();
    }, wait);
  }
  function jikanFetch(url) {
    return new Promise((resolve) => {
      _queue.push({ url, resolve });
      if (!_processing) {
        processQueue();
      }
    });
  }
  function toAnilistMedia(anime) {
    if (!anime) return null;
    let status = "FINISHED";
    if (anime.airing) status = "RELEASING";
    else if (anime.status === "Not yet aired") status = "NOT_YET_RELEASED";
    else if (anime.status === "Currently Airing") status = "RELEASING";
    let format = "TV";
    if (anime.type === "Movie") format = "MOVIE";
    else if (anime.type === "OVA") format = "OVA";
    else if (anime.type === "ONA") format = "ONA";
    else if (anime.type === "Special") format = "SPECIAL";
    else if (anime.type === "Music") format = "MUSIC";
    const season = anime.season ? anime.season.toUpperCase() : null;
    let coverImage = null;
    if (anime.images && anime.images.jpg) {
      coverImage = {
        large: anime.images.jpg.large_image_url || anime.images.jpg.image_url || null,
        medium: anime.images.jpg.image_url || null,
        color: null
      };
    }
    const startDate = {
      year: null,
      month: null,
      day: null
    };
    if (anime.aired?.prop?.from) {
      startDate.year = anime.aired.prop.from.year ?? null;
      startDate.month = anime.aired.prop.from.month ?? null;
      startDate.day = anime.aired.prop.from.day ?? null;
    }
    const endDate = {
      year: null,
      month: null,
      day: null
    };
    if (anime.aired?.prop?.to) {
      endDate.year = anime.aired.prop.to.year ?? null;
      endDate.month = anime.aired.prop.to.month ?? null;
      endDate.day = anime.aired.prop.to.day ?? null;
    }
    let trailer = null;
    if (anime.trailer?.youtube_id) {
      trailer = {
        id: anime.trailer.youtube_id,
        site: "youtube",
        thumbnail: anime.trailer.images ? anime.trailer.images.maximum_image_url || anime.trailer.images.large_image_url || null : null
      };
    }
    const studioEdges = [];
    if (anime.studios) {
      for (let i = 0; i < anime.studios.length; i++) {
        studioEdges.push({ isMain: i === 0, node: { name: anime.studios[i].name } });
      }
    }
    const genres = [];
    if (anime.genres) {
      for (const g of anime.genres) genres.push(g.name);
    }
    if (anime.themes) {
      for (const t of anime.themes) genres.push(t.name);
    }
    return {
      id: anime.mal_id,
      idMal: anime.mal_id,
      title: {
        romaji: anime.title || anime.title_japanese || null,
        english: anime.title_english || anime.title || null
      },
      coverImage,
      bannerImage: null,
      status,
      duration: anime.duration ? parseInt(anime.duration) || null : null,
      format,
      seasonYear: anime.year || startDate.year || null,
      season,
      isAdult: !!(anime.rating && anime.rating.indexOf("Rx") === 0),
      nextAiringEpisode: null,
      averageScore: anime.score ? Math.round(anime.score * 10) : null,
      episodes: anime.episodes || null,
      description: anime.synopsis || null,
      favourites: anime.favorites || 0,
      popularity: anime.members || 0,
      trending: anime.rank || 0,
      genres,
      startDate,
      endDate,
      studios: { edges: studioEdges },
      trailer,
      synonyms: anime.title_synonyms || [],
      source: anime.source || null,
      countryOfOrigin: "JP",
      reviews: { edges: [] },
      mediaListEntry: null
    };
  }
  function toPageInfo(pagination, perPage) {
    if (!pagination) return { perPage, hasNextPage: false, currentPage: 1 };
    return {
      perPage: pagination.items?.per_page ?? perPage,
      hasNextPage: pagination.has_next_page ?? false,
      currentPage: pagination.current_page ?? 1
    };
  }
  function createJikanDataSource() {
    return {
      async getTrending(page = 1, perPage = 10) {
        const url = `${JIKAN_BASE_URL}/top/anime?type=tv&filter=airing&page=${page}&limit=${perPage}`;
        const data = await jikanFetch(url);
        if (!data?.data) return null;
        const media = [];
        for (const item of data.data) {
          const m = toAnilistMedia(item);
          if (m) media.push(m);
        }
        return {
          pageInfo: toPageInfo(data.pagination, perPage),
          media
        };
      },
      async getSchedule() {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const today = (/* @__PURE__ */ new Date()).getDay();
        const url = `${JIKAN_BASE_URL}/schedules?filter=${days[today]}&page=1&limit=50&sfw=true`;
        const data = await jikanFetch(url);
        if (!data?.data) return null;
        const schedules = [];
        const now = Math.floor(Date.now() / 1e3);
        for (let i = 0; i < data.data.length; i++) {
          const anime = data.data[i];
          const m = toAnilistMedia(anime);
          if (m) {
            schedules.push({
              airingAt: now + i * 1800,
              episode: anime.episodes || 1,
              timeUntilAiring: i * 1800,
              media: m
            });
          }
        }
        return {
          pageInfo: toPageInfo(data.pagination, 50),
          airingSchedules: schedules
        };
      },
      async getRelated(malId) {
        const recUrl = `${JIKAN_BASE_URL}/anime/${malId}/recommendations?limit=10`;
        const recData = await jikanFetch(recUrl);
        const recommendations = [];
        if (recData?.data) {
          for (let i = 0; i < recData.data.length && i < 10; i++) {
            const entry = recData.data[i].entry;
            if (entry) {
              const m = toAnilistMedia(entry);
              if (m) {
                m.type = "ANIME";
                recommendations.push({ mediaRecommendation: m });
              }
            }
          }
        }
        const relUrl = `${JIKAN_BASE_URL}/anime/${malId}/relations`;
        const relData = await jikanFetch(relUrl);
        const relations = [];
        if (relData?.data) {
          for (const rel of relData.data) {
            if (rel.entry) {
              for (const re of rel.entry) {
                if (re.type === "anime") {
                  relations.push({
                    id: re.mal_id,
                    idMal: re.mal_id,
                    title: { romaji: re.name, english: re.name },
                    coverImage: re.images?.jpg ? {
                      large: re.images.jpg.large_image_url || re.images.jpg.image_url || null,
                      medium: re.images.jpg.image_url || null
                    } : null,
                    episodes: null,
                    status: null,
                    duration: null,
                    format: "TV",
                    type: "ANIME",
                    isAdult: false,
                    averageScore: null
                  });
                }
              }
            }
          }
        }
        return {
          id: malId,
          relations,
          recommendations
        };
      }
    };
  }
  var JIKAN_BASE_URL, RATE_DELAY, _lastReq, _queue, _processing;
  var init_jikan_datasource_impl = __esm({
    "src/data/datasources/jikan-datasource-impl.ts"() {
      "use strict";
      JIKAN_BASE_URL = "https://api.jikan.moe/v4";
      RATE_DELAY = 350;
      _lastReq = 0;
      _queue = [];
      _processing = false;
    }
  });

  // src/core/types/result.ts
  function success(data) {
    return new Success(data);
  }
  function failure(error) {
    return new Failure(error);
  }
  var Success, Failure;
  var init_result = __esm({
    "src/core/types/result.ts"() {
      "use strict";
      Success = class _Success {
        constructor(data) {
          this.data = data;
          this._tag = "Success";
        }
        isSuccess() {
          return true;
        }
        isFailure() {
          return false;
        }
        map(fn) {
          return new _Success(fn(this.data));
        }
        flatMap(fn) {
          return fn(this.data);
        }
        flatMapAsync(fn) {
          return fn(this.data);
        }
        mapError(_fn) {
          return this;
        }
        getOrElse(_defaultValue) {
          return this.data;
        }
        getOrThrow() {
          return this.data;
        }
        fold(onSuccess, _onFailure) {
          return onSuccess(this.data);
        }
      };
      Failure = class _Failure {
        constructor(error) {
          this.error = error;
          this._tag = "Failure";
        }
        isSuccess() {
          return false;
        }
        isFailure() {
          return true;
        }
        map(_fn) {
          return this;
        }
        flatMap(_fn) {
          return this;
        }
        flatMapAsync(_fn) {
          return Promise.resolve(this);
        }
        mapError(fn) {
          return new _Failure(fn(this.error));
        }
        getOrElse(defaultValue) {
          return defaultValue;
        }
        getOrThrow() {
          throw this.error;
        }
        fold(_onSuccess, onFailure) {
          return onFailure(this.error);
        }
      };
    }
  });

  // src/core/errors/app-errors.ts
  var Errors;
  var init_app_errors = __esm({
    "src/core/errors/app-errors.ts"() {
      "use strict";
      Errors = {
        network: (status, message, url, retryable = true) => ({
          type: "NETWORK_ERROR",
          status,
          message,
          url,
          retryable
        }),
        timeout: (url, timeoutMs) => ({
          type: "TIMEOUT_ERROR",
          url,
          timeoutMs
        }),
        dns: (hostname, resolver) => ({
          type: "DNS_RESOLUTION_ERROR",
          hostname,
          resolver
        }),
        providerUnavailable: (provider, reason) => ({
          type: "PROVIDER_UNAVAILABLE",
          provider,
          reason
        }),
        allProvidersExhausted: (triedProviders, lastError) => ({
          type: "ALL_PROVIDERS_EXHAUSTED",
          triedProviders,
          lastError
        }),
        decryption: (algorithm, reason) => ({
          type: "DECRYPTION_ERROR",
          algorithm,
          reason
        }),
        streamNotFound: (episodeId, provider) => ({
          type: "STREAM_NOT_FOUND",
          episodeId,
          provider
        }),
        streamValidation: (url, reason) => ({
          type: "STREAM_VALIDATION_ERROR",
          url,
          reason
        }),
        auth: (reason) => ({
          type: "AUTHENTICATION_ERROR",
          reason
        }),
        parse: (source, rawData, reason) => ({
          type: "PARSE_ERROR",
          source,
          rawData,
          reason
        }),
        notFound: (entity, id) => ({
          type: "NOT_FOUND",
          entity,
          id
        }),
        config: (key, reason) => ({
          type: "CONFIGURATION_ERROR",
          key,
          reason
        }),
        domainRotation: (service, triedDomains) => ({
          type: "DOMAIN_ROTATION_ERROR",
          service,
          triedDomains
        }),
        validation: (message) => ({
          type: "VALIDATION_ERROR",
          message
        })
      };
    }
  });

  // src/data/datasources/gojo-datasource-impl.ts
  function createGojoDataSource(legacy) {
    async function wrapCall(fn, context) {
      try {
        const data = await fn();
        if (data === null || data === void 0) {
          return failure(Errors.notFound("gojo-resource", context));
        }
        return success(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("timeout") || message.includes("Too many redirects")) {
          return failure(Errors.timeout(`gojo/${context}`, 15e3));
        }
        return failure(Errors.network(502, message, `gojo/${context}`, true));
      }
    }
    return {
      async getEpisodes(anilistId) {
        return wrapCall(
          () => legacy.getEpisodes(anilistId),
          `episodes/${anilistId}`
        );
      },
      async getSources(episodeId, category) {
        return wrapCall(
          () => legacy.getSources(episodeId, category),
          `sources/${episodeId}/${category}`
        );
      },
      async getSkipData(anilistId, episodeNumber) {
        return wrapCall(
          () => legacy.getSkipData(anilistId, episodeNumber),
          `skips/${anilistId}/${episodeNumber}`
        );
      },
      async getAnimeInfo(anilistId) {
        if (!legacy.getAnimeInfo) {
          return failure(
            Errors.providerUnavailable("gojo", "getAnimeInfo not supported")
          );
        }
        return wrapCall(
          () => legacy.getAnimeInfo(anilistId),
          `info/${anilistId}`
        );
      },
      getActiveDomain() {
        return legacy.activeDomain;
      }
    };
  }
  var init_gojo_datasource_impl = __esm({
    "src/data/datasources/gojo-datasource-impl.ts"() {
      "use strict";
      init_result();
      init_app_errors();
    }
  });

  // src/data/datasources/kaas-datasource-impl.ts
  function createKaasDataSource(legacy) {
    async function wrapCall(fn, context) {
      try {
        const data = await fn();
        if (data === null || data === void 0) {
          return failure(Errors.notFound("kaas-resource", context));
        }
        return success(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("timeout") || message.includes("Too many redirects")) {
          return failure(Errors.timeout(`kaas/${context}`, 15e3));
        }
        if (message.includes("decrypt") || message.includes("AES")) {
          return failure(
            Errors.decryption("pipeline", `kaas/${context}: ${message}`)
          );
        }
        return failure(Errors.network(502, message, `kaas/${context}`, true));
      }
    }
    return {
      async search(query) {
        return wrapCall(
          () => legacy.search(query),
          `search/${query}`
        );
      },
      async getAnimeInfo(slug) {
        return wrapCall(() => legacy.getAnimeInfo(slug), `show/${slug}`);
      },
      async getEpisodeDetail(episodeSlug) {
        return wrapCall(
          () => legacy.getEpisodeDetail(episodeSlug),
          `episode/${episodeSlug}`
        );
      },
      async getSources(episodeSlug, serverSlug) {
        return wrapCall(
          () => legacy.getSources(episodeSlug, serverSlug),
          `sources/${episodeSlug}/${serverSlug}`
        );
      },
      async getHomeData() {
        return wrapCall(() => legacy.getHomeData(), "home_data");
      },
      async filter(params) {
        if (!legacy.filter) {
          const query = params.query ?? "";
          return wrapCall(
            () => legacy.search(query),
            `filter/${query}`
          );
        }
        return wrapCall(
          () => legacy.filter(params),
          `filter/${JSON.stringify(params)}`
        );
      },
      getActiveDomain() {
        return legacy.activeDomain;
      }
    };
  }
  var init_kaas_datasource_impl = __esm({
    "src/data/datasources/kaas-datasource-impl.ts"() {
      "use strict";
      init_result();
      init_app_errors();
    }
  });

  // src/data/datasources/wave-datasource-impl.ts
  function createWaveDataSource(legacy) {
    async function wrapCall(fn, context) {
      try {
        const data = await fn();
        if (data === null || data === void 0) {
          return failure(Errors.notFound("wave-resource", context));
        }
        return success(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("timeout") || message.includes("Too many redirects")) {
          return failure(Errors.timeout(`wave/${context}`, 15e3));
        }
        if (message.includes("VRF") || message.includes("vrf")) {
          return failure(
            Errors.decryption("pipeline", `wave/${context}: ${message}`)
          );
        }
        if (message.includes("decrypt") || message.includes("RC4")) {
          return failure(Errors.decryption("xor", `wave/${context}: ${message}`));
        }
        return failure(Errors.network(502, message, `wave/${context}`, true));
      }
    }
    return {
      async search(query) {
        return wrapCall(
          () => legacy.search(query),
          `search/${query}`
        );
      },
      async getEpisodes(animeId) {
        return wrapCall(
          () => legacy.getEpisodes(animeId),
          `episodes/${animeId}`
        );
      },
      async getServers(episodeId) {
        return wrapCall(
          () => legacy.getServers(episodeId),
          `servers/${episodeId}`
        );
      },
      async getSources(serverId, serverName) {
        return wrapCall(
          () => legacy.getSources(serverId, serverName),
          `sources/${serverId}/${serverName}`
        );
      },
      async getAnimeInfo(animeId) {
        if (!legacy.getAnimeInfo) {
          return failure(
            Errors.providerUnavailable("wave", "getAnimeInfo not supported")
          );
        }
        return wrapCall(
          () => legacy.getAnimeInfo(animeId),
          `info/${animeId}`
        );
      },
      async getHomeSlideshow() {
        if (!legacy.getHomeSlideshow) {
          return failure(
            Errors.providerUnavailable(
              "wave",
              "getHomeSlideshow not supported"
            )
          );
        }
        return wrapCall(
          () => legacy.getHomeSlideshow(),
          "home/slideshow"
        );
      },
      async getRecent() {
        if (!legacy.getRecent) {
          return failure(
            Errors.providerUnavailable("wave", "getRecent not supported")
          );
        }
        return wrapCall(
          () => legacy.getRecent(),
          "home/recent"
        );
      },
      async initializeVrf() {
        try {
          const result = await legacy.initializeVrf();
          return success(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return failure(Errors.network(0, message, "wave/initializeVrf", true));
        }
      },
      getActiveDomain() {
        return legacy.activeDomain;
      },
      isVrfReady() {
        return legacy.vrfReady;
      }
    };
  }
  var init_wave_datasource_impl = __esm({
    "src/data/datasources/wave-datasource-impl.ts"() {
      "use strict";
      init_result();
      init_app_errors();
    }
  });

  // src/data/cache/local-storage-cache.ts
  function isLocalStorageAvailable() {
    try {
      const testKey = "__animetv_ls_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
  function createLocalStorageCache(namespace = NAMESPACE, defaultTtlMs = DEFAULT_TTL_MS) {
    const storage = typeof window !== "undefined" && isLocalStorageAvailable() ? localStorage : new MemoryStorage();
    function prefixedKey(key) {
      return `${namespace}${key}`;
    }
    function get(key) {
      try {
        const raw = storage.getItem(prefixedKey(key));
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
          storage.removeItem(prefixedKey(key));
          return null;
        }
        return entry.value;
      } catch {
        return null;
      }
    }
    function set(key, value, ttlMs) {
      const ttl = ttlMs ?? defaultTtlMs;
      const entry = {
        value,
        expiresAt: ttl > 0 ? Date.now() + ttl : 0
      };
      try {
        storage.setItem(prefixedKey(key), JSON.stringify(entry));
      } catch {
        cleanup();
        try {
          storage.setItem(prefixedKey(key), JSON.stringify(entry));
        } catch {
        }
      }
    }
    function remove(key) {
      try {
        storage.removeItem(prefixedKey(key));
      } catch {
      }
    }
    function clear() {
      try {
        const keysToRemove = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(namespace)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          storage.removeItem(k);
        }
      } catch {
      }
    }
    function cleanup() {
      try {
        const entries = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(namespace)) {
            try {
              const raw = storage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                entries.push({ key: k, expiresAt: parsed.expiresAt || 0 });
              }
            } catch {
              entries.push({ key: k, expiresAt: 0 });
            }
          }
        }
        const now = Date.now();
        let removed = 0;
        for (const e of entries) {
          if (e.expiresAt > 0 && now > e.expiresAt) {
            storage.removeItem(e.key);
            removed++;
          }
        }
        if (removed === 0 && entries.length > 0) {
          entries.sort((a, b) => a.expiresAt - b.expiresAt);
          const half = Math.ceil(entries.length / 2);
          for (let i = 0; i < half; i++) {
            storage.removeItem(entries[i].key);
          }
        }
      } catch {
      }
    }
    return { get, set, remove, clear };
  }
  function getCache() {
    if (!_instance) {
      _instance = createLocalStorageCache();
    }
    return _instance;
  }
  var NAMESPACE, DEFAULT_TTL_MS, MemoryStorage, _instance;
  var init_local_storage_cache = __esm({
    "src/data/cache/local-storage-cache.ts"() {
      "use strict";
      NAMESPACE = "animetv:";
      DEFAULT_TTL_MS = 30 * 60 * 1e3;
      MemoryStorage = class {
        constructor() {
          this.store = /* @__PURE__ */ new Map();
        }
        getItem(key) {
          return this.store.get(key) ?? null;
        }
        setItem(key, value) {
          this.store.set(key, value);
        }
        removeItem(key) {
          this.store.delete(key);
        }
        key(index) {
          const keys = Array.from(this.store.keys());
          return keys[index] ?? null;
        }
        get length() {
          return this.store.size;
        }
        clear() {
          this.store.clear();
        }
      };
      _instance = null;
    }
  });

  // src/webview/bridge.ts
  var bridge_exports = {};
  __export(bridge_exports, {
    bridge: () => bridge,
    default: () => bridge_default
  });
  function getGojoDatasource2() {
    if (_gojoDatasource2) return _gojoDatasource2;
    if (typeof globalThis.gojo === "object" && globalThis.gojo !== null) {
      _gojoDatasource2 = createGojoDataSource(globalThis.gojo);
      return _gojoDatasource2;
    }
    return null;
  }
  function getKaasDatasource2() {
    if (_kaasDatasource2) return _kaasDatasource2;
    if (typeof globalThis.kaas === "object" && globalThis.kaas !== null) {
      _kaasDatasource2 = createKaasDataSource(globalThis.kaas);
      return _kaasDatasource2;
    }
    return null;
  }
  function getWaveDatasource2() {
    if (_waveDatasource2) return _waveDatasource2;
    if (typeof globalThis.wave === "object" && globalThis.wave !== null) {
      _waveDatasource2 = createWaveDataSource(globalThis.wave);
      return _waveDatasource2;
    }
    return null;
  }
  function getAllDomains2() {
    return SOURCES.map((s) => s.domains);
  }
  function getDomainsForSource2(sdIndex) {
    const source = getSourceByIndex(sdIndex);
    return source ? source.domains : [];
  }
  function getDomainCheckConfig2(sdIndex) {
    const source = getSourceByIndex(sdIndex);
    if (!source) return null;
    return source.domainCheck ?? { url: "/manifest.json", jsonKey: "name" };
  }
  function unwrapSourceResponse2(data) {
    if (data && !("streams" in data)) {
      const wrapKeys = ["ssub", "sub", "dub", "raw"];
      for (const key of wrapKeys) {
        const inner = data[key];
        if (inner && inner.streams) {
          return inner;
        }
      }
    }
    return data;
  }
  function sortStreams2(streams) {
    return streams.slice().sort((a, b) => {
      const ra = a.resolution?.height ?? 0;
      const rb = b.resolution?.height ?? 0;
      if (rb !== ra) return rb - ra;
      const aProb = a.url && DEPRIORITIZED_CDNS2.some((cdn) => a.url.includes(cdn)) ? 1 : 0;
      const bProb = b.url && DEPRIORITIZED_CDNS2.some((cdn) => b.url.includes(cdn)) ? 1 : 0;
      if (aProb !== bProb) return aProb - bProb;
      const pa = typeof a.priority === "number" ? a.priority : 99;
      const pb2 = typeof b.priority === "number" ? b.priority : 99;
      return pa - pb2;
    });
  }
  function extractSubtitles2(data) {
    const subArr = data.captions ?? data.subtitles;
    if (!subArr || !subArr.length) return [];
    const sorted = subArr.slice().sort((a, b) => {
      const aUrl = a.url ?? a.file ?? "";
      const bUrl = b.url ?? b.file ?? "";
      const aBlock = aUrl.includes("lostproject.club") ? 1 : 0;
      const bBlock = bUrl.includes("lostproject.club") ? 1 : 0;
      return aBlock - bBlock;
    });
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      const cap = sorted[i];
      const file = cap.url ?? cap.file;
      if (file) {
        result.push({
          kind: cap.kind ?? "captions",
          file,
          label: cap.label ?? cap.language ?? `Track ${i + 1}`
        });
      }
    }
    return result;
  }
  function validateStream2(streamUrl, timeout = 8e3) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `/__proxy/${streamUrl}`, true);
      xhr.timeout = timeout;
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 400);
      xhr.onerror = () => resolve(false);
      xhr.ontimeout = () => resolve(false);
      xhr.send();
    });
  }
  function buildStreamItems2(streams) {
    const items = [];
    for (const vs of streams) {
      if ((vs.type === "hls" || vs.type === "file") && vs.url) {
        items.push({
          p: items.length,
          n: `${vs.fansub ?? ""} ${vs.quality ?? ""}`.trim(),
          u: vs.url,
          t: vs.type,
          ref: vs.referer ?? ""
        });
      }
    }
    return items;
  }
  async function fetchStreamSources2(episodeId, provider, category) {
    try {
      const reqUrl = `/__miruro_pipe/sources?episodeId=${encodeURIComponent(episodeId)}&provider=${encodeURIComponent(provider)}&category=${encodeURIComponent(category)}`;
      console.log(`[AnimeTV] getStreamSources: fetching ${provider}/${category}/${episodeId}`);
      const response = await fetch(reqUrl);
      if (!response.ok) {
        console.warn(`[AnimeTV] getStreamSources: HTTP ${response.status}`);
        return null;
      }
      const raw = await response.json();
      const data = unwrapSourceResponse2(raw);
      const rawStreams = data.streams ?? [];
      if (!rawStreams.length) {
        console.warn("[AnimeTV] getStreamSources: no streams in response");
        return null;
      }
      const sorted = sortStreams2(rawStreams);
      const streams = buildStreamItems2(sorted);
      if (!streams.length) {
        console.warn("[AnimeTV] getStreamSources: no playable (hls/file) streams");
        return null;
      }
      const subtitles = extractSubtitles2(data);
      console.log(
        `[AnimeTV] getStreamSources: ${streams.length} streams, ${subtitles.length} subtitles. Validating...`
      );
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        console.log(`[AnimeTV] Validating stream [${i}]: ${stream.u.substring(0, 80)}`);
        const valid = await validateStream2(stream.u);
        if (valid) {
          if (i > 0) {
            console.log(
              `[AnimeTV] Primary failed, using fallback [${i}]: ${stream.u.substring(0, 80)}`
            );
          }
          return { url: stream.u, srcType: stream.t, subtitles, streams };
        }
        console.warn(`[AnimeTV] Stream [${i}] failed validation, trying next...`);
      }
      const fallback = streams[0];
      console.warn("[AnimeTV] All streams failed validation, returning first as fallback");
      return { url: fallback.u, srcType: fallback.t, subtitles, streams };
    } catch (e) {
      console.warn("[AnimeTV] getStreamSources error:", e);
      return null;
    }
  }
  async function fetchEpisodes2(anilistId) {
    try {
      const response = await fetch(
        `/__miruro_pipe/episodes?anilistId=${encodeURIComponent(anilistId)}`
      );
      if (!response.ok) {
        console.warn(`[AnimeTV] getEpisodes failed: HTTP ${response.status}`);
        return null;
      }
      const data = await response.json();
      if (data && data.providers) {
        return data;
      }
      return null;
    } catch (e) {
      console.warn("[AnimeTV] getEpisodes error:", e);
      return null;
    }
  }
  function buildAniListSearchQuery2(query, options) {
    const genres = options?.genres ?? [];
    const formats = options?.formats ?? [];
    const hasSearch = query.length > 0;
    const qgenre = genres.length > 0 ? `, genre_in:${JSON.stringify(genres)}` : "";
    const qformat = formats.length > 0 ? `, format_in:[${formats.join(",")}]` : "";
    const qsearch = hasSearch ? ", search: $search" : "";
    const qvars = hasSearch ? ", $search: String" : "";
    const gqlQuery = `query ($page: Int, $perPage: Int${qvars}) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      perPage
      hasNextPage
      currentPage
    }
    media(sort: SEARCH_MATCH, isAdult:false, type: ANIME${qsearch}${qformat}${qgenre}){
      id
      title{
        romaji
        english
      }
      coverImage{
        large
        medium
      }
      startDate {
        year
        month
        day
      }
      status
      duration
      format
      seasonYear
      season
      isAdult
      averageScore
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
      episodes
    }
  }
}`;
    const variables = {};
    if (hasSearch) {
      variables.search = query;
    }
    return { query: gqlQuery, variables };
  }
  function fetchAniListSearch2(query, page, options) {
    return new Promise((resolve) => {
      try {
        const perPage = options?.perPage ?? 12;
        const { query: gqlQuery, variables } = buildAniListSearchQuery2(query, options);
        variables.page = page;
        variables.perPage = perPage;
        const body = JSON.stringify({ query: gqlQuery, variables });
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/__proxy/https://graphql.anilist.co/", true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-Post-Prox", "application/json");
        xhr.setRequestHeader("Post-Body", encodeURIComponent(body));
        xhr.timeout = 15e3;
        xhr.onload = () => {
          if (xhr.status === 403 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504) {
            console.warn(`[AnimeTV] searchAnime: AniList returned ${xhr.status}`);
            resolve(null);
            return;
          }
          try {
            const v = JSON.parse(xhr.responseText);
            if (v && v.error && v.error.status === 500) {
              console.warn("[AnimeTV] searchAnime: AniList returned error 500");
              resolve(null);
              return;
            }
            resolve(v);
          } catch (e) {
            console.warn("[AnimeTV] searchAnime: JSON parse error", e);
            resolve(null);
          }
        };
        xhr.onerror = () => {
          console.warn("[AnimeTV] searchAnime: network error");
          resolve(null);
        };
        xhr.ontimeout = () => {
          console.warn("[AnimeTV] searchAnime: timeout");
          resolve(null);
        };
        console.log(
          `[AnimeTV] searchAnime: query="${query}" page=${page} genres=${(options?.genres ?? []).length} formats=${(options?.formats ?? []).length}`
        );
        xhr.send(body);
      } catch (e) {
        console.warn("[AnimeTV] searchAnime: unexpected error", e);
        resolve(null);
      }
    });
  }
  function normalizeAniListMedia(media) {
    const title = media.title;
    const coverImage = media.coverImage;
    const startDate = media.startDate;
    const genres = media.genres;
    return {
      id: String(media.id ?? ""),
      title: title?.english ?? title?.romaji ?? "Unknown",
      image: coverImage?.large ?? coverImage?.medium ?? "",
      type: media.format,
      episodes: media.episodes,
      rating: media.averageScore ? `${media.averageScore}%` : void 0,
      status: media.status,
      year: startDate?.year,
      genres,
      description: media.description
    };
  }
  async function fetchHomeData(_source) {
    const sections = [];
    try {
      const trendingResponse = await fetchAniListSearch2("", 1, { perPage: 20 });
      const trendingMedia = trendingResponse?.data?.Page?.media ?? [];
      const trendingQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, isAdult: false, type: ANIME, status: RELEASING) {
      id title { romaji english } coverImage { large medium }
      startDate { year } status format seasonYear averageScore episodes genres description
    }
  }
}`;
      const trendingItems = await fetchAniListCustom(trendingQuery, { page: 1, perPage: 20 });
      sections.push({
        id: "trending",
        title: "Trending Now",
        items: trendingItems.length > 0 ? trendingItems : trendingMedia.map(normalizeAniListMedia)
      });
      const popularQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, isAdult: false, type: ANIME, season: SPRING, seasonYear: 2025) {
      id title { romaji english } coverImage { large medium }
      startDate { year } status format seasonYear averageScore episodes genres description
    }
  }
}`;
      const popularItems = await fetchAniListCustom(popularQuery, { page: 1, perPage: 20 });
      sections.push({
        id: "popular",
        title: "Popular This Season",
        items: popularItems
      });
      const recentQuery = `query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: UPDATED_AT_DESC, isAdult: false, type: ANIME, status: RELEASING) {
      id title { romaji english } coverImage { large medium }
      startDate { year } status format seasonYear averageScore episodes genres description
    }
  }
}`;
      const recentItems = await fetchAniListCustom(recentQuery, { page: 1, perPage: 20 });
      sections.push({
        id: "recent",
        title: "Recently Updated",
        items: recentItems
      });
    } catch (e) {
      console.warn("[AnimeTV] fetchHomeData error:", e);
    }
    return sections;
  }
  function fetchAniListCustom(query, variables) {
    return new Promise((resolve) => {
      try {
        const body = JSON.stringify({ query, variables });
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/__proxy/https://graphql.anilist.co/", true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-Post-Prox", "application/json");
        xhr.setRequestHeader("Post-Body", encodeURIComponent(body));
        xhr.timeout = 15e3;
        xhr.onload = () => {
          if (xhr.status >= 400) {
            resolve([]);
            return;
          }
          try {
            const v = JSON.parse(xhr.responseText);
            const media = v?.data?.Page?.media ?? [];
            resolve(media.map(normalizeAniListMedia));
          } catch {
            resolve([]);
          }
        };
        xhr.onerror = () => resolve([]);
        xhr.ontimeout = () => resolve([]);
        xhr.send(body);
      } catch {
        resolve([]);
      }
    });
  }
  async function fetchSearchNormalized(query) {
    console.log(`[AnimeTV:Bridge] fetchSearchNormalized: called with query="${query}"`);
    try {
      const response = await fetchAniListSearch2(query, 1, { perPage: 20 });
      console.log(
        `[AnimeTV:Bridge] fetchSearchNormalized: response=`,
        response ? "ok" : "null",
        response?.data?.Page?.media ? `media=${response.data.Page.media.length}` : "no media"
      );
      if (!response?.data?.Page?.media) return [];
      const items = response.data.Page.media.map(normalizeAniListMedia);
      console.log(
        `[AnimeTV:Bridge] fetchSearchNormalized: returning ${items.length} items`,
        items.length > 0 ? `first="${items[0].title}"` : ""
      );
      return items;
    } catch (e) {
      console.error("[AnimeTV:Bridge] fetchSearchNormalized: error", e);
      return [];
    }
  }
  var _gojoDatasource2, _kaasDatasource2, _waveDatasource2, DEPRIORITIZED_CDNS2, jikan2, bridge, bridge_default;
  var init_bridge = __esm({
    "src/webview/bridge.ts"() {
      "use strict";
      init_source();
      init_jikan_datasource_impl();
      init_gojo_datasource_impl();
      init_kaas_datasource_impl();
      init_wave_datasource_impl();
      init_local_storage_cache();
      _gojoDatasource2 = null;
      _kaasDatasource2 = null;
      _waveDatasource2 = null;
      DEPRIORITIZED_CDNS2 = ["mewstream.buzz", "lostproject.club"];
      jikan2 = createJikanDataSource();
      bridge = {
        version: "8h.0",
        getDnsArray,
        getSourceByIndex,
        getSourceName(sdIndex) {
          const source = getSourceByIndex(sdIndex);
          return source ? source.name : null;
        },
        getSourceNames,
        getSourceCount,
        getActiveSources,
        getPrimaryDomain,
        getAllDomains: getAllDomains2,
        getDomainsForSource: getDomainsForSource2,
        getDomainCheckConfig: getDomainCheckConfig2,
        sources: SOURCES,
        getEpisodes: fetchEpisodes2,
        getStreamSources: fetchStreamSources2,
        getTrending: (page, perPage) => jikan2.getTrending(page, perPage),
        getSchedule: () => jikan2.getSchedule(),
        getRelated: (malId) => jikan2.getRelated(malId),
        searchAnime: (query, page, options) => fetchAniListSearch2(query, page ?? 1, options),
        cache: getCache(),
        // Phase 9: Source Provider Datasources
        getGojo: getGojoDatasource2,
        getKaas: getKaasDatasource2,
        getWave: getWaveDatasource2,
        // Phase 10: SPA Data Methods
        getHomeData: fetchHomeData,
        searchAnilistNormalized: fetchSearchNormalized
      };
      if (typeof window !== "undefined") {
        window.AnimeTV = bridge;
        if (typeof console !== "undefined") {
          console.log(
            `[AnimeTV] Clean architecture bridge v${bridge.version} loaded. ${getSourceCount()} sources, ${getActiveSources().length} active.`
          );
        }
      }
      bridge_default = bridge;
    }
  });

  // src/webview-entry.ts
  var webview_entry_exports = {};
  __export(webview_entry_exports, {
    createAPIFacade: () => createAPIFacade,
    createAndroidBridge: () => createAndroidBridge,
    initAPIFacade: () => initAPIFacade,
    initAndroidBridge: () => initAndroidBridge,
    isAndroidEnvironment: () => isAndroidEnvironment
  });

  // src/webview/android-bridge.ts
  init_source();
  init_jikan_datasource_impl();
  init_gojo_datasource_impl();
  init_kaas_datasource_impl();
  init_wave_datasource_impl();
  init_local_storage_cache();
  function createAndroidStorageAdapter(jsapi) {
    return {
      get(key, defaultValue = "") {
        return jsapi.storeGet(key, defaultValue);
      },
      set(key, value) {
        jsapi.storeSet(key, value);
      },
      del(key) {
        jsapi.storeDel(key);
      }
    };
  }
  function createAndroidVideoController(jsapi) {
    return {
      setSource(url, type, referer, subtitles) {
        const subtitleJson = JSON.stringify(
          subtitles.map((s) => ({ kind: s.kind, file: s.file, label: s.label }))
        );
        jsapi.videoSetUrl(url, type, referer, subtitleJson);
      },
      play() {
        jsapi.videoPlay(true);
      },
      pause() {
        jsapi.videoPlay(false);
      },
      seek(positionMs) {
        jsapi.videoSetPosition(positionMs);
      },
      getPosition() {
        return jsapi.videoGetPosition();
      },
      getDuration() {
        return jsapi.videoGetDuration();
      },
      isPlaying() {
        return jsapi.videoIsPlaying();
      },
      getBufferPercent() {
        return jsapi.videoBufferPercent();
      },
      setSpeed(speed) {
        jsapi.videoSetSpeed(speed);
      },
      supportsSpeed() {
        return jsapi.videoSupportSpeed();
      },
      setScale(scale) {
        jsapi.videoSetScale(scale);
      },
      getTracks() {
        return jsapi.videoTracks();
      },
      setAudioTrack(index) {
        jsapi.videoAudioTrack(index);
      },
      setQuality(height) {
        jsapi.videoTrackQuality(height);
      }
    };
  }
  var _gojoDatasource = null;
  var _kaasDatasource = null;
  var _waveDatasource = null;
  function getGojoDatasource() {
    if (_gojoDatasource) return _gojoDatasource;
    if (typeof globalThis.gojo === "object" && globalThis.gojo !== null) {
      _gojoDatasource = createGojoDataSource(globalThis.gojo);
      return _gojoDatasource;
    }
    return null;
  }
  function getKaasDatasource() {
    if (_kaasDatasource) return _kaasDatasource;
    if (typeof globalThis.kaas === "object" && globalThis.kaas !== null) {
      _kaasDatasource = createKaasDataSource(globalThis.kaas);
      return _kaasDatasource;
    }
    return null;
  }
  function getWaveDatasource() {
    if (_waveDatasource) return _waveDatasource;
    if (typeof globalThis.wave === "object" && globalThis.wave !== null) {
      _waveDatasource = createWaveDataSource(globalThis.wave);
      return _waveDatasource;
    }
    return null;
  }
  function getAllDomains() {
    return SOURCES.map((s) => s.domains);
  }
  function getDomainsForSource(sdIndex) {
    const source = getSourceByIndex(sdIndex);
    return source ? source.domains : [];
  }
  function getDomainCheckConfig(sdIndex) {
    const source = getSourceByIndex(sdIndex);
    if (!source) return null;
    return source.domainCheck ?? { url: "/manifest.json", jsonKey: "name" };
  }
  var DEPRIORITIZED_CDNS = ["mewstream.buzz", "lostproject.club"];
  function unwrapSourceResponse(data) {
    if (data && !("streams" in data)) {
      const wrapKeys = ["ssub", "sub", "dub", "raw"];
      for (const key of wrapKeys) {
        const inner = data[key];
        if (inner && inner.streams) {
          return inner;
        }
      }
    }
    return data;
  }
  function sortStreams(streams) {
    return streams.slice().sort((a, b) => {
      const ra = a.resolution?.height ?? 0;
      const rb = b.resolution?.height ?? 0;
      if (rb !== ra) return rb - ra;
      const aProb = a.url && DEPRIORITIZED_CDNS.some((cdn) => a.url.includes(cdn)) ? 1 : 0;
      const bProb = b.url && DEPRIORITIZED_CDNS.some((cdn) => b.url.includes(cdn)) ? 1 : 0;
      if (aProb !== bProb) return aProb - bProb;
      const pa = typeof a.priority === "number" ? a.priority : 99;
      const pb2 = typeof b.priority === "number" ? b.priority : 99;
      return pa - pb2;
    });
  }
  function extractSubtitles(data) {
    const subArr = data.captions ?? data.subtitles;
    if (!subArr || !subArr.length) return [];
    const sorted = subArr.slice().sort((a, b) => {
      const aUrl = a.url ?? a.file ?? "";
      const bUrl = b.url ?? b.file ?? "";
      const aBlock = aUrl.includes("lostproject.club") ? 1 : 0;
      const bBlock = bUrl.includes("lostproject.club") ? 1 : 0;
      return aBlock - bBlock;
    });
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      const cap = sorted[i];
      const file = cap.url ?? cap.file;
      if (file) {
        result.push({
          kind: cap.kind ?? "captions",
          file,
          label: cap.label ?? cap.language ?? `Track ${i + 1}`
        });
      }
    }
    return result;
  }
  function buildStreamItems(streams) {
    const items = [];
    for (const vs of streams) {
      if ((vs.type === "hls" || vs.type === "file") && vs.url) {
        items.push({
          p: items.length,
          n: `${vs.fansub ?? ""} ${vs.quality ?? ""}`.trim(),
          u: vs.url,
          t: vs.type,
          ref: vs.referer ?? ""
        });
      }
    }
    return items;
  }
  function validateStream(streamUrl, timeout = 8e3) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `/__proxy/${streamUrl}`, true);
      xhr.timeout = timeout;
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 400);
      xhr.onerror = () => resolve(false);
      xhr.ontimeout = () => resolve(false);
      xhr.send();
    });
  }
  async function fetchStreamSources(episodeId, provider, category) {
    try {
      const reqUrl = `/__miruro_pipe/sources?episodeId=${encodeURIComponent(episodeId)}&provider=${encodeURIComponent(provider)}&category=${encodeURIComponent(category)}`;
      console.log(
        `[AnimeTV:Android] getStreamSources: fetching ${provider}/${category}/${episodeId}`
      );
      const response = await fetch(reqUrl);
      if (!response.ok) {
        console.warn(`[AnimeTV:Android] getStreamSources: HTTP ${response.status}`);
        return null;
      }
      const raw = await response.json();
      const data = unwrapSourceResponse(raw);
      const rawStreams = data.streams ?? [];
      if (!rawStreams.length) {
        console.warn("[AnimeTV:Android] getStreamSources: no streams in response");
        return null;
      }
      const sorted = sortStreams(rawStreams);
      const streams = buildStreamItems(sorted);
      if (!streams.length) {
        console.warn("[AnimeTV:Android] getStreamSources: no playable (hls/file) streams");
        return null;
      }
      const subtitles = extractSubtitles(data);
      console.log(
        `[AnimeTV:Android] getStreamSources: ${streams.length} streams, ${subtitles.length} subtitles. Validating...`
      );
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        console.log(`[AnimeTV:Android] Validating stream [${i}]: ${stream.u.substring(0, 80)}`);
        const valid = await validateStream(stream.u);
        if (valid) {
          if (i > 0) {
            console.log(
              `[AnimeTV:Android] Primary failed, using fallback [${i}]: ${stream.u.substring(0, 80)}`
            );
          }
          return { url: stream.u, srcType: stream.t, subtitles, streams };
        }
        console.warn(`[AnimeTV:Android] Stream [${i}] failed validation, trying next...`);
      }
      const fallback = streams[0];
      console.warn("[AnimeTV:Android] All streams failed validation, returning first as fallback");
      return { url: fallback.u, srcType: fallback.t, subtitles, streams };
    } catch (e) {
      console.warn("[AnimeTV:Android] getStreamSources error:", e);
      return null;
    }
  }
  async function fetchEpisodes(anilistId) {
    try {
      const response = await fetch(
        `/__miruro_pipe/episodes?anilistId=${encodeURIComponent(anilistId)}`
      );
      if (!response.ok) {
        console.warn(`[AnimeTV:Android] getEpisodes failed: HTTP ${response.status}`);
        return null;
      }
      const data = await response.json();
      if (data && data.providers) {
        return data;
      }
      return null;
    } catch (e) {
      console.warn("[AnimeTV:Android] getEpisodes error:", e);
      return null;
    }
  }
  function buildAniListSearchQuery(query, options) {
    const genres = options?.genres ?? [];
    const formats = options?.formats ?? [];
    const hasSearch = query.length > 0;
    const qgenre = genres.length > 0 ? `, genre_in:${JSON.stringify(genres)}` : "";
    const qformat = formats.length > 0 ? `, format_in:[${formats.join(",")}]` : "";
    const qsearch = hasSearch ? ", search: $search" : "";
    const qvars = hasSearch ? ", $search: String" : "";
    const gqlQuery = `query ($page: Int, $perPage: Int${qvars}) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      perPage
      hasNextPage
      currentPage
    }
    media(sort: SEARCH_MATCH, isAdult:false, type: ANIME${qsearch}${qformat}${qgenre}){
      id
      title{
        romaji
        english
      }
      coverImage{
        large
        medium
      }
      startDate {
        year
        month
        day
      }
      status
      duration
      format
      seasonYear
      season
      isAdult
      averageScore
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
      episodes
    }
  }
}`;
    const variables = {};
    if (hasSearch) {
      variables.search = query;
    }
    return { query: gqlQuery, variables };
  }
  function fetchAniListSearch(query, page, options) {
    return new Promise((resolve) => {
      try {
        const perPage = options?.perPage ?? 12;
        const { query: gqlQuery, variables } = buildAniListSearchQuery(query, options);
        variables.page = page;
        variables.perPage = perPage;
        const body = JSON.stringify({ query: gqlQuery, variables });
        console.log(
          `[AnimeTV:Android] searchAnime: STARTED query="${query}" page=${page} perPage=${perPage} genres=${(options?.genres ?? []).length} formats=${(options?.formats ?? []).length}`
        );
        console.log(`[AnimeTV:Android] searchAnime: SENDING BODY:
${body}`);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/__proxy/https://graphql.anilist.co/", true);
        xhr.setRequestHeader("Accept", "application/json");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("X-Post-Prox", "application/json");
        xhr.setRequestHeader("Post-Body", encodeURIComponent(body));
        xhr.timeout = 15e3;
        xhr.onload = () => {
          console.log(
            `[AnimeTV:Android] searchAnime: RESPONSE status=${xhr.status} responseLength=${xhr.responseText?.length ?? 0}`
          );
          console.log(`[AnimeTV:Android] searchAnime: RECEIVED JSON:
${xhr.responseText}`);
          if (xhr.status === 403 || xhr.status === 502 || xhr.status === 503 || xhr.status === 504) {
            console.warn(`[AnimeTV:Android] searchAnime: AniList returned HTTP ${xhr.status}`);
            resolve(null);
            return;
          }
          if (xhr.status !== 200) {
            console.warn(`[AnimeTV:Android] searchAnime: unexpected HTTP ${xhr.status}`);
          }
          try {
            const v = JSON.parse(xhr.responseText);
            console.log(
              `[AnimeTV:Android] searchAnime: PARSED OK hasData=${!!v?.data} hasPage=${!!v?.data?.Page} mediaCount=${v?.data?.Page?.media?.length ?? 0} hasError=${!!v?.error}`
            );
            if (v && v.error) {
              const errStatus = v.error?.status;
              console.warn(`[AnimeTV:Android] searchAnime: AniList error status=${errStatus}`);
              if (errStatus === 500) {
                resolve(null);
                return;
              }
            }
            resolve(v);
          } catch (e) {
            console.warn(`[AnimeTV:Android] searchAnime: JSON parse error: ${e}`);
            resolve(null);
          }
        };
        xhr.onerror = () => {
          console.warn(
            `[AnimeTV:Android] searchAnime: NETWORK ERROR (onerror fired). readyState=${xhr.readyState} status=${xhr.status}`
          );
          resolve(null);
        };
        xhr.ontimeout = () => {
          console.warn(
            `[AnimeTV:Android] searchAnime: TIMEOUT after 15s. readyState=${xhr.readyState} status=${xhr.status}`
          );
          resolve(null);
        };
        xhr.send(body);
        console.log(`[AnimeTV:Android] searchAnime: XHR sent, waiting for response...`);
      } catch (e) {
        console.warn(`[AnimeTV:Android] searchAnime: UNEXPECTED ERROR: ${e}`);
        resolve(null);
      }
    });
  }
  var jikan = createJikanDataSource();
  function isAndroidEnvironment() {
    const g = typeof window !== "undefined" ? window : globalThis;
    const w = g;
    return typeof w._JSAPI !== "undefined" && (typeof w._ISELECTRON === "undefined" || !w._ISELECTRON);
  }
  function createAndroidBridge(jsapi) {
    const nativeApi = jsapi ?? window._JSAPI;
    const storage = createAndroidStorageAdapter(nativeApi);
    const video = createAndroidVideoController(nativeApi);
    const bridge2 = {
      version: "3.1.0-android",
      // ── Source Utilities (same as base bridge) ──
      getDnsArray,
      getSourceByIndex,
      getSourceName(sdIndex) {
        const source = getSourceByIndex(sdIndex);
        return source ? source.name : null;
      },
      getSourceNames,
      getSourceCount,
      getActiveSources,
      getPrimaryDomain,
      getAllDomains,
      getDomainsForSource,
      getDomainCheckConfig,
      sources: SOURCES,
      // ── Data Operations (via Android WebView interceptor) ──
      getEpisodes: fetchEpisodes,
      getStreamSources: fetchStreamSources,
      // ── Jikan/MAL Fallback ──
      getTrending: (page, perPage) => jikan.getTrending(page, perPage),
      getSchedule: () => jikan.getSchedule(),
      getRelated: (malId) => jikan.getRelated(malId),
      // ── AniList Search ──
      searchAnime: (query, page, options) => fetchAniListSearch(query, page ?? 1, options),
      // ── Cache (localStorage-based, same as base bridge) ──
      cache: getCache(),
      // ── Source Provider Datasources ──
      getGojo: getGojoDatasource,
      getKaas: getKaasDatasource,
      getWave: getWaveDatasource,
      // Phase 10: SPA Data Methods
      getHomeData: async () => [],
      searchAnilistNormalized: async (query) => {
        console.log(`[AnimeTV:Android] searchAnilistNormalized: called with query="${query}"`);
        try {
          const response = await fetchAniListSearch(query, 1, { perPage: 20 });
          console.log(
            `[AnimeTV:Android] searchAnilistNormalized: fetchAniListSearch returned`,
            response ? "response" : "null",
            response?.data ? "has data" : "no data",
            response?.data?.Page ? "has Page" : "no Page",
            response?.data?.Page?.media ? `media count=${response.data.Page.media.length}` : "no media"
          );
          if (!response?.data?.Page?.media) {
            console.warn(
              "[AnimeTV:Android] searchAnilistNormalized: no media in response, returning []"
            );
            return [];
          }
          const items = response.data.Page.media.map((media) => {
            const title = media.title;
            const coverImage = media.coverImage;
            const startDate = media.startDate;
            const genres = media.genres;
            return {
              id: String(media.id ?? ""),
              title: title?.english ?? title?.romaji ?? "Unknown",
              image: coverImage?.large ?? coverImage?.medium ?? "",
              type: media.format,
              episodes: media.episodes,
              rating: media.averageScore ? `${media.averageScore}%` : void 0,
              status: media.status,
              year: startDate?.year,
              genres,
              description: media.description
            };
          });
          console.log(
            `[AnimeTV:Android] searchAnilistNormalized: returning ${items.length} items`,
            items.length > 0 ? `first="${items[0].title}"` : ""
          );
          return items;
        } catch (e) {
          console.error("[AnimeTV:Android] searchAnilistNormalized: error", e);
          return [];
        }
      },
      // ── Android-Specific Extensions ──
      storage,
      video,
      native: nativeApi,
      openIntent(uri) {
        nativeApi.openIntentUri(uri);
      },
      voiceSearch() {
        nativeApi.voiceSearchOpen();
      },
      getBrightness() {
        return nativeApi.getBrightness();
      },
      setBrightness(value) {
        nativeApi.setBrightness(value);
      },
      getVolume() {
        return nativeApi.getVolume();
      },
      setVolume(value) {
        nativeApi.setVolume(value);
      },
      setLandscapeOrientation(mode) {
        nativeApi.setLandscapeOrientation(mode);
      },
      malLogin() {
        nativeApi.malLogin();
      },
      sha1(data) {
        return nativeApi.sha1(data);
      },
      aesDecrypt(encrypted, key) {
        return nativeApi.aesDecrypt(encrypted, key);
      },
      getProfile() {
        return nativeApi.getProfile();
      },
      setProfile(name) {
        nativeApi.setProfile(name);
      },
      getProfileList() {
        return nativeApi.getProfileList();
      },
      deleteProfile(name) {
        nativeApi.deleteProfile(name);
      },
      setStreamType(type) {
        nativeApi.setStreamType(type);
      },
      setStreamServer(server) {
        nativeApi.setStreamServer(server);
      },
      getStreamType() {
        return nativeApi.getStreamType();
      },
      setDOH(enabled) {
        nativeApi.setDOH(enabled);
      },
      setHttpClient(client) {
        nativeApi.setHttpClient(client);
      },
      playNextMeta(data) {
        nativeApi.playNextMeta(data);
      }
    };
    return bridge2;
  }
  function initAndroidBridge() {
    if (!isAndroidEnvironment()) {
      return null;
    }
    const bridge2 = createAndroidBridge();
    window.AnimeTV = bridge2;
    if (typeof console !== "undefined") {
      console.log(
        `[AnimeTV:Android] Bridge v${bridge2.version} initialized. ${getSourceCount()} sources, ${getActiveSources().length} active. Native storage + video controller ready.`
      );
    }
    return bridge2;
  }

  // src/presentation/navigation/navigation-controller.ts
  function createNavigationController(adapter, options) {
    const maxHistory = options?.maxHistory ?? 50;
    const history2 = [];
    function setUri(url) {
      try {
        adapter.pushState(url);
      } catch (e) {
        if (typeof console !== "undefined") {
          console.warn("[NavigationController] pushState failed:", e);
        }
      }
      const entry = {
        url,
        timestamp: Date.now(),
        source: "user"
      };
      history2.push(entry);
      if (history2.length > maxHistory) {
        history2.splice(0, history2.length - maxHistory);
      }
    }
    function goBack() {
      if (history2.length > 1) {
        history2.pop();
        return history2[history2.length - 1] ?? null;
      }
      return null;
    }
    function reload() {
      try {
        adapter.reloadHome();
      } catch (e) {
        if (typeof console !== "undefined") {
          console.warn("[NavigationController] reload failed:", e);
        }
      }
    }
    function checkUpdate(isAdmin) {
      if (!isAdmin) return;
      if (adapter.isOnUpdate()) return;
      adapter.checkUpdate();
    }
    function getHistory() {
      return history2;
    }
    function getCurrentUrl() {
      if (history2.length === 0) return null;
      return history2[history2.length - 1].url;
    }
    function clearHistory() {
      history2.length = 0;
    }
    return {
      setUri,
      goBack,
      reload,
      checkUpdate,
      getHistory,
      getCurrentUrl,
      clearHistory
    };
  }

  // src/presentation/ui-feedback/ui-feedback.ts
  function createUIFeedback(adapter, electronDialog) {
    const asyncCallbacks = /* @__PURE__ */ new Map();
    let callbackCounter = 0;
    let toastTimeout = null;
    function showToast(text, options) {
      const duration = options?.duration ?? 5e3;
      if (adapter.useElectronToast) {
        if (toastTimeout) {
          clearTimeout(toastTimeout);
          toastTimeout = null;
        }
        adapter.showNativeToast(text);
        toastTimeout = setTimeout(() => {
          dismissToast();
          toastTimeout = null;
        }, duration);
      } else {
        adapter.showNativeToast(text);
      }
    }
    function dismissToast() {
      if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
      }
    }
    function listPrompt(options, callback) {
      const config = {
        type: "list",
        title: options.title,
        list: options.list
      };
      if (options.selected !== void 0) {
        if (Array.isArray(options.selected)) {
          config.multi = options.selected;
        } else {
          config.sel = options.selected;
        }
      }
      if (options.allowSelect) config.allowsel = true;
      if (options.noDim) config.nodim = true;
      if (options.selectedPos !== void 0) config.selpos = options.selectedPos;
      if (callback) {
        const cbId = ++callbackCounter;
        asyncCallbacks.set(cbId, callback);
        adapter.asyncPrompt(JSON.stringify(config), cbId);
      } else {
        const result = adapter.syncPrompt(JSON.stringify(config));
        if (result !== null) {
          try {
            return JSON.parse(result);
          } catch {
          }
        }
      }
    }
    function textPrompt(options, callback) {
      if (adapter.isElectron && electronDialog) {
        electronDialog.showInput(
          options.title,
          options.message,
          options.isPin ?? false,
          options.maxLen,
          options.defaultValue,
          callback ?? (() => {
          }),
          options.noHtml
        );
        return null;
      }
      const config = {
        type: "text",
        title: options.title,
        message: options.message
      };
      if (!options.noHtml) config.html = true;
      if (options.isPin) config.ispin = true;
      if (options.maxLen) config.maxlen = options.maxLen;
      if (options.defaultValue) config.deval = options.defaultValue;
      if (callback) {
        const cbId = ++callbackCounter;
        asyncCallbacks.set(cbId, (v) => callback(v));
        adapter.asyncPrompt(JSON.stringify(config), cbId);
        return null;
      }
      const result = adapter.syncPrompt(JSON.stringify(config));
      if (result !== null) {
        try {
          const parsed = JSON.parse(result);
          if (parsed && "value" in parsed) {
            return parsed.value;
          }
        } catch {
        }
      }
      return null;
    }
    function confirm2(title, text, callback) {
      if (electronDialog) {
        electronDialog.showConfirm(title, text, callback);
      } else {
        const result = confirmDialog(title, text);
        callback(result);
      }
    }
    function alert(title, text, callback) {
      if (electronDialog) {
        electronDialog.showConfirm(title, text, () => callback(), true);
      } else {
        confirmDialog(title, text);
        callback();
      }
    }
    function confirmDialog(title, text, isHtml) {
      const config = {
        title,
        message: text
      };
      if (isHtml) config.html = true;
      return adapter.syncConfirm(JSON.stringify(config));
    }
    function handleAsyncPromptResult(callbackId, value) {
      const cb = asyncCallbacks.get(callbackId);
      if (cb) {
        asyncCallbacks.delete(callbackId);
        cb(value);
      }
    }
    return {
      showToast,
      dismissToast,
      listPrompt,
      textPrompt,
      confirm: confirm2,
      alert,
      confirmDialog,
      handleAsyncPromptResult
    };
  }

  // src/webview/api-facade.ts
  function createWebViewNavigationAdapter() {
    return {
      pushState(url) {
        history.pushState({}, "", url);
      },
      reloadHome() {
        _JSAPI.reloadHome();
      },
      isOnUpdate() {
        return _JSAPI.isOnUpdate();
      },
      checkUpdate() {
        _JSAPI.checkUpdate();
      },
      getVersion(part) {
        return _JSAPI.getVersion(part);
      },
      installApk(url, isNightly) {
        _JSAPI.installApk(url, isNightly);
      },
      dnsVersion() {
        return _JSAPI.dns();
      }
    };
  }
  function createWebViewUIFeedbackAdapter() {
    return {
      showNativeToast(text) {
        if (typeof _ISELECTRON !== "undefined" && _ISELECTRON) {
          const el = document.getElementById("animetv_toast");
          if (el) {
            el.innerHTML = "<div>" + text + "</div>";
            el.classList.add("active");
          }
        } else if (typeof pb !== "undefined" && pb.cfg_data && pb.cfg_data.toaststyle === 1) {
          const el = document.getElementById("animetv_toast");
          if (el) {
            el.innerHTML = "<div>" + text + "</div>";
            el.classList.add("active");
          }
        } else {
          _JSAPI.showToast(text);
        }
      },
      asyncPrompt(config, callbackId) {
        _JSAPI.asyncPrompt(config, callbackId);
      },
      syncPrompt(config) {
        return prompt(config);
      },
      syncConfirm(config) {
        return confirm(config);
      },
      get isElectron() {
        return typeof _ISELECTRON !== "undefined" && _ISELECTRON;
      },
      get useElectronToast() {
        if (typeof _ISELECTRON !== "undefined" && _ISELECTRON) return true;
        if (typeof pb !== "undefined" && pb.cfg_data && pb.cfg_data.toaststyle === 1) return true;
        return false;
      }
    };
  }
  function createElectronDialogAdapter() {
    if (typeof _ISELECTRON === "undefined" || !_ISELECTRON) return void 0;
    if (typeof listOrder === "undefined") return void 0;
    return {
      showList: listOrder.showList.bind(listOrder),
      showInput: listOrder.showInput.bind(listOrder),
      showConfirm: listOrder.showConfirm.bind(listOrder)
    };
  }
  function createAPIFacade() {
    const navAdapter = createWebViewNavigationAdapter();
    const navigation = createNavigationController(navAdapter);
    const uiAdapter = createWebViewUIFeedbackAdapter();
    const electronDialog = createElectronDialogAdapter();
    const uiFeedback = createUIFeedback(uiAdapter, electronDialog);
    return { navigation, uiFeedback };
  }
  function initAPIFacade() {
    const facade = createAPIFacade();
    if (typeof window !== "undefined") {
      if (!window.AnimeTV) {
        window.AnimeTV = {};
      }
      window.AnimeTV.facade = facade;
      if (typeof console !== "undefined") {
        console.log("[AnimeTV] API Facade (Phase 1.2) initialized \u2014 navigation + uiFeedback ready");
      }
    }
    return facade;
  }

  // src/webview-entry.ts
  if (isAndroidEnvironment()) {
    initAndroidBridge();
  } else {
    Promise.resolve().then(() => init_bridge());
  }
  return __toCommonJS(webview_entry_exports);
})();
