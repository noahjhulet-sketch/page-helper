// Small, safe Markdown renderer: everything is HTML-escaped first, then a few
// constructs (headings, lists, code, bold, italic, http links) are turned back on.
// One extra: a block between ":::reveal Label" and ":::" stays hidden behind a
// button with that label until it's clicked.

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function inline(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

// The same Markdown without the :::reveal markers, for copying or previews.
export function withoutReveals(src) {
  return src.replace(/^[ \t]*:::(reveal\b.*)?[ \t]*$\n?/gm, "");
}

export function renderMarkdown(src) {
  const lines = src.replace(/\r/g, "").split("\n");
  const out = [];
  let list = null; // "ul" | "ol"
  let para = [];
  let inCode = false;
  let code = [];
  let reveal = null; // { label, lines } while inside a :::reveal block

  const closeReveal = () => {
    out.push(`<details class="reveal"><summary>${escapeHtml(reveal.label)}</summary><div class="reveal-body">${renderMarkdown(reveal.lines.join("\n"))}</div></details>`);
    reveal = null;
  };

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    if (reveal) {
      if (line.trim() === ":::") closeReveal();
      else reveal.lines.push(line);
      continue;
    }
    const revealStart = !inCode && line.match(/^\s*:::reveal\s*(.*)$/);
    if (revealStart) {
      flushPara(); closeList();
      reveal = { label: revealStart[1].trim() || "Show", lines: [] };
      continue;
    }

    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
      } else {
        flushPara();
        closeList();
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }

    const heading = line.match(/^(#{1,4})\s+(.*)/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);

    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushPara(); closeList();
      out.push("<hr>");
    } else if (heading) {
      flushPara(); closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushPara();
      const kind = bullet ? "ul" : "ol";
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline((bullet || numbered)[1])}</li>`);
    } else if (!line.trim()) {
      flushPara(); closeList();
    } else {
      closeList();
      para.push(line);
    }
  }
  if (inCode) out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushPara();
  closeList();
  if (reveal) closeReveal(); // still streaming, or the closing ::: never came
  return out.join("");
}
