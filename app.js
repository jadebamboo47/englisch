/* „Englisch für unterwegs“ – App-Logik.  Inhalte: content.js · Audio: audio/*.mp3 + audio/index.json */
'use strict';

/* ============================================================
   ZUSTAND (nur auf diesem Gerät gespeichert)
   ============================================================ */
const KEY = 'englisch-unterwegs-v1';
let state = { name:'', done:{}, miss:{}, scale:1, rate:0.9, voice:'rec', showDe:false, onboarded:false, server:'', code:'' };
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) state = Object.assign(state, s); } catch(e) {}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }
function applyScale(){ document.documentElement.style.setProperty('--scale', state.scale); }
applyScale();

const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nm = () => (state.name || '').trim() || 'Maria';
const N = s => String(s).split('{name}').join(nm());
const shuffle = a => { for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const byId = id => LESSONS.find(l => l.id === id);
const pickOne = a => a[Math.floor(Math.random()*a.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('show'),2800); }

/* ============================================================
   AUDIO: Aufnahmen (Kokoro) mit Rückfall auf die Gerätestimme
   ============================================================ */
let AIDX = null;
fetch('audio/index.json').then(r => r.ok ? r.json() : null).then(j => { AIDX = j; }).catch(() => {});
let actx = null;
function audioCtx(){
  if (!actx){ const C = window.AudioContext || window.webkitAudioContext; if (C) try { actx = new C(); } catch(e) {} }
  if (actx && actx.state === 'suspended') actx.resume().catch(()=>{});
  return actx;
}
document.addEventListener('click', () => audioCtx(), {capture:true});
const bufCache = new Map();
function loadBuf(id){
  if (bufCache.has(id)){ const p = bufCache.get(id); bufCache.delete(id); bufCache.set(id, p); return p; }
  const f = AIDX && AIDX.files[id] && AIDX.files[id].file;
  const p = fetch('audio/' + (f || id + '.mp3')).then(r => { if (!r.ok) throw new Error('fehlt'); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => audioCtx().decodeAudioData(b, res, rej)));
  p.catch(() => bufCache.delete(id));
  bufCache.set(id, p);
  while (bufCache.size > 3) bufCache.delete(bufCache.keys().next().value);
  return p;
}
let curSrc = null, curAudio = null;
async function playClip(text, slow){
  const e = AIDX && AIDX.clips[text];
  if (!e || state.voice !== 'rec' || !audioCtx()) return false;
  try {
    const buf = await loadBuf(e[0]);
    const useSlow = slow && e.length >= 5;
    const start = useSlow ? e[3] : e[1], dur = useSlow ? e[4] : e[2];
    stopAudioOnly();
    const src = actx.createBufferSource(); src.buffer = buf; src.connect(actx.destination);
    curSrc = src;
    return await new Promise(res => { src.onended = () => res(true); src.start(0, Math.max(0, start - 0.03), dur + 0.08); });
  } catch(err){ return false; }
}
function stopAudioOnly(){
  if (curSrc){ try { curSrc.onended = null; curSrc.stop(); } catch(e) {} curSrc = null; }
  if (curAudio){ try { curAudio.pause(); } catch(e) {} curAudio = null; }
}
function playUrl(url){
  return new Promise(res => { try { stopAudioOnly(); curAudio = new Audio(url); curAudio.onended = () => res(true); curAudio.onerror = () => res(false); curAudio.play().catch(() => res(false)); } catch(e){ res(false); } });
}

/* Gerätestimme als Rückfall */
const hasTTS = 'speechSynthesis' in window;
let voices = [];
function loadVoices(){ try { voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang)); } catch(e){ voices=[]; } }
if (hasTTS){ loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch(e){} }
function pickVoices(){
  if (!voices.length) loadVoices();
  const lang = v => v.lang.replace('_','-').toLowerCase();
  let pool = voices.filter(v => lang(v) === 'en-gb'); if (!pool.length) pool = voices.slice();
  const score = v => (v.localService?4:0) + (/premium|enhanced|natural|neural/i.test(v.name)?3:0) + (/daniel|kate|serena|arthur|martha/i.test(v.name)?1:0);
  pool.sort((a,b) => score(b)-score(a));
  const main = pool[0] || null; const other = pool.find(v => v !== main) || main;
  return [main, other];
}
function deviceSpeak(text, opts={}){
  if (!hasTTS) return Promise.resolve(false);
  return new Promise(res => {
    let fin = false; const done = () => { if(!fin){ fin = true; res(true); } };
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(N(text)); const [m, o] = pickVoices(); const v = opts.other ? o : m;
      if (v){ u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
      u.rate = opts.slow ? 0.6 : state.rate; if (opts.other && o === m) u.pitch = 1.2;
      u.onend = done; u.onerror = done; speechSynthesis.speak(u); setTimeout(done, 4000 + N(text).length * 160);
    } catch(e){ done(); }
  });
}
let speakToken = 0;
async function speak(text, opts={}){
  const slow = opts.slow || state.rate < 0.85;
  if (await playClip(text, slow)) return true;
  if (!hasTTS && !(AIDX && AIDX.clips[text])) { toast('Für diesen Satz gibt es keine Aufnahme.'); return false; }
  return deviceSpeak(text, {...opts, slow});
}
function stopSpeech(){ speakToken++; stopAudioOnly(); if (hasTTS) try { speechSynthesis.cancel(); } catch(e){} }

/* ============================================================
   MIKROFON: Aufnahme + Abgleich
   ============================================================ */
const Rec = {
  stream:null, mr:null, chunks:[], recog:null, live:'', active:false,
  supported(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); },
  async start(){
    stopSpeech();
    if (!this.supported()) throw new Error('nomic');
    this.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
    this.chunks = []; this.live = '';
    this.mr = new MediaRecorder(this.stream);
    this.mr.ondataavailable = e => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.mr.start(); this.active = true;
    // Ohne eigenen Server: Spracherkennung des Browsers versuchen (braucht Internet)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!serverReady() && SR && navigator.onLine){
      try { const r = new SR(); r.lang = 'en-GB'; r.interimResults = false; r.continuous = true; r.maxAlternatives = 1;
        r.onresult = e => { this.live = [...e.results].map(x => x[0].transcript).join(' '); };
        r.onerror = () => {}; r.start(); this.recog = r; } catch(e){ this.recog = null; }
    }
  },
  stop(){
    return new Promise(res => {
      if (!this.mr){ res(null); return; }
      this.mr.onstop = () => {
        const type = (this.chunks[0] && this.chunks[0].type) || this.mr.mimeType || 'audio/mp4';
        const blob = new Blob(this.chunks, {type});
        this.stream.getTracks().forEach(t => t.stop()); this.mr = null; this.active = false;
        setTimeout(() => res(blob), this.recog ? 700 : 0);
        if (this.recog) try { this.recog.stop(); } catch(e){}
      };
      try { this.mr.stop(); } catch(e){ res(null); }
    });
  }
};
const CONTR = {"i'm":"i am","i've":"i have","i'd":"i would","i'll":"i will","it's":"it is","that's":"that is","there's":"there is","what's":"what is","don't":"do not","doesn't":"does not","didn't":"did not","isn't":"is not","aren't":"are not","wasn't":"was not","can't":"can not","cannot":"can not","won't":"will not","we're":"we are","you're":"you are","they're":"they are","we'll":"we will","you'll":"you will","haven't":"have not","let's":"let us","we've":"we have","you've":"you have","he's":"he is","she's":"she is","here's":"here is","we'd":"we would","you'd":"you would"};
function normWords(s){
  return N(s).toLowerCase().replace(/[’`]/g,"'").replace(/[^a-z0-9' ]+/g,' ').split(/\s+/).filter(Boolean)
    .flatMap(w => (CONTR[w] || w.replace(/'s$/,'')).split(' '));
}
/* Wort-Abgleich (LCS): welche Wörter des Zielsatzes wurden erkannt? */
function compareSpeech(target, heard, probs){
  const t = normWords(target), h = normWords(heard);
  const dp = Array.from({length:t.length+1}, () => new Array(h.length+1).fill(0));
  for (let i=t.length-1;i>=0;i--) for (let j=h.length-1;j>=0;j--)
    dp[i][j] = t[i]===h[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const ok = new Array(t.length).fill(false), unsure = new Array(t.length).fill(false);
  let i=0, j=0;
  while (i<t.length && j<h.length){
    if (t[i]===h[j]){ ok[i]=true; if (probs && probs[j]!==undefined && probs[j] < 0.55) unsure[i]=true; i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) i++; else j++;
  }
  const score = t.length ? Math.round(ok.filter(Boolean).length / t.length * 100) : 0;
  return {words:t, ok, unsure, score};
}
/* Anzeige-Wörter des Zielsatzes passend zu normWords */
function displayWords(target){
  return N(target).split(/\s+/).filter(Boolean).flatMap(w => { const n = normWords(w).length; return n ? [w, ...Array(n-1).fill('')] : []; });
}

/* ============================================================
   SERVER (KI-Gesprächspartner, optional)
   ============================================================ */
function serverReady(){ return !!(state.server && state.code && navigator.onLine); }
function apiUrl(p){ let s = state.server.trim().replace(/\/+$/,''); if (!/^https?:\/\//.test(s)) s = 'https://' + s; return s + p; }
async function api(path, opts={}){
  const headers = Object.assign({'X-Access-Code': state.code}, opts.json ? {'Content-Type':'application/json'} : {});
  const r = await fetch(apiUrl(path), {method: opts.method || 'POST', headers, body: opts.json ? JSON.stringify(opts.json) : opts.body});
  if (!r.ok){ let m = 'Fehler ' + r.status; try { m = (await r.json()).detail || m; } catch(e){} throw new Error(m); }
  return opts.raw ? r : r.json();
}
async function transcribe(blob){
  const fd = new FormData(); fd.append('audio', blob, 'aufnahme.' + (blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'm4a'));
  return api('/api/transcribe', {body: fd});
}
async function serverSpeak(text, voice){
  try {
    const r = await api('/api/tts', {json:{text, voice, slow: state.rate < 0.85}, raw:true});
    const url = URL.createObjectURL(await r.blob()); const ok = await playUrl(url); URL.revokeObjectURL(url); return ok;
  } catch(e){ return deviceSpeak(text, {other: voice !== 'emma'}); }
}

/* ============================================================
   NAVIGATION
   ============================================================ */
let view = { name:'home' };
function go(v){ stopSpeech(); hideFb(); if (Rec.active) Rec.stop(); view = v; render(); window.scrollTo(0,0); }
function bar(title, back='home', right=''){
  return `<div class="bar"><button class="iconbtn" data-go="${back}" aria-label="Zurück">‹ Zurück</button>
    <div class="title">${esc(title)}</div>${right || '<div class="spacer"></div>'}</div>`;
}
function render(){
  if (!state.onboarded) return renderWelcome();
  ({warmup:renderWarmup, all:renderAll, test:renderTest, testreview:renderTestReview, home:renderHome, hub:renderHub, phrases:renderPhrases, play:renderPlay,
    tip:renderTip, video:renderVideo, ex:renderEx, done:renderDone, settings:renderSettings, chat:renderChat}[view.name] || renderHome)();
}

/* ---------- Willkommen ---------- */
function renderWelcome(){
  $app.innerHTML = `<div class="welcome stack">
    <div class="flag">🇬🇧</div>
    <h1>Willkommen bei<br>„Englisch für unterwegs“</h1>
    <p class="muted" style="font-size:1.05rem">Lektionen zum Mitspielen, Hören und Sprechen – in Ruhe, ohne Druck.</p>
    <div><label class="field" for="nameIn">Wie heißt du mit Vornamen?</label>
      <input id="nameIn" class="text" type="text" autocomplete="given-name" placeholder="z. B. Maria" value="${esc(state.name)}"></div>
    <button class="btn" id="startBtn">Los geht’s</button></div>`;
  document.getElementById('startBtn').onclick = () => { state.name = document.getElementById('nameIn').value.trim(); state.onboarded = true; save(); go({name:'home'}); };
}

/* ---------- Installation & Offline ---------- */
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; if (view.name==='home' && state.onboarded) render(); });
window.addEventListener('appinstalled', () => { installEvent = null; state.installHidden = true; save(); toast('Fertig! Die App ist jetzt installiert.'); if (view.name==='home') render(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', {updateViaCache:'none'}).catch(()=>{});
    navigator.serviceWorker.ready.then(r => { if (r.active) r.active.postMessage('warm'); }).catch(()=>{});
  });
}
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e) {}

function installHow(){
  if (installEvent) return 'Mit einem Tipp legst du die App auf deinen Computer. Danach funktioniert sie auch ohne Internet.';
  if (isIOS()) return 'Tippe in Safari auf <b>Teilen</b> (das Quadrat mit dem Pfeil nach oben) und dann auf <b>„Zum Home-Bildschirm“</b>. Danach startet „Englisch“ wie jede andere App – auch ohne Internet.';
  return 'Im Browser oben rechts im Menü <b>„App installieren“</b> bzw. <b>„Als App installieren“</b> wählen. Danach funktioniert die App auch ohne Internet.';
}
function installBanner(){
  if (isStandalone() || state.installHidden || location.protocol === 'file:') return '';
  return `<div class="install"><div class="i">📲</div><div style="flex:1">
    <b>Als App speichern</b><p>${installHow()}</p>
    <div class="row">${installEvent ? '<button class="yes" data-act="install">Jetzt installieren</button>' : ''}<button class="later" data-act="hideinstall">${installEvent ? 'Später' : 'Verstanden'}</button></div>
  </div></div>`;
}



/* ============================================================
   EINSTUFUNGSTEST (24 Fragen, A2 → C1)
   ============================================================ */
const TEST = [
  // ---- A2 ----
  {lv:'A2', q:'Yesterday we ___ to the beach.', o:['went','go','have gone','going'], a:0},
  {lv:'A2', q:"There aren't ___ apples left.", o:['any','some','a','no'], a:0},
  {lv:'A2', q:"I can't open the door. I've lost my ___.", o:['key','cup','stamp','coat'], a:0},
  {lv:'A2', ask:'Was ist die passende Antwort?', q:'„Would you like some more tea?“', o:['Yes, please. Just a little.','Yes, I would like.','No, I am not.','Yes, I am thirsty of it.'], a:0},
  {lv:'A2', text:'Dear Anna,\nWe arrived in Edinburgh on Monday. The hotel is small but very comfortable, and it\'s close to the castle. Unfortunately it rained on Tuesday, so we visited a museum. Tomorrow we\'re taking the train to Glasgow.\nLove, Ruth', q:'Why did they visit a museum?', o:['Because the weather was bad.','Because the castle was closed.','Because the hotel was small.','Because they were tired.'], a:0},
  {lv:'A2', audio:'audio/test-a2.mp3', q:'When and where does the train leave?', o:['At 9:20 from platform 4','At 9:40 from platform 4','At 9:20 from platform 2','At 4:20 from platform 9'], a:0},
  // ---- B1 ----
  {lv:'B1', q:'I ___ in this town since 1985.', o:['have lived','live','am living','lived'], a:0},
  {lv:'B1', q:'If it rains tomorrow, we ___ at home.', o:['will stay','would stay','stayed','are stay'], a:0},
  {lv:'B1', q:'„The museum was so crowded that we could hardly move.“ – crowded means …', o:['full of people','very old','very quiet','very expensive'], a:0},
  {lv:'B1', ask:'Der Kellner sagt:', q:'„I\'m afraid the fish is off today.“', o:['Oh, what a pity. What would you recommend instead?','Great, then I\'ll have the fish.','Off? Could you turn it on, please?','Yes, I\'m afraid too.'], a:0},
  {lv:'B1', text:'Many people believe that older adults find it difficult to learn new languages. However, recent research suggests that while children may learn pronunciation more easily, adults often make faster progress at the beginning, because they can use what they already know about grammar and the world. Regular practice, even ten minutes a day, appears to be more effective than long sessions once a week.', q:'According to the text, what works best?', o:['Short practice every day','One long lesson a week','Learning pronunciation first','Starting as a child'], a:0},
  {lv:'B1', audio:'audio/test-b1.mp3', q:'What do passengers need to do to get a free meal?', o:['Show their boarding pass','Pay at the restaurant','Go to the gate first','Wait two hours'], a:0},
  // ---- B2 ----
  {lv:'B2', q:'I wish I ___ more time to travel when I was younger.', o:['had had','had','have','would have'], a:0},
  {lv:'B2', q:'By the time we arrived, the concert ___.', o:['had already started','already starts','has already started','was already start'], a:0},
  {lv:'B2', q:'„She\'s very down-to-earth.“ means she is …', o:['practical and sensible','very shy','often sad','interested in gardening'], a:0},
  {lv:'B2', ask:'Welcher Satz ist am höflichsten? Die Musik des Nachbarn ist zu laut.', q:'You say:', o:['Would you mind turning the music down a little?','Turn the music down.','You must make less noise now.','I don\'t mind your music down.'], a:0},
  {lv:'B2', text:'The town council\'s decision to close the high street to cars has divided opinion. Shop owners initially feared they would lose customers, yet the number of shoppers has actually risen by fifteen per cent since the change. Some elderly residents, however, complain that the nearest bus stop is now a ten-minute walk away, which makes shopping considerably harder for them.', q:'What is the main problem for some older residents?', o:['The bus stop is now further away.','Several shops have closed.','Fewer people go shopping.','Cars are still allowed.'], a:0},
  {lv:'B2', audio:'audio/test-b2.mp3', q:'What does the company offer?', o:['A different day or the money back','A cheaper tour on Saturday','A tour in the rain','A discount on Sunday morning'], a:0},
  // ---- C1 ----
  {lv:'C1', q:'Not only ___ late, but he also forgot the tickets.', o:['did he arrive','he arrived','he did arrive','arrived he'], a:0},
  {lv:'C1', q:'Had I known about the strike, I ___ a different route.', o:['would have taken','would take','had taken','will take'], a:0},
  {lv:'C1', q:'„The guide\'s explanation was rather convoluted.“ means it was …', o:['complicated and hard to follow','short and clear','very funny','simply wrong'], a:0},
  {lv:'C1', q:'„Opera? It\'s not really my cup of tea.“ means …', o:['I don\'t particularly like it.','I don\'t drink tea.','It isn\'t my turn.','It belongs to someone else.'], a:0},
  {lv:'C1', text:'Although the novel was dismissed by critics when it was first published, it has since acquired something of a cult following, not least because its portrayal of small-town life now reads as remarkably prescient.', q:'What does the text say about the novel today?', o:['It is admired, partly because it seems to have predicted the future.','Critics still dislike it.','It was popular from the very beginning.','It describes life in a big city.'], a:0},
  {lv:'C1', audio:'audio/test-c1.mp3', q:'What are the locals worried about?', o:['Young families can no longer afford to live there.','Too many people are leaving the island.','Remote workers don\'t pay local taxes.','There are not enough jobs for young people.'], a:0}
];
const LEVELS = ['A2','B1','B2','C1'];
const LEVEL_TEXT = {
  'A1–A2':'Grundlagen: Die Lektionen der Stufe 1 passen gut.',
  'A2':'Gute Grundlagen für Reisen und Alltag. Nächster Schritt: B1.',
  'B1':'Solide Mittelstufe: Alltagsgespräche klappen. Lektionen auf B1-Niveau mit anspruchsvolleren Dialogen passen.',
  'B2':'Gute Mittelstufe: längere Texte und Gespräche sind kein Problem. Lektionen auf B2-Niveau mit Texten, Redewendungen und feinerer Grammatik passen.',
  'C1':'Fortgeschritten: Feinheiten, Redewendungen und anspruchsvolle Texte. Lektionen auf C1-Niveau passen.'
};
let testRun = null, testAudio = null;
function startTest(){ testRun = {i:0, ans:[]}; TEST.forEach(t => { t.order = t.order || shuffle(t.o.map((_,k)=>k)); }); go({name:'test'}); }
function testScore(ans){
  const per = {}; LEVELS.forEach(l => per[l] = {ok:0, n:0});
  ans.forEach((a,i) => { const t = TEST[i]; per[t.lv].n++; if (a === t.a) per[t.lv].ok++; });
  let level = 'A1–A2';
  for (const l of LEVELS){ if (per[l].n && per[l].ok >= 4) level = l; else break; }
  return {per, level};
}
function playTestAudio(src, btn){
  try { if (testAudio){ testAudio.pause(); } testAudio = new Audio(src); testAudio.play().catch(e => { if (e && e.name === 'NotSupportedError') toast('Audio konnte nicht abgespielt werden.'); }); } catch(e){}
}
function renderTest(){
  if (!testRun) return renderTestIntro();
  if (testRun.i >= TEST.length) return renderTestResult();
  const t = TEST[testRun.i];
  const pct = Math.round(testRun.i / TEST.length * 100);
  $app.innerHTML = `<div class="bar"><button class="iconbtn" data-act="testquit" aria-label="Test beenden">✕</button><div class="progress"><i style="width:${pct}%"></i></div><div class="muted small" style="min-width:64px;text-align:right">${testRun.i+1}/${TEST.length}</div></div>
    <div class="ask">${esc(t.ask || (t.audio ? 'Hör gut zu und beantworte die Frage.' : t.text ? 'Lies den Text und beantworte die Frage.' : 'Welche Antwort passt?'))}</div>
    ${t.text ? `<div class="reading">${esc(t.text).replace(/\n/g,'<br>')}</div>` : ''}
    ${t.audio ? `<div class="bigplay"><button class="circle" data-testaudio="${t.audio}" aria-label="Anhören">🔊</button><span class="muted small">So oft anhören, wie du möchtest</span></div>` : ''}
    <div class="prompt"><div class="en">${esc(t.q).replace('___','<span class="gapword">?</span>')}</div></div>
    <div class="opts">${t.order.map(k => `<button class="opt" data-testans="${k}">${esc(t.o[k])}</button>`).join('')}
      <button class="opt dk" data-testans="-1">Weiß ich nicht</button></div>`;
  if (t.audio) setTimeout(() => playTestAudio(t.audio), 300);
}
function renderTestIntro(){
  const last = state.placement;
  $app.innerHTML = bar('Einstufungstest') + `<div class="stack">
    <div class="hubhead" style="margin:8px 4px 6px"><div class="ico">🎯</div><div><h1>Welches Niveau passt?</h1><div class="muted">24 Fragen · ca. 10 Minuten</div></div></div>
    <div class="card stack">
      <p style="margin:0">Die Fragen werden nach und nach schwieriger – von leicht bis sehr anspruchsvoll. Es ist völlig normal, dass du die letzten nicht alle weißt.</p>
      <p style="margin:0">Einfach die passende Antwort antippen. Wenn du etwas nicht weißt, tippe auf <b>„Weiß ich nicht“</b> – bitte nicht raten, dann wird das Ergebnis genauer.</p>
      <p class="muted small" style="margin:0">Bei vier Fragen hörst du einen kurzen Text – Ton einschalten.</p>
    </div>
    ${last ? `<div class="card"><b>Letztes Ergebnis:</b> ${esc(last.level)} <span class="muted small">(${esc(last.date)})</span></div>` : ''}
    <button class="btn" data-act="teststart">Test starten</button>
  </div>`;
}
function renderTestResult(){
  if (testAudio) try{ testAudio.pause(); }catch(e){}
  const {per, level} = testScore(testRun.ans);
  const answered = testRun.ans.length;
  const summary = `Einstufung: ${level} · ` + LEVELS.map(l => `${l} ${per[l].ok}/${per[l].n}`).join(' · ');
  if (!testRun.saved){ state.placement = {level, summary, date:new Date().toLocaleDateString('de-DE')}; save(); testRun.saved = true; }
  $app.innerHTML = `<div class="done stack">
    <div class="emoji">🎯</div>
    <div class="muted" style="font-weight:700">Dein Niveau</div>
    <div class="levelbig">${esc(level)}</div>
    <p style="font-size:1.05rem">${esc(LEVEL_TEXT[level])}</p>
    <div class="card" style="text-align:left">
      ${LEVELS.map(l => { const p = per[l]; const w = p.n ? Math.round(p.ok/p.n*100) : 0; return `<div class="lvrow"><b>${l}</b><div class="progress"><i style="width:${w}%;${p.ok>=4?'':'background:var(--warm)'}"></i></div><span>${p.ok}/${p.n}</span></div>`; }).join('')}
      ${answered < TEST.length ? `<p class="muted small" style="margin:10px 0 0">Test nach ${answered} von ${TEST.length} Fragen beendet.</p>` : ''}
    </div>
    <div class="card" style="text-align:left"><p class="muted small" style="margin:0 0 8px">Für Claus-Peter – diesen Text weitergeben:</p><div style="font-weight:700">${esc(summary)}</div>
      <button class="btn secondary" style="margin-top:12px" data-act="testcopy">Text kopieren</button></div>
    <div class="stack" style="text-align:left">
      <button class="btn secondary" data-act="testreview">Antworten ansehen</button>
      <button class="btn ghost" data-go="home">Zur Übersicht</button>
    </div></div>`;
  testRun.summary = summary;
}
function renderTestReview(){
  $app.innerHTML = bar('Antworten', 'test') + TEST.map((t,i) => {
    const a = testRun.ans[i]; if (a === undefined) return '';
    const ok = a === t.a;
    return `<div class="phrase"><div class="muted small" style="font-weight:700">${t.lv} · Frage ${i+1} ${ok ? '✓' : '✗'}</div>
      <div class="en" style="font-size:1.1rem;margin-top:4px">${esc(t.q)}</div>
      <div style="margin-top:8px;color:var(--accent);font-weight:700">✓ ${esc(t.o[t.a])}</div>
      ${!ok ? `<div style="color:var(--warm)">${a === -1 ? 'Weiß ich nicht' : 'Deine Antwort: ' + esc(t.o[a])}</div>` : ''}</div>`;
  }).join('') + `<div style="margin-top:20px"><button class="btn" data-go="home">Zur Übersicht</button></div>`;
}



/* ---------- Startseite ---------- */
function allPhrases(){ return LESSONS.filter(l => l.stage > 0).flatMap(l => l.phrases.map(p => ({...p, lesson:l.id}))); }
function dailyPhrase(){ const all = allPhrases(); const d = Math.floor(Date.now()/86400000); return all[(d*7) % all.length]; }
function greeting(){ const h = new Date().getHours(); return h<11 ? 'Guten Morgen' : h<18 ? 'Guten Tag' : 'Guten Abend'; }
function lessonsOf(n){ return LESSONS.filter(l => l.stage === n); }
function nextLesson(){ for (const st of STAGES.filter(s => s.n > 0)) { const l = lessonsOf(st.n).find(x => !state.done[x.id]); if (l) return l; } return null; }

/* ---------- Geführter Ablauf ---------- */
function stepsOf(L){ return ['warmup','phrases','play', ...(L.tip ? ['tip'] : []), 'ex']; }
const STEP_NAMES = {warmup:'Kopf-fit', phrases:'Neue Wendungen', play:'Gespräch mitspielen', tip:'Kurz erklärt', ex:'Üben'};
function current(){
  const c = state.cur; const L = c && byId(c.id);
  if (L && stepsOf(L).includes(c.step)) return {L, step:c.step};
  return {L: nextLesson() || lessonsOf(1)[0], step:'warmup'};
}
function setCur(id, step){ state.cur = {id, step}; save(); }
function enterStep(id, step){
  setCur(id, step);
  if (step === 'ex') return startLesson(id);
  if (step === 'play') play = null;
  go(step === 'phrases' ? {name:'phrases', id, k:0} : {name:step, id});
}
function nextStep(L, step){ const s = stepsOf(L); enterStep(L.id, s[s.indexOf(step) + 1] || 'ex'); }
function lessonAfter(L){ const order = STAGES.filter(s => s.n > 0).flatMap(s => lessonsOf(s.n)); const i = order.indexOf(L); return order.slice(i+1).find(x => !state.done[x.id]) || nextLesson(); }

/* ---------- Startseite: ein Ziel, ein Knopf ---------- */
function renderHome(){
  const {L, step} = current();
  const steps = stepsOf(L); const si = steps.indexOf(step);
  const order = STAGES.filter(s => s.n > 0).flatMap(s => lessonsOf(s.n));
  const num = order.indexOf(L) + 1;
  const started = si > 0;
  $app.innerHTML = `
    <div class="bar"><div class="spacer"></div><div class="title"></div><button class="iconbtn gear" data-go="settings" aria-label="Einstellungen und mehr">⚙︎</button></div>
    <div class="hello" style="margin-top:4px"><h1>${greeting()}, ${esc(nm())}!</h1>
      <p class="muted">${started ? 'Schön, dass du wieder da bist. Hier geht es weiter:' : 'Deine heutige Lektion:'}</p></div>
    <div class="todaycard">
      <div class="ico">${L.icon}</div>
      <div class="small muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Lektion ${num} von ${order.length}</div>
      <h2>${esc(L.title)}</h2>
      <div class="dots">${steps.map((s,i) => `<span class="${i < si ? 'past' : i === si ? 'now' : ''}"></span>`).join('')}</div>
      <div class="muted">Schritt ${si+1} von ${steps.length}: <b>${STEP_NAMES[step]}</b></div>
    </div>
    <button class="btn huge" data-act="continue">▶︎ ${started ? 'Weitermachen' : 'Los geht’s'}</button>
    ${installBanner() ? '<div style="height:18px"></div>' + installBanner() : ''}`;
}

/* ---------- Alle Lektionen (über ⚙︎ erreichbar) ---------- */
function renderAll(){
  const next = nextLesson();
  const lessonBtn = (l, i) => {
    const n = state.done[l.id] || 0;
    const badge = n ? `<span class="badge ok">✓ ${n}×</span>` : (next && next.id===l.id ? '<span class="badge next">Als Nächstes</span>' : '<span class="badge">Neu</span>');
    return `<button class="lesson" data-act="open:${l.id}"><div class="ico">${l.icon}</div>
      <div class="txt"><b>${i+1}. ${esc(l.title)}</b><span>${esc(l.en)}</span></div>${badge}</button>`;
  };
  $app.innerHTML = bar('Alle Lektionen', 'settings') + STAGES.map(st => {
      const ls = lessonsOf(st.n); const d = ls.filter(l => state.done[l.id]).length;
      return `<div class="sectionhead"><div><h2>${st.n ? 'Stufe ' + st.n + ': ' : ''}${esc(st.title)}</h2><span class="muted small">${esc(st.level)} · ${esc(st.sub)}</span></div><span class="muted small">${d}/${ls.length}</span></div>
        ${ls.map(lessonBtn).join('')}`;
    }).join('');
}

/* ---------- Lektions-Übersicht ---------- */
function renderHub(){
  const L = byId(view.id);
  const st = STAGES.find(s => s.n === L.stage);
  const steps = [
    ['phrases', 'Neue Wendungen', 'Hören, raten, antippen – und nachsprechen'],
    ['play', 'Gespräch mitspielen', L.scene],
    ...(L.tip ? [['tip', 'Kurz erklärt', L.tip.t]] : []),
    ['ex', 'Üben', 'Fragen und Antworten zum Antippen'],
    ...(L.video ? [['video', '🎬 Video (mit Internet)', L.video.t]] : [])];
  $app.innerHTML = bar(st ? st.title : 'Lektion', 'all') + `
    <div class="hubhead" style="margin:8px 4px 22px"><div class="ico">${L.icon}</div>
      <div><h1>${esc(L.title)}</h1><div class="muted">${esc(L.en)}${st ? ' · ' + esc(st.level) : ''}</div></div></div>
    ${steps.map((s,i) => `<button class="step" data-go-to="${s[0]}"><div class="num">${i+1}</div><div><b>${s[1]}</b><span>${esc(s[2])}</span></div></button>`).join('')}
    <div style="margin-top:22px"><button class="btn" data-go-to="phrases">Lektion starten</button></div>`;
}

/* ---------- Schritt 1: Neue Wendungen – hören, raten, antippen ---------- */
function renderPhrases(){
  const L = byId(view.id); const k = view.k || 0; const p = L.phrases[k];
  const last = k === L.phrases.length - 1;
  const toDe = k % 2 === 0;                      // abwechselnd: Englisch → Deutsch / Deutsch → Englisch
  if (!view.opts) view.opts = toDe ? options(p.de, L.phrases.map(x => x.de)) : options(p.en, L.phrases.map(x => x.en));
  const answer = toDe ? p.de : p.en;
  $app.innerHTML = `<div class="bar"><button class="iconbtn" data-go="home">⌂ Start</button><div class="progress"><i style="width:${Math.round(k / L.phrases.length * 100)}%"></i></div><div class="muted small" style="min-width:64px;text-align:right">${k+1}/${L.phrases.length}</div></div>
    <div class="ask">${toDe ? 'Hör zu: Was bedeutet das?' : 'Wie sagt man das auf Englisch?'}</div>
    <div class="phrase big">
      ${toDe ? `<div class="en">${esc(N(p.en))}</div>` : `<div class="en" style="font-family:inherit">${esc(N(p.de))}</div>`}
      ${toDe ? `<div class="row"><button class="say primary" data-say="${esc(p.en)}">🔊 Nochmal</button><button class="say" data-say-slow="${esc(p.en)}">🐢 Langsam</button></div>` : ''}
    </div>
    <div class="opts" id="phOpts">${view.opts.map(o => `<button class="opt" data-ph="${esc(o)}">${esc(N(o))}</button>`).join('')}</div>
    <div id="phAfter"></div>`;
  const after = () => {
    view.answered = true;
    document.getElementById('phAfter').innerHTML = `
      <div class="phrase" style="margin-top:16px"><div class="en">${esc(N(p.en))}</div><div class="de">${esc(N(p.de))}</div>
        <div class="row"><button class="say primary" data-say="${esc(p.en)}">🔊 Anhören</button><button class="say mic" id="micBtn">🎙️ Nachsprechen</button></div>
        <div class="speakres" id="sr"></div></div>
      <div style="height:110px"></div>
      <div class="stickynext"><div class="inner"><button class="btn huge" data-act="phrasenext">${last ? 'Weiter zum Gespräch ›' : 'Weiter ›'}</button></div></div>`;
    document.getElementById('micBtn').onclick = () => speakCheck(p.en, document.getElementById('micBtn'), document.getElementById('sr'));
    speak(p.en);
  };
  document.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => {
    if (view.answered) return;
    const ok = b.dataset.ph === answer;
    if (ok){
      document.querySelectorAll('[data-ph]').forEach(o => { o.disabled = true; if (o.dataset.ph === answer) o.classList.add('right'); else o.classList.add('dim'); });
      toast(pickOne(PRAISE)); after();
    } else {
      b.classList.add('wrong'); b.disabled = true; state.miss[p.en] = (state.miss[p.en]||0) + 1; save();
      if (document.querySelectorAll('[data-ph]:not([disabled])').length <= 1){ document.querySelectorAll('[data-ph]').forEach(o => { o.disabled = true; if (o.dataset.ph === answer) o.classList.add('right'); }); after(); }
      else toast('Nicht ganz – versuch es noch einmal.');
    }
  });
  if (toDe) setTimeout(() => speak(p.en), 300);
}
let lastBlobUrl = null;
async function speakCheck(target, btn, out){
  if (Rec.active){
    btn.disabled = true; btn.textContent = '⏳ Prüfe …';
    const blob = await Rec.stop();
    $app.querySelectorAll('.say.mic').forEach(b => b.classList.remove('recording'));
    btn.disabled = false; btn.textContent = '🎙️ Nochmal';
    if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = blob ? URL.createObjectURL(blob) : null;
    let heard = Rec.live, probs = null, note = '';
    if (blob && serverReady()){
      try { const r = await transcribe(blob); heard = r.text; probs = r.words.map(w => w.p); }
      catch(e){ note = 'Server nicht erreichbar – nur Vergleich per Anhören.'; }
    }
    const mine = lastBlobUrl ? `<button class="say" data-playurl="${lastBlobUrl}">▶︎ Mich anhören</button>` : '';
    const orig = `<button class="say primary" data-say="${esc(target)}">🔊 Original</button>`;
    if (heard){
      const c = compareSpeech(target, heard, probs); const dw = displayWords(target);
      let wi = 0;
      const marked = dw.map(w => { if (!w) { wi++; return ''; } const i = wi++; const cls = c.ok[i] ? (c.unsure[i] ? 'w-unsure' : 'w-ok') : 'w-miss'; return `<span class="${cls}">${esc(w)}</span>`; }).filter(Boolean).join(' ');
      const verdict = c.score >= 90 ? 'Sehr gut verständlich! 👏' : c.score >= 65 ? 'Gut – ein paar Wörter noch einmal üben.' : 'Noch einmal versuchen – hör dir das Original an.';
      out.innerHTML = `<div class="sr-box"><div class="sr-score ${c.score>=90?'good':c.score>=65?'mid':'low'}">${c.score} %</div>
        <div><div style="font-weight:700">${verdict}</div><div class="sr-words">${marked}</div>
        <div class="muted small">Verstanden: „${esc(heard)}“</div></div></div>
        <p class="muted small" style="margin:6px 0 0">Grün = verstanden${probs ? ', gelb = etwas undeutlich' : ''}, rot = nicht verstanden.</p>
        <div class="row">${orig}${mine}</div>`;
    } else {
      out.innerHTML = `<div class="muted small" style="margin:8px 0">${note || 'Vergleiche selbst: erst das Original, dann deine Aufnahme.'}</div><div class="row">${orig}${mine}</div>`;
    }
    return;
  }
  try {
    await Rec.start();
    btn.classList.add('recording'); btn.textContent = '■ Fertig';
    out.innerHTML = '<div class="muted small" style="margin-top:8px">Sprich jetzt den Satz – dann auf „Fertig“ tippen.</div>';
  } catch(e){
    out.innerHTML = '<div class="muted small" style="margin-top:8px">Das Mikrofon ist nicht verfügbar. Bitte in den iPad-Einstellungen das Mikrofon für Safari bzw. diese App erlauben.</div>';
  }
}

/* ---------- Schritt 2: Gespräch mitspielen ---------- */
let play = null;
function myAlternatives(L, k){
  const d = L.dialog[k]; if (d.alt && d.alt.length >= 2) return d.alt.slice(0,2);
  const pool = LESSONS.filter(x => x.id !== L.id).flatMap(x => x.dialog.filter(y => y.who === 'me').map(y => y.en));
  return shuffle(pool).slice(0,2);
}
function renderPlay(){
  const L = byId(view.id);
  if (!play || play.id !== L.id) play = {id:L.id, k:0, shown:[], mistakes:0, phase:'dialog', qi:0, compOk:0};
  $app.innerHTML = bar('Gespräch mitspielen', 'home') + `
    <div class="scene"><b>Die Situation:</b> ${esc(L.scene)}</div>
    <div class="bubbles" id="bubbles"></div><div id="playArea" style="margin-top:18px"></div>`;
  play.shown.forEach(k => addBubble(L, k, false));
  stepPlay(L);
}
function addBubble(L, k, animate=true){
  const d = L.dialog[k];
  const el = document.createElement('button');
  el.className = 'bub ' + (d.who==='me' ? 'me' : 'other') + (animate ? ' pop' : '');
  el.innerHTML = `<div class="who">${d.who==='me' ? 'Du' : esc(d.who)}</div><div class="en">${esc(N(d.en))}</div><div class="de" ${state.showDe ? '' : 'hidden'}>${esc(N(d.de))}</div>`;
  el.onclick = () => { const de = el.querySelector('.de'); if (de.hidden) de.hidden = false; speak(d.en, {other: d.who !== 'me'}); };
  document.getElementById('bubbles').appendChild(el);
  return el;
}
async function stepPlay(L){
  const area = document.getElementById('playArea'); if (!area) return;
  const tok = ++speakToken;
  if (play.phase === 'dialog'){
    if (play.k >= L.dialog.length){ play.phase = (L.comp && L.comp.length) ? 'comp' : 'end'; return stepPlay(L); }
    const d = L.dialog[play.k];
    if (d.who !== 'me'){
      area.innerHTML = '<div class="muted small" style="text-align:center">🔊 hör zu …</div>';
      const el = addBubble(L, play.k); el.scrollIntoView({block:'center', behavior:'smooth'});
      play.shown.push(play.k); play.k++;
      el.classList.add('playing'); await speak(d.en, {other:true}); el.classList.remove('playing');
      if (tok !== speakToken) return;
      await sleep(250); return stepPlay(L);
    }
    const opts = shuffle([d.en, ...myAlternatives(L, play.k)]);
    area.innerHTML = `<div class="ask" style="margin-top:0">Was sagst du? Tippe die passende Antwort an.</div>
      <div class="opts">${opts.map(o => `<button class="opt" data-line="${esc(o)}">${esc(N(o))}</button>`).join('')}</div>
      <div class="row" style="margin-top:12px"><button class="say" data-act="playrepeat">🔁 Letzten Satz nochmal</button><button class="say" data-act="playhelp">💡 Hilfe</button></div>`;
    area.scrollIntoView({block:'end', behavior:'smooth'});
    area.querySelectorAll('[data-line]').forEach(b => b.onclick = async () => {
      if (b.dataset.line === d.en){
        area.querySelectorAll('.opt').forEach(o => o.disabled = true); b.classList.add('right');
        await sleep(350); area.innerHTML = '';
        const el = addBubble(L, play.k); play.shown.push(play.k); play.k++;
        el.classList.add('playing'); await speak(d.en); el.classList.remove('playing');
        if (tok === speakToken) stepPlay(L);
      } else {
        play.mistakes++; b.classList.add('wrong'); b.disabled = true;
        toast(pickOne(['Passt hier nicht ganz – schau noch mal.','Fast! Lies noch einmal, was gerade gesagt wurde.','Nicht ganz – versuch eine andere.']));
      }
    });
    return;
  }
  if (play.phase === 'comp'){
    const q = L.comp[play.qi];
    if (!q){ play.phase = 'end'; return stepPlay(L); }
    q.order = q.order || shuffle(q.o.map((_,i) => i));
    area.innerHTML = `<div class="card" style="margin-bottom:12px"><b>Hast du alles verstanden?</b> <span class="muted small">Frage ${play.qi+1} von ${L.comp.length}</span></div>
      <div class="prompt"><div class="en">${esc(q.q)}</div></div>
      <div class="opts">${q.order.map(i => `<button class="opt" data-ci="${i}">${esc(q.o[i])}</button>`).join('')}</div>`;
    area.scrollIntoView({block:'start', behavior:'smooth'});
    area.querySelectorAll('[data-ci]').forEach(b => b.onclick = () => {
      const ok = +b.dataset.ci === q.a; if (ok && !q.tried) play.compOk++;
      area.querySelectorAll('.opt').forEach(o => { o.disabled = true; if (+o.dataset.ci === q.a) o.classList.add('right'); else if (o !== b) o.classList.add('dim'); });
      if (!ok) b.classList.add('wrong');
      showFb(ok, ok ? pickOne(PRAISE) : 'Nicht ganz – die richtige Antwort ist markiert.', '', '', () => { play.qi++; stepPlay(L); });
    });
    return;
  }
  // Ende
  area.innerHTML = `<div class="card stack" style="text-align:center"><div style="font-size:2.4rem">🎭</div>
    <h2>Gespräch geschafft!</h2><p class="muted" style="margin:0">${play.mistakes === 0 ? 'Alle Antworten auf Anhieb richtig – wunderbar!' : 'Gut gemacht – Übung macht den Meister.'}${L.comp ? ` Verständnis: ${play.compOk} von ${L.comp.length}.` : ''}</p></div>
    <div class="stack" style="margin-top:14px">
      <button class="btn huge" data-act="nextstep:play">Weiter: ${L.tip ? 'Kurz erklärt' : 'Üben'} ›</button>
      <button class="btn ghost" data-act="playall">▶︎ Ganzes Gespräch noch einmal anhören</button></div>`;
}
async function playAll(L){
  stopSpeech(); const tok = speakToken; const bubs = [...document.querySelectorAll('#bubbles .bub')];
  for (let k=0; k<L.dialog.length; k++){
    if (tok !== speakToken) return; const el = bubs[k]; if (el){ el.classList.add('playing'); el.scrollIntoView({block:'center', behavior:'smooth'}); }
    await speak(L.dialog[k].en, {other: L.dialog[k].who !== 'me'}); if (el) el.classList.remove('playing'); await sleep(300);
  }
}

/* ---------- Schritt 3: Kurz erklärt ---------- */
function renderTip(){
  const L = byId(view.id); const t = L.tip;
  $app.innerHTML = bar('Kurz erklärt', 'home') + `
    <div class="tipcard"><div class="tiphead">💡 ${esc(t.t)}</div><p>${esc(t.d)}</p></div>
    ${t.ex.map(e => `<div class="phrase"><div class="en">${esc(e[0])}</div><div class="de">${esc(e[1])}</div>
      <div class="row"><button class="say primary" data-say="${esc(e[0])}">🔊 Anhören</button></div></div>`).join('')}
    <div style="margin-top:22px"><button class="btn huge" data-act="nextstep:tip">Weiter: Üben ›</button></div>`;
}

/* ---------- Video (nur mit Internet) ---------- */
function renderVideo(){
  const L = byId(view.id); const v = L.video;
  const online = navigator.onLine;
  $app.innerHTML = bar('Video', 'hub:'+L.id) + `
    <div class="card stack"><div><b>${esc(v.t)}</b><div class="muted small">${esc(v.src)} · Englisch mit Untertiteln</div></div>
    ${online ? `<div class="videobox"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?rel=0&playsinline=1&cc_load_policy=1&cc_lang_pref=en&hl=en&modestbranding=1" title="${esc(v.t)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>
      <p class="muted small" style="margin:0">Tipp: Mit dem Zahnrad im Video kannst du die Geschwindigkeit verringern (z. B. 0,75). Falls das Video hier nicht startet:</p>
      <a class="btn secondary" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">Auf YouTube öffnen</a>`
    : '<p style="margin:0">📶 Für Videos brauchst du Internet. Alles andere in der Lektion funktioniert auch ohne.</p>'}
    </div>
    <div style="margin-top:22px"><button class="btn" data-go="hub:${L.id}">Zurück zur Lektion</button></div>`;
}

/* ============================================================
   KOPF-FIT: Gedächtnis- und Konzentrationsspiele mit Englisch
   ============================================================ */
const GAMES = ['memory','list','story','odd','sort'];
const GAME_INFO = {
  memory:{t:'Memory', d:'Finde die Paare: Bild und englisches Wort.'},
  list:{t:'Einkaufsliste merken', d:'Hör gut zu und merk dir die Reihenfolge.'},
  story:{t:'Geschichte merken', d:'Hör gut zu – am Ende der Lektion kommen zwei Fragen dazu.'},
  odd:{t:'Was passt nicht?', d:'Finde das Wort, das nicht zu den anderen passt.'},
  sort:{t:'Sortieren', d:'Ordne jedes Wort der richtigen Gruppe zu.'}
};
function brainState(){ state.brain = Object.assign({pairs:4, list:3, storyN:0}, state.brain || {}); return state.brain; }
function gameFor(L){ const order = STAGES.flatMap(s => lessonsOf(s.n)); return GAMES[Math.max(0, order.indexOf(L)) % GAMES.length]; }
const catDe = c => BRAIN.cats[c].de;
const tile = w => `<span class="pic">${w.pic}</span><span class="word">${esc(w.en)}</span>`;
function oddRound(){
  const cats = shuffle(Object.keys(BRAIN.cats)); const main = cats[0], other = cats[1];
  const three = shuffle(BRAIN.words.filter(w => w.cat === main)).slice(0,3);
  const odd = pickOne(BRAIN.words.filter(w => w.cat === other));
  return {main, other, odd, opts: shuffle([...three, odd])};
}

function renderWarmup(){
  const L = byId(view.id); const g = gameFor(L); brainState();
  $app.innerHTML = `<div class="bar"><button class="iconbtn" data-go="home">⌂ Start</button><div class="title">🧠 Kopf-fit</div><div class="spacer"></div></div>
    <div class="hello" style="padding-top:0"><h2>${GAME_INFO[g].t}</h2><p class="muted" style="margin:.3rem 0 14px">${GAME_INFO[g].d}</p></div>
    <div id="game"></div><div id="gameEnd"></div>`;
  const el = document.getElementById('game');
  const finish = (msg) => {
    save();
    document.getElementById('gameEnd').innerHTML = `<div class="card" style="text-align:center;margin-top:16px"><div style="font-size:2.2rem">🧠✨</div><p style="margin:.4rem 0 0;font-size:1.1rem">${msg}</p></div>
      <div style="height:110px"></div><div class="stickynext"><div class="inner"><button class="btn huge" data-act="nextstep:warmup">Weiter zur Lektion ›</button></div></div>`;
    document.getElementById('gameEnd').scrollIntoView({block:'end', behavior:'smooth'});
  };
  ({memory:gameMemory, list:gameList, story:gameStory, odd:gameOdd, sort:gameSort})[g](el, finish, L);
}

function gameMemory(el, finish){
  const B = brainState(); const n = B.pairs;
  const ws = shuffle(BRAIN.words.slice()).slice(0, n);
  const cards = shuffle(ws.flatMap((w,i) => [{i, kind:'pic', w}, {i, kind:'word', w}]));
  let open = [], found = 0, moves = 0, lock = false;
  el.innerHTML = `<div class="memgrid">${cards.map((c,k) => `<button class="mcard" data-k="${k}"><span class="back">?</span><span class="face">${c.kind==='pic' ? `<span class="pic">${c.w.pic}</span>` : `<span class="word">${esc(c.w.en)}</span>`}</span></button>`).join('')}</div>
    <div class="muted small" id="memInfo" style="text-align:center;margin-top:12px">Tippe zwei Karten an.</div>`;
  el.querySelectorAll('.mcard').forEach(btn => btn.onclick = () => {
    const k = +btn.dataset.k, c = cards[k];
    if (lock || btn.classList.contains('open') || btn.classList.contains('found')) return;
    btn.classList.add('open'); if (c.kind === 'word') speak(c.w.en);
    open.push(k);
    if (open.length < 2) return;
    moves++;
    const [a, b] = open.map(x => cards[x]);
    if (a.i === b.i){
      open.forEach(x => el.querySelector(`[data-k="${x}"]`).classList.add('found')); open = []; found++;
      document.getElementById('memInfo').textContent = `${a.w.pic} ${a.w.en} = ${a.w.de}`; speak(a.w.en);
      if (found === n){
        const good = moves <= n + 2;
        if (good) B.pairs = Math.min(8, n + 1); else if (moves > n * 2.5) B.pairs = Math.max(3, n - 1);
        finish(`Alle ${n} Paare in ${moves} Zügen gefunden!${good ? ' Hervorragendes Gedächtnis – beim nächsten Mal wird es etwas kniffliger.' : ''}`);
      }
    } else {
      lock = true;
      setTimeout(() => { open.forEach(x => el.querySelector(`[data-k="${x}"]`).classList.remove('open')); open = []; lock = false; }, 1300);
    }
  });
}

function gameList(el, finish){
  const B = brainState(); const n = B.list;
  const pool = BRAIN.words.filter(w => ['food','home','clothes'].includes(w.cat));
  const items = shuffle(pool.slice()).slice(0, n);
  const extras = shuffle(pool.filter(w => !items.includes(w))).slice(0, Math.min(4, 9 - n));
  let played = false;
  const listen = async () => {
    const tok = ++speakToken;
    el.querySelector('#listDots').innerHTML = items.map(() => '<span></span>').join('');
    const dots = [...el.querySelectorAll('#listDots span')];
    for (let i = 0; i < items.length; i++){
      if (tok !== speakToken) return;
      dots[i].classList.add('on'); await speak(items[i].en); await sleep(650);
    }
    played = true; el.querySelector('#goPick').disabled = false;
  };
  el.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:3rem">🛒</div>
      <p style="margin:.4rem 0 12px">Deine Einkaufsliste hat <b>${n} Dinge</b>. Hör gut zu!</p>
      <div class="listdots" id="listDots"></div>
      <div class="row" style="justify-content:center;margin-top:14px"><button class="say primary" id="replayList" style="flex:0 0 auto;padding:0 20px">🔊 Nochmal anhören</button></div></div>
    <div style="margin-top:16px"><button class="btn" id="goPick" disabled>Ich habe sie mir gemerkt ›</button></div>`;
  el.querySelector('#replayList').onclick = () => listen();
  el.querySelector('#goPick').onclick = () => {
    stopSpeech();
    const tiles = shuffle([...items, ...extras]); const picked = [];
    el.innerHTML = `<p style="margin:0 4px 12px">Tippe die Dinge <b>in der richtigen Reihenfolge</b> an:</p>
      <div class="tilegrid">${tiles.map((w,k) => `<button class="tile" data-t="${k}">${tile(w)}<span class="num"></span></button>`).join('')}</div>
      <div id="listRes"></div>`;
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => {
      if (picked.length >= n || b.classList.contains('picked')) return;
      const w = tiles[+b.dataset.t]; picked.push(w); b.classList.add('picked'); b.querySelector('.num').textContent = picked.length; speak(w.en);
      if (picked.length === n){
        const right = picked.filter((w,i) => w === items[i]).length;
        if (right === n) B.list = Math.min(7, n + 1); else if (right < n / 2) B.list = Math.max(3, n - 1);
        el.querySelectorAll('.tile').forEach(t => { const w = tiles[+t.dataset.t]; const pos = picked.indexOf(w); if (pos >= 0) t.classList.add(items[pos] === w ? 'right' : 'wrong'); });
        document.getElementById('listRes').innerHTML = `<div class="card" style="margin-top:14px"><b>Richtig wäre gewesen:</b><div class="seq">${items.map((w,i) => `<span>${i+1}. ${w.pic} ${esc(w.en)}</span>`).join('')}</div></div>`;
        finish(right === n ? `Perfekt – alle ${n} Dinge in der richtigen Reihenfolge! 👏` : `${right} von ${n} an der richtigen Stelle. Gut gemacht!`);
      }
    });
  };
  setTimeout(listen, 500);
}

function gameStory(el, finish, L){
  const B = brainState(); const st = BRAIN.stories[B.storyN % BRAIN.stories.length];
  state.story = {lesson: L.id, id: st.id}; B.storyN++; save();
  el.innerHTML = `<div class="card"><div class="muted small" style="font-weight:700">📖 ${esc(st.title)}</div>
      <div class="story" id="storyText">${st.s.map((x,i) => `<span data-s="${i}">${esc(x)}</span>`).join(' ')}</div>
      <div class="row" style="margin-top:14px"><button class="say primary" id="storyPlay">🔊 Nochmal anhören</button><button class="say" id="storySlow">🐢 Langsam</button></div></div>`;
  const play = async (slow) => {
    stopSpeech(); const tok = speakToken; const spans = [...el.querySelectorAll('[data-s]')];
    for (let i = 0; i < st.s.length; i++){
      if (tok !== speakToken) return;
      spans.forEach((s,j) => s.classList.toggle('reading', j === i));
      await speak(st.s[i], {other: true, slow}); await sleep(300);
    }
    spans.forEach(s => s.classList.remove('reading'));
  };
  el.querySelector('#storyPlay').onclick = () => play(false);
  el.querySelector('#storySlow').onclick = () => play(true);
  setTimeout(() => play(false).then(() => finish('Merk dir die Geschichte gut – am Ende der Lektion fragen wir nach! 😉')), 500);
}

function gameOdd(el, finish){
  const rounds = [oddRound(), oddRound(), oddRound()]; let r = 0, right = 0;
  const show = () => {
    const R = rounds[r];
    el.innerHTML = `<div class="muted small" style="margin:0 4px 10px">Runde ${r+1} von ${rounds.length}</div>
      <div class="tilegrid two">${R.opts.map((w,k) => `<button class="tile" data-o="${k}">${tile(w)}</button>`).join('')}</div><div id="oddRes"></div>`;
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => {
      if (el.querySelector('.tile.right')) return;
      const w = R.opts[+b.dataset.o]; const ok = w === R.odd;
      if (ok && !b.dataset.tried) right++;
      if (!ok){ b.classList.add('wrong'); b.dataset.tried = 1; speak(w.en); toast(`${w.pic} ${w.en} gehört zu „${catDe(w.cat)}“ – versuch ein anderes.`); el.querySelectorAll('.tile').forEach(t => t.dataset.tried = 1); return; }
      b.classList.add('right'); speak(w.en);
      document.getElementById('oddRes').innerHTML = `<div class="card" style="margin-top:14px">✓ <b>${esc(w.en)}</b> (${esc(w.de)}) gehört zu „${catDe(R.other)}“ – die anderen sind „${catDe(R.main)}“.</div>
        ${r < rounds.length - 1 ? '<div style="margin-top:14px"><button class="btn" id="oddNext">Nächste Runde ›</button></div>' : ''}`;
      if (r < rounds.length - 1) document.getElementById('oddNext').onclick = () => { r++; show(); };
      else finish(`${right} von ${rounds.length} auf Anhieb gefunden!`);
    });
  };
  show();
}

function gameSort(el, finish){
  const cats = shuffle(Object.keys(BRAIN.cats)).slice(0,2);
  const ws = shuffle(cats.flatMap(c => shuffle(BRAIN.words.filter(w => w.cat === c)).slice(0,4)));
  let i = 0, right = 0;
  const show = () => {
    const w = ws[i];
    el.innerHTML = `<div class="muted small" style="margin:0 4px 10px">Wort ${i+1} von ${ws.length}</div>
      <div class="card" style="text-align:center"><div style="font-size:4rem;line-height:1.2">${w.pic}</div><div class="phrase" style="box-shadow:none;padding:4px 0 0"><div class="en">${esc(w.en)}</div></div>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="say primary" data-say="${esc(w.en)}" style="flex:0 0 auto;padding:0 20px">🔊</button></div></div>
      <div class="two" style="margin-top:16px">${cats.map(c => `<button class="btn secondary sortbtn" data-c="${c}">${esc(BRAIN.cats[c].de)}<br><span class="muted small">${esc(BRAIN.cats[c].en)}</span></button>`).join('')}</div>`;
    speak(w.en);
    el.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
      const ok = b.dataset.c === w.cat; if (ok) right++;
      b.classList.add(ok ? 'right' : 'wrong'); el.querySelectorAll('[data-c]').forEach(x => x.disabled = true);
      toast(ok ? `${pickOne(PRAISE)} ${w.en} = ${w.de}` : `${w.en} (${w.de}) gehört zu „${catDe(w.cat)}“.`);
      await sleep(1100); i++;
      if (i < ws.length) show(); else { el.innerHTML = ''; finish(`${right} von ${ws.length} richtig sortiert!`); }
    });
  };
  show();
}

/* Kleine Denk-Aufgaben mitten im Üben */
function mkOdd(){
  const R = oddRound(); const lab = w => w.pic + ' ' + w.en;
  return {type:'odd', key:'odd-' + R.odd.en, en:R.odd.en, de:`„${R.odd.en}“ (${R.odd.de}) gehört zu „${catDe(R.other)}“ – die anderen sind „${catDe(R.main)}“.`,
    answer: lab(R.odd), options: R.opts.map(lab)};
}
function storyQuestions(L){
  if (!state.story || state.story.lesson !== L.id) return [];
  const st = BRAIN.stories.find(s => s.id === state.story.id); if (!st) return [];
  return st.q.map((q,i) => ({type:'storyq', key:'story-' + st.id + i, title:st.title, q:q.q, en:q.o[q.a], answer:q.o[q.a], options:shuffle(q.o.slice())}));
}

/* ============================================================
   ÜBUNGEN
   ============================================================ */
const words = s => N(s).trim().split(/\s+/);
function options(correct, pool, n=2){ const others = shuffle([...new Set(pool)].filter(x => x !== correct)).slice(0,n); return shuffle([correct, ...others]); }
const mk = {
  meaning:(p,pool)=>({type:'meaning', key:p.en, en:p.en, de:p.de, answer:p.de, options:options(p.de, pool.map(x=>x.de))}),
  listen:(p,pool)=>({type:'listen', key:p.en, en:p.en, de:p.de, answer:p.en, options:options(p.en, pool.map(x=>x.en))}),
  deen:(p,pool)=>({type:'deen', key:p.en, en:p.en, de:p.de, answer:p.en, options:options(p.en, pool.map(x=>x.en))}),
  order:(p)=>({type:'order', key:p.en, en:p.en, de:p.de}),
  recall:(p)=>({type:'recall', key:p.en, en:p.en, de:p.de}),
  gap:(g)=>({type:'gap', key:g.en, en:g.en, full:g.en.replace('___', g.answer), de:g.de, answer:g.answer, options:shuffle([g.answer, ...g.wrong])}),
  reply:(r)=>({type:'reply', key:r.q, q:r.q, qde:r.qde, en:r.a, answer:r.a, options:shuffle([r.a, ...r.wrong])}),
  polite:(p)=>({type:'polite', key:p.ask, ask:p.ask, en:p.o[p.a], answer:p.o[p.a], options:shuffle(p.o.slice())})
};
const orderable = p => { const n = words(p.en).length; return n>=4 && n<=9; };
function buildLesson(L){
  const ph = shuffle(L.phrases.slice()); const P = L.phrases;
  const ord = shuffle(P.filter(orderable))[0] || ph[0];
  const ex = [mk.meaning(ph[0],P), mk.listen(ph[1],P)];
  L.gaps.forEach((g,i) => { ex.push(mk.gap(g)); if (L.replies[i]) ex.push(mk.reply(L.replies[i])); });
  L.replies.slice(L.gaps.length).forEach(r => ex.push(mk.reply(r)));
  ex.push(mk.order(ord), mk.listen(ph[2],P), mk.deen(ph[3],P), mk.meaning(ph[4],P));
  (L.polite || []).forEach(p => ex.push(mk.polite(p)));
  ex.push(mk.recall(ph[5]));
  ex.splice(Math.floor(ex.length / 2), 0, mkOdd());
  return ex.concat(storyQuestions(L));
}
function buildReview(){
  const ls = LESSONS.filter(l => state.done[l.id]);
  const pool = ls.flatMap(l => l.phrases);
  const weighted = pool.flatMap(p => Array(1 + Math.min(4, (state.miss[p.en]||0)*2)).fill(p));
  const picked = []; const seen = new Set();
  for (const p of shuffle(weighted)){ if (!seen.has(p.en)){ seen.add(p.en); picked.push(p); } if (picked.length>=7) break; }
  const types = ['recall','meaning','listen','deen','order','recall','listen'];
  const ex = picked.map((p,i) => { const t = types[i % types.length]; return t==='order' && !orderable(p) ? mk.recall(p) : (['meaning','listen','deen'].includes(t) ? mk[t](p,pool) : mk[t](p)); });
  shuffle(ls.flatMap(l => l.replies)).slice(0,2).forEach((r,i) => ex.splice(2+i*3, 0, mk.reply(r)));
  const g = shuffle(ls.flatMap(l => l.gaps))[0]; if (g) ex.splice(5, 0, mk.gap(g));
  return ex;
}
let run = null;
function startLesson(id){ const L = byId(id); const q = buildLesson(L); run = {mode:'lesson', id, queue:q, i:0, firstTry:0, total:q.length, retried:new Set()}; go({name:'ex', id}); }
function startReview(){
  if (!LESSONS.some(l => state.done[l.id])){ toast('Mach zuerst eine Lektion – dann gibt es hier etwas zu wiederholen.'); return; }
  const q = buildReview(); run = {mode:'review', queue:q, i:0, firstTry:0, total:q.length, retried:new Set()}; go({name:'ex'});
}
const ASK = { odd:'🧠 Kopf-fit: Was passt nicht zu den anderen?', storyq:'🧠 Erinnerst du dich an die Geschichte vom Anfang?', meaning:'Was bedeutet dieser Satz?', listen:'Hör zu. Welchen Satz hörst du?', deen:'Wie sagt man das auf Englisch?',
  order:'Bring die Wörter in die richtige Reihenfolge.', gap:'Welches Wort fehlt?', reply:'Was antwortest du?', recall:'Kannst du es auf Englisch sagen? Sprich es laut aus.' };

function renderEx(){
  if (!run) return go({name:'home'});
  const e = run.queue[run.i];
  const pct = Math.round(run.i / run.queue.length * 100);
  const back = 'home';
  let body = '';
  const optsHtml = () => `<div class="opts">${e.options.map(o => `<button class="opt" data-val="${esc(o)}">${esc(N(o))}</button>`).join('')}</div>`;
  if (e.type==='meaning') body = `<div class="prompt"><div class="en">${esc(N(e.en))}</div><div class="row"><button class="say primary" data-say="${esc(e.en)}">🔊 Anhören</button><button class="say" data-say-slow="${esc(e.en)}">🐢 Langsam</button></div></div>` + optsHtml();
  else if (e.type==='listen') body = `<div class="bigplay"><button class="circle" data-say="${esc(e.en)}" aria-label="Anhören">🔊</button><button class="say" style="flex:none;padding:0 22px" data-say-slow="${esc(e.en)}">🐢 Langsam anhören</button></div><div style="height:12px"></div>` + optsHtml();
  else if (e.type==='deen') body = `<div class="prompt"><div class="en">${esc(N(e.de))}</div></div>` + optsHtml();
  else if (e.type==='gap') body = `<div class="prompt"><div class="en">${esc(N(e.en)).replace('___','<span class="gapword">?</span>')}</div><div class="de">${esc(N(e.de))}</div></div>` + optsHtml();
  else if (e.type==='reply') body = `<div class="prompt"><div class="muted small" style="font-weight:700">Jemand sagt zu dir:</div><div class="en">„${esc(N(e.q))}“</div><div class="de" hidden id="qde">${esc(N(e.qde))}</div><div class="row"><button class="say primary" data-say="${esc(e.q)}" data-other="1">🔊 Anhören</button><button class="say" data-act="showqde">🇩🇪 Übersetzung</button></div></div>` + optsHtml();
  else if (e.type==='odd') body = optsHtml();
  else if (e.type==='storyq') body = `<div class="prompt"><div class="muted small" style="font-weight:700">📖 ${esc(e.title)}</div><div class="en">${esc(e.q)}</div></div>` + optsHtml();
  else if (e.type==='polite') body = `<div class="prompt"><div class="en" style="font-family:inherit;font-size:1.1rem">${esc(e.ask)}</div></div>` + optsHtml();
  else if (e.type==='order'){
    if (!e.bank){ const w = words(e.en); let s; do { s = shuffle(w.map((t,k)=>({t,k}))); } while (w.length>1 && s.every((x,k)=>x.k===k)); e.bank = s; }
    e.placed = [];
    body = `<div class="prompt" style="padding:18px 22px"><div class="de" style="margin:0;font-size:1.1rem;color:var(--ink)">${esc(N(e.de))}</div></div>
      <div class="answerbox" id="abox"></div><div class="bank" id="bank">${e.bank.map((x,j)=>`<button class="chip" data-chip="${j}">${esc(x.t)}</button>`).join('')}</div>
      <div class="two"><button class="btn secondary" id="clearBtn">Neu anfangen</button><button class="btn" id="checkBtn" disabled>Prüfen</button></div>`;
  } else if (e.type==='recall') body = `<div class="prompt"><div class="en">${esc(N(e.de))}</div></div><div id="recallArea"><div class="two"><button class="btn secondary" id="recMic">🎙️ Sprechen</button><button class="btn" id="revealBtn">Lösung zeigen</button></div><div id="recRes"></div></div>`;
  $app.innerHTML = `<div class="bar"><button class="iconbtn" data-go="${back}" aria-label="Beenden">✕</button><div class="progress"><i style="width:${pct}%"></i></div></div>
    <div class="ask">${e.type==='polite' ? 'Welcher Satz passt?' : ASK[e.type]}</div>${body}`;
  if (e.type==='listen') setTimeout(()=>speak(e.en), 250);
  if (e.type==='order') bindOrder(e);
  if (e.type==='recall'){
    const reveal = () => {
      speak(e.en);
      document.getElementById('recallArea').innerHTML = `<div class="prompt"><div class="en">${esc(N(e.en))}</div><div class="row"><button class="say primary" data-say="${esc(e.en)}">🔊 Nochmal</button><button class="say" data-say-slow="${esc(e.en)}">🐢 Langsam</button></div></div>
        <div id="recRes2"></div><p class="muted" style="margin:0 4px 12px">Hattest du es gewusst?</p>
        <div class="two"><button class="btn secondary" id="noBtn">Noch nicht ganz</button><button class="btn" id="yesBtn">Ja, gewusst! 👍</button></div>`;
      document.getElementById('yesBtn').onclick = () => answer(true, e, {silent:true});
      document.getElementById('noBtn').onclick = () => answer(false, e, {silent:true});
    };
    document.getElementById('revealBtn').onclick = reveal;
    const mic = document.getElementById('recMic');
    mic.onclick = async () => { await speakCheck(e.en, mic, document.getElementById('recRes')); if (!Rec.active && document.getElementById('recRes').innerHTML.includes('sr-box')) { document.getElementById('revealBtn').textContent = 'Weiter ›'; } };
  }
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (e.answered) return;
    const ok = b.dataset.val === e.answer;
    $app.querySelectorAll('.opt').forEach(o => { o.disabled = true; if (o.dataset.val===e.answer) o.classList.add('right'); else if (o!==b) o.classList.add('dim'); });
    if (!ok) b.classList.add('wrong');
    answer(ok, e);
  });
}
function bindOrder(e){
  const abox = document.getElementById('abox'), bank = document.getElementById('bank'), check = document.getElementById('checkBtn');
  const draw = () => {
    abox.innerHTML = e.placed.map((j,pos) => `<button class="chip placed" data-pos="${pos}">${esc(e.bank[j].t)}</button>`).join('') || '<span class="muted small" style="padding:14px 8px">Tippe die Wörter unten der Reihe nach an …</span>';
    bank.querySelectorAll('.chip').forEach(c => c.classList.toggle('used', e.placed.includes(+c.dataset.chip)));
    check.disabled = e.placed.length !== e.bank.length;
    abox.querySelectorAll('.chip').forEach(c => c.onclick = () => { if (e.answered) return; e.placed.splice(+c.dataset.pos,1); draw(); });
  };
  bank.querySelectorAll('.chip').forEach(c => c.onclick = () => { if (e.answered) return; const j=+c.dataset.chip; if (!e.placed.includes(j)){ e.placed.push(j); draw(); } });
  document.getElementById('clearBtn').onclick = () => { if (e.answered) return; e.placed = []; draw(); };
  check.onclick = () => {
    if (e.answered) return;
    const ok = e.placed.map(j => e.bank[j].t).join(' ') === words(e.en).join(' ');
    abox.style.borderColor = ok ? 'var(--accent)' : 'var(--warm)'; abox.style.borderStyle = 'solid';
    answer(ok, e);
  };
  draw();
}
const PRAISE = ['Richtig! 👏','Sehr gut!','Genau so!','Prima!','Wunderbar!','Stimmt!'];
const COMFORT = ['Fast! So heißt es richtig:','Kein Problem – so ist es richtig:','Nicht schlimm. Richtig ist:'];
function showFb(ok, head, solEn, solDe, onNext, extra=''){
  const fb = document.getElementById('fb');
  fb.className = 'feedback show ' + (ok ? 'ok' : 'no');
  document.getElementById('fbInner').innerHTML = `<div class="head">${head}</div>
    ${solEn ? `<div class="sol">${esc(N(solEn))}${solDe ? `<div class="de">${esc(N(solDe))}</div>` : ''}</div>` : '<div style="height:10px"></div>'}${extra}
    <div class="row">${solEn ? `<button class="say" data-say="${esc(solEn)}">🔊</button>` : ''}<button class="btn" id="nextBtn">Weiter ›</button></div>`;
  document.getElementById('nextBtn').onclick = () => { hideFb(); onNext(); };
}
function answer(ok, e, o={}){
  e.answered = true;
  if (ok){ if (!run.retried.has(e.key)) run.firstTry++; state.miss[e.key] = Math.max(0,(state.miss[e.key]||0)-1); }
  else {
    state.miss[e.key] = (state.miss[e.key]||0)+1;
    if (!run.retried.has(e.key)){ run.retried.add(e.key); const copy = {...e, answered:false, bank:null}; if (copy.options) copy.options = shuffle(copy.options.slice()); run.queue.push(copy); }
  }
  save();
  const solEn = e.type==='gap' ? e.full : e.en;
  const solDe = (e.type==='reply' || e.type==='polite' || e.type==='storyq') ? '' : e.de;
  if (!o.silent && e.type !== 'storyq') speak(solEn);
  showFb(ok, ok ? pickOne(PRAISE) : (o.silent ? 'Macht nichts – das kommt gleich noch einmal.' : pickOne(COMFORT)),
    (!ok && !o.silent) || ok ? solEn : '', solDe, next,
    !ok && !o.silent ? '<p class="muted small" style="margin:-6px 0 12px">Diese Aufgabe kommt am Ende noch einmal.</p>' : '');
}
function hideFb(){ const fb=document.getElementById('fb'); if (fb) fb.className='feedback'; }
function next(){
  hideFb(); stopSpeech(); run.i++;
  if (run.i >= run.queue.length){ if (run.mode==='lesson'){ state.done[run.id] = (state.done[run.id]||0)+1; const nx = lessonAfter(byId(run.id)); if (nx) setCur(nx.id, 'warmup'); else state.cur = null; save(); } return go({name:'done'}); }
  renderEx(); window.scrollTo(0,0);
}

/* ---------- Geschafft ---------- */
function renderDone(){
  const L = run.mode==='lesson' ? byId(run.id) : null;
  const nx = current().L;
  const ratio = run.firstTry / run.total;
  const msg = ratio >= .9 ? 'Ausgezeichnet – fast alles auf Anhieb richtig!' : ratio >= .6 ? 'Sehr ordentlich! Mit jeder Wiederholung wird es leichter.' : 'Gut gemacht, dass du drangeblieben bist. Morgen sitzt es schon besser.';
  $app.innerHTML = `<div class="done stack"><div class="emoji">${ratio>=.9 ? '🌟' : '🎉'}</div>
    <h1>${L ? 'Lektion geschafft!' : 'Kopftraining geschafft!'}</h1>
    <p style="font-size:1.1rem">${run.firstTry} von ${run.total} Aufgaben auf Anhieb richtig.</p><p class="muted">${msg}</p>
    <div class="stack" style="margin-top:26px;text-align:left">
      <button class="btn huge" data-act="continue">Nächste Lektion: ${esc(nx.title)} ›</button>
      <button class="btn ghost" data-go="home">Für heute Schluss</button></div></div>`;
}

/* ============================================================
   KI-GESPRÄCHSPARTNER
   ============================================================ */
const SCEN = [
  {k:'free', icon:'💬', t:'Freies Gespräch', d:'Über Alltag, Familie, Hobbys und Reisen', first:"Hello! It's lovely to meet you. How are you today?", v:'isabella'},
  {k:'cafe', icon:'☕', t:'Im Café', d:'Bestellen und plaudern in Bath', first:"Good morning! Welcome to the Pump Room Café. What can I get you?", v:'george'},
  {k:'hotel', icon:'🏨', t:'An der Hotelrezeption', d:'Ein Hotel in Edinburgh', first:"Good evening, and welcome to the Castle View Hotel. How can I help you?", v:'isabella'},
  {k:'doctor', icon:'🩺', t:'Beim Arzt', d:'Beschwerden schildern', first:"Good morning. Please, have a seat. What brings you here today?", v:'george'},
  {k:'neighbour', icon:'🌊', t:'Nachbar im Urlaub', d:'Plaudern in Cornwall', first:"Hello there! Lovely weather today, isn't it? Are you here on holiday?", v:'george'},
  {k:'directions', icon:'🗺️', t:'Nach dem Weg fragen', d:'Unterwegs in York', first:"Hello! You look a little lost. Can I help you find something?", v:'isabella'}
];
let chat = null;
function renderChat(){
  if (!state.server || !state.code){
    $app.innerHTML = bar('Mit der KI sprechen') + `<div class="card stack"><div style="font-size:2.4rem">🗣️</div>
      <h2>Noch nicht eingerichtet</h2><p style="margin:0">Hier kannst du bald frei mit einem englischen Gesprächspartner sprechen. Er antwortet dir und verbessert freundlich deine Fehler.</p>
      <p class="muted" style="margin:0">Claus-Peter richtet das ein: Server-Adresse und Zugangscode unter <b>Einstellungen › KI-Gesprächspartner</b> eintragen.</p>
      <button class="btn secondary" data-go="settings">Zu den Einstellungen</button></div>`;
    return;
  }
  if (!chat){
    $app.innerHTML = bar('Mit der KI sprechen') + `<p class="muted" style="margin:0 4px 14px">Wähle eine Situation. Du sprichst – die KI antwortet und gibt dir Tipps.</p>
      ${SCEN.map(s => `<button class="lesson" data-scen="${s.k}"><div class="ico">${s.icon}</div><div class="txt"><b>${esc(s.t)}</b><span>${esc(s.d)}</span></div></button>`).join('')}
      ${!navigator.onLine ? '<div class="card" style="margin-top:14px">⚠️ Für das KI-Gespräch brauchst du Internet.</div>' : ''}`;
    $app.querySelectorAll('[data-scen]').forEach(b => b.onclick = () => startChat(b.dataset.scen));
    return;
  }
  const s = SCEN.find(x => x.k === chat.scen);
  $app.innerHTML = bar(s.t, 'chat', '<button class="iconbtn" data-act="chatend">Neu</button>') + `
    <div class="bubbles" id="chatlog"></div>
    <div class="chatbar"><div class="inner">
      <div id="chatstatus" class="muted small" style="text-align:center;min-height:1.4em"></div>
      <button class="micbig" id="micBig">🎙️<span>Sprechen</span></button>
      <div class="row" style="margin-top:10px"><input class="text" id="chatText" placeholder="… oder hier tippen" style="min-height:54px"><button class="say" id="chatSend" style="flex:0 0 auto;padding:0 18px">Senden</button></div>
    </div></div>`;
  chat.log.forEach(m => drawMsg(m));
  document.getElementById('micBig').onclick = chatMic;
  document.getElementById('chatSend').onclick = () => { const t = document.getElementById('chatText'); if (t.value.trim()){ sendChat(t.value.trim()); t.value=''; } };
  document.getElementById('chatText').onkeydown = ev => { if (ev.key === 'Enter') document.getElementById('chatSend').click(); };
}
function startChat(k){
  const s = SCEN.find(x => x.k === k);
  chat = {scen:k, log:[{role:'assistant', content:s.first}], busy:false};
  renderChat(); serverSpeak(s.first, s.v);
}
function drawMsg(m){
  const log = document.getElementById('chatlog'); if (!log) return;
  const el = document.createElement('div');
  el.className = 'bub ' + (m.role==='user' ? 'me' : 'other') + ' pop';
  let html = `<div class="who">${m.role==='user' ? 'Du' : 'Gesprächspartner'}</div><div class="en">${esc(m.content)}</div>`;
  if (m.role === 'assistant') html += `<div class="row" style="margin-top:8px"><button class="say" data-chatsay="1">🔊</button><button class="say" data-chatslow="1">🐢</button></div>`;
  if (m.fb){
    const c = m.fb.corrections || [];
    if (m.fb.praise) html += `<div class="praise">👍 ${esc(m.fb.praise)}</div>`;
    c.forEach(x => { html += `<div class="corr"><div class="muted small">Besser so:</div><div class="better">${esc(x.better)}</div><div class="small">${esc(x.why || '')}</div><button class="say" data-better="${esc(x.better)}" style="margin-top:6px">🔊 Anhören</button></div>`; });
  }
  el.innerHTML = html;
  const s = SCEN.find(x => x.k === chat.scen);
  el.querySelectorAll('[data-chatsay]').forEach(b => b.onclick = () => serverSpeak(m.content, s.v));
  el.querySelectorAll('[data-chatslow]').forEach(b => b.onclick = async () => { const r = state.rate; state.rate = 0.7; await serverSpeak(m.content, s.v); state.rate = r; });
  el.querySelectorAll('[data-better]').forEach(b => b.onclick = () => serverSpeak(b.dataset.better, 'emma'));
  log.appendChild(el); el.scrollIntoView({block:'end', behavior:'smooth'});
  return el;
}
function chatStatus(t){ const s = document.getElementById('chatstatus'); if (s) s.textContent = t; }
async function chatMic(){
  const btn = document.getElementById('micBig');
  if (chat.busy) return;
  if (!Rec.active){
    try { await Rec.start(); btn.classList.add('recording'); btn.innerHTML = '■<span>Fertig</span>'; chatStatus('Ich höre zu … sprich in Ruhe, dann auf „Fertig“ tippen.'); }
    catch(e){ chatStatus('Mikrofon nicht verfügbar – bitte in den Einstellungen erlauben oder tippen.'); }
    return;
  }
  btn.classList.remove('recording'); btn.innerHTML = '🎙️<span>Sprechen</span>';
  const blob = await Rec.stop(); if (!blob) return;
  chat.busy = true; chatStatus('Ich verstehe dich gerade …');
  try {
    const r = await transcribe(blob);
    if (!r.text){ chatStatus('Ich habe leider nichts verstanden – bitte noch einmal, etwas lauter.'); chat.busy = false; return; }
    chat.busy = false; await sendChat(r.text);
  } catch(e){ chatStatus('Fehler: ' + e.message); chat.busy = false; }
}
async function sendChat(text){
  if (chat.busy) return; chat.busy = true;
  const um = {role:'user', content:text}; chat.log.push(um); const uel = drawMsg(um);
  chatStatus('Dein Gesprächspartner denkt nach …');
  try {
    const out = await api('/api/chat', {json:{scenario:chat.scen, messages:chat.log.map(m => ({role:m.role, content:m.content}))}});
    um.fb = {corrections: out.corrections || [], praise: out.praise || ''};
    if (uel && (um.fb.praise || um.fb.corrections.length)){ uel.remove(); drawMsg(um); }
    const am = {role:'assistant', content: out.reply || '…'}; chat.log.push(am); drawMsg(am);
    chatStatus(''); const s = SCEN.find(x => x.k === chat.scen); chat.busy = false; await serverSpeak(am.content, s.v);
  } catch(e){ chatStatus('Fehler: ' + e.message); chat.log.pop(); chat.busy = false; }
}

/* ---------- Einstellungen ---------- */
function renderSettings(){
  const seg = (key, opts) => `<div class="seg ${opts.length===2?'two-c':''}">${opts.map(([v,l]) => `<button data-set="${key}" data-v="${v}" class="${String(state[key])===String(v)?'on':''}">${l}</button>`).join('')}</div>`;
  $app.innerHTML = bar('Einstellungen & mehr') + `<div class="stack">
    <div class="card stack"><h3>Mehr</h3>
      <button class="lesson" data-go="all"><div class="ico">📚</div><div class="txt"><b>Alle Lektionen</b><span>Lektionen frei auswählen, Videos</span></div></button>
      <button class="lesson" data-act="review"><div class="ico">🧠</div><div class="txt"><b>Kopftraining</b><span>Gelerntes gemischt wiederholen</span></div></button>
      <button class="lesson" data-act="chatopen"><div class="ico">🗣️</div><div class="txt"><b>Mit der KI sprechen</b><span>${state.server && state.code ? 'Freies Gespräch mit Korrekturen' : 'Noch einzurichten (siehe unten)'}</span></div></button>
      <button class="lesson" data-act="testopen"><div class="ico">🎯</div><div class="txt"><b>Einstufungstest</b><span>${state.placement ? 'Letztes Ergebnis: ' + esc(state.placement.level) : '24 Fragen · 10 Min.'}</span></div></button>
    </div>
    <div class="card stack"><label class="field" for="nameIn">Dein Vorname</label><input id="nameIn" class="text" type="text" value="${esc(state.name)}" placeholder="z. B. Maria"></div>
    <div class="card stack"><h3>Schriftgröße</h3>${seg('scale',[[1,'Normal'],[1.15,'Groß'],[1.3,'Sehr groß']])}</div>
    <div class="card stack"><h3>Sprechtempo</h3>${seg('rate',[[0.7,'Langsam'],[0.9,'Normal']])}</div>
    <div class="card stack"><h3>Stimme</h3>${seg('voice',[['rec','Aufnahmen (empfohlen)'],['device','Gerätestimme']])}
      <button class="btn secondary" data-say="Good afternoon. How can I help you?">🔊 Stimme testen</button></div>
    <div class="card stack"><h3>Übersetzungen im Gespräch</h3>${seg('showDe',[[false,'Erst beim Antippen'],[true,'Immer zeigen']])}</div>
    <div class="card stack"><h3>🗣️ KI-Gesprächspartner</h3>
      <label class="field" for="srvIn">Server-Adresse</label><input id="srvIn" class="text" type="url" autocapitalize="off" autocorrect="off" placeholder="z. B. 85-215-1-2.sslip.io" value="${esc(state.server)}">
      <label class="field" for="codeIn">Zugangscode</label><input id="codeIn" class="text" type="text" autocapitalize="characters" autocorrect="off" value="${esc(state.code)}">
      <button class="btn secondary" id="srvTest">Verbindung testen</button><div id="srvRes" class="muted small"></div></div>
    <div class="card stack"><h3>App & Offline</h3>
      <p style="margin:0">${isStandalone() ? '✓ Die App ist installiert. Lektionen funktionieren ohne Internet; Sprechprüfung und KI-Gespräch brauchen Internet.' : installHow()}</p>
      ${!isStandalone() && installEvent ? '<button class="btn" data-act="install">Jetzt installieren</button>' : ''}
      <p class="muted small" style="margin:0">Dein Lernstand wird nur auf diesem Gerät gespeichert.</p></div>
    <div class="card stack"><h3>Fortschritt</h3><div id="resetArea"><button class="btn secondary" id="resetBtn">Fortschritt zurücksetzen</button></div></div></div>`;
  const nameIn = document.getElementById('nameIn'); nameIn.onchange = nameIn.onblur = () => { state.name = nameIn.value.trim(); save(); };
  const srv = document.getElementById('srvIn'), code = document.getElementById('codeIn');
  const keep = () => { state.server = srv.value.trim(); state.code = code.value.trim().toUpperCase(); save(); };
  srv.onchange = srv.onblur = keep; code.onchange = code.onblur = keep;
  document.getElementById('srvTest').onclick = async () => {
    keep(); const out = document.getElementById('srvRes'); out.textContent = 'Teste …';
    try {
      const h = await fetch(apiUrl('/api/health')).then(r => r.json()); if (!h.ok) throw new Error('keine Antwort');
      await api('/api/tts', {json:{text:'Hello! The connection works.', voice:'emma'}, raw:true});
      out.innerHTML = '<span style="color:var(--accent);font-weight:700">✓ Verbindung klappt.</span>';
      serverSpeak('Hello! The connection works.', 'emma');
    } catch(e){ out.innerHTML = '<span style="color:var(--warm);font-weight:700">✗ ' + esc(e.message === 'Failed to fetch' ? 'Server nicht erreichbar' : e.message) + '</span>'; }
  };
  $app.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const k=b.dataset.set, v=b.dataset.v; state[k] = (k==='voice') ? v : (k==='showDe') ? v==='true' : parseFloat(v); save(); applyScale(); renderSettings();
  });
  document.getElementById('resetBtn').onclick = () => {
    document.getElementById('resetArea').innerHTML = `<p style="margin:0 0 12px">Wirklich alles zurücksetzen? Die geschafften Lektionen werden gelöscht.</p>
      <div class="two"><button class="btn secondary" id="rNo">Abbrechen</button><button class="btn" style="background:var(--warm)" id="rYes">Ja, zurücksetzen</button></div>`;
    document.getElementById('rNo').onclick = renderSettings;
    document.getElementById('rYes').onclick = () => { state.done={}; state.miss={}; save(); toast('Fortschritt zurückgesetzt.'); go({name:'home'}); };
  };
}

/* ============================================================
   KLICKS (zentral)
   ============================================================ */
document.addEventListener('click', ev => {
  const t = ev.target.closest('button'); if (!t) return;
  if (t.dataset.say !== undefined){ speak(t.dataset.say, {other: !!t.dataset.other}); return; }
  if (t.dataset.saySlow !== undefined){ speak(t.dataset.saySlow, {slow:true}); return; }
  if (t.dataset.playurl){ playUrl(t.dataset.playurl); return; }
  if (t.dataset.testaudio){ playTestAudio(t.dataset.testaudio); return; }
  if (t.dataset.testans !== undefined){ if (testAudio) try{testAudio.pause();}catch(e){} testRun.ans[testRun.i] = parseInt(t.dataset.testans); testRun.i++; renderTest(); window.scrollTo(0,0); return; }
  if (t.dataset.go){ const [n,id] = t.dataset.go.split(':'); if (n === 'chat' && view.name === 'chat') chat = null; go(id ? {name:n, id} : {name:n}); return; }
  if (t.dataset.goTo){ const id = view.id; if (['phrases','play','tip','ex'].includes(t.dataset.goTo)) return enterStep(id, t.dataset.goTo); go({name:t.dataset.goTo, id}); return; }
  if (t.dataset.act){
    const [a,id] = t.dataset.act.split(':'); const L = view.id ? byId(view.id) : null;
    if (a==='open') go({name:'hub', id});
    else if (a==='continue'){ const c = current(); enterStep(c.L.id, c.step); }
    else if (a==='nextstep' && L) nextStep(L, id);
    else if (a==='phrasenext' && L){ const k = view.k || 0; if (k < L.phrases.length - 1){ stopSpeech(); if (Rec.active) Rec.stop(); view = {name:'phrases', id:L.id, k:k+1}; render(); window.scrollTo(0,0); } else nextStep(L, 'phrases'); }
    else if (a==='review') startReview();
    else if (a==='again') startLesson(run.id);
    else if (a==='basics'){ state.showBasics = true; save(); renderHome(); }
    else if (a==='showqde'){ const q = document.getElementById('qde'); if (q) q.hidden = false; }
    else if (a==='playrepeat' && L){ const last = play.shown[play.shown.length-1]; if (last !== undefined) speak(L.dialog[last].en, {other: L.dialog[last].who !== 'me'}); }
    else if (a==='playhelp' && L){ const last = play.shown[play.shown.length-1]; const d = last !== undefined ? L.dialog[last] : null; toast(d ? 'Gerade gesagt: „' + N(d.de) + '“' : 'Du beginnst das Gespräch: ' + L.scene); }
    else if (a==='playall' && L) playAll(L);
    else if (a==='playagain'){ play = null; renderPlay(); }
    else if (a==='chatopen'){ chat = null; go({name:'chat'}); }
    else if (a==='chatend'){ chat = null; renderChat(); }
    else if (a==='teststart'){ startTest(); }
    else if (a==='testopen'){ testRun = null; go({name:'test'}); }
    else if (a==='testquit'){ if (testRun && testRun.ans.length){ testRun.i = TEST.length; renderTest(); } else go({name:'home'}); }
    else if (a==='testreview'){ go({name:'testreview'}); }
    else if (a==='testcopy'){ try { navigator.clipboard.writeText(testRun.summary).then(()=>toast('Kopiert!'), ()=>toast('Kopieren nicht möglich – bitte abschreiben.')); } catch(e){ toast('Kopieren nicht möglich – bitte abschreiben.'); } }
    else if (a==='install' && installEvent){ installEvent.prompt(); installEvent.userChoice.finally(() => { installEvent = null; render(); }); }
    else if (a==='hideinstall'){ state.installHidden = true; save(); render(); }
  }
});

render();
