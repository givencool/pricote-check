/**
 * Unified Judge Client supporting self-hosted Judge0 CE & Piston API
 * Credentials (URL & Token) are loaded exclusively from browser localStorage.
 */
class JudgeClient {
  static STORAGE_KEY = 'pricote_judge_config';

  /**
   * Get server config from localStorage
   */
  static getConfig() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem('mybac_judge_config');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('설정 불러오기 실패:', e);
    }
    return {
      type: 'judge0', // 'judge0' or 'piston'
      serverUrl: '',
      token: '',
      headerName: 'X-Auth-Token'
    };
  }

  /**
   * Save server config to localStorage
   */
  static saveConfig(config) {
    const cleanConfig = {
      type: config.type || 'judge0',
      serverUrl: (config.serverUrl || '').trim().replace(/\/+$/, ''), // strip trailing slashes
      token: (config.token || '').trim(),
      headerName: (config.headerName || (config.type === 'judge0' ? 'X-Auth-Token' : 'X-Grading-Token')).trim()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanConfig));
    return cleanConfig;
  }

  /**
   * Check if valid server URL is configured
   */
  static isConfigured() {
    const config = this.getConfig();
    return Boolean(config.serverUrl && config.serverUrl.startsWith('http'));
  }

  /**
   * Test connection to the configured server
   */
  static async testConnection(customConfig = null) {
    const config = customConfig || this.getConfig();
    if (!config.serverUrl) {
      return { success: false, message: '채점 서버 URL을 입력해주세요.' };
    }

    const startTime = performance.now();
    const headers = { 'Content-Type': 'application/json' };
    if (config.token) {
      headers[config.headerName || 'X-Auth-Token'] = config.token;
    }

    try {
      if (config.type === 'piston') {
        // Piston runtime check or lightweight test
        const testUrl = `${config.serverUrl}/api/v2/runtimes`;
        const res = await fetch(testUrl, { method: 'GET', headers });
        const elapsed = Math.round(performance.now() - startTime);

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: '인증 실패 (401/403): 접근 토큰이 올바르지 않습니다.' };
        }
        if (!res.ok) {
          return { success: false, message: `서버 응답 오류 (상태 코드: ${res.status})` };
        }

        const data = await res.json();
        const hasCpp = Array.isArray(data) && data.some(r => r.language === 'cpp' || (r.aliases && r.aliases.includes('cpp')));
        return {
          success: true,
          message: `Piston 서버 연결 성공 (${elapsed}ms)${hasCpp ? ' - C++ 런타임 확인됨' : ''}`
        };
      } else {
        // Judge0 CE check (/about or /languages or /system_info)
        const testUrl = `${config.serverUrl}/about`;
        const res = await fetch(testUrl, { method: 'GET', headers });
        const elapsed = Math.round(performance.now() - startTime);

        if (res.status === 401 || res.status === 403) {
          return { success: false, message: '인증 실패 (401/403): 접근 토큰이 올바르지 않습니다.' };
        }
        if (!res.ok) {
          // Fallback: try /languages
          const langRes = await fetch(`${config.serverUrl}/languages`, { method: 'GET', headers });
          if (langRes.ok) {
            return { success: true, message: `Judge0 CE 서버 연결 성공 (${elapsed}ms)` };
          }
          return { success: false, message: `서버 응답 오류 (상태 코드: ${res.status})` };
        }

        return { success: true, message: `Judge0 CE 서버 연결 성공 (${elapsed}ms)` };
      }
    } catch (err) {
      if (window.location.protocol === 'https:' && config.serverUrl.startsWith('http:')) {
        return {
          success: false,
          message: 'HTTPS 환경에서 HTTP 서버 호출이 브라우저에 의해 차단되었습니다 (Mixed Content). HTTPS 서버 URL을 사용해주세요.'
        };
      }
      return {
        success: false,
        message: `연결 실패: ${err.message || '서버에 도달할 수 없습니다. CORS 및 URL을 확인해주세요.'}`
      };
    }
  }

  /**
   * Execute code using configured engine
   */
  static async execute(code, stdin = '') {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        isConfigError: true,
        error: '채점 서버가 설정되지 않았습니다. 상단 [⚙️ 설정]에서 서버 정보를 입력해주세요.'
      };
    }

    if (config.type === 'piston') {
      return this._executePiston(config, code, stdin);
    } else {
      return this._executeJudge0(config, code, stdin);
    }
  }

  /**
   * Execute via Piston API
   */
  static async _executePiston(config, code, stdin) {
    const startTime = performance.now();
    const endpoint = `${config.serverUrl}/api/v2/execute`;

    const headers = { 'Content-Type': 'application/json' };
    if (config.token) {
      headers[config.headerName || 'X-Grading-Token'] = config.token;
    }

    const payload = {
      language: 'cpp',
      version: '10.2.0',
      files: [{ name: 'main.cpp', content: code }],
      stdin: stdin,
      run_timeout: 3000,
      compile_timeout: 10000
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          isAuthError: true,
          error: '접근 토큰이 올바르지 않거나 권한이 없습니다. 설정(⚙️)에서 토큰을 확인해주세요.',
          elapsedTimeMs: elapsed
        };
      }

      if (!response.ok) {
        throw new Error(`Piston 서버 오류 (상태 코드: ${response.status})`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        engine: 'piston',
        elapsedTimeMs: elapsed
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || '채점 서버 통신 중 오류가 발생했습니다.',
        elapsedTimeMs: Math.round(performance.now() - startTime)
      };
    }
  }

  /**
   * Execute via Judge0 CE API
   */
  static async _executeJudge0(config, code, stdin) {
    const startTime = performance.now();
    const endpoint = `${config.serverUrl}/submissions?base64_encoded=false&wait=true`;

    const headers = { 'Content-Type': 'application/json' };
    if (config.token) {
      headers[config.headerName || 'X-Auth-Token'] = config.token;
    }

    // language_id 54 is C++ (GCC 9.2.0), or standard C++ GCC in Judge0
    const payload = {
      source_code: code,
      language_id: 54,
      stdin: stdin,
      cpu_time_limit: 4.0
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          isAuthError: true,
          error: '접근 토큰이 올바르지 않거나 권한이 없습니다. 설정(⚙️)에서 토큰을 확인해주세요.',
          elapsedTimeMs: elapsed
        };
      }

      if (!response.ok) {
        throw new Error(`Judge0 서버 오류 (상태 코드: ${response.status})`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        engine: 'judge0',
        elapsedTimeMs: elapsed
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Judge0 서버 통신 중 오류가 발생했습니다.',
        elapsedTimeMs: Math.round(performance.now() - startTime)
      };
    }
  }

  /**
   * Run and grade against a specific example testcase
   */
  static async gradeTestcase(code, example) {
    const res = await this.execute(code, example.input);

    if (!res.success) {
      return {
        status: res.isAuthError ? 'AUTH_ERROR' : (res.isConfigError ? 'CONFIG_ERROR' : 'NETWORK_ERROR'),
        label: res.isAuthError ? '인증 실패' : (res.isConfigError ? '서버 미설정' : '통신 오류'),
        input: example.input,
        expected: example.output,
        actual: '',
        error: res.error,
        timeMs: res.elapsedTimeMs
      };
    }

    if (res.engine === 'judge0') {
      return this._parseJudge0Result(res.data, example, res.elapsedTimeMs);
    } else {
      return this._parsePistonResult(res.data, example, res.elapsedTimeMs);
    }
  }

  static _parseJudge0Result(data, example, elapsedMs) {
    const statusId = data.status ? data.status.id : 0;
    const compileOutput = data.compile_output || '';
    const stdout = data.stdout || '';
    const stderr = data.stderr || data.message || '';
    const executionTimeSec = parseFloat(data.time) || (elapsedMs / 1000);
    const timeMs = Math.round(executionTimeSec * 1000);

    // Status ID 6: Compilation Error
    if (statusId === 6 || compileOutput) {
      return {
        status: 'COMPILE_ERROR',
        label: '컴파일 에러',
        input: example.input,
        expected: example.output,
        actual: '',
        error: compileOutput || '컴파일 실패',
        timeMs
      };
    }

    // Status ID 5: Time Limit Exceeded
    if (statusId === 5) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        label: '시간 초과',
        input: example.input,
        expected: example.output,
        actual: stdout,
        error: '시간 제한 초과 (Time Limit Exceeded)',
        timeMs
      };
    }

    // Status ID 7~12: Runtime Error
    if (statusId >= 7 && statusId <= 12) {
      return {
        status: 'RUNTIME_ERROR',
        label: '런타임 에러',
        input: example.input,
        expected: example.output,
        actual: stdout,
        error: stderr || `프로세스 비정상 종료: ${data.status.description}`,
        timeMs
      };
    }

    // Compare Outputs
    const isCorrect = this.compareOutput(stdout, example.output);
    return {
      status: isCorrect ? 'PASSED' : 'WRONG_ANSWER',
      label: isCorrect ? '맞았습니다!!' : '틀렸습니다',
      input: example.input,
      expected: example.output,
      actual: stdout,
      error: stderr || null,
      timeMs
    };
  }

  static _parsePistonResult(data, example, elapsedMs) {
    const { compile, run } = data;

    if (compile && compile.code !== 0) {
      return {
        status: 'COMPILE_ERROR',
        label: '컴파일 에러',
        input: example.input,
        expected: example.output,
        actual: '',
        error: compile.output || compile.stderr || '컴파일 실패',
        timeMs: elapsedMs
      };
    }

    if (run.code !== 0) {
      let label = '런타임 에러';
      if (run.signal === 'SIGKILL' || (run.stderr && run.stderr.includes('timed out'))) {
        label = '시간 초과';
      }
      return {
        status: label === '시간 초과' ? 'TIME_LIMIT_EXCEEDED' : 'RUNTIME_ERROR',
        label: label,
        input: example.input,
        expected: example.output,
        actual: run.stdout || '',
        error: run.stderr || `프로세스가 비정상 종료되었습니다 (Exit code: ${run.code})`,
        timeMs: elapsedMs
      };
    }

    const stdout = run.stdout || '';
    const isCorrect = this.compareOutput(stdout, example.output);
    return {
      status: isCorrect ? 'PASSED' : 'WRONG_ANSWER',
      label: isCorrect ? '맞았습니다!!' : '틀렸습니다',
      input: example.input,
      expected: example.output,
      actual: stdout,
      error: run.stderr || null,
      timeMs: elapsedMs
    };
  }

  /**
   * Normalized output comparison
   */
  static compareOutput(actual, expected) {
    const norm = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim();
    };

    return norm(actual) === norm(expected);
  }
}

window.JudgeClient = JudgeClient;
