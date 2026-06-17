(function () {
  // Supabase 공용 데이터베이스 설정.
  // 아래 두 값을 채우면 모든 사용자가 같은 데이터를 실시간으로 공유합니다.
  // 비워두면 기존처럼 각자 브라우저(localStorage)에만 저장됩니다.
  //
  // 값 확인 위치: Supabase 대시보드 > Project Settings > API
  //   - SUPABASE_URL      : "Project URL"
  //   - SUPABASE_ANON_KEY : "Project API keys" 의 anon public 키
  // 일시적으로 클라우드 연결을 끊은 상태입니다(로컬 저장으로 폴백).
  // 다시 붙이려면 아래 두 값을 채우세요(데이터는 Supabase에 그대로 보존됨):
  //   SUPABASE_URL: "https://uewkfzwbkuklzgcbcizu.supabase.co",
  //   SUPABASE_ANON_KEY: "sb_publishable_-e7Lv6UffE9uXEJytWg1jA_8ZBTZkFL",
  window.PEPSI_CONFIG = {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
  };
})();
