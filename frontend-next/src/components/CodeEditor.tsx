"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import { useEffect, useState, useRef } from "react";

// Monaco is automatically loaded via CDN by @monaco-editor/react.
// Relying on the default internal loader resolves Next.js Webpack stuck-on-loading issues
// and ensures the version strictly matches the wrapper.

/* ── Monaco theme definitions keyed by app theme id ── */
const MONACO_THEMES: Record<
  string,
  {
    base: "vs" | "vs-dark";
    inherit: boolean;
    rules: { token: string; foreground?: string; fontStyle?: string }[];
    colors: Record<string, string>;
  }
> = {
  "one-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      { token: "keyword", foreground: "c678dd" },
      { token: "string", foreground: "98c379" },
      { token: "number", foreground: "d19a66" },
      { token: "type", foreground: "e5c07b" },
      { token: "variable", foreground: "e06c75" },
      { token: "function", foreground: "61afef" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorLineNumber.foreground": "#495162",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editor.selectionBackground": "#3e4451",
      "editor.lineHighlightBackground": "#2c313c",
      "editorCursor.foreground": "#528bff",
      "editorIndentGuide.background": "#3b4048",
    },
  },
  "github-light": {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6a737d", fontStyle: "italic" },
      { token: "keyword", foreground: "d73a49" },
      { token: "string", foreground: "032f62" },
      { token: "number", foreground: "005cc5" },
      { token: "type", foreground: "6f42c1" },
      { token: "variable", foreground: "e36209" },
      { token: "function", foreground: "6f42c1" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#24292e",
      "editorLineNumber.foreground": "#babbbc",
      "editorLineNumber.activeForeground": "#24292e",
      "editor.selectionBackground": "#c8c8fa",
      "editor.lineHighlightBackground": "#f6f8fa",
      "editorCursor.foreground": "#044289",
      "editorIndentGuide.background": "#eff2f5",
    },
  },
  monokai: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "keyword", foreground: "f92672" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "function", foreground: "a6e22e" },
    ],
    colors: {
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#49483e",
      "editor.lineHighlightBackground": "#3e3d32",
      "editorCursor.foreground": "#f8f8f0",
      "editorIndentGuide.background": "#464741",
    },
  },
  dracula: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "keyword", foreground: "ff79c6" },
      { token: "string", foreground: "f1fa8c" },
      { token: "number", foreground: "bd93f9" },
      { token: "type", foreground: "8be9fd", fontStyle: "italic" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "function", foreground: "50fa7b" },
    ],
    colors: {
      "editor.background": "#282a36",
      "editor.foreground": "#f8f8f2",
      "editorLineNumber.foreground": "#6272a4",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.selectionBackground": "#44475a",
      "editor.lineHighlightBackground": "#44475a75",
      "editorCursor.foreground": "#f8f8f2",
      "editorIndentGuide.background": "#424450",
    },
  },
  nord: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "616e88", fontStyle: "italic" },
      { token: "keyword", foreground: "81a1c1" },
      { token: "string", foreground: "a3be8c" },
      { token: "number", foreground: "b48ead" },
      { token: "type", foreground: "8fbcbb" },
      { token: "variable", foreground: "d8dee9" },
      { token: "function", foreground: "88c0d0" },
    ],
    colors: {
      "editor.background": "#2e3440",
      "editor.foreground": "#d8dee9",
      "editorLineNumber.foreground": "#4c566a",
      "editorLineNumber.activeForeground": "#d8dee9",
      "editor.selectionBackground": "#434c5e",
      "editor.lineHighlightBackground": "#3b4252",
      "editorCursor.foreground": "#d8dee9",
      "editorIndentGuide.background": "#434c5e",
    },
  },
};

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
}

export default function CodeEditor({
  language,
  value,
  onChange,
}: CodeEditorProps) {
  const [activeTheme, setActiveTheme] = useState("one-dark");
  const monacoRef = useRef<Monaco | null>(null);

  // Sync with app theme (reads data-theme attribute)
  useEffect(() => {
    const sync = () => {
      const t =
        document.documentElement.getAttribute("data-theme") || "one-dark";
      setActiveTheme(t);
      // If monaco is already loaded, switch live
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(`algoarena-${t}`);
      }
    };
    sync();

    // Watch for attribute changes (theme toggle / picker)
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const handleBeforeMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    // Register all custom themes once
    for (const [id, def] of Object.entries(MONACO_THEMES)) {
      monaco.editor.defineTheme(`algoarena-${id}`, def);
    }

    // Register basic Python method suggestions
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = [
          {
            label: "append",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "append(${1:item})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Append object to the end of the list",
            range,
          },
          {
            label: "pop",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "pop(${1:index})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Remove and return item at index",
            range,
          },
          {
            label: "sort",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "sort()",
            detail: "Sort the list in ascending order",
            range,
          },
          {
            label: "reverse",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "reverse()",
            detail: "Reverse the list",
            range,
          },
          {
            label: "insert",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "insert(${1:index}, ${2:object})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Insert object before index",
            range,
          },
          {
            label: "remove",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "remove(${1:value})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Remove first occurrence of value",
            range,
          },
          {
            label: "count",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "count(${1:value})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Return number of occurrences of value",
            range,
          },
          {
            label: "index",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "index(${1:value})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Return first index of value",
            range,
          },
          {
            label: "keys",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "keys()",
            detail: "Return a set-like object providing a view on D's keys",
            range,
          },
          {
            label: "values",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "values()",
            detail: "Return an object providing a view on D's values",
            range,
          },
          {
            label: "items",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "items()",
            detail: "Return a set-like object providing a view on D's items",
            range,
          },
          {
            label: "get",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "get(${1:key}, ${2:default})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail:
              "Return the value for key if key is in the dictionary, else default",
            range,
          },
          {
            label: "split",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "split(${1:sep})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail:
              "Return a list of the words in the string, using sep as the delimiter string",
            range,
          },
          {
            label: "join",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "join(${1:iterable})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "Concatenate any number of strings",
            range,
          },
          {
            label: "replace",
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: "replace(${1:old}, ${2:new})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail:
              "Return a copy with all occurrences of substring old replaced by new",
            range,
          },
        ];
        return { suggestions };
      },
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme={`algoarena-${activeTheme}`}
      beforeMount={handleBeforeMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 16 },
        lineNumbers: "on",
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        // Explicitly enable deep code suggestions
        quickSuggestions: {
          other: true,
          comments: true,
          strings: true,
        },
        wordBasedSuggestions: "currentDocument",
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: "on",
        snippetSuggestions: "bottom",
      }}
    />
  );
}
