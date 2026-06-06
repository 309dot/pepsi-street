(function () {
  const root = document.getElementById("dashboard");
  const api = window.PepsiStreetStore;
  const h = window.PepsiComponents.escapeHtml;

  const PAGES = [
    { id: "overview", label: "대시보드", title: "대시보드", desc: "매장 등록 현황과 마케팅 퍼포먼스를 확인합니다." },
    { id: "stores", label: "매장관리", title: "매장관리", desc: "등록 완료·신청 매장을 관리합니다." },
    { id: "maps", label: "지도 URL 관리", title: "지도 URL 관리", desc: "팹시스트릿 지도 URL을 관리합니다." },
    { id: "images", label: "메인 이미지 관리", title: "메인 이미지 관리", desc: "메인 화면에 랜덤 노출할 이미지를 관리합니다." },
  ];

  let activePage = "overview";
  let storeModalOpen = false;
  let activeStatus = "approved";
  let query = "";
  let editingId = null;
  let activePeriod = 28;

  function stores() {
    return api.getAllStores();
  }

  function visibleStores() {
    const needle = query.trim().toLowerCase();
    return stores()
      .filter((store) => store.status === activeStatus)
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

    root.innerHTML = `
      <div class="dash-layout">
        ${sidebarMarkup(all)}
        <main class="dash-content">
          <header class="dash-header">
            <div>
              <h1>${h(page.title)}</h1>
              <p>${h(page.desc)}</p>
            </div>
            <div class="dash-actions">
              <a class="dash-button" href="index.html" target="_blank" rel="noreferrer">사이트 보기</a>
              <button class="dash-button danger" type="button" data-reset>초기 데이터 복원</button>
            </div>
          </header>
          ${pageMarkup(all)}
        </main>
      </div>
      ${storeModalMarkup()}
    `;

    bind();
  }

  function sidebarMarkup(all) {
    const pending = all.filter((store) => store.status === "pending").length;
    return `
      <aside class="dash-sidebar">
        <div class="dash-brand">
          <img src="assets/figma/pepsi-logo.svg" alt="Pepsi" />
          <span>Pepsi Street</span>
        </div>
        <nav class="dash-nav" aria-label="대시보드 메뉴">
          ${PAGES.map(
            (item) => `
              <button class="dash-nav-item ${item.id === activePage ? "is-active" : ""}" type="button" data-page="${item.id}">
                <span>${h(item.label)}</span>
                ${item.id === "stores" && pending ? `<em class="dash-nav-badge">${pending}</em>` : ""}
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
        <div class="metric"><span>등록 완료 매장</span><strong>${approved.length}</strong></div>
        <div class="metric"><span>등록 신청 매장</span><strong>${pending.length}</strong></div>
        <div class="metric"><span>카테고리</span><strong>${new Set(approved.map((store) => store.category)).size}</strong></div>
      </section>
      ${analyticsMarkup(analytics)}
    `;
  }

  function storesPageMarkup() {
    return `
      <section class="dash-panel">
        <div class="dash-panel-header">
          <div class="dash-tabs" role="tablist" aria-label="매장 상태">
            <button class="${activeStatus === "approved" ? "is-active" : ""}" type="button" data-tab="approved">등록 완료된 매장</button>
            <button class="${activeStatus === "pending" ? "is-active" : ""}" type="button" data-tab="pending">등록 신청한 매장</button>
          </div>
          <div class="dash-panel-tools">
            <input class="dash-search" type="search" value="${h(query)}" placeholder="매장명, 카테고리, 주소 검색" data-search />
            <button class="dash-button primary" type="button" data-open-store-modal>+ 매장 등록</button>
          </div>
        </div>
        <div class="store-table-wrap">
          ${tableMarkup(visibleStores())}
        </div>
      </section>
    `;
  }

  function mapsPageMarkup() {
    const mapLinks = api.getMapLinks();
    return `
      <section class="dash-panel">
        <form class="dash-form" data-map-form>
          <h2>팹시스트릿 지도 URL 관리</h2>
          ${field("naver", "네이버 지도 URL", mapLinks.naver, true)}
          ${field("kakao", "카카오맵 URL", mapLinks.kakao, true)}
          ${field("tmap", "티맵 URL", mapLinks.tmap, true)}
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
            <h2>${title}</h2>
            <button class="dash-modal-close" type="button" data-close-store-modal aria-label="닫기">×</button>
          </div>
          <form class="dash-form" data-store-form>
            ${field("name", "매장명", edit?.name || "", true)}
            ${field("category", "카테고리", edit?.category || "", true)}
            ${field("menuCategory", "메뉴 분류", edit?.menuCategory || api.getMenuCategory(edit || {}) || "", true)}
            ${field("address", "주소", edit?.address || "", true)}
            ${field("note", "비고", edit?.note || "", false, true)}
            ${field("email", "이메일", edit?.email || "", false)}
            ${field("phone", "전화번호", edit?.phone || "", false)}
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
            <img src="${src}" alt="메인 이미지 ${index + 1}" />
            <button class="hero-image-remove" type="button" data-hero-remove="${index}" aria-label="이미지 삭제">×</button>
          </div>
        `,
      )
      .join("");

    return `
      <section class="dash-panel">
        <div class="dash-form">
          <h2>메인 이미지 관리</h2>
          <p class="hero-image-hint">최대 ${limit}개까지 첨부할 수 있으며, 메인 화면에 랜덤으로 노출됩니다. (현재 ${images.length}/${limit})</p>
          <div class="hero-image-grid">
            ${thumbs || `<p class="analytics-empty">등록된 이미지가 없습니다.</p>`}
          </div>
          <label class="dash-button primary hero-image-add ${remaining ? "" : "is-disabled"}">
            이미지 추가
            <input type="file" accept="image/*" multiple data-hero-input ${remaining ? "" : "disabled"} hidden />
          </label>
        </div>
      </section>
    `;
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

  function field(name, label, value, required = false, textarea = false) {
    const attrs = `name="${h(name)}" ${required ? "required" : ""}`;
    return `
      <label class="dash-field">
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
            <th>카테고리</th>
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
                    <strong>${h(store.name)}</strong>
                    <span>${h(store.email || store.phone || api.getDistrict(store.address))}</span>
                  </td>
                  <td>${h(store.category)}</td>
                  <td>${h(api.getMenuCategory(store))}</td>
                  <td>${h(store.address)}</td>
                  <td>${h(store.note || "-")}</td>
                  <td>
                    <div class="row-actions">
                      ${store.status === "pending" ? `<button class="dash-button primary" type="button" data-approve="${h(store.id)}">수락</button>` : ""}
                      <button class="dash-button" type="button" data-edit="${h(store.id)}">수정</button>
                      <button class="dash-button danger" type="button" data-delete="${h(store.id)}">삭제</button>
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
    root.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        if (activePage === button.dataset.page) return;
        activePage = button.dataset.page;
        editingId = null;
        storeModalOpen = false;
        render();
      });
    });

    root.querySelector("[data-open-store-modal]")?.addEventListener("click", () => openStoreModal(null));

    root.querySelectorAll("[data-close-store-modal]").forEach((button) => {
      button.addEventListener("click", closeStoreModal);
    });

    root.querySelector("[data-store-modal-overlay]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeStoreModal();
    });

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeStatus = button.dataset.tab;
        editingId = null;
        render();
      });
    });

    root.querySelectorAll("[data-period]").forEach((button) => {
      button.addEventListener("click", () => {
        activePeriod = Number(button.dataset.period);
        render();
      });
    });

    root.querySelector("[data-reset-analytics]")?.addEventListener("click", () => {
      window.PepsiAnalytics.reset();
      render();
    });

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

    root.querySelector("[data-reset]")?.addEventListener("click", () => {
      api.resetStores();
      editingId = null;
      activeStatus = "approved";
      render();
    });
  }

  render();
})();
