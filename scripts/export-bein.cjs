// Export the beIN entries already included in the bundled catalog.
const fs=require('fs'),vm=require('vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('LiveChannels/catalog.js','utf8'),context);
const channels=context.window.unifiedCatalog.filter(c=>/\bbein\b/i.test(c.name));
const attr=s=>String(s||'').replace(/["\r\n]/g,'');
const lines=['#EXTM3U','# Replacement for the retired iptv-org /sources/bein.m3u URL.','# Channel availability can change.'];
for(const c of channels){
 const spanish=/espa[nñ]ol/i.test(c.name),name=c.name+(c.url.includes('tubi.io')?' — Tubi':'');
 lines.push('#EXTINF:-1 tvg-id="'+attr(c.tvgId)+'" tvg-logo="'+attr(c.logo)+'" tvg-language="'+(spanish?'spa':'eng')+'" group-title="Sports",'+attr(name));
 if(c.userAgent)lines.push('#EXTVLCOPT:http-user-agent='+attr(c.userAgent));
 lines.push(c.url);
}
fs.mkdirSync('playlists',{recursive:true});
fs.writeFileSync('playlists/bein.m3u',lines.join('\n')+'\n');
console.log('Exported',channels.length,'beIN feeds');
