// Ejecuta una expresión JS en el WebView de la app (protocolo de depuración de Chrome) y la imprime.
// Uso: node cdp.mjs "<expresión>"   (requiere adb forward tcp:9222 al socket del WebView)
const expr = process.argv[2];
const paginas = await (await fetch('http://localhost:9222/json')).json();
const p = paginas.find(x => x.type === 'page' && /vercel\.app/.test(x.url)) || paginas.find(x => x.type === 'page');
if (!p) { console.log('SIN PÁGINA', JSON.stringify(paginas)); process.exit(0); }
const ws = new WebSocket(p.webSocketDebuggerUrl);
await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
const r = await new Promise(ok => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) ok(d); }; });
console.log(JSON.stringify(r.result && r.result.result ? r.result.result.value : r));
ws.close();
process.exit(0);
