(function () {
  const root = document.getElementById("dashboard");
  const api = window.PepsiStreetStore;
  const h = window.PepsiComponents.escapeHtml;

  const PAGES = [
    { id: "overview", label: "대시보드", title: "대시보드", desc: "매장 등록 현황과 마케팅 퍼포먼스를 한 화면에서 확인합니다.", meta: "성과 요약", icon: "dashboard" },
    { id: "stores", label: "매장관리", title: "매장관리", desc: "등록 완료 매장과 신청 매장을 빠르게 검토하고 정리합니다.", meta: "운영 관리", icon: "store" },
    { id: "maps", label: "지도 URL 관리", title: "지도 URL 관리", desc: "외부 지도 링크를 채널별로 검수하고 업데이트합니다.", meta: "외부 링크", icon: "map" },
    { id: "images", label: "메인 이미지 관리", title: "메인 이미지 관리", desc: "메인 화면에 노출할 이미지를 업로드하고 순서를 점검합니다.", meta: "콘텐츠 자산", icon: "image" },
  ];

  const CATEGORY_ORDER = ["한식", "중식", "양식", "일식", "아시안", "멕시칸", "버거"];

  const ICONS = {
    plus: '<path d="M10 4v12M4 10h12"/>',
    check: '<path d="M4 10.5l4 4L16 5"/>',
    edit: '<path d="M13.5 3.5l3 3L7 16l-4 1 1-4z"/>',
    trash: '<path d="M4 5h12M8 5V3h4v2M5.5 5l.7 11h7.6l.7-11"/>',
    external: '<path d="M11 3h6v6M17 3l-8 8M15 11.5V16a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h4.5"/>',
    link: '<path d="M8.5 11.5l3-3M7 9.5L5 11.5a2.5 2.5 0 003.5 3.5l2-2M9.5 7.5l2-2A2.5 2.5 0 0115 9l-2 2"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2L16.5 16.5"/>',
    dashboard: '<path d="M3.5 4.5h5.5v5.5H3.5zM11 4.5h5.5v3.5H11zM11 10h5.5v5.5H11zM3.5 12h5.5v3.5H3.5z"/>',
    store: '<path d="M3.5 8.5h13v8h-13zM5 8.5V5.8l1.1-2.3h7.8L15 5.8v2.7M7 11.5h2.5M11.5 11.5H13"/>',
    map: '<path d="M10 16.5s4-4.2 4-7.5a4 4 0 10-8 0c0 3.3 4 7.5 4 7.5z"/><circle cx="10" cy="9" r="1.6"/>',
    image: '<rect x="3.5" y="4.5" width="13" height="11" rx="1.5"/><path d="M6.5 12l2.5-2.8 2.1 2.2 1.7-1.6 2.7 3.2"/><circle cx="7" cy="8" r="1"/>',
    refresh: '<path d="M16 10a6 6 0 10-1.2 3.6"/><path d="M16 5.5v4h-4"/>',
  };

  function icon(name) {
    return `<svg class="ui-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  let activePage = "overview";
  let storeModalOpen = false;
  let activeStatus = "approved";
  let storeMode = "category";
  let storeFilter = "전체";
  let heroEditIndex = null;
  let imagePreviewIndex = null;
  let query = "";
  let editingId = null;
  let activePeriod = 28;
  let confirmAction = null;
  let fabObserver = null;

  function stores() {
    return api.getAllStores();
  }

  function scopedStores() {
    return stores().filter((store) => store.status === activeStatus);
  }

  function storeFilterItems() {
    const scoped = scopedStores();
    if (storeMode === "category") {
      const present = new Set(scoped.map((s) => api.getMenuCategory(s)).filter(Boolean));
      const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
      const rest = [...present].filter((c) => !CATEGORY_ORDER.includes(c));
      return ["전체", ...ordered, ...rest];
    }
    const all = Array.from(new Set(scoped.map((s) => api.getDistrict(s.address)).filter(Boolean)));
    const seoul = all.filter((d) => scoped.some((s) => api.getDistrict(s.address) === d && /^서울/.test(s.address)));
    const rest = all.filter((d) => !seoul.includes(d));
    return ["전체", ...seoul, ...rest];
  }

  function visibleStores() {
    const needle = query.trim().toLowerCase();
    return scopedStores()
      .filter((store) => {
        if (storeFilter === "전체") return true;
        if (storeMode === "category") return api.getMenuCategory(store) === storeFilter;
        return api.getDistrict(store.address) === storeFilter;
      })
      .filter((store) => {
        if (!needle) return true;
        return [store.name, store.category, store.menuCategory, store.address, store.note, store.email, store.phone]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }

  function currentEditStore() {
    return stores().find((store) => store.id === editingId) || null;
  }

  function render() {
    const all = stores();
    const page = PAGES.find((item) => item.id === activePage) || PAGES[0];
    const approvedCount = all.filter((store) => store.status === "approved").length;
    const pendingCount = all.filter((store) => store.status === "pending").length;

    root.innerHTML = `
      <div class="dash-layout">
        ${sidebarMarkup(all, approvedCount, pendingCount)}
        <main class="dash-content">
          <header class="dash-header">
            <div class="dash-header-copy">
              <p class="dash-kicker">Pepsi Street Admin</p>
              <h1>${h(page.title)}</h1>
              <p>${h(page.desc)}</p>
            </div>
            <div class="dash-actions">
              <a class="icon-btn header-icon-btn" href="index.html" target="_blank" rel="noreferrer" title="사이트 보기" aria-label="사이트 보기">${icon("external")}</a>
              <button class="icon-btn danger header-icon-btn" type="button" data-reset title="초기 데이터 복원" aria-label="초기 데이터 복원">${icon("refresh")}</button>
            </div>
          </header>
          ${pageMarkup(all)}
        </main>
      </div>
      ${storeModalMarkup()}
      ${confirmModalMarkup()}
      ${imagePreviewMarkup()}
    `;

    bind();
  }

  function sidebarMarkup(all, approvedCount, pendingCount) {
    return `
      <aside class="dash-sidebar">
        <div class="dash-brand">
          <img src="assets/figma/pepsi-logo.svg" alt="Pepsi" />
          <div>
            <strong>Pepsi Street</strong>
            <span>Campaign Console</span>
          </div>
        </div>
        <div class="dash-sidebar-stats" aria-label="운영 요약">
          <div class="dash-sidebar-stat">
            <span>등록 완료</span>
            <strong>${approvedCount.toLocaleString()}</strong>
          </div>
          <div class="dash-sidebar-stat">
            <span>승인 대기</span>
            <strong>${pendingCount.toLocaleString()}</strong>
          </div>
        </div>
        <nav class="dash-nav" aria-label="대시보드 메뉴">
          ${PAGES.map(
            (item) => `
              <button class="dash-nav-item ${item.id === activePage ? "is-active" : ""}" type="button" data-page="${item.id}">
                <span class="dash-nav-leading">
                  <span class="dash-nav-icon">${icon(item.icon)}</span>
                  <span class="dash-nav-copy">
                    <strong>${h(item.label)}</strong>
                    <small>${h(item.meta)}</small>
                  </span>
                </span>
                ${item.id === "stores" && pendingCount ? `<em class="dash-nav-badge">${pendingCount}</em>` : ""}
              </button>
            `,
          ).join("")}
        </nav>
      </aside>
    `;
  }

  function pageMarkup(all) {
    if (activePage === "stores") return storesPageMarkup();
    if (activePage === "maps") return mapsPageMarkup();
    if (activePage === "images") return imagesPageMarkup();
    return overviewPageMarkup(all);
  }

  function overviewPageMarkup(all) {
    const approved = all.filter((store) => store.status === "approved");
    const pending = all.filter((store) => store.status === "pending");
    const analytics = buildAnalytics(all, activePeriod);
    return `
      <section class="metric-row" aria-label="요약">
        <div class="metric">
          <div class="metric-top"><span>등록 완료 매장</span><i>${icon("store")}</i></div>
          <strong>${approved.length.toLocaleString()}</strong>
          <p>메인 사이트에 즉시 노출되는 매장 수</p>
        </div>
        <div class="metric">
          <div class="metric-top"><span>등록 신청 매장</span><i>${icon("check")}</i></div>
          <strong>${pending.length.toLocaleString()}</strong>
          <p>검수 및 승인 대기 중인 신청 건수</p>
        </div>
        <div class="metric">
          <div class="metric-top"><span>카테고리</span><i>${icon("dashboard")}</i></div>
          <strong>${new Set(approved.map((store) => store.category)).size}</strong>
          <p>현재 노출 중인 매장 카테고리 분포</p>
        </div>
      </section>
      ${analyticsMarkup(analytics)}
    `;
  }

  function storesPageMarkup() {
    const filters = storeFilterItems();
    if (!filters.includes(storeFilter)) storeFilter = "전체";
    const items = visibleStores();
    return `
      <section class="dash-panel">
        <div class="dash-panel-header">
          <div class="dash-panel-title">
            <div>
              <p class="panel-kicker">Store Operations</p>
              <h2>매장 데이터 관리</h2>
              <p>${activeStatus === "approved" ? "등록 완료된 매장을 유지보수합니다." : "신청 매장을 검토하고 승인합니다."}</p>
            </div>
            <button class="dash-button primary" type="button" data-open-store-modal data-open-store-anchor>${icon("plus")}매장 등록</button>
          </div>
          <div class="dash-toolbar-row">
            <div class="dash-tabs" role="tablist" aria-label="매장 상태">
              <button class="${activeStatus === "approved" ? "is-active" : ""}" type="button" data-tab="approved">등록 완료된 매장</button>
              <button class="${activeStatus === "pending" ? "is-active" : ""}" type="button" data-tab="pending">등록 신청한 매장</button>
            </div>
            <label class="dash-search-field">
              ${icon("search")}
              <input class="dash-search" type="search" value="${h(query)}" placeholder="매장명, 카테고리, 주소 검색" data-search />
            </label>
          </div>
        </div>
        <div class="store-filter-bar">
          <div class="dash-toggle" role="tablist" aria-label="매장 분류">
            <button class="${storeMode === "category" ? "is-active" : ""}" type="button" data-store-mode="category">메뉴별</button>
            <button class="${storeMode === "district" ? "is-active" : ""}" type="button" data-store-mode="district">지역별</button>
          </div>
          <div class="dash-subtabs" role="tablist" aria-label="상세 분류">
            ${filters
              .map(
                (item) => `<button class="${item === storeFilter ? "is-active" : ""}" type="button" data-store-filter="${h(item)}">${h(item)}</button>`,
              )
              .join("")}
          </div>
          <div class="store-filter-meta">
            <span>${storeMode === "category" ? "카테고리 기준" : "지역 기준"}</span>
            <strong>${items.length.toLocaleString()}개 매장</strong>
          </div>
        </div>
        <div class="store-table-wrap">
          ${tableMarkup(items)}
        </div>
      </section>
      <button class="dash-fab" type="button" data-open-store-modal data-open-store-fab aria-label="매장 등록">${icon("plus")}</button>
    `;
  }

  function mapsPageMarkup() {
    const mapLinks = api.getMapLinks();
    const rows = [
      { name: "naver", label: "네이버 지도 URL", value: mapLinks.naver || "" },
      { name: "kakao", label: "카카오맵 URL", value: mapLinks.kakao || "" },
      { name: "tmap", label: "티맵 URL", value: mapLinks.tmap || "" },
    ];
    return `
      <section class="dash-panel">
        <form class="dash-form" data-map-form>
          <div class="dash-panel-title compact">
            <div>
              <p class="panel-kicker">Outbound Map Links</p>
              <h2>팹시스트릿 지도 URL 관리</h2>
              <p>채널별 링크를 보관하고, 저장 즉시 최신 링크를 운영 화면에 반영합니다.</p>
            </div>
          </div>
          <div class="map-url-grid">
            ${rows
            .map(
              (row) => `
                <div class="map-url-row">
                  <div class="map-url-row-head">
                    <strong>${h(row.label)}</strong>
                    <span>${h(row.name.toUpperCase())}</span>
                  </div>
                  <label class="dash-field">
                    <span>링크 주소</span>
                    <div class="map-url-input">
                      <input name="${row.name}" value="${h(row.value)}" required />
                      <button class="dash-button map-open" type="button" data-map-open="${row.name}" title="새 탭에서 열기">${icon("external")}바로가기</button>
                    </div>
                  </label>
                  ${
                    row.value
                      ? `<a class="map-url-preview" href="${h(row.value)}" target="_blank" rel="noreferrer">${icon("link")}<span>${h(row.value)}</span></a>`
                      : `<p class="map-url-empty">저장된 링크가 없습니다.</p>`
                  }
                </div>
              `,
            )
            .join("")}
          </div>
          <button class="dash-button primary" type="submit">지도 URL 저장</button>
        </form>
      </section>
    `;
  }

  function imagesPageMarkup() {
    return heroImagesMarkup(api.getHeroImages());
  }

  function storeModalMarkup() {
    if (!storeModalOpen) return "";
    const edit = currentEditStore();
    const title = edit ? "매장 수정" : activeStatus === "pending" ? "신청 매장 직접 등록" : "매장 등록";
    return `
      <div class="dash-modal-overlay" data-store-modal-overlay>
        <div class="dash-modal" role="dialog" aria-modal="true" aria-label="${h(title)}">
          <div class="dash-modal-header">
            <div>
              <p class="panel-kicker">Store Editor</p>
              <h2>${title}</h2>
            </div>
            <button class="dash-modal-close" type="button" data-close-store-modal aria-label="닫기">×</button>
          </div>
          <form class="dash-form dash-modal-form" data-store-form>
            <div class="field-grid">
              ${field("name", "매장명", edit?.name || "", true)}
              ${field("category", "카테고리", edit?.category || "", true)}
              ${field("menuCategory", "메뉴 분류", edit?.menuCategory || api.getMenuCategory(edit || {}) || "", true)}
              ${field("address", "주소", edit?.address || "", true, false, "span-2")}
              ${field("note", "비고", edit?.note || "", false, true, "span-2")}
              ${field("email", "이메일", edit?.email || "", false)}
              ${field("phone", "전화번호", edit?.phone || "", false)}
            </div>
            <div class="form-actions">
              <button class="dash-button" type="button" data-close-store-modal>취소</button>
              <button class="dash-button primary" type="submit">${edit ? "수정 저장" : "매장 등록"}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openStoreModal(id = null) {
    editingId = id;
    storeModalOpen = true;
    render();
  }

  function closeStoreModal() {
    editingId = null;
    storeModalOpen = false;
    render();
  }

  function openConfirmModal(type) {
    if (type === "resetStores") {
      confirmAction = {
        type,
        title: "초기 데이터를 복원할까요?",
        message: "현재 등록한 매장, 지도 URL, 메인 이미지가 기본 데이터 상태로 되돌아갑니다.",
        confirmLabel: "초기화",
      };
    } else if (type === "resetAnalytics") {
      confirmAction = {
        type,
        title: "분석 데이터를 초기화할까요?",
        message: "수집된 로컬 마케팅 분석 데이터가 모두 삭제되며, 되돌릴 수 없습니다.",
        confirmLabel: "분석 초기화",
      };
    } else {
      confirmAction = null;
    }
    render();
  }

  function closeConfirmModal() {
    confirmAction = null;
    render();
  }

  function runConfirmAction() {
    if (!confirmAction) return;

    if (confirmAction.type === "resetStores") {
      api.resetStores();
      editingId = null;
      activeStatus = "approved";
    }

    if (confirmAction.type === "resetAnalytics") {
      window.PepsiAnalytics.reset();
    }

    confirmAction = null;
    render();
  }

  function confirmModalMarkup() {
    if (!confirmAction) return "";
    return `
      <div class="dash-modal-overlay" data-confirm-modal-overlay>
        <div class="dash-modal dash-confirm-modal" role="dialog" aria-modal="true" aria-label="${h(confirmAction.title)}">
          <div class="dash-modal-header">
            <div>
              <p class="panel-kicker">Confirm Action</p>
              <h2>${h(confirmAction.title)}</h2>
            </div>
            <button class="dash-modal-close" type="button" data-close-confirm-modal aria-label="닫기">×</button>
          </div>
          <div class="dash-form dash-confirm-body">
            <p>${h(confirmAction.message)}</p>
            <div class="form-actions">
              <button class="dash-button" type="button" data-close-confirm-modal>취소</button>
              <button class="dash-button danger" type="button" data-confirm-action>${h(confirmAction.confirmLabel)}</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildAnalytics(allStores, days) {
    const events = window.PepsiAnalytics.getEvents({ withFallback: true, stores: allStores });
    const cutoff = Date.now() - days * 86400000;
    const scoped = events.filter((event) => new Date(event.ts).getTime() >= cutoff);
    const sessions = new Set(scoped.map((event) => event.sessionId));
    const engagedSessions = new Set(scoped.filter((event) => event.type !== "page_view").map((event) => event.sessionId));
    const pageViews = scoped.filter((event) => event.type === "page_view").length;
    const mapClicks = scoped.filter((event) => event.type === "map_click").length;
    const registerOpen = scoped.filter((event) => event.type === "register_open").length;
    const registerSubmit = scoped.filter((event) => event.type === "register_submit").length;
    const filters = scoped.filter((event) => event.type === "filter_select");
    const approved = allStores.filter((store) => store.status === "approved");

    return {
      days,
      sessions: sessions.size,
      pageViews,
      engagementRate: ratio(engagedSessions.size, sessions.size),
      mapClickRate: ratio(mapClicks, sessions.size),
      conversionRate: ratio(registerSubmit, sessions.size),
      mapClicks,
      registerOpen,
      registerSubmit,
      trend: trend(scoped, days),
      funnel: [
        ["방문", pageViews],
        ["리스트 탐색", filters.length],
        ["지도 클릭", mapClicks],
        ["신청 열기", registerOpen],
        ["신청 완료", registerSubmit],
      ],
      categories: topCounts([
        ...filters.filter((event) => event.payload.mode === "category").map((event) => event.payload.filter),
        ...scoped.filter((event) => event.type === "register_submit").map((event) => event.payload.category),
        ...approved.map((store) => api.getMenuCategory(store)),
      ], 8),
      districts: topCounts([
        ...filters.filter((event) => event.payload.mode === "district").map((event) => event.payload.filter),
        ...approved.map((store) => api.getDistrict(store.address)),
      ], 8),
      maps: topCounts(scoped.filter((event) => event.type === "map_click").map((event) => event.payload.map), 3),
      sources: topCounts(scoped.map((event) => event.source?.source), 6),
      heatmap: heatmap(scoped),
    };
  }

  function ratio(value, total) {
    return total ? Math.round((value / total) * 1000) / 10 : 0;
  }

  function topCounts(values, limit) {
    const counts = values.filter(Boolean).reduce((acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, value]) => ({ label, value }));
  }

  function trend(events, days) {
    const byDay = new Map();
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 86400000).toISOString().slice(5, 10);
      byDay.set(date, { label: date, visits: 0, conversions: 0 });
    }
    events.forEach((event) => {
      const label = event.ts.slice(5, 10);
      if (!byDay.has(label)) return;
      if (event.type === "page_view") byDay.get(label).visits += 1;
      if (event.type === "register_submit") byDay.get(label).conversions += 1;
    });
    return Array.from(byDay.values());
  }

  function heatmap(events) {
    const counts = Array.from({ length: 7 }, () => Array.from({ length: 4 }, () => 0));
    events.forEach((event) => {
      const date = new Date(event.ts);
      const day = date.getDay();
      const slot = Math.min(3, Math.floor(date.getHours() / 6));
      counts[day][slot] += 1;
    });
    return counts;
  }

  function analyticsMarkup(data) {
    return `
      <section class="analytics-panel">
        <div class="analytics-header">
          <div>
            <p class="eyebrow">Marketing Analytics</p>
            <h2>펩시스트릿 마케팅 퍼포먼스</h2>
          </div>
          <div class="period-tabs" aria-label="분석 기간">
            ${[7, 28, 90].map((day) => `<button class="${data.days === day ? "is-active" : ""}" type="button" data-period="${day}">${day}일</button>`).join("")}
            <button class="dash-button danger" type="button" data-reset-analytics>분석 초기화</button>
          </div>
        </div>
        <div class="analytics-kpis">
          ${kpi("세션", data.sessions.toLocaleString(), `${data.pageViews.toLocaleString()} page views`)}
          ${kpi("참여율", `${data.engagementRate}%`, "탭/지도/신청 행동 포함")}
          ${kpi("지도 클릭률", `${data.mapClickRate}%`, `${data.mapClicks.toLocaleString()} clicks`)}
          ${kpi("신청 전환율", `${data.conversionRate}%`, `${data.registerSubmit.toLocaleString()} submits`)}
        </div>
        <div class="analytics-grid">
          <article class="analytics-card wide">
            <h3>방문 및 신청 추이</h3>
            ${barTrend(data.trend)}
          </article>
          <article class="analytics-card">
            <h3>전환 퍼널</h3>
            ${rankBars(data.funnel.map(([label, value]) => ({ label, value })))}
          </article>
          <article class="analytics-card">
            <h3>인기 카테고리</h3>
            ${rankBars(data.categories)}
          </article>
          <article class="analytics-card">
            <h3>상위 지역</h3>
            ${rankBars(data.districts)}
          </article>
          <article class="analytics-card">
            <h3>지도 플랫폼</h3>
            ${rankBars(data.maps)}
          </article>
          <article class="analytics-card">
            <h3>유입 채널</h3>
            ${rankBars(data.sources)}
          </article>
          <article class="analytics-card wide">
            <h3>요일/시간대 히트맵</h3>
            ${heatmapMarkup(data.heatmap)}
          </article>
        </div>
      </section>
    `;
  }

  function kpi(label, value, caption) {
    return `
      <div class="analytics-kpi">
        <span>${h(label)}</span>
        <strong>${h(value)}</strong>
        <em>${h(caption)}</em>
      </div>
    `;
  }

  function barTrend(items) {
    const max = Math.max(1, ...items.map((item) => item.visits));
    return `
      <div class="trend-chart">
        ${items.map((item) => `
          <div class="trend-day" title="${h(item.label)} 방문 ${item.visits}, 신청 ${item.conversions}">
            <span class="trend-conversion" style="height:${Math.max(3, item.conversions * 12)}px"></span>
            <span class="trend-visit" style="height:${Math.max(6, (item.visits / max) * 120)}px"></span>
          </div>
        `).join("")}
      </div>
      <div class="chart-legend"><span>방문</span><span>신청</span></div>
    `;
  }

  function rankBars(items) {
    if (!items.length) return `<p class="analytics-empty">데이터가 없습니다.</p>`;
    const max = Math.max(1, ...items.map((item) => item.value));
    return `
      <div class="rank-bars">
        ${items.map((item) => `
          <div class="rank-row">
            <span>${h(item.label)}</span>
            <strong>${item.value.toLocaleString()}</strong>
            <i style="width:${Math.max(4, (item.value / max) * 100)}%"></i>
          </div>
        `).join("")}
      </div>
    `;
  }

  function heatmapMarkup(rows) {
    const labels = ["일", "월", "화", "수", "목", "금", "토"];
    const slots = ["0-6", "6-12", "12-18", "18-24"];
    const max = Math.max(1, ...rows.flat());
    return `
      <div class="heatmap">
        <span></span>
        ${slots.map((slot) => `<b>${slot}</b>`).join("")}
        ${rows.map((row, index) => `
          <b>${labels[index]}</b>
          ${row.map((value) => `<i style="--heat:${value / max}" title="${labels[index]} ${value} events">${value}</i>`).join("")}
        `).join("")}
      </div>
    `;
  }

  function heroImagesMarkup(images) {
    const limit = api.heroImageLimit;
    const remaining = Math.max(0, limit - images.length);
    const thumbs = images
      .map(
        (src, index) => `
          <div class="hero-image-thumb">
            <button class="hero-image-preview" type="button" data-hero-preview="${index}" aria-label="이미지 미리보기">
              <img src="${src}" alt="메인 이미지 ${index + 1}" />
            </button>
            <div class="hero-image-actions">
              <button class="icon-btn" type="button" data-hero-edit="${index}" title="수정" aria-label="이미지 수정">${icon("edit")}</button>
              <button class="icon-btn danger" type="button" data-hero-remove="${index}" title="삭제" aria-label="이미지 삭제">${icon("trash")}</button>
            </div>
          </div>
        `,
      )
      .join("");

    return `
      <section class="dash-panel">
        <div class="dash-form">
          <div class="dash-panel-title compact">
            <div>
              <p class="panel-kicker">Hero Assets</p>
              <h2>메인 이미지 관리</h2>
              <p>최대 ${limit}개까지 첨부할 수 있으며 메인 화면에 랜덤으로 노출됩니다. 현재 ${images.length}/${limit}개가 저장되어 있습니다.</p>
            </div>
          </div>
          <div class="hero-image-grid">
            ${thumbs || `<p class="analytics-empty">등록된 이미지가 없습니다.</p>`}
          </div>
          <label class="dash-button primary hero-image-add ${remaining ? "" : "is-disabled"}">
            ${icon("plus")}이미지 추가
            <input type="file" accept="image/*" multiple data-hero-input ${remaining ? "" : "disabled"} hidden />
          </label>
          <input type="file" accept="image/*" data-hero-edit-input hidden />
        </div>
      </section>
    `;
  }

  function imagePreviewMarkup() {
    if (imagePreviewIndex === null) return "";
    const images = api.getHeroImages();
    const src = images[imagePreviewIndex];
    if (!src) return "";
    return `
      <div class="dash-modal-overlay image-preview-overlay" data-image-preview-overlay>
        <div class="image-preview-box">
          <button class="dash-modal-close" type="button" data-close-image-preview aria-label="닫기">×</button>
          <img src="${src}" alt="메인 이미지 미리보기" />
        </div>
      </div>
    `;
  }

  async function replaceHeroImage(index, file) {
    if (!file || !file.type.startsWith("image/")) return;
    const images = api.getHeroImages();
    if (index < 0 || index >= images.length) return;
    try {
      images[index] = await compressImage(file);
      api.saveHeroImages(images);
    } catch (error) {
      window.alert("이미지를 처리하지 못했습니다.");
    }
    render();
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const maxEdge = 720;
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addHeroImages(fileList) {
    const limit = api.heroImageLimit;
    const current = api.getHeroImages();
    const room = limit - current.length;
    if (room <= 0) return;
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/")).slice(0, room);
    const encoded = [];
    for (const file of files) {
      try {
        encoded.push(await compressImage(file));
      } catch (error) {
        /* skip unreadable file */
      }
    }
    try {
      api.saveHeroImages([...current, ...encoded]);
    } catch (error) {
      window.alert("이미지 저장 용량을 초과했습니다. 기존 이미지를 삭제한 뒤 다시 시도해 주세요.");
    }
    render();
  }

  function field(name, label, value, required = false, textarea = false, className = "") {
    const attrs = `name="${h(name)}" ${required ? "required" : ""}`;
    return `
      <label class="dash-field ${className}">
        <span>${h(label)}</span>
        ${
          textarea
            ? `<textarea ${attrs}>${h(value)}</textarea>`
            : `<input ${attrs} value="${h(value)}" />`
        }
      </label>
    `;
  }

  function tableMarkup(items) {
    if (!items.length) {
      return `<div class="empty-state">표시할 매장이 없습니다.</div>`;
    }

    return `
      <table class="store-table">
        <thead>
          <tr>
            <th>매장</th>
            <th>메뉴 분류</th>
            <th>주소</th>
            <th>비고</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (store) => `
                <tr>
                  <td class="store-name-cell">
                    <div class="store-name-main">
                      <strong>${h(store.name)}</strong>
                    </div>
                    <span>${h(store.email || store.phone || api.getDistrict(store.address))}</span>
                  </td>
                  <td><span class="store-badge subtle">${h(api.getMenuCategory(store))}</span></td>
                  <td class="store-address">${h(store.address)}</td>
                  <td class="store-note">${h(store.note || "-")}</td>
                  <td>
                    <div class="row-actions">
                      ${store.status === "pending" ? `<button class="icon-btn approve" type="button" data-approve="${h(store.id)}" title="수락" aria-label="수락">${icon("check")}</button>` : ""}
                      <button class="icon-btn" type="button" data-edit="${h(store.id)}" title="수정" aria-label="수정">${icon("edit")}</button>
                      <button class="icon-btn danger" type="button" data-delete="${h(store.id)}" title="삭제" aria-label="삭제">${icon("trash")}</button>
                    </div>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function bind() {
    if (fabObserver) {
      fabObserver.disconnect();
      fabObserver = null;
    }

    root.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        if (activePage === button.dataset.page) return;
        activePage = button.dataset.page;
        editingId = null;
        storeModalOpen = false;
        imagePreviewIndex = null;
        render();
      });
    });

    root.querySelectorAll("[data-open-store-modal]").forEach((button) => {
      button.addEventListener("click", () => openStoreModal(null));
    });

    root.querySelectorAll("[data-close-store-modal]").forEach((button) => {
      button.addEventListener("click", closeStoreModal);
    });

    root.querySelector("[data-store-modal-overlay]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeStoreModal();
    });

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeStatus = button.dataset.tab;
        storeFilter = "전체";
        editingId = null;
        render();
      });
    });

    root.querySelectorAll("[data-store-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        if (storeMode === button.dataset.storeMode) return;
        storeMode = button.dataset.storeMode;
        storeFilter = "전체";
        render();
      });
    });

    root.querySelectorAll("[data-store-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        if (storeFilter === button.dataset.storeFilter) return;
        storeFilter = button.dataset.storeFilter;
        render();
      });
    });

    root.querySelectorAll("[data-map-open]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = button.closest(".map-url-input")?.querySelector("input");
        const url = (input?.value || "").trim();
        if (url) window.open(url, "_blank", "noopener");
      });
    });

    root.querySelectorAll("[data-hero-preview]").forEach((button) => {
      button.addEventListener("click", () => {
        imagePreviewIndex = Number(button.dataset.heroPreview);
        render();
      });
    });

    root.querySelector("[data-close-image-preview]")?.addEventListener("click", () => {
      imagePreviewIndex = null;
      render();
    });

    root.querySelector("[data-image-preview-overlay]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        imagePreviewIndex = null;
        render();
      }
    });

    root.querySelectorAll("[data-hero-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        heroEditIndex = Number(button.dataset.heroEdit);
        root.querySelector("[data-hero-edit-input]")?.click();
      });
    });

    root.querySelector("[data-hero-edit-input]")?.addEventListener("change", (event) => {
      const input = event.currentTarget;
      if (input.files?.length && heroEditIndex !== null) replaceHeroImage(heroEditIndex, input.files[0]);
      heroEditIndex = null;
      input.value = "";
    });

    const activeSubtab = root.querySelector(".dash-subtabs .is-active");
    if (activeSubtab) {
      const bar = activeSubtab.parentElement;
      bar.scrollLeft = Math.max(0, activeSubtab.offsetLeft - (parseFloat(getComputedStyle(bar).paddingLeft) || 0));
    }

    root.querySelectorAll("[data-period]").forEach((button) => {
      button.addEventListener("click", () => {
        activePeriod = Number(button.dataset.period);
        render();
      });
    });

    root.querySelector("[data-reset-analytics]")?.addEventListener("click", () => openConfirmModal("resetAnalytics"));

    root.querySelector("[data-search]")?.addEventListener("input", (event) => {
      query = event.target.value;
      render();
      root.querySelector("[data-search]")?.focus();
    });

    root.querySelector("[data-store-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const previous = currentEditStore();
      api.upsertStore({
        id: editingId,
        createdAt: previous?.createdAt,
        status: previous?.status || activeStatus,
        name: form.get("name"),
        category: form.get("category"),
        menuCategory: form.get("menuCategory"),
        address: form.get("address"),
        note: form.get("note"),
        email: form.get("email"),
        phone: form.get("phone"),
      });
      editingId = null;
      storeModalOpen = false;
      render();
    });

    root.querySelector("[data-map-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      api.saveMapLinks({
        naver: form.get("naver"),
        kakao: form.get("kakao"),
        tmap: form.get("tmap"),
      });
      render();
    });

    root.querySelector("[data-hero-input]")?.addEventListener("change", (event) => {
      const input = event.currentTarget;
      if (input.files?.length) addHeroImages(input.files);
      input.value = "";
    });

    root.querySelectorAll("[data-hero-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = api.getHeroImages().filter((_, index) => index !== Number(button.dataset.heroRemove));
        api.saveHeroImages(next);
        render();
      });
    });

    root.querySelectorAll("[data-approve]").forEach((button) => {
      button.addEventListener("click", () => {
        api.approveStore(button.dataset.approve);
        render();
      });
    });

    root.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => openStoreModal(button.dataset.edit));
    });

    root.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        api.removeStore(button.dataset.delete);
        editingId = null;
        render();
      });
    });

    root.querySelector("[data-reset]")?.addEventListener("click", () => openConfirmModal("resetStores"));

    root.querySelectorAll("[data-close-confirm-modal]").forEach((button) => {
      button.addEventListener("click", closeConfirmModal);
    });

    root.querySelector("[data-confirm-modal-overlay]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeConfirmModal();
    });

    root.querySelector("[data-confirm-action]")?.addEventListener("click", runConfirmAction);

    const storeAnchor = root.querySelector("[data-open-store-anchor]");
    const fabButton = root.querySelector("[data-open-store-fab]");
    if (storeAnchor && fabButton && "IntersectionObserver" in window) {
      fabObserver = new IntersectionObserver(
        ([entry]) => {
          fabButton.classList.toggle("is-visible", !entry.isIntersecting);
        },
        {
          threshold: 0.85,
        },
      );
      fabObserver.observe(storeAnchor);
    } else if (fabButton) {
      fabButton.classList.add("is-visible");
    }
  }

  render();

  if (api.cloudEnabled()) {
    window.addEventListener("pepsi-street:synced", () => render());
    api.subscribeCloud(() => api.refreshFromCloud());
    api.refreshFromCloud();
  }
})();
