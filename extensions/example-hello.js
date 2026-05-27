/**
 * Example Extension — Hello World proof-of-concept.
 *
 * This demonstrates the minimum viable extension format.
 * A real extension would scrape/fetch from an actual anime source.
 *
 * Extensions must call `AnimeTV.registerExtension(exportObj)` to register themselves.
 */

AnimeTV.registerExtension({
  id: "example-hello",
  name: "Example Hello",
  version: "1.0.0",

  capabilities: {
    hasSub: true,
    hasDub: false,
    hasSoftsub: false,
    hasSkipData: false,
    hasSearch: false,
    hasHome: false,
  },

  async getEpisodes(anilistId) {
    console.log(`[example-hello] getEpisodes called with anilistId: ${anilistId}`);

    // Return mock data for testing
    return {
      episodes: [
        { id: `example-${anilistId}-1`, number: 1, title: "Hello Episode 1" },
        { id: `example-${anilistId}-2`, number: 2, title: "Hello Episode 2" },
        { id: `example-${anilistId}-3`, number: 3, title: "Hello Episode 3" },
      ],
      totalEpisodes: 3,
      hasDub: false,
      hasSoftsub: false,
    };
  },

  async getStreamSources(episodeId, category) {
    console.log(`[example-hello] getStreamSources: ${episodeId} [${category}]`);

    // Return a mock stream URL for testing
    return {
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      type: "hls",
      quality: "720p",
      referer: "",
      headers: {},
      subtitles: [],
    };
  },

  async isAvailable() {
    // Always available (it's a mock)
    return true;
  },

  async initialize() {
    console.log("[example-hello] Extension initialized!");
  },

  async dispose() {
    console.log("[example-hello] Extension disposed!");
  },
});
