// Soccer-specific channels and mixed-programming broadcasters that can carry it.
// This is a potential-broadcaster filter, not a current-match or rights schedule.
module.exports=function(c){
 const n=c.name.toLowerCase();
 if(c.group.split(';').includes('Football'))return true;
 if(/\b(?:f1|nfl|cricket|tennis|golf|wrestling|fight|mma|nascar|basketball|hockey|baseball)\b/.test(n))return false;
 return /\b(?:bein sports|espn(?: ?[12])?|tnt sports|premier sports|setanta sports|sony sports ten|star sports(?: select)?|s sport|sky sports? (?:[1-9]|select|football|premier league|main event|arena|mix)|tsn[1-5]|sporty tv|cbs sports golazo|cbs sports network|nbc sports|persiana sports|varzesh|telewebion sport|abu dhabi sports|sharjah sports|oman sports|ktv sport)\b/.test(n) ||
 /^irib(?: tv)?3\b|^irib (?:varzesh|uhd)\b|^bbc (?:one|two|scotland|red button)\b|^itv ?(?:1|4)\b/.test(n) ||
 /^(?:cbs|nbc)(?:\s*\(|\s+[kw][a-z]{2,5}\b|\s+(?:east|west)\b|$)/.test(n) ||
 /^fox \(united states\)/.test(n);
};
