(function () {
  const assets = {
    logo: "assets/figma/pepsi-logo.svg",
    star: "assets/figma/rolling-star.svg",
    rollingText: "assets/figma/pepsi-street.svg",
    hand: "assets/figma/scroll-hand.svg",
    icons: {
      menu: "assets/figma/icon-menu.svg",
      home: "assets/figma/icon-home.svg",
      food: "assets/figma/icon-food.svg",
      map: "assets/figma/icon-map.svg",
      register: "assets/figma/icon-register.svg",
      tabActive: "assets/figma/icon-tab-active.svg",
      tabMuted: "assets/figma/icon-tab-muted.svg",
      toggleFood: "assets/figma/icon-toggle-food-active.svg",
      toggleDistrict: "assets/figma/icon-toggle-district-muted.svg",
      store: "assets/figma/icon-store.svg",
      address: "assets/figma/icon-address.svg",
      email: "assets/figma/icon-email.svg",
      instagram: "assets/figma/icon-instagram.svg",
      phone: "assets/figma/icon-phone.svg",
      owner: "assets/figma/icon-owner.svg",
      menuFood: "assets/figma/icon-menu-food.svg",
      close: "assets/figma/icon-close.svg",
      floatRegister: "assets/figma/icon-float-register.svg",
    },
    maps: {
      naver: "assets/figma/map-naver.png",
      kakao: "assets/figma/map-kakao.png",
      tmap: "assets/figma/map-tmap.png",
    },
    food: [
      "assets/figma/store-float-1.png",
      "assets/figma/store-float-2.png",
      "assets/figma/store-float-3.png",
      "assets/figma/store-float-4.png",
      "assets/figma/store-float-5.png",
      "assets/figma/store-float-6.png",
    ],
  };

  const categoryImoji = {
    "한식": "assets/figma/imoji/korean.png",
    "중식": "assets/figma/imoji/chinese.png",
    "양식": "assets/figma/imoji/western.png",
    "일식": "assets/figma/imoji/japanese.png",
    "아시안": "assets/figma/imoji/asian-food.png",
    "멕시칸": "assets/figma/imoji/mexican-food.png",
    "버거": "assets/figma/imoji/hamburger.png",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function rollingBanner() {
    const unit = Array.from({ length: 8 })
      .map(
        () => `
          <span class="rolling-unit">
            <img class="rolling-star" src="${assets.star}" alt="" />
            <span class="rolling-word">PEPSI-스트릿</span>
          </span>
        `,
      )
      .join("");

    return `
      <div class="ps-rolling-banner" aria-hidden="true">
        <div class="rolling-track">${unit}${unit}</div>
      </div>
    `;
  }

  function nav({ open = false, activeSection = "content-1" } = {}) {
    const navClass = (section) => `nav-item ${activeSection === section ? "is-active" : ""}`.trim();
    const currentAttr = (section) => (activeSection === section ? 'aria-current="page"' : "");

    return `
      <nav class="ps-nav ${open ? "is-open" : ""}" aria-label="주요 메뉴">
        <div class="nav-bar">
          <button class="logo-button" type="button" data-scroll-target="content-1" aria-label="홈으로 이동">
            <img src="${assets.logo}" alt="Pepsi" />
          </button>
          <button class="icon-button menu-button" type="button" data-menu-toggle aria-expanded="${open}" aria-label="메뉴 열기">
            <img src="${assets.icons.menu}" alt="" />
          </button>
        </div>
        <div class="nav-panel" aria-hidden="${open ? "false" : "true"}" ${open ? "" : "inert"}>
          <button class="${navClass("content-1")}" type="button" data-scroll-target="content-1" ${currentAttr("content-1")}>
            <img class="nav-icon" src="${assets.icons.home}" alt="" />
            홈
          </button>
          <button class="${navClass("content-2")}" type="button" data-scroll-target="content-2" ${currentAttr("content-2")}>
            <img class="nav-icon" src="${assets.icons.food}" alt="" />
            팹시스트릿 매장 리스트
          </button>
          <button class="${navClass("content-3")}" type="button" data-scroll-target="content-3" ${currentAttr("content-3")}>
            <img class="nav-icon" src="${assets.icons.map}" alt="" />
            팹시스트릿 지도
          </button>
          <button class="nav-item" type="button" data-open-register>
            <img class="nav-icon" src="${assets.icons.register}" alt="" />
            매장 등록하기
          </button>
        </div>
      </nav>
    `;
  }

  function toggle({ mode }) {
    return `
      <div class="ps-toggle" role="tablist" aria-label="매장 분류">
        <button class="${mode === "category" ? "is-active" : ""}" type="button" data-mode="category">
          <img src="${assets.icons.toggleFood}" alt="" />
          메뉴별
        </button>
        <button class="${mode === "district" ? "is-active" : ""}" type="button" data-mode="district">
          <img src="${assets.icons.toggleDistrict}" alt="" />
          지역별
        </button>
      </div>
    `;
  }

  function floatingRegisterButton() {
    return `
      <button class="floating-register" type="button" data-open-register aria-label="매장 등록 신청 모달 열기">
        <img src="${assets.icons.floatRegister}" alt="" />
      </button>
    `;
  }

  function tabs({ items, active, showIcons = true }) {
    return `
      <div class="ps-tabs" role="tablist" aria-label="상세 분류">
        ${items
          .map((item) => {
            const imoji = showIcons ? categoryImoji[item] : "";
            return `
              <button class="${item === active ? "is-active" : ""}" type="button" data-filter="${escapeHtml(item)}">
                ${imoji ? `<img class="tab-imoji" src="${escapeHtml(imoji)}" alt="" />` : ""}
                ${escapeHtml(item)}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function intro() {
    return `
      <section class="intro-screen" data-intro>
        <img class="intro-logo" src="${assets.logo}" alt="Pepsi" />
      </section>
    `;
  }

  function scrollHint() {
    return `
      <div class="scroll-alert" aria-hidden="true" data-node-id="22:220">
        <div class="scroll-flick" data-node-id="22:191">
          <div class="scroll-hand-wrap" data-node-id="I22:191;22:175">
            <img src="${assets.hand}" alt="" />
          </div>
        </div>
      </div>
    `;
  }

  function heroFood() {
    return `
      <span class="hero-food hero-food-a"><img src="assets/figma/food-hero-a.png" alt="" /></span>
      <span class="hero-food hero-food-b"><img src="assets/figma/food-hero-b.png" alt="" /></span>
    `;
  }

  function floatingFoods() {
    return assets.food
      .map(
        (src, index) => `
          <img class="floating-food floating-food-${index + 1}" src="${src}" alt="" />
        `,
      )
      .join("");
  }

  function storeList(stores) {
    if (!stores.length) {
      return `<div class="empty-state">선택한 조건의 매장이 없습니다.</div>`;
    }

    return stores
      .map(
        (store, index) => `
          <article class="store-row ${index % 2 === 1 ? "is-lime" : ""}">
            <h3>${escapeHtml(store.name)}</h3>
            <p>${escapeHtml(window.PepsiStreetStore.getMenuCategory(store))} · ${escapeHtml(window.PepsiStreetStore.getDistrict(store.address))}</p>
            <address>${escapeHtml(store.address)}</address>
          </article>
        `,
      )
      .join("");
  }

  function inputField({ id, label, placeholder, type = "text", required = false, icon = assets.icons.store, value = "" }) {
    return `
      <label class="ps-input" for="${escapeHtml(id)}">
        <span class="input-label">${escapeHtml(label)}</span>
        <span class="input-field">
          <img class="input-icon" src="${escapeHtml(icon)}" alt="" />
          <input id="${escapeHtml(id)}" name="${escapeHtml(id)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" ${required ? "required" : ""} />
        </span>
      </label>
    `;
  }

  function registerModal() {
    const fields = [
      { id: "name", label: "매장명", placeholder: "매장명을 입력해주세요", required: true, icon: assets.icons.store },
      { id: "address", label: "매장 주소", placeholder: "매장 주소를 입력해주세요", required: true, icon: assets.icons.address },
      { id: "email", label: "이메일", placeholder: "이메일 주소를 입력해주세요", type: "email", required: true, icon: assets.icons.email },
      { id: "instagram", label: "인스타그램", placeholder: "인스타그램 주소를 입력해주세요", icon: assets.icons.instagram },
      { id: "phone", label: "전화번호", placeholder: "전화번호를 입력해주세요", type: "tel", icon: assets.icons.phone },
      { id: "owner", label: "대표자명", placeholder: "대표자명을 입력해주세요", icon: assets.icons.owner },
      { id: "menu", label: "매장 대표 메뉴", placeholder: "매장 대표 메뉴를 입력해주세요", required: true, icon: assets.icons.menuFood },
    ];

    return `
      <section class="modal-screen" role="dialog" aria-modal="true" aria-labelledby="register-title" data-register-modal>
        <button class="modal-close" type="button" data-close-modal aria-label="닫기"><img src="${assets.icons.close}" alt="" /></button>
        <form class="register-form" data-register-form>
          <h2 id="register-title">펩시 페어링에 매장을 등록 하세요.</h2>
          <div class="input-stack">
            ${fields.map(inputField).join("")}
          </div>
          <section class="notice-box">
            <h3>펩시스트릿 참여 신청 안내</h3>
            <p>펩시스트릿 캠페인 참여를 위해서는 펩시 콤보 메뉴 개발 및 운영이 필수입니다. 신청해주신 모든 매장이 자동 선정되는 것은 아니며, 내부 심사를 통해 선정된 매장에 한해 개별 연락드릴 예정입니다. 따라서 신청 후 별도 연락을 받지 못하실 수 있는 점 양해 부탁드립니다.</p>
          </section>
          <button class="primary-pill" type="submit">동의하고 신청하기</button>
          <p class="privacy-note">신청하기 시 개인정보 수집에 동의로 간주됩니다.</p>
        </form>
        ${rollingBanner()}
      </section>
    `;
  }

  function confirmModal() {
    return `
      <section class="modal-screen modal-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title" data-confirm-modal>
        <button class="modal-close" type="button" data-close-modal aria-label="닫기"><img src="${assets.icons.close}" alt="" /></button>
        <div class="confirm-body">
          <h2 id="confirm-title">신청이 완료되었습니다.</h2>
          <p>펩시스트릿 캠페인 참여를 위해서는 펩시 콤보 메뉴 개발 및 운영이 필수입니다. 신청해주신 모든 매장이 자동 선정되는 것은 아니며, 내부 심사를 통해 선정된 매장에 한해 개별 연락드릴 예정입니다. 따라서 신청 후 별도 연락을 받지 못하실 수 있는 점 양해 부탁드립니다.</p>
          <button class="primary-pill" type="button" data-close-modal>확인</button>
        </div>
        ${rollingBanner()}
      </section>
    `;
  }

  function mapCards(mapLinks) {
    const cards = [
      ["naver", "네이버 지도", "white"],
      ["kakao", "카카오맵", "yellow"],
      ["tmap", "티맵", "white"],
    ];

    return `
      <div class="map-card-grid">
        ${cards
          .map(
            ([key, label, tone]) => `
              <a class="map-card ${tone}" href="${escapeHtml(mapLinks[key])}" target="_blank" rel="noreferrer" data-map="${escapeHtml(key)}">
                <span>${escapeHtml(label)}</span>
                <img src="${assets.maps[key]}" alt="" />
              </a>
            `,
          )
          .join("")}
      </div>
    `;
  }

  window.PepsiComponents = {
    assets,
    escapeHtml,
    rollingBanner,
    nav,
    toggle,
    floatingRegisterButton,
    tabs,
    intro,
    scrollHint,
    heroFood,
    floatingFoods,
    storeList,
    inputField,
    registerModal,
    confirmModal,
    mapCards,
  };
})();
