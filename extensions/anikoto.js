/**
 * Anikoto Extension — Real anime source provider.
 *
 * Ports the inline anikoto-datasource.js scraping logic into an extension bundle.
 * Handles:
 *   - Search (title → animeId + slug)
 *   - Episode list (animeId → episodes with data-ids)
 *   - Server list (data-ids → sub/hsub/dub servers)
 *   - Embed URL resolution (linkId → embed URL for stream capture)
 *   - Kiwi-Stream mapper API (MAL ID → additional streaming sources)
 *
 * Stream capture (m3u8 interception from embed iframe) remains in the
 * interceptor layer as it requires browser-level network interception.
 * This extension returns embed URLs + metadata for that process.
 */

(function () {
  "use strict";

  // ─── Configuration ─────────────────────────────────────────────────────────

  const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  /* Active domain — can be changed via setDomain */
  let activeDomain = "anikototv.to";

  /* Known fallback domains */
  const knownDomains = [
    "anikototv.to",
    "anikoto.cz",
    "anikoto.me",
    "anikoto.net",
    "anikototv.se",
  ];

  /* Mapper API for Kiwi-Stream sources (animepahe) */
  const MAPPER_API = "https://mapper.mewcdn.online/api/mal";

  /* Spinoff/special indicators for search scoring */
  const SPINOFF_WORDS = [
    "mini",
    "marumaru",
    "special",
    "specials",
    "ova",
    "movie",
    "recap",
    "picture",
    "drama",
  ];

  // ─── Utility: HTTP fetch wrapper ──────────────────────────────────────────

  /**
   * Fetch a URL with proper headers, following redirects.
   * Uses the sandbox-provided `fetch()` (Electron net.fetch — bypasses CORS).
   */
  async function httpGet(url, headers = {}) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        ...headers,
      },
      redirect: "follow",
    });
    return {
      status: response.status,
      body: await response.text(),
    };
  }

  // ─── Search & Matching ─────────────────────────────────────────────────────

  /**
   * Calculate match score between a keyword slug and a result slug.
   */
  function slugMatchScore(keywordSlug, slugWithoutHash) {
    let score = 0;

    if (slugWithoutHash === keywordSlug) {
      score = 1000;
    } else if (
      slugWithoutHash.startsWith(keywordSlug + "-") ||
      slugWithoutHash.startsWith(keywordSlug)
    ) {
      const extraLength = slugWithoutHash.length - keywordSlug.length;
      score = 900 - extraLength * 3;
      if (score < 500) score = 500;
    } else if (
      keywordSlug.startsWith(slugWithoutHash + "-") ||
      keywordSlug.startsWith(slugWithoutHash)
    ) {
      const extraLength = keywordSlug.length - slugWithoutHash.length;
      score = 700 - extraLength * 2;
      if (score < 400) score = 400;
    } else if (
      slugWithoutHash
        .split("-")
        .join(" ")
        .includes(keywordSlug.split("-").join(" "))
    ) {
      score = 300;
    } else {
      const kwWords = keywordSlug.split("-");
      const slugWords = slugWithoutHash.split("-");
      let matchedWords = 0;
      for (const w of kwWords) {
        if (w.length >= 3 && slugWords.includes(w)) matchedWords++;
      }
      if (kwWords.length > 0 && matchedWords > 0) {
        score = Math.round(200 * (matchedWords / kwWords.length));
      }
    }

    return score;
  }

  /**
   * Find best matching result from search results list.
   */
  function findBestMatch(keyword, results) {
    const keywordSlug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Alternate slug handling apostrophe variants (Unicode U+2019 etc.)
    const keywordSlugAlt = keyword
      .toLowerCase()
      .replace(/[\u2018\u2019\u0027\u2032\u0060\u00B4\u2035]/g, "-")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let bestResult = results[0];
    let bestScore = -1;

    for (const result of results) {
      const slug = result.slug.toLowerCase();
      const slugWithoutHash = slug.replace(/-[a-z0-9]{4,6}$/, "");

      const matchScore1 = slugMatchScore(keywordSlug, slugWithoutHash);
      const matchScore2 = slugMatchScore(keywordSlugAlt, slugWithoutHash);
      let score = Math.max(matchScore1, matchScore2);

      // Penalize spinoff indicators
      if (score >= 500 && score < 900) {
        const slugWords = slugWithoutHash.split("-");
        for (const sw of SPINOFF_WORDS) {
          if (slugWords.includes(sw)) {
            score -= 200;
            break;
          }
        }
        if (
          !keywordSlug.includes("season") &&
          slugWithoutHash.includes("season-")
        ) {
          score -= 100;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestResult = result;
      }
    }

    bestResult._matchScore = bestScore;
    return bestResult;
  }

  // ─── Core API Methods ──────────────────────────────────────────────────────

  /**
   * Search for an anime on Anikoto.
   * @param {string} keyword - Anime title to search
   * @returns {Promise<{ok:boolean, animeId?:string, slug?:string, error?:string}>}
   */
  async function search(keyword) {
    try {
      const url = `https://${activeDomain}/filter?keyword=${encodeURIComponent(keyword)}`;
      const res = await httpGet(url, {
        Referer: `https://${activeDomain}/`,
      });

      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const allResults = [];
      const regex =
        /class="ani poster tip"[^>]*data-tip="(\d+)"[^>]*>\s*<a[^>]*href="[^"]*\/watch\/([^/"]+)/g;
      let match;
      while ((match = regex.exec(res.body)) !== null) {
        allResults.push({ animeId: match[1], slug: match[2] });
      }

      // Fallback regex
      if (allResults.length === 0) {
        const regex2 =
          /data-tip="(\d+)"[\s\S]{0,500}?href="[^"]*\/watch\/([^/"]+)/g;
        while ((match = regex2.exec(res.body)) !== null) {
          allResults.push({ animeId: match[1], slug: match[2] });
        }
      }

      if (allResults.length === 0) {
        return { ok: false, error: "No results found" };
      }

      if (allResults.length === 1) {
        return {
          ok: true,
          animeId: allResults[0].animeId,
          slug: allResults[0].slug,
        };
      }

      const best = findBestMatch(keyword, allResults);
      console.log(
        `Search "${keyword}": ${allResults.length} results, best: ${best.slug} (score=${best._matchScore})`
      );
      return {
        ok: true,
        animeId: best.animeId,
        slug: best.slug,
        matchScore: best._matchScore,
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get anime ID from a watch page slug.
   */
  async function getAnimeId(slug) {
    try {
      const url = `https://${activeDomain}/watch/${slug}/ep-1`;
      const res = await httpGet(url);
      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      const match = res.body.match(/data-id="(\d+)"/);
      if (!match) {
        return { ok: false, error: "data-id not found in page" };
      }
      return { ok: true, animeId: match[1] };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get episode list for an anime.
   * @param {string} animeId - Numeric anime ID
   * @returns {Promise<{ok:boolean, episodes?:Array, malId?:string, timestamp?:string}>}
   */
  async function getEpisodeList(animeId) {
    try {
      const url = `https://${activeDomain}/ajax/episode/list/${animeId}`;
      const res = await httpGet(url, {
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://${activeDomain}/`,
      });

      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const json = JSON.parse(res.body);
      if (json.status !== 200 || !json.result) {
        return { ok: false, error: json.message || "invalid response" };
      }

      const html = json.result;
      const episodes = [];
      const regex =
        /<a[^>]*data-ids="([^"]+)"[^>]*data-num="([^"]*)"[^>]*data-slug="([^"]*)"[^>]*>/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        episodes.push({
          dataIds: m[1],
          num: m[2] || episodes.length + 1 + "",
          slug: m[3],
        });
      }

      // Fallback extraction
      if (episodes.length === 0) {
        const idsRegex = /data-ids="([^"]+)"/g;
        let idMatch;
        let idx = 0;
        while ((idMatch = idsRegex.exec(html)) !== null) {
          idx++;
          episodes.push({
            dataIds: idMatch[1],
            num: idx + "",
            slug: idx + "",
          });
        }
      }

      // Extract MAL ID and timestamp (for mapper/Kiwi)
      const malMatch = html.match(/data-mal="([^"]+)"/);
      const tsMatch = html.match(/data-timestamp="([^"]+)"/);
      const malId = malMatch ? malMatch[1] : null;
      const timestamp = tsMatch ? tsMatch[1] : null;

      return { ok: true, episodes, malId, timestamp };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get server list for an episode.
   * @param {string} dataIds - Encrypted data-ids from episode element
   * @returns {Promise<{ok:boolean, servers?:Array}>}
   */
  async function getServerList(dataIds) {
    try {
      const url = `https://${activeDomain}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`;
      const res = await httpGet(url, {
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://${activeDomain}/`,
      });

      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const json = JSON.parse(res.body);
      if (json.status !== 200 || !json.result) {
        return { ok: false, error: json.message || "invalid response" };
      }

      const html = json.result;
      const servers = [];

      // Parse SUB servers
      const subSection = html.match(/data-type="sub"[\s\S]*?<\/ul>/);
      if (subSection) {
        const items = subSection[0].matchAll(
          /<li[^>]*data-sv-id="([^"]*)"[^>]*data-link-id="([^"]*)"[^>]*>([^<]*)<\/li>/g
        );
        for (const m of items) {
          servers.push({
            svId: m[1],
            linkId: m[2],
            name: m[3].trim(),
            type: "sub",
          });
        }
      }

      // Parse HSUB (hardsub) servers
      const hsubSection = html.match(/data-type="hsub"[\s\S]*?<\/ul>/);
      if (hsubSection) {
        const items = hsubSection[0].matchAll(
          /<li[^>]*data-sv-id="([^"]*)"[^>]*data-link-id="([^"]*)"[^>]*>([^<]*)<\/li>/g
        );
        for (const m of items) {
          servers.push({
            svId: m[1],
            linkId: m[2],
            name: m[3].trim(),
            type: "hsub",
          });
        }
      }

      // Parse DUB servers
      const dubSection = html.match(/data-type="dub"[\s\S]*?<\/ul>/);
      if (dubSection) {
        const items = dubSection[0].matchAll(
          /<li[^>]*data-sv-id="([^"]*)"[^>]*data-link-id="([^"]*)"[^>]*>([^<]*)<\/li>/g
        );
        for (const m of items) {
          servers.push({
            svId: m[1],
            linkId: m[2],
            name: m[3].trim(),
            type: "dub",
          });
        }
      }

      return { ok: true, servers };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get embed URL for a server link ID.
   * @param {string} linkId - Encrypted data-link-id from server element
   * @returns {Promise<{ok:boolean, url?:string, skipData?:object}>}
   */
  async function getEmbedUrl(linkId) {
    try {
      const url = `https://${activeDomain}/ajax/server?get=${encodeURIComponent(linkId)}`;
      const res = await httpGet(url, {
        "X-Requested-With": "XMLHttpRequest",
        Referer: `https://${activeDomain}/`,
      });

      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const json = JSON.parse(res.body);
      if (json.status !== 200 || !json.result) {
        return { ok: false, error: json.message || "invalid response" };
      }

      const result = json.result;
      return {
        ok: true,
        url: result.url,
        skipData: result.skip_data || { intro: [0, 0], outro: [0, 0] },
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Get Kiwi-Stream servers from the mapper API.
   * @param {string} malId - MyAnimeList ID
   * @param {string} epSlug - Episode slug/number
   * @param {string} timestamp - Timestamp from episode element
   * @returns {Promise<{ok:boolean, servers?:Array, downloads?:object}>}
   */
  async function getMapperServers(malId, epSlug, timestamp) {
    try {
      if (!malId || !epSlug || !timestamp) {
        return { ok: false, error: "missing malId, epSlug, or timestamp" };
      }

      const url = `${MAPPER_API}/${malId}/${epSlug}/${timestamp}`;
      console.log("Fetching mapper API:", url);

      const res = await httpGet(url, {
        Referer: `https://${activeDomain}/`,
        Origin: `https://${activeDomain}`,
      });

      if (res.status !== 200) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = JSON.parse(res.body);
      if (!data || typeof data !== "object") {
        return { ok: false, error: "invalid response" };
      }

      const servers = [];
      const downloads = {};

      for (const [name, entry] of Object.entries(data)) {
        if (name === "status") continue;

        if (entry.sub && entry.sub.download && !entry.sub.url) {
          downloads.sub = entry.sub.download;
        }
        if (entry.dub && entry.dub.download && !entry.dub.url) {
          downloads.dub = entry.dub.download;
        }

        if (entry.sub && entry.sub.url) {
          servers.push({
            svId: "kiwi",
            linkId: entry.sub.url,
            name: name,
            type: "sub",
            isKiwi: true,
          });
        }
        if (entry.dub && entry.dub.url) {
          servers.push({
            svId: "kiwi",
            linkId: entry.dub.url,
            name: name,
            type: "dub",
            isKiwi: true,
          });
        }
      }

      console.log("Mapper returned", servers.length, "Kiwi servers");
      return { ok: true, servers, downloads };
    } catch (e) {
      console.log("Mapper API error:", e.message);
      return { ok: false, error: e.message };
    }
  }

  // ─── Extension Interface ───────────────────────────────────────────────────

  AnimeTV.registerExtension({
    id: "anikoto",
    name: "Anikoto",
    version: "1.0.0",

    capabilities: {
      hasSub: true,
      hasDub: true,
      hasSoftsub: true,
      hasSkipData: true,
      hasSearch: true,
      hasHome: false,
    },

    /**
     * Get the current active domain.
     */
    getDomain() {
      return activeDomain;
    },

    /**
     * Set the active domain for requests.
     */
    setDomain(domain) {
      if (domain && typeof domain === "string") {
        activeDomain = domain;
      }
      return activeDomain;
    },

    /**
     * Get known fallback domains.
     */
    getKnownDomains() {
      return knownDomains;
    },

    /**
     * Get episodes for an anime from AniList ID.
     * Workflow: search by title → get anime ID → get episode list
     *
     * @param {string} anilistId - AniList anime ID (unused for direct search — see title param)
     * @param {object} [opts] - Options: { title, titleRomaji }
     * @returns {Promise<object>} Episode data with servers metadata
     */
    async getEpisodes(anilistId, opts) {
      const title = (opts && opts.title) || "";
      const titleRomaji = (opts && opts.titleRomaji) || "";

      if (!title && !titleRomaji) {
        return {
          ok: false,
          error: "No title provided for search",
          episodes: [],
        };
      }

      // Search with English title first, then romaji fallback
      let searchResult = await search(title || titleRomaji);
      if (!searchResult.ok && titleRomaji && title !== titleRomaji) {
        console.log("English title failed, trying romaji:", titleRomaji);
        searchResult = await search(titleRomaji);
      }

      if (!searchResult.ok) {
        return {
          ok: false,
          error: searchResult.error || "Search failed",
          episodes: [],
        };
      }

      // Get episode list
      const epResult = await getEpisodeList(searchResult.animeId);
      if (!epResult.ok) {
        return {
          ok: false,
          error: epResult.error || "Episode list failed",
          episodes: [],
        };
      }

      return {
        ok: true,
        animeId: searchResult.animeId,
        slug: searchResult.slug,
        malId: epResult.malId,
        timestamp: epResult.timestamp,
        episodes: epResult.episodes,
        totalEpisodes: epResult.episodes.length,
        hasDub: true,
        hasSoftsub: true,
      };
    },

    /**
     * Get stream sources for an episode.
     * Returns server list + embed URLs for stream capture by interceptor.
     *
     * @param {string} episodeId - The dataIds string for the episode
     * @param {string} category - "sub", "hsub", or "dub"
     * @param {object} [opts] - Options: { malId, epSlug, timestamp, preferredServer }
     * @returns {Promise<object>} Stream source data
     */
    async getStreamSources(episodeId, category, opts) {
      category = category || "sub";
      const malId = (opts && opts.malId) || "";
      const epSlug = (opts && opts.epSlug) || "";
      const timestamp = (opts && opts.timestamp) || "";
      const preferredServer = (opts && opts.preferredServer) || "";

      // Get native servers from Anikoto
      const serverResult = await getServerList(episodeId);
      if (!serverResult.ok) {
        return {
          ok: false,
          error: serverResult.error || "Server list failed",
          sources: [],
        };
      }

      // Filter servers by category
      let servers = serverResult.servers.filter((s) => s.type === category);

      // If no servers for requested category, try fallback
      if (servers.length === 0 && category === "hsub") {
        servers = serverResult.servers.filter((s) => s.type === "sub");
      }

      // Get Kiwi-Stream servers (optional, non-blocking)
      let kiwiServers = [];
      if (malId && epSlug && timestamp) {
        try {
          const mapperResult = await getMapperServers(malId, epSlug, timestamp);
          if (mapperResult.ok && mapperResult.servers) {
            kiwiServers = mapperResult.servers.filter(
              (s) => s.type === category || (category === "hsub" && s.type === "sub")
            );
          }
        } catch (e) {
          console.log("Kiwi mapper failed (non-fatal):", e.message);
        }
      }

      // Select best server: preferred → first native → first kiwi
      let selectedServer = null;
      if (preferredServer) {
        selectedServer =
          servers.find((s) => s.svId === preferredServer) ||
          kiwiServers.find((s) => s.name.toLowerCase().includes(preferredServer));
      }
      if (!selectedServer && servers.length > 0) {
        selectedServer = servers[0];
      }
      if (!selectedServer && kiwiServers.length > 0) {
        selectedServer = kiwiServers[0];
      }

      if (!selectedServer) {
        return {
          ok: false,
          error: `No servers found for category: ${category}`,
          sources: [],
        };
      }

      // Get embed URL for selected server
      let embedResult = null;
      if (!selectedServer.isKiwi) {
        embedResult = await getEmbedUrl(selectedServer.linkId);
      }

      return {
        ok: true,
        selectedServer: selectedServer,
        embedUrl: embedResult ? embedResult.url : null,
        skipData: embedResult ? embedResult.skipData : null,
        isKiwi: selectedServer.isKiwi || false,
        kiwiUrl: selectedServer.isKiwi ? selectedServer.linkId : null,
        allServers: servers,
        allKiwiServers: kiwiServers,
        // Stream resolution type tells the webview how to handle this
        resolutionType: selectedServer.isKiwi ? "kiwi-direct" : "iframe-capture",
      };
    },

    /**
     * Check if Anikoto domain is reachable.
     */
    async isAvailable() {
      try {
        const res = await httpGet(`https://${activeDomain}/`, {
          Referer: `https://${activeDomain}/`,
        });
        return res.status === 200;
      } catch (e) {
        // Try fallback domains
        for (const domain of knownDomains) {
          if (domain === activeDomain) continue;
          try {
            const res = await httpGet(`https://${domain}/`);
            if (res.status === 200) {
              activeDomain = domain;
              console.log("Switched to fallback domain:", domain);
              return true;
            }
          } catch (_) {
            /* continue */
          }
        }
        return false;
      }
    },

    async initialize() {
      console.log("Anikoto extension initialized. Domain:", activeDomain);
    },

    async dispose() {
      console.log("Anikoto extension disposed.");
    },
  });
})();
