// Sync the complete unpacked extension, including newly referenced scripts.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const {check}=require('./check.cjs');
const project=path.resolve(__dirname,'..'),source=path.join(project,'extension');
const targets=[path.resolve(project,'../bili-language-toolkit'),path.resolve(project,'../bili-ja-zh-v0.1/bili-ja-zh')];
function files(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),path.join(prefix,e.name)):[path.join(prefix,e.name)]);}
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
check(source);
const entries=files(source).sort((a,b)=>Number(a==='manifest.json')-Number(b==='manifest.json'));
for(const target of targets){
 let changed=0;
 for(const relative of entries){const from=path.join(source,relative),to=path.join(target,relative);if(!fs.existsSync(to)||digest(from)!==digest(to)){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);changed++;}}
 check(target);
 for(const relative of entries)assert.equal(digest(path.join(source,relative)),digest(path.join(target,relative)),'Outdated artifact: '+relative);
 console.log('SYNC OK: '+target+' ('+changed+' updated; '+entries.length+' files verified)');
}
