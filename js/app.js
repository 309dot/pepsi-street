(function () {
  const app = document.getElementById("app");
  const components = window.PepsiComponents;
  const storeApi = window.PepsiStreetStore;

  let mode = "category";
  let activeFilter = "전체";
  let activeSection = "content-1";
  let menuOpen = false;
  let sectionObserver = null;
  let maxScrollDepth = 0;

  function unique(values) {
    return ["전체", ...Array.from(new Set(values.filter(Boolean)))];
  }

  function approvedStores() {
    return storeApi.getAllStores().filter((store) => store.status === "approved");
  }

  function filterItems(stores) {
    if (mode === "category") return unique(stores.map((store) => storeApi.getMenuCategory(store)));
    return unique(stores.map((store) => storeApi.getDistrict(store.address)));
  }

  function filteredStores() {
    const stores = approvedStores();
    if (activeFilter === "전체") return stores;
    if (mode === "category") return stores.filter((store) => storeApi.getMenuCategory(store) === activeFilter);
    return stores.filter((store) => storeApi.getDistrict(store.address) === activeFilter);
  }

  function render() {
    const stores = approvedStores();
    const filters = filterItems(stores);
    if (!filters.includes(activeFilter)) activeFilter = "전체";

    app.innerHTML = `
      ${components.intro()}
      <div class="main-stage">
        ${components.nav({ open: menuOpen, activeSection })}
        <div class="main-scroll" data-main-scroll>
          <section id="content-1" class="content-section content-1">
            <div class="hero-copy">
              <h1>
                <span class="hero-line">펩시가 입수한 로컬</span>
                <span class="hero-line">맛집 스탭들의 <span class="hero-shape hero-shape-small"></span></span>
                <span class="hero-line">비밀 레시피 특별함을</span>
                <span class="hero-line hero-line-connected"><span class="hero-shape hero-shape-wide"></span><span>찾는</span></span>
                <span class="hero-line">특별한 사람들을 위해 공개합니다!</span>
              </h1>
              <p>펩시제로라임을 최상의 페어링으로 즐길 수 있는 전국의 감도 높은 F&amp;B 매장 큐레이션 캠페인</p>
            </div>
            ${components.scrollHint()}
          </section>
          <section id="content-2" class="content-section content-2">
            <div class="sticky-filter">
              ${components.toggle({ mode })}
              ${components.tabs({ items: filters, active: activeFilter, showIcons: mode !== "district" })}
            </div>
            <div class="store-scroll" data-store-scroll>
              ${components.storeList(filteredStores())}
            </div>
          </section>
          <section id="content-3" class="content-section content-3">
            <div class="map-copy">
              <h2>“펩시로 즐겨봐! 너만의 맛. 너만의 짜릿함”</h2>
              <p>맛있는 음식에 완벽한 페어링이 더해질 때, 식탁은 가장 완성된 순간을 맞이합니다.</p>
              <p>바삭함은 더욱 선명하게, 매콤함은 더욱 깔끔하게.</p>
              <p>이제, 그 완벽한 조합을 직접 경험해보세요.</p>
              <p>펩시스트릿 매장은 공식 지도에서 확인하실 수 있습니다.</p>
            </div>
            <p class="map-caption">원하는 지도를 선택해 나만의 펩시스트릿 지도를 확인해 보세요</p>
            ${components.mapCards(storeApi.getMapLinks())}
            <p class="map-update">지도는 계속 업데이트 될 예정입니다.</p>
            <footer>Pepsi Horizon © 2026</footer>
          </section>
        </div>
        ${components.rollingBanner()}
      </div>
    `;

    bindEvents();
    runIntro();
    initSectionTracking();
    bindScrollDepthTracking();
    window.PepsiAnalytics?.track("page_view", { page: "main" });
  }

  function scrollToSection(id, behavior = "smooth") {
    const scroller = app.querySelector("[data-main-scroll]");
    const target = document.getElementById(id);
    if (!scroller || !target) return;
    scroller.scrollTo({ top: target.offsetTop, behavior });
  }

  function runIntro() {
    const intro = app.querySelector("[data-intro]");
    if (!intro) return;
    if (sessionStorage.getItem("pepsi-street:intro-seen")) {
      intro.remove();
      return;
    }
    intro.addEventListener("click", dismissIntro);
    window.setTimeout(dismissIntro, 2050);

    function dismissIntro() {
      if (!intro || intro.classList.contains("is-hidden")) return;
      intro.classList.add("is-hidden");
      sessionStorage.setItem("pepsi-street:intro-seen", "true");
      window.setTimeout(() => intro.remove(), 760);
    }
  }

  function bindEvents() {
    app.querySelectorAll("[data-menu-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        menuOpen = !menuOpen;
        setMenuOpen(menuOpen);
        window.PepsiAnalytics?.track("nav_open", { open: menuOpen });
      });
    });

    app.querySelectorAll("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => {
        menuOpen = false;
        setMenuOpen(false);
        setActiveSection(button.dataset.scrollTarget);
        window.PepsiAnalytics?.track("nav_click", { target: button.dataset.scrollTarget });
        scrollToSection(button.dataset.scrollTarget);
      });
    });

    bindStoreControls();

    app.querySelectorAll("[data-open-register]").forEach((button) => {
      button.addEventListener("click", openRegisterModal);
    });

    app.querySelectorAll(".map-card").forEach((link) => {
      link.addEventListener("click", () => {
        window.PepsiAnalytics?.track("map_click", { map: link.dataset.map });
      });
    });

    app.addEventListener("click", handleOutsideMenuClick);
    document.addEventListener("keydown", handleEscape);
    bindNestedScroll();
  }

  function handleOutsideMenuClick(event) {
    if (!menuOpen) return;
    if (event.target.closest(".ps-nav")) return;
    setMenuOpen(false);
    window.PepsiAnalytics?.track("nav_open", { open: false, reason: "outside" });
  }

  function handleEscape(event) {
    if (event.key !== "Escape" || !menuOpen) return;
    setMenuOpen(false);
    window.PepsiAnalytics?.track("nav_open", { open: false, reason: "escape" });
  }

  function bindStoreControls() {
    app.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        if (mode === button.dataset.mode) return;
        const mainScrollTop = app.querySelector("[data-main-scroll]")?.scrollTop || 0;
        mode = button.dataset.mode;
        activeFilter = "전체";
        updateStoreArea();
        restoreMainScroll(mainScrollTop);
        window.PepsiAnalytics?.track("mode_select", { mode });
      });
    });

    app.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        if (activeFilter === button.dataset.filter) return;
        const mainScrollTop = app.querySelector("[data-main-scroll]")?.scrollTop || 0;
        activeFilter = button.dataset.filter;
        updateStoreArea({ keepListScroll: false });
        restoreMainScroll(mainScrollTop);
        window.PepsiAnalytics?.track("filter_select", { mode, filter: activeFilter });
      });
    });
  }

  function bindNestedScroll() {
    const storeScroll = app.querySelector("[data-store-scroll]");
    const mainScroll = app.querySelector("[data-main-scroll]");
    if (storeScroll && mainScroll) {
      if (storeScroll.dataset.scrollBound === "true") return;
      storeScroll.dataset.scrollBound = "true";
      let touchStartY = 0;
      storeScroll.addEventListener("wheel", (event) => {
        const bottom = storeScroll.scrollTop + storeScroll.clientHeight >= storeScroll.scrollHeight - 2;
        const top = storeScroll.scrollTop <= 0;
        if (event.deltaY > 0 && bottom) scrollToSection("content-3");
        if (event.deltaY < 0 && top) scrollToSection("content-1");
      });
      storeScroll.addEventListener("touchstart", (event) => {
        touchStartY = event.touches[0].clientY;
      }, { passive: true });
      storeScroll.addEventListener("touchmove", (event) => {
        const delta = touchStartY - event.touches[0].clientY;
        const bottom = storeScroll.scrollTop + storeScroll.clientHeight >= storeScroll.scrollHeight - 2;
        const top = storeScroll.scrollTop <= 0;
        if (delta > 42 && bottom) scrollToSection("content-3");
        if (delta < -42 && top) scrollToSection("content-1");
      }, { passive: true });
    }
  }

  function setMenuOpen(open) {
    menuOpen = open;
    const nav = app.querySelector(".ps-nav");
    const panel = app.querySelector(".nav-panel");
    const button = app.querySelector("[data-menu-toggle]");
    nav?.classList.toggle("is-open", open);
    panel?.setAttribute("aria-hidden", String(!open));
    if (panel) panel.inert = !open;
    button?.setAttribute("aria-expanded", String(open));
  }

  function setActiveSection(sectionId) {
    if (!sectionId || activeSection === sectionId) return false;
    activeSection = sectionId;
    app.querySelectorAll(".nav-item[data-scroll-target]").forEach((button) => {
      const active = button.dataset.scrollTarget === sectionId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    return true;
  }

  function updateStoreArea({ keepListScroll = true } = {}) {
    const stores = approvedStores();
    const filters = filterItems(stores);
    if (!filters.includes(activeFilter)) activeFilter = "전체";

    const filterRoot = app.querySelector(".sticky-filter");
    const listRoot = app.querySelector("[data-store-scroll]");
    const listScrollTop = keepListScroll ? listRoot?.scrollTop || 0 : 0;

    if (filterRoot) {
      filterRoot.innerHTML = `
        ${components.toggle({ mode })}
        ${components.tabs({ items: filters, active: activeFilter, showIcons: mode !== "district" })}
      `;
    }
    if (listRoot) {
      const stores = filteredStores();
      listRoot.innerHTML = components.storeList(stores);
      listRoot.scrollTop = listScrollTop;
      window.PepsiAnalytics?.track("store_list_view", { mode, filter: activeFilter, count: stores.length });
    }

    bindStoreControls();
    bindNestedScroll();
  }

  function restoreMainScroll(scrollTop) {
    const scroller = app.querySelector("[data-main-scroll]");
    if (!scroller) return;
    requestAnimationFrame(() => {
      scroller.scrollTop = scrollTop;
    });
  }

  function initSectionTracking() {
    const scroller = app.querySelector("[data-main-scroll]");
    if (!scroller) return;
    sectionObserver?.disconnect();
    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        if (setActiveSection(visible.target.id)) {
          window.PepsiAnalytics?.track("section_view", { section: visible.target.id });
        }
      },
      { root: scroller, threshold: [0.35, 0.55, 0.7] },
    );
    app.querySelectorAll(".content-section").forEach((section) => sectionObserver.observe(section));
  }

  function bindScrollDepthTracking() {
    const scroller = app.querySelector("[data-main-scroll]");
    if (!scroller || scroller.dataset.depthBound === "true") return;
    scroller.dataset.depthBound = "true";
    scroller.addEventListener("scroll", () => {
      const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const depth = Math.floor((scroller.scrollTop / max) * 100);
      const bucket = Math.floor(depth / 25) * 25;
      if (bucket > maxScrollDepth) {
        maxScrollDepth = bucket;
        window.PepsiAnalytics?.track("scroll_depth", { depth: bucket });
      }
    }, { passive: true });
  }

  function openRegisterModal() {
    if (app.querySelector("[data-register-modal], [data-confirm-modal]")) return;
    setMenuOpen(false);
    window.PepsiAnalytics?.track("register_open");
    app.insertAdjacentHTML("beforeend", components.registerModal());
    const modal = app.querySelector("[data-register-modal]");
    modal.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
    modal.querySelector("[data-register-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      storeApi.submitApplication({
        name: form.get("name"),
        address: form.get("address"),
        email: form.get("email"),
        instagram: form.get("instagram"),
        phone: form.get("phone"),
        owner: form.get("owner"),
        menu: form.get("menu"),
        category: form.get("menu"),
      });
      window.PepsiAnalytics?.track("register_submit", { category: form.get("menu") });
      closeModal();
      app.insertAdjacentHTML("beforeend", components.confirmModal());
      window.PepsiAnalytics?.track("register_confirm");
      app.querySelectorAll("[data-confirm-modal] [data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
    });
  }

  function closeModal() {
    app.querySelectorAll("[data-register-modal], [data-confirm-modal]").forEach((modal) => modal.remove());
  }

  render();
})();
