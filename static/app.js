(function () {
  const stepScan = document.getElementById("step-scan");
  const stepSlides = document.getElementById("step-slides");
  const stepList = document.getElementById("step-list");

  const btnScan = document.getElementById("btnScan");
  const scanResult = document.getElementById("scanResult");

  const slideCounter = document.getElementById("slideCounter");
  const slideImage = document.getElementById("slideImage");
  const slideFilename = document.getElementById("slideFilename");
  const fieldDate = document.getElementById("fieldDate");
  const fieldTime = document.getElementById("fieldTime");
  const fieldMerchant = document.getElementById("fieldMerchant");
  const fieldAmount = document.getElementById("fieldAmount");
  const fieldUserNotes = document.getElementById("fieldUserNotes");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnShowList = document.getElementById("btnShowList");
  const btnReload = document.getElementById("btnReload");
  const btnReloadAll = document.getElementById("btnReloadAll");

  const saveListEl = document.getElementById("saveList");
  const btnBackToSlides = document.getElementById("btnBackToSlides");
  const btnSaveAll = document.getElementById("btnSaveAll");
  const saveResult = document.getElementById("saveResult");

  let receipts = [];
  let currentSlideIndex = 0;

  function showStep(step) {
    stepScan.classList.add("hidden");
    stepSlides.classList.add("hidden");
    stepList.classList.add("hidden");
    if (step === "scan") stepScan.classList.remove("hidden");
    if (step === "slides") stepSlides.classList.remove("hidden");
    if (step === "list") stepList.classList.remove("hidden");
  }

  // 폴더 스캔
  btnScan.addEventListener("click", async () => {
    btnScan.textContent = "스캔 중...";
    btnScan.disabled = true;

    try {
      const r = await fetch("/api/scan");
      const data = await r.json();

      if (data.count === 0) {
        scanResult.innerHTML = `<p class="error">파일이 없습니다.<br>uploads 폴더에 영수증을 넣어주세요.<br><small>${data.folder}</small></p>`;
        return;
      }

      scanResult.innerHTML = `<p class="success">${data.count}개 파일 발견!</p>`;

      // 기본값으로 receipts 초기화
      var now = new Date();
      var yy = String(now.getFullYear()).slice(-2);
      var mm = String(now.getMonth() + 1).padStart(2, "0");
      var dd = String(now.getDate()).padStart(2, "0");
      var hh = String(now.getHours()).padStart(2, "0");
      var min = String(now.getMinutes()).padStart(2, "0");
      var sec = String(now.getSeconds()).padStart(2, "0");

      receipts = data.files.map(f => ({
        id: f.id,
        filename: f.filename,
        original_name: f.original_name,
        date: yy + mm + dd,
        time: hh + min + sec,
        merchant: "",
        amount: "",
        user_notes: "",
      }));

      currentSlideIndex = 0;
      
      // 스캔 후 자동으로 분석 결과 불러오기
      try {
        const resResults = await fetch("/api/results");
        const results = await resResults.json();
        
        let loadedCount = 0;
        for (const r of receipts) {
          const d = results[r.id];
          if (d) {
            if (d.date) r.date = d.date;
            if (d.time) r.time = d.time;
            if (d.merchant) r.merchant = d.merchant;
            if (d.amount) r.amount = d.amount;
            if (d.user_notes) r.user_notes = d.user_notes;
            loadedCount++;
          }
        }
        if (loadedCount > 0) {
          scanResult.innerHTML = `<p class="success">${data.count}개 파일 발견! (${loadedCount}개 분석 결과 자동 로드)</p>`;
        }
      } catch (e) {
        console.error("결과 자동 로드 실패:", e);
      }
      
      setTimeout(() => {
        showStep("slides");
        renderSlide();
      }, 500);

    } catch (e) {
      scanResult.innerHTML = `<p class="error">오류: ${e.message}</p>`;
    } finally {
      btnScan.textContent = "폴더 스캔";
      btnScan.disabled = false;
    }
  });

  function renderSlide() {
    const r = receipts[currentSlideIndex];
    if (!r) return;

    slideCounter.textContent = `${currentSlideIndex + 1} / ${receipts.length}`;
    slideImage.src = `/api/receipt/${encodeURIComponent(r.filename)}?t=${Date.now()}`;
    slideImage.alt = r.filename;
    slideFilename.textContent = r.filename;

    fieldDate.value = r.date || "";
    fieldTime.value = r.time || "";
    fieldMerchant.value = r.merchant || "";
    fieldAmount.value = r.amount || "";
    fieldUserNotes.value = r.user_notes || "";

    btnPrev.disabled = currentSlideIndex === 0;
    btnNext.textContent = currentSlideIndex === receipts.length - 1 ? "리스트 보기" : "다음";
  }

  function saveCurrentToReceipt() {
    const r = receipts[currentSlideIndex];
    if (!r) return;
    r.date = fieldDate.value.trim();
    r.time = fieldTime.value.trim();
    r.merchant = fieldMerchant.value.trim();
    r.amount = fieldAmount.value.trim().replace(/,/g, "");
    r.user_notes = fieldUserNotes.value.trim();
  }

  // 현재 파일 결과 불러오기
  btnReload.addEventListener("click", async () => {
    const r = receipts[currentSlideIndex];
    if (!r) return;

    btnReload.textContent = "불러오는 중...";
    btnReload.disabled = true;

    try {
      const res = await fetch(`/api/result/${encodeURIComponent(r.id)}`);
      const data = await res.json();

      if (data.date) r.date = data.date;
      if (data.time) r.time = data.time;
      if (data.merchant) r.merchant = data.merchant;
      if (data.amount) r.amount = data.amount;
      if (data.user_notes) r.user_notes = data.user_notes;

      renderSlide();

      if (data.merchant || data.amount) {
        alert("분석 결과를 불러왔습니다!");
      } else {
        alert("아직 분석 결과가 없습니다.\nCursor 채팅에서 '분석해줘'를 입력해주세요.");
      }
    } catch (e) {
      alert("오류: " + e.message);
    } finally {
      btnReload.textContent = "결과 불러오기";
      btnReload.disabled = false;
    }
  });

  // 전체 결과 불러오기
  btnReloadAll.addEventListener("click", async () => {
    btnReloadAll.textContent = "불러오는 중...";
    btnReloadAll.disabled = true;

    try {
      const res = await fetch("/api/results");
      const results = await res.json();

      let count = 0;
      for (const r of receipts) {
        const data = results[r.id];
        if (data) {
          if (data.date) r.date = data.date;
          if (data.time) r.time = data.time;
          if (data.merchant) r.merchant = data.merchant;
          if (data.amount) r.amount = data.amount;
          if (data.user_notes) r.user_notes = data.user_notes;
          count++;
        }
      }

      renderSlide();
      alert(`${count}개 파일의 분석 결과를 불러왔습니다!`);
    } catch (e) {
      alert("오류: " + e.message);
    } finally {
      btnReloadAll.textContent = "전체 불러오기";
      btnReloadAll.disabled = false;
    }
  });

  btnPrev.addEventListener("click", () => {
    saveCurrentToReceipt();
    currentSlideIndex = Math.max(0, currentSlideIndex - 1);
    renderSlide();
  });

  btnNext.addEventListener("click", () => {
    saveCurrentToReceipt();
    if (currentSlideIndex < receipts.length - 1) {
      currentSlideIndex++;
      renderSlide();
    } else {
      showStep("list");
      renderSaveList();
    }
  });

  btnShowList.addEventListener("click", () => {
    saveCurrentToReceipt();
    showStep("list");
    renderSaveList();
  });

  function renderSaveList() {
    saveListEl.innerHTML = "";
    for (const r of receipts) {
      const notes = (r.user_notes || "").trim() || "메모없음";
      const merchant = r.merchant || "미입력";
      const amount = r.amount || "0";
      const name = `${r.date}_${r.time}_${merchant}_${amount}_${notes}`;
      const li = document.createElement("li");
      li.textContent = `${r.filename} → ${name}`;
      saveListEl.appendChild(li);
    }
    saveResult.classList.add("hidden");
  }

  btnBackToSlides.addEventListener("click", () => {
    showStep("slides");
    renderSlide();
  });

  btnSaveAll.addEventListener("click", async () => {
    saveResult.classList.add("hidden");
    const items = receipts.map((r) => ({
      id: r.id,
      filename: r.filename,
      original_name: r.original_name,
      date: (r.date || "").trim(),
      time: (r.time || "").trim(),
      merchant: (r.merchant || "").trim() || "미입력",
      amount: (r.amount || "").trim().replace(/,/g, "") || "0",
      user_notes: (r.user_notes || "").trim() || "메모없음",
    }));

    if (items.length === 0) {
      saveResult.textContent = "저장할 항목이 없습니다.";
      saveResult.className = "save-result error";
      saveResult.classList.remove("hidden");
      return;
    }

    try {
      const r = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await r.json();
      if (!r.ok) {
        saveResult.textContent = data.error || "저장 실패";
        saveResult.className = "save-result error";
        saveResult.classList.remove("hidden");
        return;
      }

      const ok = data.saved.filter((s) => s.ok).length;
      const fail = data.saved.filter((s) => !s.ok);
      let msg = `저장 완료: ${ok}개\n폴더: ${data.output_dir}`;
      if (fail.length) msg += "\n실패: " + fail.map((f) => f.original).join(", ");
      saveResult.textContent = msg;
      saveResult.className = "save-result success";
      saveResult.classList.remove("hidden");
    } catch (e) {
      saveResult.textContent = "오류: " + e.message;
      saveResult.className = "save-result error";
      saveResult.classList.remove("hidden");
    }
  });
})();
