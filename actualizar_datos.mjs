// Baja los datos de ESPN (desde el servidor de GitHub, donde no hay bloqueos) y los guarda en datos.json.
// Usa el mismo código que la página (index.html), así el formato siempre coincide.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const codigo = bloques[bloques.length - 1][1];

const memoria = new Map();
const entorno = {
  document: {addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], documentElement: {dataset: {}}},
  localStorage: {getItem: k => (memoria.has(k) ? memoria.get(k) : null), setItem: (k, v) => memoria.set(k, String(v))},
  location: {protocol: 'node:'}
};
const armar = new Function(...Object.keys(entorno), codigo + `
;return {API,
  poner(d) { EQUIPOS = d.EQUIPOS; JUGADORES = d.JUGADORES; PARTIDOS = d.PARTIDOS; STATS = d.STATS; FUENTE = {tipo: 'vivo'}; },
  leer() { return {EQUIPOS, JUGADORES, PARTIDOS, STATS}; }};`);
const app = armar(...Object.values(entorno));

console.log('Pidiendo partidos a ESPN…');
const datos = await app.API.traer();                       // partidos, clubes y goleadores
app.poner(datos);
try { console.log('Pidiendo clubes y planteles…'); await app.API.traerExtras(); app.API.aplicarExtras(); }
catch (e) { console.log('No se pudieron traer los planteles (no es grave):', e.message); }

const est = app.leer();
const salida = {EQUIPOS: est.EQUIPOS.filter(e => !e.sintetico), JUGADORES: est.JUGADORES, PARTIDOS: est.PARTIDOS, STATS: [], ALERTAS: [], actualizado: Date.now()};
if (!salida.PARTIDOS.some(p => p.gl !== null)) throw new Error('ESPN no devolvió partidos jugados');
fs.writeFileSync(new URL('./datos.json', import.meta.url), JSON.stringify(salida));
const jugados = salida.PARTIDOS.filter(p => p.gl !== null), ult = jugados.map(p => p.fecha).sort().pop();
console.log(`Listo: ${salida.EQUIPOS.length} equipos, ${jugados.length} partidos jugados (último: ${ult}), ${salida.JUGADORES.length} jugadores.`);
