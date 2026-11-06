(function(root){
  'use strict';
  function listings(data,channel,now){
    var entry=data&&data.channels&&data.channels[channel.url];
    var ps=entry&&Array.isArray(entry.programmes)?entry.programmes.filter(function(p){return Number.isFinite(p.start)&&Number.isFinite(p.end)&&p.end>p.start&&typeof p.title==='string';}).slice().sort(function(a,b){return a.start-b.start;}):[];
    var current=ps.find(function(p){return p.start<=now&&now<p.end;})||null;
    return {now:current,next:ps.find(function(p){return current?p.start>=current.end:p.start>now;})||null,programmes:ps,source:entry&&entry.source};
  }
  function today(programmes,now){
    var start=new Date(now);start.setHours(0,0,0,0);var end=new Date(start);end.setDate(end.getDate()+1);
    return programmes.filter(function(p){return p.start<end.getTime()&&p.end>start.getTime();});
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={listings:listings,today:today};return;}
  var data=null,loaded=false,listeners=[],lastFetch=0;
  function emit(){listeners.forEach(function(fn){fn();});}
  function accept(value){if(!value||!value.channels||!Number.isFinite(value.generatedAt))return;if(!data||value.generatedAt>=data.generatedAt){data=value;emit();}}
  function fetchGuide(url){var xhr=new XMLHttpRequest();xhr.open('GET',url,true);xhr.timeout=15000;xhr.onload=function(){loaded=true;if(xhr.status===200||(xhr.status===0&&url==='schedules.json')){try{accept(JSON.parse(xhr.responseText));}catch(e){}}emit();};xhr.onerror=xhr.ontimeout=function(){loaded=true;emit();};try{xhr.send();}catch(e){loaded=true;emit();}}
  root.channelSchedule={
    get:function(c){var result=listings(data,c,Date.now());result.loading=!loaded;result.updated=data&&data.generatedAt;return result;},
    today:today,
    subscribe:function(fn){listeners.push(fn);},
    refresh:function(){if(Date.now()-lastFetch<3600000)return;lastFetch=Date.now();fetchGuide('schedules.json');fetchGuide('https://raw.githubusercontent.com/Saeed-rbh/live-channels-tizen/main/LiveChannels/schedules.json');}
  };
  root.channelSchedule.refresh();
  setInterval(function(){root.channelSchedule.refresh();emit();},60000);
}(this));
