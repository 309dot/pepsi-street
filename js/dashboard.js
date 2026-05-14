(function () {
  const root = document.getElementById("dashboard");
  const api = window.PepsiStreetStore;
  const h = window.PepsiComponents.escapeHtml;

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
    const approved = all.filter((store) => store.status === "approved");
    const pending = all.filter((store) => store.status === "pending");
    const edit = currentEditStore();
    const mapLinks = api.getMapLinks();
    const analytics = buildAnalytics(all, activePeriod);

    root.innerHTML = `
      <header class="dash-header">
        <div>
          <h1>Pepsi Street Dashboard</h1>
          <p>매장 등록 데이터와 지도 URL을 관리합니다.</p>
        </div>
        <div class="dash-actions">
          <a class="dash-button" href="index.html" target="_blank" rel="noreferrer">사이트 보기</a>
          <button class="dash-button danger" type="button" data-reset>초기 데이터 복원</button>
        </div>
      </header>

      <section class="metric-row" aria-label="요약">
        <div class="metric"><span>등록 완료 매장</span><strong>${approved.length}</strong></div>
        <div class="metric"><span>등록 신청 매장</span><strong>${pending.length}</strong></div>
        <div class="metric"><span>카테고리</span><strong>${new Set(approved.map((store) => store.category)).size}</strong></div>
      </section>

      ${analyticsMarkup(analytics)}

      <div class="dashboard-grid">
        <section class="dash-panel">
          <div class="dash-panel-header">
            <div class="dash-tabs" role="tablist" aria-label="매장 상태">
              <button class="${activeStatus === "approved" ? "is-active" : ""}" type="button" data-tab="approved">등록 완료된 매장</button>
              <button class="${activeStatus === "pending" ? "is-active" : ""}" type="button" data-tab="pending">등록 신청한 매장</button>
            </div>
            <input class="dash-search" type="search" value="${h(query)}" placeholder="매장명, 카테고리, 주소 검색" data-search />
          </div>
          <div class="store-table-wrap">
            ${tableMarkup(visibleStores())}
          </div>
        </section>

        <aside class="side-stack">
          <section class="dash-panel">
            <form class="dash-form" data-store-form>
              <h2>${edit ? "매장 수정" : activeStatus === "pending" ? "신청 매장 직접 등록" : "완료 매장 직접 등록"}</h2>
              ${field("name", "매장명", edit?.name || "", true)}
              ${field("category", "카테고리", edit?.category || "", true)}
              ${field("menuCategory", "메뉴 분류", edit?.menuCategory || api.getMenuCategory(edit || {}) || "", true)}
              ${field("address", "주소", edit?.address || "", true)}
              ${field("note", "비고", edit?.note || "", false, true)}
              ${field("email", "이메일", edit?.email || "", false)}
              ${field("phone", "전화번호", edit?.phone || "", false)}
              <div class="form-actions">
                <button class="dash-button primary" type="submit">${edit ? "수정 저장" : "매장 등록"}</button>
                ${edit ? '<button class="dash-button" type="button" data-cancel-edit>취소</button>' : ""}
              </div>
            </form>
          </section>

          <section class="dash-panel">
            <form class="dash-form" data-map-form>
              <h2>팹시스트릿 지도 URL 관리</h2>
              ${field("naver", "네이버 지도 URL", mapLinks.naver, true)}
              ${field("kakao", "카카오맵 URL", mapLinks.kakao, true)}
              ${field("google", "구글맵 URL", mapLinks.google, true)}
              <button class="dash-button primary" type="submit">지도 URL 저장</button>
            </form>
          </section>
        </aside>
      </div>
    `;

    bind();
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
      render();
    });

    root.querySelector("[data-map-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      api.saveMapLinks({
        naver: form.get("naver"),
        kakao: form.get("kakao"),
        google: form.get("google"),
      });
      render();
    });

    root.querySelectorAll("[data-approve]").forEach((button) => {
      button.addEventListener("click", () => {
        api.approveStore(button.dataset.approve);
        render();
      });
    });

    root.querySelectorAll("[data-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        editingId = button.dataset.edit;
        render();
      });
    });

    root.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        api.removeStore(button.dataset.delete);
        editingId = null;
        render();
      });
    });

    root.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
      editingId = null;
      render();
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
