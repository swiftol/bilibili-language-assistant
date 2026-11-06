(function(root){
 function parse(text){
  if(text.trim().startsWith('{')){const j=JSON.parse(text);return (j.body||[]).map(x=>({start:x.from,end:x.to,text:x.content}));}
  const time=s=>s.trim().replace(',','.').split(':').reduce((a,v)=>a*60+Number(v),0);
  return text.replace(/\r/g,'').split(/\n\s*\n/).flatMap(block=>{const lines=block.split('\n'),i=lines.findIndex(x=>x.includes('-->'));if(i<0)return [];const [a,b]=lines[i].split('-->');return [{start:time(a),end:time(b.trim().split(/\s/)[0]),text:lines.slice(i+1).join('\n')}];}).filter(x=>Number.isFinite(x.start)&&Number.isFinite(x.end));
 }
 function route(ctx,source,side){const mono=ctx.createGain();mono.channelCount=1;mono.channelCountMode='explicit';source.connect(mono);const merger=ctx.createChannelMerger(2);mono.connect(merger,0,side);merger.connect(ctx.destination);return mono;}
 function levels(master,muted,left,right){const clamp=v=>Math.max(0,Math.min(1,Number(v)||0)),m=muted?0:clamp(master);return [m*clamp(left),m*clamp(right)];}
 const api={parse,route,levels};root.BiliDual=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
