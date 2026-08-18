/**
 * PRICOTE Application Main Orchestrator
 */
class App {
  constructor() {
    this.problems = [];
    this.currentIndex = -1;
    this.lastResults = [];
    this.overallVerdict = { status: 'IDLE', label: '채점 대기' };
    this.isExecuting = false;
    this.activeResultTab = 'testcases';

    this.initDOM();
    this.initEditor();
    this.bindEvents();
    this.setupTheme();
    this.setupSplitter();
    this.refreshServerStatus();
  }

  initDOM() {
    this.dom = {
      // Header
      fileInput: document.getElementById('file-input'),
      btnLoadFile: document.getElementById('btn-load-file'),
      btnSampleProblem: document.getElementById('btn-sample-problem'),
      btnDownloadTemplate: document.getElementById('btn-download-template'),
      problemSelect: document.getElementById('problem-select'),
      problemSelectWrapper: document.getElementById('problem-select-wrapper'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      btnFontIncrease: document.getElementById('btn-font-increase'),
      btnFontDecrease: document.getElementById('btn-font-decrease'),
      btnResetCode: document.getElementById('btn-reset-code'),
      btnRunCode: document.getElementById('btn-run-code'),
      btnExportResult: document.getElementById('btn-export-result'),
      btnOpenSettings: document.getElementById('btn-open-settings'),
      serverStatusPill: document.getElementById('server-status-pill'),
      serverStatusDot: document.getElementById('server-status-dot'),
      serverStatusText: document.getElementById('server-status-text'),

      // Panels
      problemPanel: document.getElementById('problem-panel'),
      editorPanel: document.getElementById('editor-panel'),
      emptyState: document.getElementById('empty-state'),
      problemContent: document.getElementById('problem-content'),
      dropzone: document.getElementById('dropzone'),

      // Problem Header Elements
      problemId: document.getElementById('problem-id'),
      problemTitle: document.getElementById('problem-title'),
      problemDifficulty: document.getElementById('problem-difficulty'),
      problemTimeLimit: document.getElementById('problem-time-limit'),
      problemMemoryLimit: document.getElementById('problem-memory-limit'),
      problemTags: document.getElementById('problem-tags'),
      problemBody: document.getElementById('problem-body'),
      problemExamplesContainer: document.getElementById('problem-examples-container'),

      // Results Panel
      resultsPanel: document.getElementById('results-panel'),
      resizeHandle: document.getElementById('resize-handle'),
      overallVerdictBadge: document.getElementById('overall-verdict-badge'),
      tabBtnTestcases: document.getElementById('tab-btn-testcases'),
      tabBtnCustom: document.getElementById('tab-btn-custom'),
      tabBtnError: document.getElementById('tab-btn-error'),
      viewTestcases: document.getElementById('view-testcases'),
      viewCustom: document.getElementById('view-custom'),
      viewError: document.getElementById('view-error'),
      testcaseList: document.getElementById('testcase-list'),
      errorLogContent: document.getElementById('error-log-content'),
      serverUnconfiguredNotice: document.getElementById('server-unconfigured-notice'),
      btnNoticeOpenSettings: document.getElementById('btn-notice-open-settings'),

      // Custom Input
      customInput: document.getElementById('custom-input'),
      customOutput: document.getElementById('custom-output'),
      btnRunCustom: document.getElementById('btn-run-custom'),

      // Settings Modal
      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnCancelSettings: document.getElementById('btn-cancel-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      btnTestConnection: document.getElementById('btn-test-connection'),
      testConnectionResult: document.getElementById('test-connection-result'),
      inputServerUrl: document.getElementById('input-server-url'),
      inputServerToken: document.getElementById('input-server-token'),
      inputHeaderName: document.getElementById('input-header-name'),
      mixedContentWarning: document.getElementById('mixed-content-warning'),

      // Mobile Tabs
      tabProblem: document.getElementById('tab-problem'),
      tabEditor: document.getElementById('tab-editor'),
      toastContainer: document.getElementById('toast-container')
    };
  }

  async initEditor() {
    this.editor = new CodeEditor('monaco-editor', {
      theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark',
      fontSize: 14,
      onRunShortcut: () => this.runAndGrade()
    });

    try {
      await this.editor.init();
    } catch (err) {
      console.error('Monaco Editor 초기화 실패:', err);
      this.showToast('에디터 로드에 실패했습니다. 네트워크를 확인해주세요.', 'error');
    }
  }

  bindEvents() {
    // File upload
    this.dom.btnLoadFile.addEventListener('click', () => this.dom.fileInput.click());
    this.dom.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

    // Sample Problem & Template
    this.dom.btnSampleProblem.addEventListener('click', () => this.loadSampleProblem());
    if (this.dom.btnDownloadTemplate) {
      this.dom.btnDownloadTemplate.addEventListener('click', () => this.downloadTemplateFile());
    }

    // Drag & Drop
    if (this.dom.dropzone) {
      this.dom.dropzone.addEventListener('click', () => this.dom.fileInput.click());
    }
    
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.dom.dropzone) this.dom.dropzone.classList.add('drag-over');
    });
    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (this.dom.dropzone) this.dom.dropzone.classList.remove('drag-over');
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.dom.dropzone) this.dom.dropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files);
      }
    });

    // Problem Select Dropdown
    this.dom.problemSelect.addEventListener('change', (e) => {
      this.switchProblem(Number(e.target.value));
    });

    // Editor Actions
    this.dom.btnRunCode.addEventListener('click', () => this.runAndGrade());
    this.dom.btnExportResult.addEventListener('click', () => this.exportResult());
    this.dom.btnResetCode.addEventListener('click', () => {
      if (confirm('작성 중인 코드를 C++ 기본 템플릿으로 초기화하시겠습니까?')) {
        this.editor.resetBoilerplate();
      }
    });

    // Settings Modal
    this.dom.btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
    this.dom.serverStatusPill.addEventListener('click', () => this.openSettingsModal());
    if (this.dom.btnNoticeOpenSettings) {
      this.dom.btnNoticeOpenSettings.addEventListener('click', () => this.openSettingsModal());
    }
    this.dom.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());
    this.dom.btnCancelSettings.addEventListener('click', () => this.closeSettingsModal());
    this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    this.dom.btnTestConnection.addEventListener('click', () => this.testServerConnection());

    // Live check for Mixed Content (http vs https)
    this.dom.inputServerUrl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      const isHttp = val.startsWith('http://');
      this.dom.mixedContentWarning.style.display = isHttp ? 'flex' : 'none';
    });

    // Change default header name when radio server-type changes
    document.querySelectorAll('input[name="server-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'judge0') {
          if (!this.dom.inputHeaderName.value || this.dom.inputHeaderName.value === 'X-Grading-Token') {
            this.dom.inputHeaderName.value = 'X-Auth-Token';
          }
        } else {
          if (!this.dom.inputHeaderName.value || this.dom.inputHeaderName.value === 'X-Auth-Token') {
            this.dom.inputHeaderName.value = 'X-Grading-Token';
          }
        }
      });
    });

    // Font Size
    this.dom.btnFontIncrease.addEventListener('click', () => {
      const current = this.editor.getFontSize();
      if (current < 26) this.editor.setFontSize(current + 1);
    });
    this.dom.btnFontDecrease.addEventListener('click', () => {
      const current = this.editor.getFontSize();
      if (current > 11) this.editor.setFontSize(current - 1);
    });

    // Theme Toggle
    this.dom.btnThemeToggle.addEventListener('click', () => this.toggleTheme());

    // Result Tabs
    this.dom.tabBtnTestcases.addEventListener('click', () => this.switchResultTab('testcases'));
    this.dom.tabBtnCustom.addEventListener('click', () => this.switchResultTab('custom'));
    this.dom.tabBtnError.addEventListener('click', () => this.switchResultTab('error'));

    // Custom Run
    this.dom.btnRunCustom.addEventListener('click', () => this.runCustomInput());

    // Mobile Tabs
    this.dom.tabProblem.addEventListener('click', () => this.switchMobileTab('problem'));
    this.dom.tabEditor.addEventListener('click', () => this.switchMobileTab('editor'));
  }

  /* --- Settings Modal Management --- */
  openSettingsModal() {
    const config = JudgeClient.getConfig();
    const typeRadio = document.querySelector(`input[name="server-type"][value="${config.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    this.dom.inputServerUrl.value = config.serverUrl || '';
    this.dom.inputServerToken.value = config.token || '';
    this.dom.inputHeaderName.value = config.headerName || (config.type === 'judge0' ? 'X-Auth-Token' : 'X-Grading-Token');

    const isHttp = (config.serverUrl || '').startsWith('http://');
    this.dom.mixedContentWarning.style.display = isHttp ? 'flex' : 'none';

    this.dom.testConnectionResult.style.display = 'none';
    this.dom.settingsModal.classList.add('show');
  }

  closeSettingsModal() {
    this.dom.settingsModal.classList.remove('show');
  }

  saveSettings() {
    const selectedType = document.querySelector('input[name="server-type"]:checked')?.value || 'judge0';
    const serverUrl = this.dom.inputServerUrl.value.trim();
    const token = this.dom.inputServerToken.value.trim();
    const headerName = this.dom.inputHeaderName.value.trim();

    JudgeClient.saveConfig({
      type: selectedType,
      serverUrl,
      token,
      headerName
    });

    this.closeSettingsModal();
    this.refreshServerStatus();
    this.showToast('채점 서버 설정이 브라우저에 저장되었습니다.', 'success');
  }

  async testServerConnection() {
    const selectedType = document.querySelector('input[name="server-type"]:checked')?.value || 'judge0';
    const serverUrl = this.dom.inputServerUrl.value.trim();
    const token = this.dom.inputServerToken.value.trim();
    const headerName = this.dom.inputHeaderName.value.trim();

    if (!serverUrl) {
      this.dom.testConnectionResult.className = 'test-connection-result error';
      this.dom.testConnectionResult.textContent = '서버 URL을 입력해주세요.';
      return;
    }

    this.dom.btnTestConnection.disabled = true;
    this.dom.btnTestConnection.textContent = '연결 중...';
    this.dom.testConnectionResult.style.display = 'none';

    const res = await JudgeClient.testConnection({
      type: selectedType,
      serverUrl,
      token,
      headerName
    });

    this.dom.btnTestConnection.disabled = false;
    this.dom.btnTestConnection.textContent = '📡 연결 테스트 (Ping)';

    if (res.success) {
      this.dom.testConnectionResult.className = 'test-connection-result success';
      this.dom.testConnectionResult.textContent = `✔ ${res.message}`;
    } else {
      this.dom.testConnectionResult.className = 'test-connection-result error';
      this.dom.testConnectionResult.textContent = `✖ ${res.message}`;
    }
  }

  refreshServerStatus() {
    const isConfigured = JudgeClient.isConfigured();
    const config = JudgeClient.getConfig();

    if (isConfigured) {
      this.dom.serverStatusPill.className = 'server-status-pill server-status-configured';
      this.dom.serverStatusText.textContent = `${config.type === 'judge0' ? 'Judge0' : 'Piston'} 연결됨`;
      if (this.dom.serverUnconfiguredNotice) {
        this.dom.serverUnconfiguredNotice.style.display = 'none';
      }
    } else {
      this.dom.serverStatusPill.className = 'server-status-pill server-status-unconfigured';
      this.dom.serverStatusText.textContent = '서버 미설정';
      if (this.dom.serverUnconfiguredNotice) {
        this.dom.serverUnconfiguredNotice.style.display = 'flex';
      }
    }
  }

  /* --- UI Theme & Splitter --- */
  setupTheme() {
    const savedTheme = localStorage.getItem('pricote_theme') || localStorage.getItem('mybac_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pricote_theme', next);
    this.updateThemeIcon(next);
    if (this.editor) {
      this.editor.setTheme(next === 'light' ? 'vs' : 'vs-dark');
    }
  }

  updateThemeIcon(theme) {
    if (this.dom.themeIcon) {
      this.dom.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
  }

  setupSplitter() {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    this.dom.resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = this.dom.resultsPanel.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(120, Math.min(window.innerHeight * 0.7, startHeight + deltaY));
      this.dom.resultsPanel.style.height = `${newHeight}px`;
      if (this.editor) this.editor.layout();
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (this.editor) this.editor.layout();
      }
    });
  }

  /* --- Problem Loading & Rendering --- */
  async handleFileSelect(fileList) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'));
    if (files.length === 0) {
      this.showToast('.md 형식의 문제 마크다운 파일을 선택해주세요.', 'error');
      return;
    }

    const loadedList = [];
    for (const file of files) {
      try {
        const text = await this.readFileAsText(file);
        const parsed = ProblemParser.parse(text);
        loadedList.push({
          filename: file.name,
          data: parsed
        });
      } catch (err) {
        console.error(`파일 파싱 에러 (${file.name}):`, err);
        this.showToast(`[${file.name}] 파싱 실패: ${err.message}`, 'error');
      }
    }

    if (loadedList.length === 0) return;

    this.problems = loadedList;
    this.updateProblemDropdown();
    this.switchProblem(0);
    this.showToast(`${loadedList.length}개의 문제를 성공적으로 불러왔습니다.`, 'success');
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8');
    });
  }

  updateProblemDropdown() {
    this.dom.problemSelect.innerHTML = '';
    this.problems.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `[${p.data.id}] ${p.data.title}`;
      this.dom.problemSelect.appendChild(opt);
    });

    this.dom.problemSelectWrapper.style.display = this.problems.length > 0 ? 'flex' : 'none';
  }

  switchProblem(index) {
    if (index < 0 || index >= this.problems.length) return;
    this.currentIndex = index;
    this.dom.problemSelect.value = index;

    const problem = this.problems[index].data;
    this.renderProblem(problem);

    // Reset verdict & results
    this.lastResults = [];
    this.overallVerdict = { status: 'IDLE', label: '채점 대기' };
    this.updateVerdictBadge(this.overallVerdict);
    this.renderTestcaseList(problem.examples);
    this.dom.btnExportResult.disabled = true;

    // Show problem content, hide empty state
    this.dom.emptyState.style.display = 'none';
    this.dom.problemContent.style.display = 'block';

    if (this.editor) this.editor.layout();
  }

  renderProblem(problem) {
    this.dom.problemId.textContent = `#${problem.id}`;
    this.dom.problemTitle.textContent = problem.title;
    
    // Difficulty
    this.dom.problemDifficulty.textContent = problem.difficulty;
    this.dom.problemDifficulty.className = `difficulty-badge ${this.getDifficultyClass(problem.difficulty)}`;

    // Time & Memory
    this.dom.problemTimeLimit.textContent = problem.time_limit;
    this.dom.problemMemoryLimit.textContent = problem.memory_limit;

    // Tags
    this.dom.problemTags.innerHTML = '';
    if (problem.tags && problem.tags.length > 0) {
      problem.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-badge';
        span.textContent = tag;
        this.dom.problemTags.appendChild(span);
      });
    }

    // Body
    this.dom.problemBody.innerHTML = problem.bodyHtml;

    // Render Examples in Problem Description
    this.renderProblemExamples(problem.examples);
  }

  renderProblemExamples(examples) {
    this.dom.problemExamplesContainer.innerHTML = '';
    if (!examples || examples.length === 0) return;

    const heading = document.createElement('h2');
    heading.textContent = '예제 입출력';
    this.dom.problemExamplesContainer.appendChild(heading);

    examples.forEach((ex, idx) => {
      const container = document.createElement('div');
      container.className = 'example-container';

      // Input Box
      const inBox = document.createElement('div');
      inBox.className = 'example-box';
      inBox.innerHTML = `
        <div class="example-box-header">
          <span>예제 입력 ${ex.index || idx + 1}</span>
          <button class="copy-btn" data-copy="${this.escapeAttr(ex.input)}">복사</button>
        </div>
        <pre><code>${this.escapeHtml(ex.input)}</code></pre>
      `;

      // Output Box
      const outBox = document.createElement('div');
      outBox.className = 'example-box';
      outBox.innerHTML = `
        <div class="example-box-header">
          <span>예제 출력 ${ex.index || idx + 1}</span>
          <button class="copy-btn" data-copy="${this.escapeAttr(ex.output)}">복사</button>
        </div>
        <pre><code>${this.escapeHtml(ex.output)}</code></pre>
      `;

      container.appendChild(inBox);
      container.appendChild(outBox);
      this.dom.problemExamplesContainer.appendChild(container);
    });

    // Bind copy buttons
    this.dom.problemExamplesContainer.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.target.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          const original = e.target.textContent;
          e.target.textContent = '복사됨!';
          setTimeout(() => { e.target.textContent = original; }, 1500);
        });
      });
    });
  }

  getDifficultyClass(diff) {
    if (!diff) return 'tier-unrated';
    const d = diff.toLowerCase();
    if (d.includes('bronze') || d.includes('브론즈')) return 'tier-bronze';
    if (d.includes('silver') || d.includes('실버')) return 'tier-silver';
    if (d.includes('gold') || d.includes('골드')) return 'tier-gold';
    if (d.includes('platinum') || d.includes('플래티넘')) return 'tier-platinum';
    if (d.includes('diamond') || d.includes('다이아')) return 'tier-diamond';
    if (d.includes('ruby') || d.includes('루비')) return 'tier-ruby';
    return 'tier-unrated';
  }

  renderTestcaseList(examples, results = []) {
    this.dom.testcaseList.innerHTML = '';
    if (!examples || examples.length === 0) {
      this.dom.testcaseList.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:8px;">등록된 예제 테스트케이스가 없습니다.</div>`;
      return;
    }

    examples.forEach((ex, idx) => {
      const res = results[idx];
      const card = document.createElement('div');
      card.className = 'testcase-card';

      let statusBadge = `<span class="testcase-status status-icon-pending">● 대기 중</span>`;
      if (res) {
        if (res.status === 'PASSED') {
          statusBadge = `<span class="testcase-status status-icon-pass" title="서버 왕복 및 컴파일/실행 포함 총 소요 시간: ${res.timeMs}ms">✔ 통과 (${res.timeMs}ms)</span>`;
        } else if (res.status === 'RUNNING') {
          statusBadge = `<span class="testcase-status" style="color:var(--accent-yellow)">⏳ 채점 중...</span>`;
        } else {
          statusBadge = `<span class="testcase-status status-icon-fail" title="${res.error ? this.escapeHtml(res.error) : res.label}">✖ ${res.label} (${res.timeMs ? res.timeMs + 'ms' : '-'})</span>`;
        }
      }

      card.innerHTML = `
        <div class="testcase-header">
          <span>예제 ${ex.index || idx + 1}</span>
          ${statusBadge}
        </div>
        <div class="testcase-detail">
          <div class="detail-col">
            <h4>입력 (stdin)</h4>
            <pre>${this.escapeHtml(ex.input)}</pre>
          </div>
          <div class="detail-col">
            <h4>기대 출력 (expected)</h4>
            <pre>${this.escapeHtml(ex.output)}</pre>
          </div>
          ${res && res.actual !== undefined ? `
          <div class="detail-col" style="grid-column: span 2;">
            <h4>실행 결과 (stdout)</h4>
            <pre style="${res.status === 'PASSED' ? 'border-color:var(--accent-green)' : 'border-color:var(--accent-red)'}">${this.escapeHtml(res.actual)}</pre>
          </div>` : ''}
        </div>
      `;

      this.dom.testcaseList.appendChild(card);
    });
  }

  updateVerdictBadge(verdict) {
    const badge = this.dom.overallVerdictBadge;
    badge.textContent = verdict.label;
    badge.className = 'verdict-badge';

    switch (verdict.status) {
      case 'PASSED':
        badge.classList.add('verdict-passed');
        break;
      case 'WRONG_ANSWER':
      case 'COMPILE_ERROR':
      case 'RUNTIME_ERROR':
      case 'TIME_LIMIT_EXCEEDED':
      case 'NETWORK_ERROR':
      case 'AUTH_ERROR':
      case 'CONFIG_ERROR':
        badge.classList.add('verdict-failed');
        break;
      case 'RUNNING':
        badge.classList.add('verdict-running');
        break;
      default:
        badge.classList.add('verdict-idle');
    }
  }

  switchResultTab(tabName) {
    this.activeResultTab = tabName;
    this.dom.tabBtnTestcases.classList.toggle('active', tabName === 'testcases');
    this.dom.tabBtnCustom.classList.toggle('active', tabName === 'custom');
    this.dom.tabBtnError.classList.toggle('active', tabName === 'error');

    this.dom.viewTestcases.style.display = tabName === 'testcases' ? 'block' : 'none';
    this.dom.viewCustom.style.display = tabName === 'custom' ? 'flex' : 'none';
    this.dom.viewError.style.display = tabName === 'error' ? 'block' : 'none';
  }

  switchMobileTab(tab) {
    this.dom.tabProblem.classList.toggle('active', tab === 'problem');
    this.dom.tabEditor.classList.toggle('active', tab === 'editor');

    this.dom.problemPanel.classList.toggle('active-tab-content', tab === 'problem');
    this.dom.editorPanel.classList.toggle('active-tab-content', tab === 'editor');

    if (tab === 'editor' && this.editor) {
      setTimeout(() => this.editor.layout(), 50);
    }
  }

  /* --- Execution & Grading --- */
  async runAndGrade() {
    if (!JudgeClient.isConfigured()) {
      this.showToast('먼저 [⚙️ 설정]에서 채점 서버 URL을 등록해주세요.', 'error');
      this.openSettingsModal();
      return;
    }

    if (this.currentIndex < 0 || !this.problems[this.currentIndex]) {
      this.showToast('먼저 문제를 불러와주세요.', 'error');
      return;
    }

    if (this.isExecuting) return;

    const problem = this.problems[this.currentIndex].data;
    const code = this.editor.getValue();

    if (!code.trim()) {
      this.showToast('코드를 작성해주세요.', 'error');
      return;
    }

    this.isExecuting = true;
    this.dom.btnRunCode.disabled = true;
    this.dom.btnExportResult.disabled = true;
    this.switchResultTab('testcases');

    this.overallVerdict = { status: 'RUNNING', label: '채점 중...' };
    this.updateVerdictBadge(this.overallVerdict);

    const examples = problem.examples || [];
    const results = [];
    let hasCompileError = false;
    let compileErrorMsg = '';
    let hasAuthError = false;

    // Initialize list with running states
    this.renderTestcaseList(examples, examples.map(() => ({ status: 'RUNNING' })));

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const res = await JudgeClient.gradeTestcase(code, ex);
      results.push(res);

      if (res.status === 'AUTH_ERROR') {
        hasAuthError = true;
        this.showToast('⚠️ 접근 토큰이 올바르지 않거나 권한이 없습니다. 설정(⚙️)을 확인해주세요.', 'error');
        for (let j = i + 1; j < examples.length; j++) {
          results.push({ ...res, input: examples[j].input, expected: examples[j].output });
        }
        break;
      }

      if (res.status === 'COMPILE_ERROR') {
        hasCompileError = true;
        compileErrorMsg = res.error;
        for (let j = i + 1; j < examples.length; j++) {
          results.push({ ...res, input: examples[j].input, expected: examples[j].output });
        }
        break;
      }

      this.renderTestcaseList(examples, [...results, ...examples.slice(i + 1).map(() => ({ status: 'RUNNING' }))]);
    }

    this.lastResults = results;

    // Determine overall verdict
    if (hasAuthError) {
      this.overallVerdict = { status: 'AUTH_ERROR', label: '인증 실패' };
    } else if (hasCompileError) {
      this.overallVerdict = { status: 'COMPILE_ERROR', label: '컴파일 에러' };
      this.dom.errorLogContent.textContent = compileErrorMsg;
      this.switchResultTab('error');
    } else {
      const isAllPassed = results.length > 0 && results.every(r => r.status === 'PASSED');
      if (isAllPassed) {
        this.overallVerdict = { status: 'PASSED', label: '맞았습니다!!' };
      } else {
        const firstFailed = results.find(r => r.status !== 'PASSED');
        this.overallVerdict = {
          status: firstFailed ? firstFailed.status : 'WRONG_ANSWER',
          label: firstFailed ? firstFailed.label : '틀렸습니다'
        };
      }
    }

    this.updateVerdictBadge(this.overallVerdict);
    this.renderTestcaseList(examples, results);

    this.isExecuting = false;
    this.dom.btnRunCode.disabled = false;
    this.dom.btnExportResult.disabled = false;

    if (this.overallVerdict.status === 'PASSED') {
      this.showToast('🎉 모든 예제 테스트케이스를 통과했습니다!', 'success');
    }
  }

  /**
   * Run code with arbitrary custom input
   */
  async runCustomInput() {
    if (!JudgeClient.isConfigured()) {
      this.showToast('먼저 [⚙️ 설정]에서 채점 서버 URL을 등록해주세요.', 'error');
      this.openSettingsModal();
      return;
    }

    const code = this.editor.getValue();
    const input = this.dom.customInput.value;

    if (!code.trim()) {
      this.showToast('코드를 작성해주세요.', 'error');
      return;
    }

    this.dom.btnRunCustom.disabled = true;
    this.dom.customOutput.value = '실행 중...';

    const res = await JudgeClient.execute(code, input);
    this.dom.btnRunCustom.disabled = false;

    if (!res.success) {
      this.dom.customOutput.value = `[오류] ${res.error}`;
      if (res.isAuthError) {
        this.showToast('⚠️ 접근 토큰이 올바르지 않습니다. 설정(⚙️)을 확인해주세요.', 'error');
      }
      return;
    }

    let out = '';
    if (res.engine === 'judge0') {
      const data = res.data;
      if (data.compile_output) {
        out = `[컴파일 에러]\n${data.compile_output}`;
      } else {
        out = data.stdout || '';
        if (data.stderr) out += `\n[Stderr]\n${data.stderr}`;
        out += `\n\n(실행 시간: ${Math.round((parseFloat(data.time) || 0) * 1000)}ms, 메모리: ${data.memory || '-'}KB, 상태: ${data.status?.description || 'OK'})`;
      }
    } else {
      const { compile, run } = res.data;
      if (compile && compile.code !== 0) {
        out = `[컴파일 에러]\n${compile.output || compile.stderr}`;
      } else {
        out = run.stdout || '';
        if (run.stderr) out += `\n[Stderr / 런타임 메시지]\n${run.stderr}`;
        out += `\n\n(실행 시간: ${res.elapsedTimeMs}ms, 종료 코드: ${run.code})`;
      }
    }

    this.dom.customOutput.value = out;
  }

  /**
   * Export Markdown Result
   */
  exportResult() {
    if (this.currentIndex < 0 || !this.problems[this.currentIndex]) {
      this.showToast('내보낼 문제 정보가 없습니다.', 'error');
      return;
    }

    const problem = this.problems[this.currentIndex].data;
    const code = this.editor.getValue();

    try {
      const filename = ResultExporter.exportResult(
        problem,
        code,
        this.overallVerdict,
        this.lastResults
      );
      this.showToast(`결과 파일 다운로드 완료: ${filename}`, 'success');
    } catch (err) {
      console.error('결과 내보내기 실패:', err);
      this.showToast('결과 내보내기에 실패했습니다.', 'error');
    }
  }

  /**
   * Load built-in sample problem (A+B) into memory
   */
  loadSampleProblem() {
    const sampleMarkdown = `---
id: 1000
title: "A+B"
time_limit: "1초"
memory_limit: "256MB"
difficulty: "Bronze V"
tags: ["구현", "사칙연산", "수학"]
examples:
  - input: "1 2"
    output: "3"
  - input: "3 4"
    output: "7"
---
## 문제
두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.

## 입력
첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)

## 출력
첫째 줄에 A+B를 출력한다.
`;

    const parsed = ProblemParser.parse(sampleMarkdown);
    this.problems = [{ filename: '1000_A+B.md', data: parsed }];
    this.updateProblemDropdown();
    this.switchProblem(0);
    this.showToast('예시 문제(1000. A+B)가 로드되었습니다.', 'success');
  }

  downloadTemplateFile() {
    const templateContent = `---
id: 1000
title: "문제 제목"
time_limit: "1초"
memory_limit: "256MB"
difficulty: "Bronze V"
tags: ["구현", "수학"]
examples:
  - input: "1 2"
    output: "3"
  - input: "3 4"
    output: "7"
---
## 문제
여기에 문제 설명을 작성하세요.

## 입력
여기에 입력 형식을 작성하세요.

## 출력
여기에 출력 형식을 작성하세요.
`;
    const blob = new Blob([templateContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'problem_template.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    this.showToast('템플릿 파일이 다운로드되었습니다.', 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : '')}`;
    toast.innerHTML = `<span>${type === 'success' ? '✔' : (type === 'error' ? '✖' : 'ℹ')}</span> <span>${this.escapeHtml(message)}</span>`;
    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }

  escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
