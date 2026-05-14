(function () {
  const EVENT_KEY = "pepsi-street:analytics-events:v1";
  const SESSION_KEY = "pepsi-street:analytics-session:v1";
  const SOURCE_KEY = "pepsi-street:traffic-source:v1";

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = makeId("session");
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function getSource() {
    const query = new URLSearchParams(location.search);
    const current = {
      source: query.get("utm_source") || "direct",
      medium: query.get("utm_medium") || "none",
      campaign: query.get("utm_campaign") || "pepsi-street",
    };
    if (current.source !== "direct" || !sessionStorage.getItem(SOURCE_KEY)) {
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(current));
    }
    return JSON.parse(sessionStorage.getItem(SOURCE_KEY));
  }

  function read() {
    const raw = localStorage.getItem(EVENT_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  function write(events) {
    localStorage.setItem(EVENT_KEY, JSON.stringify(events.slice(-5000)));
  }

  function track(type, payload = {}) {
    const event = {
      id: makeId("event"),
      type,
      payload,
      ts: new Date().toISOString(),
      sessionId: getSessionId(),
      path: location.pathname,
      source: getSource(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
    write([...read(), event]);
    return event;
  }

  function reset() {
    localStorage.removeItem(EVENT_KEY);
  }

  function fallbackEvents(stores) {
    const categories = Array.from(new Set(stores.map((store) => window.PepsiStreetStore.getMenuCategory(store)))).slice(0, 14);
    const districts = Array.from(new Set(stores.map((store) => window.PepsiStreetStore.getDistrict(store.address)))).slice(0, 12);
    const sources = ["instagram", "naver", "kakao", "direct", "youtube", "search"];
    const mapTypes = ["naver", "kakao", "google"];
    const now = Date.now();
    const events = [];

    for (let day = 89; day >= 0; day -= 1) {
      const dailySessions = 28 + ((90 - day) % 11) * 5;
      for (let i = 0; i < dailySessions; i += 1) {
        const sessionId = `demo-session-${day}-${i}`;
        const ts = new Date(now - day * 86400000 + i * 420000).toISOString();
        const category = categories[(i + day) % categories.length] || "햄버거";
        const district = districts[(i * 2 + day) % districts.length] || "마포구";
        const source = { source: sources[(i + day) % sources.length], medium: "demo", campaign: "pepsi-street" };

        events.push({ id: `demo-pv-${day}-${i}`, type: "page_view", ts, sessionId, path: "/index.html", source, payload: {} });
        if (i % 2 !== 0) events.push({ id: `demo-filter-${day}-${i}`, type: "filter_select", ts, sessionId, path: "/index.html", source, payload: { mode: "category", filter: category } });
        if (i % 3 === 0) events.push({ id: `demo-area-${day}-${i}`, type: "filter_select", ts, sessionId, path: "/index.html", source, payload: { mode: "district", filter: district } });
        if (i % 4 === 0) events.push({ id: `demo-map-${day}-${i}`, type: "map_click", ts, sessionId, path: "/index.html", source, payload: { map: mapTypes[(i + day) % mapTypes.length] } });
        if (i % 9 === 0) events.push({ id: `demo-open-${day}-${i}`, type: "register_open", ts, sessionId, path: "/index.html", source, payload: {} });
        if (i % 17 === 0) events.push({ id: `demo-submit-${day}-${i}`, type: "register_submit", ts, sessionId, path: "/index.html", source, payload: { category } });
      }
    }
    return events;
  }

  function getEvents({ withFallback = false, stores = [] } = {}) {
    const events = read();
    if (events.length || !withFallback) return events;
    return fallbackEvents(stores);
  }

  window.PepsiAnalytics = {
    track,
    getEvents,
    reset,
  };
})();
