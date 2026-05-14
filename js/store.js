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

  const MENU_CATEGORY_MAP = {
    "일식당": "일식", "라멘": "일식", "일식 카레": "일식", "돈가스": "일식", "타코야끼, 야끼소바": "일식",
    "한식(국밥)": "한식", "오리곰탕": "한식",
    "중식": "중식", "퓨전 중식": "중식", "중화요리 주점": "중식", "마라샹궈, 버섯튀김": "중식",
    "화덕 피자": "양식", "화덕피자": "양식", "스페인 음식": "양식", "브런치": "양식",
    "퓨전 요리": "양식", "수제소시지": "양식",
    "태국음식": "아시안", "아시아 음식": "아시안", "아시안음식": "아시안",
    "베트남 음식": "아시안", "베트남 음식 (퀴진)": "아시안",
    "커리": "아시안", "스프커리": "아시안", "우육당면": "아시안",
    "멕시코, 남미음식": "멕시칸", "멕시칸 음식": "멕시칸", "타코": "멕시칸",
    "타코, 퀘사디아": "멕시칸", "부리또보울&부리또": "멕시칸",
    "햄버거": "버거", "치킨버거": "버거", "수제버거": "버거", "핫도그": "버거", "샌드위치": "버거",
  };

  function getMenuCategory(store) {
    const raw = store.menuCategory || store.category || "";
    return MENU_CATEGORY_MAP[raw] || raw;
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
