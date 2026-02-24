(function () {
  // Elements
  const stepProject = document.getElementById("step-project");
  const stepUpload = document.getElementById("step-upload");
  const stepSlides = document.getElementById("step-slides");
  const stepList = document.getElementById("step-list");

  // Project elements
  const newProjectName = document.getElementById("newProjectName");
  const newProjectDesc = document.getElementById("newProjectDesc");
  const btnCreateProject = document.getElementById("btnCreateProject");
  const projectListEl = document.getElementById("projectList");
  const btnBackToProjects = document.getElementById("btnBackToProjects");
  const currentProjectNameEl = document.getElementById("currentProjectName");

  // Upload elements
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("fileInput");
  const uploadResult = document.getElementById("uploadResult");
  const btnScan = document.getElementById("btnScan");
  const btnAnalyzeAll = document.getElementById("btnAnalyzeAll");
  const btnResetAnalysis = document.getElementById("btnResetAnalysis");
  const scanResult = document.getElementById("scanResult");
  const analyzeResult = document.getElementById("analyzeResult");

  // Slide elements
  const btnBackToUpload = document.getElementById("btnBackToUpload");
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
  const btnAnalyzeOne = document.getElementById("btnAnalyzeOne");

  // List elements
  const saveListEl = document.getElementById("saveList");
  const btnBackToSlides = document.getElementById("btnBackToSlides");
  const btnSaveAll = document.getElementById("btnSaveAll");
  const saveResult = document.getElementById("saveResult");

  // State
  let currentProject = null;
  let receipts = [];
  let currentSlideIndex = 0;

  // ===== Step Navigation =====
  function showStep(step) {
    stepProject.classList.add("hidden");
    stepUpload.classList.add("hidden");
    stepSlides.classList.add("hidden");
    stepList.classList.add("hidden");
    
    if (step === "project") stepProject.classList.remove("hidden");
    if (step === "upload") stepUpload.classList.remove("hidden");
    if (step === "slides") stepSlides.classList.remove("hidden");
    if (step === "list") stepList.classList.remove("hidden");
  }

  // ===== Project Management =====
  async function loadProjects() {
    projectListEl.innerHTML = '<p class="loading">프로젝트 목록 불러오는 중...</p>';
    
    try {
      const res = await fetch("/api/projects");
      const projects = await res.json();
      
      if (projects.length === 0) {
        projectListEl.innerHTML = '<div class="empty-projects">프로젝트가 없습니다.<br>새 프로젝트를 생성해주세요.</div>';
        return;
      }
      
      projectListEl.innerHTML = "";
      
      for (const project of projects) {
        const item = document.createElement("div");
        item.className = "project-item";
        item.innerHTML = `
          <div class="project-item-info">
            <div class="project-item-name">${escapeHtml(project.name)}</div>
            <div class="project-item-meta">
              파일 ${project.fileCount || 0}개 · ${formatDate(project.createdAt)}
            </div>
            ${project.description ? `<div class="project-item-desc">${escapeHtml(project.description)}</div>` : ''}
          </div>
          <div class="project-item-actions">
            <button class="btn-icon btn-delete" data-id="${project.id}" title="삭제">🗑️</button>
          </div>
        `;
        
        // Click to select project
        item.querySelector(".project-item-info").addEventListener("click", () => {
          selectProject(project);
        });
        
        // Delete button
        item.querySelector(".btn-delete").addEventListener("click", async (e) => {
          e.stopPropagation();
          if (await confirmDelete(project.name)) {
            await deleteProject(project.id);
          }
        });
        
        projectListEl.appendChild(item);
      }
    } catch (e) {
      projectListEl.innerHTML = `<p class="error">오류: ${e.message}</p>`;
    }
  }

  function selectProject(project) {
    currentProject = project;
    currentProjectNameEl.textContent = project.name;
    uploadResult.innerHTML = "";
    scanResult.innerHTML = "";
    analyzeResult.classList.add("hidden");
    receipts = [];
    showStep("upload");
  }

  btnCreateProject.addEventListener("click", async () => {
    const name = newProjectName.value.trim();
    if (!name) {
      alert("프로젝트 이름을 입력해주세요.");
      return;
    }
    
    btnCreateProject.disabled = true;
    btnCreateProject.textContent = "생성 중...";
    
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: newProjectDesc.value.trim(),
        }),
      });
      
      const project = await res.json();
      
      if (res.ok) {
        newProjectName.value = "";
        newProjectDesc.value = "";
        await loadProjects();
        selectProject(project);
      } else {
        alert(project.error || "프로젝트 생성 실패");
      }
    } catch (e) {
      alert("오류: " + e.message);
    } finally {
      btnCreateProject.disabled = false;
      btnCreateProject.textContent = "프로젝트 생성";
    }
  });

  async function deleteProject(projectId) {
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      await loadProjects();
    } catch (e) {
      alert("삭제 오류: " + e.message);
    }
  }

  function confirmDelete(name) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-content">
          <h3>⚠️ 프로젝트 삭제</h3>
          <p>"${escapeHtml(name)}" 프로젝트와 모든 파일이 삭제됩니다.<br>이 작업은 되돌릴 수 없습니다.</p>
          <div class="modal-actions">
            <button class="btn secondary" id="modalCancel">취소</button>
            <button class="btn primary" style="background: #e53e3e;" id="modalConfirm">삭제</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      overlay.querySelector("#modalCancel").addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(false);
      });
      
      overlay.querySelector("#modalConfirm").addEventListener("click", () => {
        document.body.removeChild(overlay);
        resolve(true);
      });
      
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
          resolve(false);
        }
      });
    });
  }

  btnBackToProjects.addEventListener("click", () => {
    currentProject = null;
    loadProjects();
    showStep("project");
  });

  // ===== File Upload =====
  uploadZone.addEventListener("click", () => fileInput.click());
  
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });
  
  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });
  
  uploadZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFiles(files);
    }
  });
  
  fileInput.addEventListener("change", async (e) => {
    if (e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  });

  async function uploadFiles(files) {
    if (!currentProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    
    uploadResult.innerHTML = "업로드 중...";
    uploadResult.className = "upload-result";
    
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    
    try {
      const res = await fetch(`/api/project/${currentProject.id}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (data.count > 0) {
        uploadResult.innerHTML = `✅ ${data.count}개 파일 업로드 완료!`;
        uploadResult.className = "upload-result success";
      } else {
        uploadResult.innerHTML = "업로드된 파일이 없습니다.";
        uploadResult.className = "upload-result error";
      }
    } catch (e) {
      uploadResult.innerHTML = `❌ 업로드 오류: ${e.message}`;
      uploadResult.className = "upload-result error";
    }
  }

  // ===== File Scan =====
  btnScan.addEventListener("click", async () => {
    if (!currentProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    
    btnScan.textContent = "불러오는 중...";
    btnScan.disabled = true;

    try {
      const r = await fetch(`/api/project/${currentProject.id}/scan`);
      const data = await r.json();

      if (data.count === 0) {
        scanResult.innerHTML = `<p class="error">업로드된 파일이 없습니다.<br>먼저 영수증 파일을 업로드해주세요.</p>`;
        return;
      }

      scanResult.innerHTML = `<p class="success">${data.count}개 파일 발견!</p>`;

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
      
      // Auto-load analysis results
      try {
        const resResults = await fetch(`/api/project/${currentProject.id}/results`);
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
      btnScan.textContent = "업로드된 파일 불러오기";
      btnScan.disabled = false;
    }
  });

  // ===== Slide Navigation =====
  btnBackToUpload.addEventListener("click", () => {
    saveCurrentToReceipt();
    showStep("upload");
  });

  function renderSlide() {
    const r = receipts[currentSlideIndex];
    if (!r) return;

    slideCounter.textContent = `${currentSlideIndex + 1} / ${receipts.length}`;
    slideImage.src = `/api/project/${currentProject.id}/receipt/${encodeURIComponent(r.filename)}?t=${Date.now()}`;
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

  btnReload.addEventListener("click", async () => {
    const r = receipts[currentSlideIndex];
    if (!r || !currentProject) return;

    btnReload.textContent = "불러오는 중...";
    btnReload.disabled = true;

    try {
      const res = await fetch(`/api/project/${currentProject.id}/result/${encodeURIComponent(r.id)}`);
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
        alert("아직 분석 결과가 없습니다.");
      }
    } catch (e) {
      alert("오류: " + e.message);
    } finally {
      btnReload.textContent = "결과 불러오기";
      btnReload.disabled = false;
    }
  });

  btnReloadAll.addEventListener("click", async () => {
    if (!currentProject) return;
    
    btnReloadAll.textContent = "불러오는 중...";
    btnReloadAll.disabled = true;

    try {
      const res = await fetch(`/api/project/${currentProject.id}/results`);
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

  // ===== Save List =====
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
    if (!currentProject) return;
    
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
      const r = await fetch(`/api/project/${currentProject.id}/save`, {
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

  // ===== AI Analysis =====
  
  // 분석 결과 초기화
  btnResetAnalysis.addEventListener("click", async () => {
    if (!currentProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    
    if (!confirm("기존 분석 결과를 모두 삭제하고 초기화합니다.\n계속하시겠습니까?")) {
      return;
    }
    
    btnResetAnalysis.disabled = true;
    btnResetAnalysis.textContent = "초기화 중...";
    
    try {
      const res = await fetch(`/api/project/${currentProject.id}/reset-analysis`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        alert("분석 결과가 초기화되었습니다.\nAI 전체 분석 버튼을 눌러 다시 분석해주세요.");
        analyzeResult.classList.add("hidden");
      } else {
        alert(data.error || "초기화 실패");
      }
    } catch (e) {
      alert("오류: " + e.message);
    } finally {
      btnResetAnalysis.disabled = false;
      btnResetAnalysis.textContent = "🔄 분석 초기화";
    }
  });
  
  // 전체 파일 AI 분석
  btnAnalyzeAll.addEventListener("click", async () => {
    if (!currentProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }
    
    btnAnalyzeAll.disabled = true;
    btnAnalyzeAll.textContent = "분석 중...";
    analyzeResult.innerHTML = '<div class="analyze-progress"><div class="spinner"></div> AI가 영수증을 분석하고 있습니다...</div>';
    analyzeResult.className = "analyze-result";
    analyzeResult.classList.remove("hidden");
    
    try {
      // 먼저 파일 목록 가져오기
      const scanRes = await fetch(`/api/project/${currentProject.id}/scan`);
      const scanData = await scanRes.json();
      
      if (scanData.count === 0) {
        analyzeResult.innerHTML = `❌ 분석할 파일이 없습니다. 먼저 파일을 업로드해주세요.`;
        analyzeResult.className = "analyze-result error";
        return;
      }
      
      // AI 분석 실행
      const res = await fetch(`/api/project/${currentProject.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok) {
        analyzeResult.innerHTML = `❌ ${data.error || "분석 실패"}`;
        analyzeResult.className = "analyze-result error";
        return;
      }
      
      let msg = `✅ AI 분석 완료! `;
      msg += `${data.analyzed}개 분석`;
      if (data.skipped > 0) msg += `, ${data.skipped}개 건너뜀`;
      if (data.errors > 0) msg += `, ${data.errors}개 오류`;
      
      analyzeResult.innerHTML = msg;
      analyzeResult.className = "analyze-result success";
      
      // receipts 배열 초기화 및 분석 결과 로드
      var now = new Date();
      var yy = String(now.getFullYear()).slice(-2);
      var mm = String(now.getMonth() + 1).padStart(2, "0");
      var dd = String(now.getDate()).padStart(2, "0");
      var hh = String(now.getHours()).padStart(2, "0");
      var min = String(now.getMinutes()).padStart(2, "0");
      var sec = String(now.getSeconds()).padStart(2, "0");

      receipts = scanData.files.map(f => ({
        id: f.id,
        filename: f.filename,
        original_name: f.original_name,
        date: yy + mm + dd,
        time: hh + min + sec,
        merchant: "",
        amount: "",
        user_notes: "",
      }));
      
      // 분석 결과 불러와서 적용
      const resResults = await fetch(`/api/project/${currentProject.id}/results`);
      const results = await resResults.json();
      
      for (const r of receipts) {
        const d = results[r.id];
        if (d) {
          if (d.date) r.date = d.date;
          if (d.time) r.time = d.time;
          if (d.merchant) r.merchant = d.merchant;
          if (d.amount) r.amount = d.amount;
          if (d.user_notes) r.user_notes = d.user_notes;
        }
      }
      
      currentSlideIndex = 0;
      
      // 1초 후 슬라이드 화면으로 이동
      setTimeout(() => {
        showStep("slides");
        renderSlide();
      }, 1000);
      
    } catch (e) {
      analyzeResult.innerHTML = `❌ 오류: ${e.message}`;
      analyzeResult.className = "analyze-result error";
    } finally {
      btnAnalyzeAll.disabled = false;
      btnAnalyzeAll.textContent = "🤖 AI 전체 분석";
    }
  });
  
  // 단일 파일 AI 분석
  btnAnalyzeOne.addEventListener("click", async () => {
    const r = receipts[currentSlideIndex];
    if (!r || !currentProject) return;
    
    btnAnalyzeOne.disabled = true;
    btnAnalyzeOne.textContent = "분석 중...";
    
    try {
      const res = await fetch(`/api/project/${currentProject.id}/analyze/${encodeURIComponent(r.filename)}`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        alert(`분석 실패: ${data.error || "알 수 없는 오류"}`);
        return;
      }
      
      // 결과 적용
      if (data.result) {
        if (data.result.date) r.date = data.result.date;
        if (data.result.time) r.time = data.result.time;
        if (data.result.merchant) r.merchant = data.result.merchant;
        if (data.result.amount) r.amount = data.result.amount;
        if (data.result.user_notes) r.user_notes = data.result.user_notes;
        
        renderSlide();
        alert("AI 분석 완료! 결과가 입력되었습니다.");
      }
      
    } catch (e) {
      alert(`오류: ${e.message}`);
    } finally {
      btnAnalyzeOne.disabled = false;
      btnAnalyzeOne.textContent = "🤖 AI 분석";
    }
  });

  // ===== Utilities =====
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  }

  // ===== Initialize =====
  loadProjects();
})();
