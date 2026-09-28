import packageInfo from '../../package.json' with { type: 'json' }

type Code = { html: string; css: string; js: string }

/** Собирает самодостаточную страницу из тех же исходников, что запускают предпросмотр. */
export function standalonePage(code: Code): string {
  const tagged = `https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@v${packageInfo.version}/browser-build`
  const latest = 'https://cdn.jsdelivr.net/gh/VladimirIvanin/tvist@main/browser-build'
  return `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style id="tvist-example-style">body { font-family: system-ui; padding: 24px; }\n${code.css}\n</style></head>
<body>\n${code.html}
<script>
function startTvistExample() {\n${code.js}\n}
async function loadTvistAssets(base) {
  const resources = [];
  function load(file) {
    return new Promise((resolve, reject) => {
      const isStyle = file.endsWith('.css');
      const element = document.createElement(isStyle ? 'link' : 'script');
      if (isStyle) {
        element.rel = 'stylesheet';
        element.href = base + '/' + file;
      } else {
        element.src = base + '/' + file;
      }
      element.onload = resolve;
      element.onerror = () => reject(new Error('Failed to load ' + file));
      resources.push(element);
      document.head.insertBefore(element, document.getElementById('tvist-example-style'));
    });
  }
  try {
    await Promise.all([load('tvist.core.css'), load('tvist.modules.css')]);
    await load('tvist.core.min.js');
    await load('tvist.modules.min.js');
  } catch (error) {
    resources.forEach(element => element.remove());
    delete window.TvistV1;
    delete window.__tvistV1Queue;
    throw error;
  }
}
loadTvistAssets('${tagged}')
  .catch(() => loadTvistAssets('${latest}'))
  .then(startTvistExample)
  .catch(error => console.error(error));
</script></body></html>`
}
