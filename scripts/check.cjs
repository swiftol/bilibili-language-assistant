const fs=require('fs'),cp=require('child_process'),path=require('path'),assert=require('assert');
const project=path.resolve(__dirname,'..');
const version=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8')).version;
const lock=JSON.parse(fs.readFileSync(path.join(project,'package-lock.json'),'utf8'));assert.equal(lock.version,version,'Lockfile version mismatch');assert.equal(lock.packages[''].version,version,'Lockfile package version mismatch');assert(fs.readFileSync(path.join(project,'CHANGELOG.md'),'utf8').includes('## '+version+'（'),'Missing changelog entry for '+version);
function check(directory){
 const root=path.resolve(directory),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.equal(manifest.version,version,'Manifest version mismatch: '+root);
 for(const script of manifest.content_scripts.flatMap(c=>c.js||[])){
  const file=path.join(root,script);assert(fs.existsSync(file),script+' missing in '+root);
  cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
 }
 for(const html of [manifest.action?.default_popup,manifest.options_page].filter(Boolean)){
  const file=path.join(root,html);assert(fs.existsSync(file),'Missing page: '+html);const text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/<(script|link)\b[^>]*?(?:src|href)=["']([^"']+)["'][^>]*>/g)){const asset=path.join(root,match[2]);assert(fs.existsSync(asset),'Missing popup asset: '+match[2]);if(match[1]==='script')cp.execFileSync(process.execPath,['--check',asset],{stdio:'inherit'});}
 }
 for(const item of manifest.web_accessible_resources||[])for(const resource of item.resources){
  if(resource.endsWith('/*')){const dir=path.join(root,resource.slice(0,-2));assert(fs.existsSync(dir)&&fs.readdirSync(dir).length>0,'Missing resources: '+resource+' in '+root);}
  else assert(fs.existsSync(path.join(root,resource)),'Missing resource: '+resource+' in '+root);
 }
 console.log('PASS: manifest, scripts and resources in '+root);
}
if(require.main===module)for(const directory of process.argv.slice(2).length?process.argv.slice(2):[path.join(project,'extension')])check(directory);
module.exports={check};
