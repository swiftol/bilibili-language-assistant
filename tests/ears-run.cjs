const {chromium}=require('../scripts/test-env.cjs');const fs=require('fs'),path=require('path'),assert=require('assert');
function wav(){const rate=8000,n=rate*4,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.sin(i*2*Math.PI*440/rate)*1000,44+i*2);return b;}
(async()=>{const b=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage();await p.route('https://www.bilibili.com/**',r=>r.fulfill({contentType:'text/html',body:'<video loop style="width:640px;height:360px" controls></video><div id="bili-dual-native"></div>'}));await p.route('https://test.bilivideo.com/**',r=>{
 const body=wav(),range=r.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/),headers={'Access-Control-Allow-Origin':'*','Accept-Ranges':'bytes'};
 if(!range)return r.fulfill({contentType:'audio/wav',headers,body});
 const from=Number(range[1]),to=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
 return r.fulfill({status:206,contentType:'audio/wav',headers:{...headers,'Content-Range':'bytes '+from+'-'+to+'/'+body.length},body:body.subarray(from,to+1)});
});await p.goto('https://www.bilibili.com/video/test');await p.evaluate(()=>{document.querySelector('#bili-dual-native').attachShadow({mode:'open'}).innerHTML='<section></section>';window.gates=[];window.originalSources=0;const C=window.AudioContext;window.AudioContext=class extends C{createGain(){const g=super.createGain();gates.push(g);return g;}createMediaElementSource(a){if(a.tagName==='VIDEO')originalSources++;const node=super.createMediaElementSource(a),connect=node.connect.bind(node);node.connect=(target,...args)=>{node.lastTarget=target;return connect(target,...args)};(window.sourceNodes||=[]).push(node);return node;}};const v=document.querySelector('video');v.crossOrigin='anonymous';v.src='https://test.bilivideo.com/video.wav';v.volume=.6;});for(const f of ['core.js','stereo.js'])await p.addScriptTag({path:path.resolve('extension/'+f)});await p.evaluate(()=>{document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type:'media',mediaKey:'fixture',route:location.pathname+'?p=1',page:location.pathname})}));for(const language of ['','en'])document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type:'play',mediaKey:'fixture',route:location.pathname+'?p=1',page:location.pathname,data:{language,duration:language?7000:4000,audio:[{url:'https://test.bilivideo.com/'+(language||'zh')+'.wav',bandwidth:100}]}})}));});await p.locator('#dual-left').fill('1.5');await p.locator('#dual-right').fill('0.5');await p.locator('video').evaluate(v=>v.play());await p.locator('#dual-start').click();await p.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.startsWith('双音轨已启用'));
await p.waitForFunction(()=>gates[1]?.gain.value>0&&gates[2]?.gain.value>0);
let values=await p.evaluate(()=>gates.map(g=>g.gain.value));assert(Math.abs(values[1]-.9)<.001);assert(Math.abs(values[2]-.3)<.001);assert.equal(values[0],0);
await p.locator('video').evaluate(v=>{v.volume=.2;v.muted=false;});await p.waitForTimeout(150);values=await p.evaluate(()=>gates.map(g=>g.gain.value));assert.equal(values[0],0);assert(Math.abs(values[1]-.3)<.001);assert(Math.abs(values[2]-.1)<.001);
await p.locator('video').evaluate(v=>v.muted=true);await p.waitForTimeout(150);values=await p.evaluate(()=>gates.map(g=>g.gain.value));assert.equal(values[1],0);assert.equal(values[2],0);await p.locator('video').evaluate(v=>v.muted=false);await p.locator('#dual-stop').click();assert.equal(await p.evaluate(()=>gates[0].gain.value),1);assert.equal(await p.locator('video').evaluate(v=>v.volume),.2);await p.locator('#dual-start').click();await p.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent.startsWith('双音轨已启用'));assert.equal(await p.evaluate(()=>originalSources),1);await p.locator('#ear-swap').click();assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots'))),{left:'original',right:'en'});assert.equal(await p.locator('#dual-right').inputValue(),'1.5');assert.equal(await p.locator('#dual-left').inputValue(),'0.5');assert(await p.evaluate(()=>{const nodes=sourceNodes.slice(-2);return nodes[0].lastTarget===gates[gates.length-1]&&nodes[1].lastTarget===gates[gates.length-2];}));await p.locator('#ear-swap').click();assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots'))),{left:'en',right:'original'});await p.locator('#audio-pool [data-language="en"]').dragTo(p.locator('#ear-right'));await p.waitForFunction(()=>document.querySelector('#bili-dual-native').shadowRoot.querySelector('#dual-status').textContent==='双音轨已启用：左耳 English / 右耳 English');assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots'))),{left:'en',right:'en'});
assert.equal(await p.locator('#bili-dual-native audio').count(),1);
await p.goto('https://www.bilibili.com/video/fallback');
await p.evaluate(()=>{
 localStorage.setItem('bili-dual-ear-slots',JSON.stringify({left:'ja',right:'original'}));
 localStorage.setItem('bili-dual-language-gains',JSON.stringify({ja:1.4,en:0.7}));
 document.querySelector('#bili-dual-native').attachShadow({mode:'open'}).innerHTML='<section></section>';
 const video=document.querySelector('video');
 video.crossOrigin='anonymous';
 video.src='https://test.bilivideo.com/video.wav';
 const button=document.createElement('button');
 button.id='fixture-play';
 button.textContent='Play video';
 button.onclick=()=>video.play();
 document.body.prepend(button);
});
for(const f of ['core.js','stereo.js'])await p.addScriptTag({path:path.resolve('extension/'+f)});
await p.locator('#fixture-play').click();
await p.waitForFunction(()=>!document.querySelector('video').paused);

async function switchEpisode(part, languages, staleMenuLanguage) {
 await p.evaluate(({part,languages,staleMenuLanguage})=>{
  const route=location.pathname+'?p='+part;
  history.pushState({},'',route);
  document.querySelector('.bpx-player-ctrl-translation-language-item')?.remove();
  if(staleMenuLanguage){
   const menu=document.createElement('div');
   menu.className='bpx-player-ctrl-translation-language-item';
   menu.dataset.lan=staleMenuLanguage;
   document.body.append(menu);
  }
  const mediaKey='fixture-'+part;
  function emit(type,data){
   document.dispatchEvent(new CustomEvent('bili-dual-data',{detail:JSON.stringify({type,data,mediaKey,route,page:location.pathname})}));
  }
  emit('media');
  emit('languages',languages.map(lang=>({lang})));
  for(const language of ['',...languages]){
   emit('play',{language,duration:4000,audio:[{url:'https://test.bilivideo.com/'+(language||'zh')+'.wav?part='+part,bandwidth:100}]});
  }
 },{part,languages,staleMenuLanguage});
}
const savedEars=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('bili-dual-ear-slots')));
async function expectAudioRoute(left,right) {
 await p.waitForFunction(({left,right})=>{
  const shadow=document.querySelector('#bili-dual-native').shadowRoot;
  const [leftAudio,rightAudio]=shadow.querySelectorAll('audio');
  return leftAudio&&leftAudio.readyState>=1&&new URL(leftAudio.src).pathname==='/'+left+'.wav'&&
    rightAudio&&rightAudio.readyState>=1&&new URL(rightAudio.src).pathname==='/'+right+'.wav'&&
    shadow.querySelector('#dual-status').textContent.startsWith('双音轨已启用');
 },{left,right},{timeout:8000}).catch(async error=>{
  console.error(await p.locator('#dual-status').textContent(),await p.locator('#dual-tracks').textContent());
  console.error(await p.locator('audio').evaluateAll(items=>items.map(a=>[a.src,a.paused])),await p.locator('video').evaluate(v=>[v.paused,v.currentTime,v.readyState]));
  console.error('auto',await p.locator('#dual-auto').isChecked(),'ears',await savedEars());
  throw error;
 });
}

await switchEpisode(2,['en'],'ja');
await expectAudioRoute('en','zh');
assert((await p.locator('#dual-status').textContent()).includes('（本片无日语，使用英语）'));
assert.deepEqual(await savedEars(),{left:'ja',right:'original'});
assert.equal(await p.locator('#dual-left').inputValue(),'0.7');

await switchEpisode(3,['en','ja'],'en');
await expectAudioRoute('ja','zh');
assert.deepEqual(await savedEars(),{left:'ja',right:'original'});
assert.equal(await p.locator('#dual-left').inputValue(),'1.4');
await p.locator('#ear-swap').click();

await switchEpisode(4,['en'],'ja');
await expectAudioRoute('zh','en');
assert.deepEqual(await savedEars(),{left:'original',right:'ja'});
assert.equal(await p.locator('#dual-right').inputValue(),'0.7');

await switchEpisode(5,[]);
assert.equal(await p.locator('#bili-dual-native audio').count(),0);
console.log('PASS: automatic English fallback, Japanese restoration on episode change, language gains and ear preference retained, original audio on unsupported video');
await b.close();console.log('PASS: drag track to either ear; physical left/right routing swapped and restored; same-language assignment; master scales both ears; mute/unmute; restore; repeat start reuses source');})().catch(e=>{console.error(e);process.exit(1)});

