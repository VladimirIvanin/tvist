import packageInfo from '../../package.json' with { type: 'json' }

type Code = { html: string; css: string; js: string }

/** Собирает самодостаточную страницу из тех же исходников, что запускают предпросмотр. */
export function standalonePage(code: Code): string {
  const tagged = `https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@v${packageInfo.version}/browser-build`
  const latest = 'https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@main/browser-build'
  return `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${tagged}/tvist.css" onerror="this.onerror=null;this.href='${latest}/tvist.css'">
<style>body { font-family: system-ui; padding: 24px; }\n${code.css}\n</style></head>
<body>\n${code.html}\n<script src="${tagged}/tvist.min.js"></script>
<script>
function startTvistExample() {\n${code.js}\n}
if (window.TvistV1) {
  startTvistExample();
} else {
  const fallback = document.createElement('script');
  fallback.src = '${latest}/tvist.min.js';
  fallback.onload = startTvistExample;
  document.head.append(fallback);
}
</script></body></html>`
}
