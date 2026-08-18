/**
 * Monaco Editor Wrapper for C++
 */
class CodeEditor {
  static DEFAULT_CPP_BOILERPLATE = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // 여기에 C++ 풀이 코드를 작성하세요
    
    return 0;
}
`;

  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.editor = null;
    this.options = {
      theme: options.theme || 'vs-dark',
      fontSize: options.fontSize || 14,
      onRunShortcut: options.onRunShortcut || null
    };
  }

  /**
   * Initialize Monaco Editor using AMD loader
   */
  init() {
    return new Promise((resolve, reject) => {
      if (typeof require === 'undefined') {
        return reject(new Error('Monaco loader가 로드되지 않았습니다.'));
      }

      require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
        }
      });

      require(['vs/editor/editor.main'], () => {
        try {
          this.editor = monaco.editor.create(this.container, {
            value: CodeEditor.DEFAULT_CPP_BOILERPLATE,
            language: 'cpp',
            theme: this.options.theme,
            fontSize: this.options.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
            fontLigatures: true,
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            minimap: {
              enabled: false
            },
            scrollBeyondLastLine: false,
            roundedSelection: false,
            bracketPairColorization: {
              enabled: true
            },
            padding: {
              top: 12,
              bottom: 12
            }
          });

          // Shortcut: Ctrl+Enter or Cmd+Enter to Run
          this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            if (typeof this.options.onRunShortcut === 'function') {
              this.options.onRunShortcut();
            }
          });

          window.addEventListener('resize', () => {
            this.layout();
          });

          resolve(this.editor);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  setValue(code) {
    if (this.editor) {
      this.editor.setValue(code);
    }
  }

  resetBoilerplate() {
    this.setValue(CodeEditor.DEFAULT_CPP_BOILERPLATE);
  }

  setTheme(themeName) {
    this.options.theme = themeName;
    if (window.monaco) {
      monaco.editor.setTheme(themeName);
    }
  }

  setFontSize(size) {
    this.options.fontSize = size;
    if (this.editor) {
      this.editor.updateOptions({ fontSize: size });
    }
  }

  getFontSize() {
    return this.options.fontSize;
  }

  layout() {
    if (this.editor) {
      this.editor.layout();
    }
  }
}

window.CodeEditor = CodeEditor;
