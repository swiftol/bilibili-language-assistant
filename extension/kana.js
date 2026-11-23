(()=>{
 let tokenizerPromise;const cache=new Map();
 function tokenizer(){if(!tokenizerPromise)tokenizerPromise=new Promise((resolve,reject)=>{kuromoji.builder({dicPath:chrome.runtime.getURL('vendor/dict/')}).build((error,value)=>error?reject(error):resolve(value));}).catch(error=>{tokenizerPromise=null;throw error;});return tokenizerPromise;}
 async function annotate(text){let result=cache.get(text);if(result===undefined){const engine=await tokenizer();result=engine.tokenize(text).map(token=>{if(!/[\u3400-\u9fff々]/u.test(token.surface_form)||!token.reading||token.reading==='*')return token.surface_form;const kana=token.reading.replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));return token.surface_form+'（'+kana+'）';}).join('');cache.set(text,result);if(cache.size>500)cache.delete(cache.keys().next().value);}return result;}
 globalThis.BiliKana={annotate};
 window.addEventListener('message',async event=>{const data=event.data;if(event.source!==window||event.origin!==location.origin||data?.source!=='bili-kana-request'||typeof data.id!=='string'||typeof data.text!=='string'||data.text.length>50000)return;try{const result=await annotate(data.text);window.postMessage({source:'bili-kana-result',id:data.id,text:result},location.origin);}catch{window.postMessage({source:'bili-kana-result',id:data.id,error:true},location.origin);}});
})();
