// Isolated development browser setup. Never uses the user's browser profile/cookies.
const fs=require('fs'),path=require('path'),os=require('os');
const project=path.resolve(__dirname,'..');
const home=process.env.BILI_TEST_HOME||(process.platform==='win32'&&fs.existsSync('D:/CodexBrowserTests')?'D:/CodexBrowserTests':path.join(os.tmpdir(),'bili-language-tests'));
fs.mkdirSync(path.join(home,'tmp'),{recursive:true});process.env.TEMP=process.env.TMP=path.join(home,'tmp');
process.env.PLAYWRIGHT_BROWSERS_PATH||=path.join(home,'browsers');
try{require.resolve('playwright');}catch{const local=path.resolve(project,'../../work/node_modules');if(fs.existsSync(path.join(local,'playwright'))){process.env.NODE_PATH=[local,process.env.NODE_PATH].filter(Boolean).join(path.delimiter);require('module').Module._initPaths();}}
const {chromium}=require('playwright');
process.env.CHROME_PATH||=fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':chromium.executablePath();
module.exports={home,project,chromium};
