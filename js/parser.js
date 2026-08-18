/**
 * Problem Markdown Parser
 * Extracts YAML frontmatter and renders markdown content in-memory.
 */
class ProblemParser {
  /**
   * Parse a raw markdown string into a structured problem object
   * @param {string} content - Raw markdown content from local file
   * @returns {Object} Parsed problem data
   */
  static parse(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('유효한 마크다운 파일 내용이 아닙니다.');
    }

    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    let frontmatter = {};
    let markdownBody = content;

    if (match) {
      const yamlStr = match[1];
      markdownBody = match[2];
      try {
        if (typeof jsyaml !== 'undefined') {
          frontmatter = jsyaml.load(yamlStr) || {};
        }
      } catch (err) {
        console.warn('YAML 파싱 중 경고/오류 발생:', err);
      }
    }

    // Extract Examples from Frontmatter or fallback to Markdown Regex
    let examples = [];
    if (Array.isArray(frontmatter.examples)) {
      examples = frontmatter.examples.map((ex, idx) => ({
        index: idx + 1,
        input: String(ex.input ?? ''),
        output: String(ex.output ?? '')
      }));
    } else {
      // Fallback: Try to parse `## 예제 입력 N` / `## 예제 출력 N` from body
      examples = this._extractExamplesFromBody(markdownBody);
    }

    // Render Markdown to HTML
    let bodyHtml = '';
    if (typeof marked !== 'undefined') {
      // Configure marked
      marked.setOptions({
        breaks: true,
        gfm: true
      });
      bodyHtml = marked.parse(markdownBody);
      if (typeof DOMPurify !== 'undefined') {
        bodyHtml = DOMPurify.sanitize(bodyHtml);
      }
    } else {
      bodyHtml = `<pre>${this._escapeHtml(markdownBody)}</pre>`;
    }

    return {
      id: frontmatter.id !== undefined ? String(frontmatter.id) : 'Custom',
      title: frontmatter.title || '제목 없음',
      time_limit: frontmatter.time_limit || '2초',
      memory_limit: frontmatter.memory_limit || '512MB',
      difficulty: frontmatter.difficulty || 'Unrated',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      examples: examples,
      rawBody: markdownBody,
      bodyHtml: bodyHtml
    };
  }

  /**
   * Fallback extractor for example inputs and outputs in markdown body
   * @private
   */
  static _extractExamplesFromBody(body) {
    const examples = [];
    const inRegex = /##\s*예제\s*입력\s*(\d+)[\r\n]+(?:```[\w]*\r?\n)?([\s\S]*?)(?:```|(?=##|$))/g;
    const outRegex = /##\s*예제\s*출력\s*(\d+)[\r\n]+(?:```[\w]*\r?\n)?([\s\S]*?)(?:```|(?=##|$))/g;

    const inputs = {};
    const outputs = {};

    let m;
    while ((m = inRegex.exec(body)) !== null) {
      inputs[m[1]] = m[2].trim();
    }
    while ((m = outRegex.exec(body)) !== null) {
      outputs[m[1]] = m[2].trim();
    }

    const indices = Array.from(new Set([...Object.keys(inputs), ...Object.keys(outputs)])).sort((a, b) => Number(a) - Number(b));
    indices.forEach(idx => {
      examples.push({
        index: Number(idx),
        input: inputs[idx] || '',
        output: outputs[idx] || ''
      });
    });

    return examples;
  }

  static _escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

window.ProblemParser = ProblemParser;
