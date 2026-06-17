(function () {
  const cfg = window.PEPSI_CONFIG || {};
  const hasLib = typeof window.supabase !== "undefined" && window.supabase?.createClient;
  const configured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  const enabled = hasLib && configured;

  const client = enabled ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  // DB(snake_case) <-> 앱(camelCase) 매핑
  function fromRow(row) {
    return {
      id: row.id,
      name: row.name || "",
      category: row.category || "",
      menuCategory: row.menu_category || "",
      address: row.address || "",
      note: row.note || "",
      status: row.status || "approved",
      owner: row.owner || "",
      email: row.email || "",
      phone: row.phone || "",
      instagram: row.instagram || "",
      menu: row.menu || "",
      createdAt: row.created_at || undefined,
      approvedAt: row.approved_at || undefined,
    };
  }

  function toRow(store) {
    return {
      id: store.id,
      name: store.name || "",
      category: store.category || "",
      menu_category: store.menuCategory || "",
      address: store.address || "",
      note: store.note || "",
      status: store.status || "approved",
      owner: store.owner || "",
      email: store.email || "",
      phone: store.phone || "",
      instagram: store.instagram || "",
      menu: store.menu || "",
      created_at: store.createdAt || new Date().toISOString(),
      approved_at: store.approvedAt || null,
      updated_at: new Date().toISOString(),
    };
  }

  async function fetchAll() {
    const [stores, mapLinks, heroImages] = await Promise.all([
      client.from("stores").select("*"),
      client.from("map_links").select("*").eq("id", 1).maybeSingle(),
      client.from("hero_images").select("*").order("position", { ascending: true }),
    ]);
    if (stores.error) throw stores.error;
    return {
      stores: (stores.data || []).map(fromRow),
      mapLinks: mapLinks.data
        ? { naver: mapLinks.data.naver, kakao: mapLinks.data.kakao, tmap: mapLinks.data.tmap }
        : null,
      heroImages: (heroImages.data || []).map((row) => row.data).filter(Boolean),
    };
  }

  async function pushStore(store) {
    const { error } = await client.from("stores").upsert(toRow(store), { onConflict: "id" });
    if (error) throw error;
  }

  async function deleteStore(id) {
    const { error } = await client.from("stores").delete().eq("id", id);
    if (error) throw error;
  }

  async function saveMapLinks(links) {
    const { error } = await client
      .from("map_links")
      .upsert({ id: 1, naver: links.naver, kakao: links.kakao, tmap: links.tmap, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
  }

  async function saveHeroImages(images) {
    await client.from("hero_images").delete().neq("id", "__none__");
    if (!images.length) return;
    const rows = images.map((data, index) => ({ id: `hero-${index + 1}`, data, position: index }));
    const { error } = await client.from("hero_images").insert(rows);
    if (error) throw error;
  }

  // 클라우드가 비어 있을 때만 시드 데이터를 1회 업로드한다(중복 시드 방지).
  async function seedIfEmpty(seedStores, defaultMapLinks) {
    const meta = await client.from("app_meta").select("value").eq("key", "seeded").maybeSingle();
    if (meta.data?.value === "true") return false;

    const existing = await client.from("stores").select("id", { count: "exact", head: true });
    if ((existing.count || 0) > 0) {
      await client.from("app_meta").upsert({ key: "seeded", value: "true" }, { onConflict: "key" });
      return false;
    }

    if (seedStores.length) {
      const { error } = await client.from("stores").upsert(seedStores.map(toRow), { onConflict: "id" });
      if (error) throw error;
    }
    if (defaultMapLinks) await saveMapLinks(defaultMapLinks);
    await client.from("app_meta").upsert({ key: "seeded", value: "true" }, { onConflict: "key" });
    return true;
  }

  function subscribe(onChange) {
    if (!enabled) return;
    client
      .channel("pepsi-street-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "map_links" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "hero_images" }, onChange)
      .subscribe();
  }

  window.PepsiCloud = {
    enabled,
    configured,
    fetchAll,
    pushStore,
    deleteStore,
    saveMapLinks,
    saveHeroImages,
    seedIfEmpty,
    subscribe,
  };
})();
