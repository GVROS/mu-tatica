const PROJECT = window.YL_PROJECT;
const STORAGE_KEY = "yas-lore-studio-v1";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
let activeScene = null;
let activeImageData = null;

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderAll(); }
function sceneState(id){ return state[id] || {image:false,video:false,voice:false,edit:false}; }
function setStep(id,key,value=true){ state[id]={...sceneState(id),[key]:value}; save(); }

function totalDuration(){
  const sec=PROJECT.scenes.reduce((a,s)=>a+s.duration,0);
  return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
}
function completion(){
  const total=PROJECT.scenes.length*4;
  const done=PROJECT.scenes.reduce((n,s)=>{
    const x=sceneState(s.id); return n+["image","video","voice","edit"].filter(k=>x[k]).length;
  },0);
  return {done,total,pct:Math.round(done/total*100)};
}

function renderAll(){
  const c=completion();
  $("#progressPct").textContent=c.pct+"%";
  $("#progressText").textContent=`${c.done} de ${c.total} etapas concluídas`;
  $("#sceneCount").textContent=PROJECT.scenes.length;
  $("#durationTotal").textContent=totalDuration();
  $("#ring").textContent=c.pct+"%";
  renderPipeline();
  renderScenes();
  renderLibrary();
  renderNextAction();
}
function renderPipeline(){
  const groups=[
    ["Personagens MASTER", false],
    ["Imagem-base", PROJECT.scenes.some(s=>sceneState(s.id).image)],
    ["Vídeo Grok", PROJECT.scenes.some(s=>sceneState(s.id).video)],
    ["Narração", PROJECT.scenes.some(s=>sceneState(s.id).voice)],
    ["Música", false],["Edição",PROJECT.scenes.some(s=>sceneState(s.id).edit)],
    ["Thumbnail",false],["Publicação",false]
  ];
  $("#pipeline").innerHTML=groups.map((g,i)=>`<div class="pipe ${g[1]?"done":""}"><b>${g[1]?"✓":i+1}</b><span>${g[0]}</span></div>`).join("");
}
function renderScenes(){
  $("#sceneList").innerHTML=PROJECT.scenes.map(s=>{
    const st=sceneState(s.id);
    const n=["image","video","voice","edit"].filter(k=>st[k]).length;
    return `<article class="scene">
      <div class="scene-id">${s.id}</div>
      <div>
        <h3>${s.title}</h3>
        <p>${s.summary}</p>
        <div class="scene-meta">
          <span class="tag">${s.duration}s</span><span class="tag">${s.type}</span>
          <span class="tag ${st.image?"done":""}">Imagem ${st.image?"✓":"○"}</span>
          <span class="tag ${st.video?"done":""}">Vídeo ${st.video?"✓":"○"}</span>
          <span class="tag ${st.voice?"done":""}">Voz ${st.voice?"✓":"○"}</span>
          <span class="tag ${st.edit?"done":""}">Editado ${st.edit?"✓":"○"}</span>
        </div>
      </div>
      <div class="scene-actions"><button class="btn small" data-scene="${s.id}">Abrir</button></div>
    </article>`;
  }).join("");
  $$("[data-scene]").forEach(b=>b.onclick=()=>openScene(b.dataset.scene));
}
function renderLibrary(){
  const counts={
    image:PROJECT.scenes.filter(s=>sceneState(s.id).image).length,
    video:PROJECT.scenes.filter(s=>sceneState(s.id).video).length,
    voice:PROJECT.scenes.filter(s=>sceneState(s.id).voice).length,
    edit:PROJECT.scenes.filter(s=>sceneState(s.id).edit).length
  };
  $("#libraryGrid").innerHTML=[
    ["Imagens-base",counts.image,"frames prontos"],
    ["Vídeos Grok",counts.video,"clipes gerados"],
    ["Vozes",counts.voice,"cenas narradas"],
    ["Edição",counts.edit,"cenas finalizadas"],
    ["Roteiros",PROJECT.scenes.length,"cenas cadastradas"],
    ["Música","1","Dois a Dois"]
  ].map(x=>`<article><strong>${x[0]}</strong><h2>${x[1]}</h2><span>${x[2]}</span></article>`).join("");
}
function renderNextAction(){
  const steps=["image","video","voice","edit"];
  const labels={image:"Criar imagem-base",video:"Gerar vídeo no Grok",voice:"Gerar vozes",edit:"Editar cena"};
  let found=null;
  for(const s of PROJECT.scenes){for(const k of steps){if(!sceneState(s.id)[k]){found={s,k};break}}if(found)break}
  if(!found){$("#nextActionTitle").textContent="Episódio pronto para montagem final";$("#nextActionText").textContent="Todas as cenas foram marcadas como concluídas.";return}
  $("#nextActionTitle").textContent=`${found.s.id} — ${labels[found.k]}`;
  $("#nextActionText").textContent=found.s.summary;
  $("#nextActionBtn").onclick=()=>{showView("episode");openScene(found.s.id)};
}
function dialogueHtml(s){
  const all=[];
  if(s.narration) all.push(`<div class="script-line"><b>Narradora:</b> “${s.narration}”</div>`);
  (s.dialogue||[]).forEach(d=>all.push(`<div class="script-line"><b>${d[0]}:</b> “${d[1]}”</div>`));
  if(s.music) all.push(`<div class="script-line"><b>Música:</b> ${s.music}</div>`);
  return all.join("") || '<span class="muted">Sem fala nesta cena.</span>';
}
function openScene(id){
  activeScene=PROJECT.scenes.find(s=>s.id===id); activeImageData=null;
  const s=activeScene, st=sceneState(s.id);
  $("#dialogContent").innerHTML=`
    <div class="dialog-title"><p class="eyebrow">${s.id} • ${s.duration}s • ${s.type}</p><h2>${s.title}</h2><p class="muted">${s.summary}</p></div>
    <div class="dialog-grid">
      <div>
        <div class="box"><h4>Roteiro / falas</h4>${dialogueHtml(s)}</div>
        <div class="box" style="margin-top:12px"><h4>Prompt para Grok</h4><textarea id="promptBox" class="prompt">${s.prompt}</textarea>
          <div class="tool-row"><button type="button" class="btn small" id="copyPrompt">Copiar prompt</button><button type="button" class="btn small" id="openGrok">Abrir Grok</button></div>
        </div>
      </div>
      <div>
        ${s.takes?`<div class="box"><h4>Takes sugeridos</h4><div class="takes">${s.takes.map(t=>`<div class="take"><b>${t[0]}</b><span>${t[1]}</span><small>${t[2]}</small></div>`).join("")}</div></div>`:""}
        <div class="box" style="margin-top:12px"><h4>Imagem de partida</h4><div class="upload-zone">Use a imagem desta cena para manter rosto, roupa e cenário.<input id="sceneImage" type="file" accept="image/*"></div>
          <div class="tool-row"><button type="button" class="btn small" id="markImage">${st.image?"Imagem pronta ✓":"Marcar imagem pronta"}</button><button type="button" class="btn primary small" id="generateVideo">Gerar vídeo</button></div>
          <div class="generation-status" id="genStatus">Para Image-to-Video, selecione uma imagem. Sem imagem, será Text-to-Video.</div>
          <div id="videoResult"></div>
        </div>
        <div class="box" style="margin-top:12px"><h4>Vozes</h4>
          <div class="tool-row">
            ${s.narration?`<button type="button" class="btn small tts" data-voice="narrator" data-text="${escapeAttr(s.narration)}">Narradora</button>`:""}
            ${[...new Set((s.dialogue||[]).map(d=>d[0]))].filter(v=>["Yas","Lore"].includes(v)).map(v=>`<button type="button" class="btn small tts" data-voice="${v.toLowerCase()}" data-text="${escapeAttr((s.dialogue||[]).filter(d=>d[0]===v).map(d=>d[1]).join(" "))}">${v}</button>`).join("")}
          </div>
          <div class="generation-status" id="voiceStatus">Gera MP3 via ElevenLabs.</div>
        </div>
        <div class="box" style="margin-top:12px"><h4>Status da cena</h4>
          <div class="tool-row">
            ${["image","video","voice","edit"].map(k=>`<button type="button" class="btn small statusToggle" data-key="${k}">${({image:"Imagem",video:"Vídeo",voice:"Voz",edit:"Editado"})[k]} ${st[k]?"✓":"○"}</button>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
  if(!$("#sceneDialog").open) $("#sceneDialog").showModal();
  $("#copyPrompt").onclick=async()=>{await navigator.clipboard.writeText($("#promptBox").value);$("#copyPrompt").textContent="Copiado ✓"};
  $("#openGrok").onclick=()=>window.open("https://grok.com/imagine","_blank");
  $("#markImage").onclick=()=>setStep(s.id,"image",true);
  $$(".statusToggle").forEach(b=>b.onclick=()=>{setStep(s.id,b.dataset.key,!sceneState(s.id)[b.dataset.key]);openScene(s.id)});
  $("#sceneImage").onchange=async e=>{ const f=e.target.files[0]; if(f){activeImageData=await resizeImage(f); $("#genStatus").textContent=`Imagem carregada: ${f.name}`; setStep(s.id,"image",true);} };
  $("#generateVideo").onclick=generateVideo;
  $$(".tts").forEach(b=>b.onclick=()=>generateTTS(b.dataset.voice,b.dataset.text));
}
function escapeAttr(v){ return String(v).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

async function resizeImage(file){
  const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=data});
  const max=1600, scale=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",.88);
}
async function generateVideo(){
  const s=activeScene; const btn=$("#generateVideo");btn.disabled=true;
  $("#genStatus").textContent="Enviando para Grok Imagine…";
  try{
    const r=await fetch("/api/video-start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      prompt:$("#promptBox").value,image:activeImageData||null,duration:Math.min(15,Math.max(5,s.duration>15?10:s.duration)),aspect_ratio:"16:9",resolution:"720p"
    })});
    const data=await r.json(); if(!r.ok) throw new Error(data.error||"Falha ao iniciar");
    $("#genStatus").textContent="Geração iniciada. Aguardando o vídeo…";
    await pollVideo(data.request_id);
  }catch(e){$("#genStatus").textContent="Erro: "+e.message;btn.disabled=false}
}
async function pollVideo(id){
  for(let i=0;i<120;i++){
    await new Promise(r=>setTimeout(r,5000));
    const r=await fetch("/api/video-status?id="+encodeURIComponent(id));const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Falha ao consultar");
    $("#genStatus").textContent=`Status Grok: ${data.status}`;
    if(data.status==="done"){
      const url=data.video?.url;$("#videoResult").innerHTML=`<video class="video-result" controls src="${url}"></video><div class="tool-row"><a class="btn small" href="${url}" target="_blank" rel="noreferrer">Abrir vídeo</a></div>`;
      setStep(activeScene.id,"video",true);$("#generateVideo").disabled=false;return;
    }
    if(["failed","expired"].includes(data.status)) throw new Error("Geração "+data.status);
  }
  throw new Error("Tempo de geração excedido");
}
async function generateTTS(voice,text){
  $("#voiceStatus").textContent=`Gerando voz de ${voice}…`;
  try{
    const r=await fetch("/api/tts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voice,text})});
    if(!r.ok){const d=await r.json();throw new Error(d.error||"Falha no TTS")}
    const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${activeScene.id}_${voice}.mp3`;a.click();
    $("#voiceStatus").textContent="MP3 gerado e baixado ✓";setStep(activeScene.id,"voice",true);
  }catch(e){$("#voiceStatus").textContent="Erro: "+e.message}
}

function showView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));$("#"+name+"View").classList.add("active");
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===name));
  $("#pageTitle").textContent={dashboard:"Yas & Lore Studio",episode:"Episódio 01",characters:"Personagens",library:"Biblioteca",settings:"Configuração"}[name]||"Yas & Lore Studio";
}
$$(".nav-item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
$("#continueBtn").onclick=()=>showView("episode");
$("#exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({project:PROJECT,state,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="yas-lore-projeto.json";a.click();
};
$("#resetBtn").onclick=()=>{if(confirm("Limpar todo o status de produção?")){state={};save()}};
$$("[data-upload]").forEach(inp=>inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const img=$("#"+inp.dataset.upload+"Preview");img.src=URL.createObjectURL(f);img.classList.remove("hidden")});
renderAll();