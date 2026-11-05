const fs=require('fs'),vm=require('vm'),parse=require('../LiveChannels/playlist.js');
const meta=JSON.parse(fs.readFileSync('.cache/catalog/channel-metadata.json'));
const feeds=JSON.parse(fs.readFileSync('.cache/catalog/feed-metadata.json'));
const ids=new Map(meta.map(c=>[c.id,c])),names=new Map(),langs=new Map();
meta.forEach(c=>[c.name,...c.alt_names].forEach(n=>names.set(n.toLowerCase(),c)));
feeds.forEach(f=>{const k=f.channel;langs.set(k,[...new Set([...(langs.get(k)||[]),...f.languages])]);langs.set(k+'@'+f.id,f.languages);});
const ctx={};vm.runInNewContext(fs.readFileSync('LiveChannels/curated.js','utf8'),{window:ctx});
let input=ctx.curatedChannels.map(c=>({...c,verified:/Q82B/.test(c.playbackNote||'')}));
const sources=JSON.parse(fs.readFileSync('.cache/catalog/merged/sources.json'));
sources.filter(s=>s.ok).forEach(s=>parse(fs.readFileSync(s.path,'utf8'),s.url).forEach(c=>input.push({...c,sourceName:new URL(s.url).hostname})));
const rows=[],seen=new Set();let unknown=0;
const category=require('./classify-channel.cjs');
const footballCandidate=require('./football-candidates.cjs');
for(const c of input){const id=(c.tvgId||'').split('@')[0],clean=c.name.replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g,'').trim().toLowerCase(),m=ids.get(id)||names.get(clean);
let ls=(c.language||'').toLowerCase().split(/[;,\/ ]+/).map(x=>({english:'eng',en:'eng',persian:'fas',farsi:'fas',fa:'fas',per:'fas'})[x]||x).filter(Boolean);
if(!ls.length)ls=langs.get(c.tvgId)||langs.get(m&&m.id)||[];
if(!ls.length && (/^IRIB|^Telewebion|^Varzesh|^Tapesh|^Iran International|^Persiana (?:Cinema|Iranian|Fight)/i.test(c.name)||c.group==='Persian'))ls=['fas'];
if(!ls.length&&c.verified&&/^(?:FIFA\+ English|FIFA\+ Women|Red Bull TV|Willow Sports|Tennis Channel T2|NASCAR|beIN Sports Xtra|Goal TV|FIGHT NETWORK)$/.test(c.name))ls=['eng'];
const selected=ls.filter(x=>x==='eng'||x==='fas');if(!selected.length){unknown++;continue;}
if(!/^https?:/.test(c.url)||seen.has(c.url))continue;
seen.add(c.url);rows.push({...c,language:selected.includes('fas')?'Persian':'English',group:category(c,m)});
}
// Merge repeated channel names, retaining different URLs as fallback feeds.
const merged=new Map();for(const c of rows){const key=c.language+'|'+c.name.toLowerCase().replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();const old=merged.get(key);if(old){old.alternativeUrls=old.alternativeUrls||[];old.alternativeUrls.push(c.url);}else merged.set(key,c);}
for(const c of merged.values()){
 if(footballCandidate(c)){c.group=[...new Set([...c.group.split(';'),'Sports','Football'])].join(';');c.footballCandidate=true;}
}
const result=[...merged.values()].sort((a,b)=>Number(b.verified)-Number(a.verified)||a.name.localeCompare(b.name));
fs.writeFileSync('LiveChannels/catalog.js','window.unifiedCatalog = '+JSON.stringify(result)+';\n');
console.log(JSON.stringify({channels:result.length,languages:result.reduce((a,c)=>(a[c.language]=(a[c.language]||0)+1,a),{}),categories:result.reduce((a,c)=>(a[c.group]=(a[c.group]||0)+1,a),{}),excluded:unknown}));
