(function () {
  function getLanguage(codeEl) {
    const match = codeEl.className.match(/language-(\w+)/);
    return match ? match[1] : null;
  }

  function highlightSource(codeEl, text) {
    const lang = getLanguage(codeEl);
    if (
      typeof Prism === "undefined" ||
      !lang ||
      !Prism.languages[lang]
    ) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    return Prism.highlight(text, Prism.languages[lang], lang);
  }

  function wrapCodeLines(walkthrough) {
    const codeEl = walkthrough.querySelector("pre code");
    if (!codeEl || codeEl.dataset.linesWrapped === "true") return;

    const text = codeEl.textContent || "";
    const highlighted = highlightSource(codeEl, text);
    const lineHtmls = highlighted.replace(/\n$/, "").split("\n");

    codeEl.innerHTML = lineHtmls
      .map((lineHtml, i) => {
        const n = i + 1;
        return `<span class="code-line" data-line="${n}">${lineHtml || "\u00a0"}</span>`;
      })
      .join("");
    codeEl.dataset.linesWrapped = "true";
  }

  function clearHighlights(walkthrough) {
    walkthrough.querySelectorAll(".code-line--active").forEach((el) => {
      el.classList.remove("code-line--active");
    });
  }

  function highlightRange(walkthrough, start, end) {
    clearHighlights(walkthrough);
    for (let n = start; n <= end; n++) {
      const line = walkthrough.querySelector(`.code-line[data-line="${n}"]`);
      if (line) line.classList.add("code-line--active");
    }
  }

  function initWalkthrough(walkthrough) {
    wrapCodeLines(walkthrough);

    const sections = walkthrough.querySelectorAll(".guide-section");
    sections.forEach((section) => {
      section.addEventListener("toggle", () => {
        if (!section.open) return;
        const start = Number(section.dataset.start);
        const end = Number(section.dataset.end);
        if (start && end) highlightRange(walkthrough, start, end);
      });
    });

    const expandBtn = walkthrough.querySelector("[data-action=expand-all]");
    const collapseBtn = walkthrough.querySelector("[data-action=collapse-all]");
    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        sections.forEach((s) => {
          s.open = true;
        });
      });
    }
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        sections.forEach((s) => {
          s.open = false;
        });
        clearHighlights(walkthrough);
      });
    }
  }

  window.addEventListener("load", () => {
    document.querySelectorAll(".code-walkthrough").forEach(initWalkthrough);

    if (typeof Prism !== "undefined") {
      document.querySelectorAll('pre[class*="language-"]').forEach((pre) => {
        if (pre.closest(".code-walkthrough")) return;
        Prism.highlightElement(pre);
      });
    }
  });
})();
