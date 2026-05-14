(function () {
  const STORE_KEY = "pepsi-street:stores:v1";
  const MAP_KEY = "pepsi-street:map-links:v1";
  const SEED_VERSION_KEY = "pepsi-street:stores:seed-version";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeKey(store) {
    return [store.name, store.address]
      .map((value) => String(value || "").replace(/\s+/g, "").toLowerCase())
      .join("|");
  }

  function dedupeStores(stores) {
    const seen = new Map();
    stores.forEach((store) => {
      const key = normalizeKey(store);
      if (!key || key === "|") return;
      if (!seen.has(key)) {
        seen.set(key, store);
        return;
      }
      seen.set(key, {
        ...seen.get(key),
        ...store,
        note: [seen.get(key).note, store.note].filter(Boolean).join(" / "),
      });
    });
    return Array.from(seen.values());
  }

  function getDistrict(address) {
    const match = String(address || "").match(/(?:서울특별시|서울시|서울|부산|강원)\s+([^\s]+(?:구|군|시))/);
    return match ? match[1] : "기타";
  }

  function getAllStores() {
    const seedVersion = window.PEPSI_STREET_SEED_VERSION || "legacy";
    const raw = localStorage.getItem(STORE_KEY);
    const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
    if (raw && storedVersion === seedVersion) return dedupeStores(JSON.parse(raw));

    const seed = clone(window.PEPSI_STREET_SEED || []);
    if (raw) {
      const userStores = JSON.parse(raw).filter((store) => !String(store.id || "").startsWith("seed-"));
      const migrated = dedupeStores([...seed, ...userStores]);
      saveStores(migrated);
      localStorage.setItem(SEED_VERSION_KEY, seedVersion);
      return migrated;
    }

    const next = dedupeStores(seed);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    localStorage.setItem(SEED_VERSION_KEY, seedVersion);
    return next;
  }

  function saveStores(stores) {
    localStorage.setItem(STORE_KEY, JSON.stringify(dedupeStores(stores)));
  }

  function upsertStore(input) {
    const stores = getAllStores();
    const next = {
      id: input.id || makeId("store"),
      name: input.name.trim(),
      category: input.category.trim(),
      menuCategory: (input.menuCategory || input.category || "").trim(),
      address: input.address.trim(),
      note: (input.note || "").trim(),
      status: input.status || "approved",
      owner: (input.owner || "").trim(),
      email: (input.email || "").trim(),
      phone: (input.phone || "").trim(),
      instagram: (input.instagram || "").trim(),
      menu: (input.menu || "").trim(),
      createdAt: input.createdAt || new Date().toISOString(),
    };
    const index = stores.findIndex((store) => store.id === next.id);
    if (index >= 0) stores[index] = { ...stores[index], ...next };
    else stores.unshift(next);
    saveStores(stores);
    return next;
  }

  function submitApplication(input) {
    return upsertStore({
      ...input,
      category: input.category || input.menu || "신청 매장",
      menuCategory: input.menuCategory || input.menu || input.category || "신청 매장",
      note: input.note || "웹사이트 등록 신청",
      status: "pending",
    });
  }

  function getMenuCategory(store) {
    return store.menuCategory || store.category || "";
  }

  function approveStore(id) {
    const stores = getAllStores();
    const store = stores.find((item) => item.id === id);
    if (!store) return null;
    store.status = "approved";
    store.approvedAt = new Date().toISOString();
    saveStores(stores);
    return store;
  }

  function removeStore(id) {
    saveStores(getAllStores().filter((store) => store.id !== id));
  }

  function resetStores() {
    localStorage.removeItem(STORE_KEY);
    return getAllStores();
  }

  function getMapLinks() {
    const raw = localStorage.getItem(MAP_KEY);
    return raw ? JSON.parse(raw) : { ...window.PEPSI_DEFAULT_MAP_LINKS };
  }

  function saveMapLinks(links) {
    const next = {
      ...window.PEPSI_DEFAULT_MAP_LINKS,
      ...links,
    };
    localStorage.setItem(MAP_KEY, JSON.stringify(next));
    return next;
  }

  window.PepsiStreetStore = {
    getAllStores,
    saveStores,
    upsertStore,
    submitApplication,
    approveStore,
    removeStore,
    resetStores,
    getMapLinks,
    saveMapLinks,
    getDistrict,
    getMenuCategory,
  };
})();
