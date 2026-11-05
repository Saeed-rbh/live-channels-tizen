const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function fixture() {
  const nodes = { 'av-surface': {hidden:true}, 'browser-video': {hidden:true,pause(){},load(){},removeAttribute(){},play(){return Promise.resolve();}} };
  const timers = new Map(); let sequence=0, request;
  const instances=[];
  class Hls { constructor(){this.events={};instances.push(this);} on(e,f){this.events[e]=f;} loadSource(url){this.url=url;} attachMedia(v){this.video=v;} destroy(){this.destroyed=true;} }
  Hls.isSupported=()=>true; Hls.Events={ERROR:'error',MANIFEST_PARSED:'parsed'};
  const api={open(){},getState(){return 'IDLE';},close(){},setListener(){},setDisplayRect(){},setDisplayMethod(){},prepareAsync(ok,fail){fail({message:'PLAYER_ERROR_CONNECTION_FAILED'});}};
  const context={URL,console,document:{getElementById:id=>nodes[id]},XMLHttpRequest:function(){request=this;this.open=()=>{};this.send=()=>{};this.abort=()=>{this.aborted=true;};}};
  context.window={Hls,webapis:{avplay:api},setTimeout:f=>{timers.set(++sequence,f);return sequence;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync('LiveChannels/player.js','utf8'),context);
  return {api,player:context.window.channelPlayer,nodes,instances,timers,get request(){return request;}};
}
let f=fixture(),messages=[];
f.player.play({url:'https://example.com/live.m3u8'},m=>messages.push(m));
assert.equal(f.instances.length,1,'native failure invokes fallback');
f.instances[0].video.onplaying();assert.equal(messages.at(-1),'');
f.player.stop();assert(f.instances[0].destroyed);assert(f.nodes['browser-video'].hidden);assert.equal(f.timers.size,0);
f=fixture();f.player.play({url:'https://ncdn.telewebion.ir/tv1/live/playlist.m3u8'},()=>{});
const req=f.request;f.player.stop();req.status=200;req.responseText='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\n480p/index.m3u8';req.responseURL='https://live.telewebion.ir/ek/tv1/live/playlist.m3u8';req.onload();assert.equal(f.instances.length,0,'cancelled lookup must not start playback');
f=fixture();f.player.play({url:'https://live.telewebion.ir/ek/tv1/live/1080p/index.m3u8'},()=>{});
f.request.status=200;f.request.responseText=req.responseText;f.request.responseURL=req.responseURL;f.request.onload();assert.equal(f.instances[0].url,'https://live.telewebion.ir/ek/tv1/live/480p/index.m3u8');
f.player.stop();console.log('Player fallback, stop cleanup, resolver and cancellation passed');

f=fixture();let state='PLAYING';f.api.getState=()=>state;f.api.pause=()=>{state='PAUSED';};f.api.play=()=>{state='PLAYING';};assert.equal(f.player.setPaused(true),true);assert(f.player.isPaused());assert.equal(f.player.setPaused(false),false);assert.equal(state,'PLAYING');
f.nodes['browser-video'].hidden=false;f.nodes['browser-video'].pause=function(){this.paused=true;};f.nodes['browser-video'].play=function(){this.paused=false;return Promise.resolve();};f.player.setPaused(true);assert(f.player.isPaused());f.player.setPaused(false);assert(!f.player.isPaused());console.log('Native and compatibility pause/resume passed');
