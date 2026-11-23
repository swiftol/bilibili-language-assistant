// One command: check, sync, regression tests, manifest-loaded extension, real Bilibili.
const {home,project,chromium}=require('./test-env.cjs');
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),output=path.join(home,'runs',stamp);fs.mkdirSync(output,{recursive:true});
const report={started:new Date().toISOString(),version:JSON.parse(fs.readFileSync(path.join(project,'extension/manifest.json'))).version,output,userBrowserTouched:false,realAccountWrites:false,stages:[]};
function run(name,script,env={}){console.log('Testing '+name);const start=Date.now(),r=cp.spawnSync(process.execPath,[path.join(project,script)],{cwd:project,env:{...process.env,...env},encoding:'utf8',timeout:360000,maxBuffer:32*1024*1024});fs.writeFileSync(path.join(output,name+'.log'),(r.stdout||'')+'\n'+(r.stderr||''));report.stages.push({name,pass:r.status===0,seconds:Math.round((Date.now()-start)/1000)});if(r.status!==0)throw Error(name+' failed; see '+path.join(output,name+'.log'));}
function fingerprint(dir){const hash=crypto.createHash('sha256');function scan(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())scan(file);else{hash.update(path.relative(dir,file));hash.update(fs.readFileSync(file));}}}scan(dir);return hash.digest('hex');}
try{
 if(!fs.existsSync(chromium.executablePath())){const cli=require.resolve('playwright/cli');cp.execFileSync(process.execPath,[cli,'install','chromium'],{env:process.env,stdio:'inherit'});}
 run('source-check','scripts/check.cjs');run('sync-and-verify','scripts/sync-local.cjs');
 const installed=path.resolve(project,'../bili-ja-zh-v0.1/bili-ja-zh'),snapshot=path.join(output,'extension');fs.cpSync(installed,snapshot,{recursive:true});report.extensionDigest=fingerprint(snapshot);report.sourceDigest=fingerprint(path.join(project,'extension'));
 run('regressions','scripts/test.cjs');run('packaged-gestures','tests/gestures-packaged.cjs',{BILI_TEST_EXTENSION:snapshot,BILI_GESTURE_REPORTS:path.join(output,'gestures')});
 run('real-bilibili','tests/player-live-smoke.cjs',{BILI_TEST_EXTENSION:snapshot,BILI_PACKAGED_LIVE:'1'});
 if(fingerprint(installed)!==report.extensionDigest||fingerprint(path.join(project,'extension'))!==report.sourceDigest)throw Error('Extension changed during testing; rerun on the latest snapshot');
 for(const file of ['real-player-smoke.json','real-player-panel.png','real-audio-branches.png']){const from=path.join(project,'artifacts',file);if(fs.existsSync(from))fs.copyFileSync(from,path.join(output,file));}
 report.pass=true;
}catch(error){report.pass=false;report.error=error.message;process.exitCode=1;console.error(error.message);}
finally{
 report.finished=new Date().toISOString();fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));const latest=path.join(project,'artifacts/background-latest.json');fs.mkdirSync(path.dirname(latest),{recursive:true});fs.writeFileSync(latest,JSON.stringify(report,null,2));console.log((report.pass?'PASS':'FAIL')+': '+output);
}
