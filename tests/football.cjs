const assert=require('assert'),candidate=require('../scripts/football-candidates.cjs');
for(const name of ['IRIB TV3','IRIB3 (1080p)','Varzesh TV','beIN Sports Xtra','TNT Sports 2','TSN2','BBC One London HD','ITV 1','ITV4 (360p)','CBS KIRO-TV','NBC KNTV','Fox (United States) KCPQ','Telewebion Sport 1','Persiana Sports 4'])assert(candidate({name,group:'General TV'}),name);
for(const name of ['BBC News','BBC Food','ITV Persian Music','CBS News NOW','NBC Comedy Vault','Fox News','Sky Sports F1','Sky Sports NFL','Willow Sports','Tennis Channel T2','NASCAR','Persiana Fight'])assert(!candidate({name,group:'Sports'}),name);
console.log('26 football candidate checks passed');
