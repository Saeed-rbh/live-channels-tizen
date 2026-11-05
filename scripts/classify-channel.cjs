// Content categories only: language and provider labels are not genres.
function classify(c,m){
 const name=c.name.toLowerCase(), hints=(c.group+' '+((m&&m.categories)||[]).join(' ')).toLowerCase();
 const t=name+' '+hints;
 const sports=[['Football',/\b(?:football|soccer|fifa|goal tv|premier league|laliga|uefa|barca|lfc|mutv|real madrid)\b|فوتبال/],['Combat Sports',/\b(?:fight|fighting|boxing|ufc|mma|wrestling|tna|martial)\b|رزمی|کشتی/],['Motorsport',/\b(?:motorsport|motorracing|motorvision|nascar|racer|racing|nhra|floracing|auto moto|mtrspt1)\b/],['Tennis',/\btennis\b/],['Cricket',/\b(?:cricket|willow)\b/],['Basketball',/\b(?:basketball|nba|hoop)\b/],['Golf',/\b(?:golf|pga)\b/],['Outdoor Sports',/\b(?:fishing|surf|surfing|freesports|fuel tv|red bull|outdoor|hunting|hunt fish|darcizzle|skiing)\b/]];
 for(const [group,pattern] of sports)if(pattern.test(name))return 'Sports;'+group;
 if(/\b(?:sports?|varzesh|espn|stadium)\b|ورزش/.test(t))return 'Sports';
 const rules=[
 ['Weather',/\b(?:weather|accuweather)\b|هواشناسی/],
 ['Business & Finance',/\b(?:bloomberg|cnbc|business|finance|financial|investment|ameritrade|ausbiz|cheddar)\b|اقتصاد/],
 ['Food & Cooking',/\b(?:food|cooking|cook|kitchen|chef|tastemade|gusto|bon appetit)\b|آشپزی/],
 ['Travel',/\b(?:travel|voyage|tourism|destination|travelxp)\b|گردشگری/],
 ['Kids & Family',/\b(?:kids|children|cartoon|junior|animation|nickelodeon|cbeebies|babytv|baby tv|boomerang|pogo)\b|کودک|پویا/],
 ['News',/\b(?:news|irinn|cnn|al jazeera|euronews|france 24|iran international|bbc persian|bbc farsi|dw english|press tv)\b|اخبار|خبر/],
 ['Crime & Investigation',/\b(?:crime|investigation|forensic|court tv|true crime|law & crime|law and crime)\b/],
 ['Comedy',/\b(?:comedy|sitcom|laugh|funny|stand.?up)\b|طنز/],
 ['Movies & Series',/\b(?:movies?|cinema|series|drama|ifilm|tamasha|film|films|hollywood|paramount|hallmark)\b|فیلم|سریال|تماشا/],
 ['Music',/\b(?:music|mtv|vevo|radio javan|concert|dj|setmix)\b|موسیقی|آوا/],
 ['Documentaries',/\b(?:documentar\w*|nature|wildlife|history|science|discovery|national geographic|nat geo|animal kingdom|ak[c] tv|smithsonian)\b|مستند/],
 ['Education',/\b(?:education\w*|learning|learn|amouzesh|ted|nasa|university|school)\b|آموزش/],
 ['Lifestyle',/\b(?:lifestyle|fashion|health|wellness|fitness|yoga|home|garden|pets|medical)\b|سلامت/],
 ['Faith & Culture',/\b(?:religio\w*|quran|islam\w*|christian\w*|church|bible|gospel|faith|spiritual|culture)\b|قرآن|مذهب/],
 ['Shopping',/\b(?:shop\w*|qvc|hsn)\b|خرید/],
 ['Local & Regional',/\b(?:access|community|government|public access|county|municipal|city council|local|provincial|regional)\b|\b(?:abc|cbs|nbc|fox) [kw][a-z]{2,5}\b/],
 ['Entertainment',/\b(?:entertainment|reality|game show|gameshow|10 peach|7mate|7two|e!)\b|سرگرمی/]
 ];
 for(const [group,pattern] of rules)if(pattern.test(name))return group;
 // Use explicit genre metadata after channel-name rules, avoiding misleading provider names.
 for(const [group,pattern] of rules)if(pattern.test(hints))return group;
 return 'General TV';
};

// Reviewed families from the remaining General TV catalog. These rules only
// refine General TV; they do not override a channel's established genre.
const reviewed = [
 ['Politics & Public Affairs', /\b(?:c-span|cpac|parliament|parliamentary|oireachtas|legislative|sansad|alþingi|ct-n|council|ebs\+?)\b/i],
 ['Automotive', /\b(?:cars|cars\.tv|canal motor|motor ?trend|pluto tv motor|fifth gear|full custom garage|powernation|speedvision|rev.n)\b/i],
 ['Classic TV & Westerns', /\b(?:classic tv|classics|cinevault westerns|western tv|westerns|retro tv|tvs nostalgia|the archive|wanted: dead or alive|whiplash|gem classic)\b/i],
 ['Pets & Animals', /\b(?:pet collective|pet parade|pets|real wild)\b/i],
 ['Technology & Gaming', /\b(?:techstorm|dungeon tv)\b/i],
 ['Sports;Outdoor Sports', /\b(?:field & stream|outside tv|pursuit(?:up| channel)?|spike outdoors|waypoint|wired2fish|wild tv|the cowboy channel|horse & country|gctv)\b/i],
 ['Sports', /\b(?:big ten network|sec network|tsn[1-5]?|yes network|rugby ?pass|world billiards|vsin)\b/i],
 ['Music', /\b(?:bet jams|bet soul|deejay|kpop|revolt|soundcity|sun fm|pulse95|wlng radio)\b/i],
 ['Education', /\b(?:irib amoozesh|ualr|batv educational)\b/i],
 ['Documentaries', /\b(?:irib mostanad|quest tv|story television|insayt|clarity 4k)\b/i],
 ['Lifestyle', /\b(?:awe(?: plus| international)?|homeful|myzen|zenlife|golkhane|irib salamat|salamat tv|wine watches & whiskey)\b/i],
 ['Crime & Investigation', /\b(?:buzzfeed unsolved|ion mystery|sherlock|cr[ií]menes imperfectos|tvs cipher)\b/i],
 ['Comedy', /\b(?:beverly hillbillies|hogan.s heroes|frasier|portlandia|andy griffith|carol burnett|the millers|the nanny|tim conway)\b/i],
 ['Kids & Family', /\b(?:rainbow ruby|rev and roll|rtejr|yu-gi-oh)\b/i],
 ['News', /\b(?:real america.s voice|the hill tv|talktv|taiwan plus|dd india)\b/i],
 ['Faith & Culture', /\b(?:tbn|cbn|tct|scientology|great commission|his glory|overcomers|praise tv|resurrection|sunna|supreme master|swamiji|synagogue|world harvest|velayat|nejat|tekyemadahi|labbayk)\b/i],
 ['Movies & Series', /\b(?:hbo|starz|showtime|studio universal|talking pictures|pixl|positiv|shemaroo|silver screen|séptimo arte|shout! factory|sci fi|the love boat|w network|wedo tv amor)\b/i],
 ['Shopping', /\b(?:tv warehouse|window tv)\b/i],
 ['Entertainment', /\b(?:bravo|bounce|binge|bet|celebrity scene|dove channel|irib nasim|tapesh|ava family|tv land|tbs|tnt|trutv|together tv|sbs viceland|vice tv|funbox|brit asia|vegas life|tvnz duke)\b|^itv ?[24]\b/i],
 ['Entertainment', /^(?:bbc three|beyond belief|byu tv|dubai one|fx \(|itv ?2|u&w|tvnz duke|sony canal escape perfecto|tvs quiz show|tvs talk|tvs select|tvs family|up tv)\b/i],
 ['Lifestyle', /\b(?:dr pal|bride tv|the boat show|rfd-tv)\b/i],
 ['Faith & Culture', /^(?:labbayktv|sangat tv|salaam tv|ganj e hozour|the walk tv|tln kqsl|wacx|watc-dt|wggs-tv)\b/i],
 ['Music', /^(?:magic tv \(bulgaria\)|folk tv)\b/i],
 ['Sports;Outdoor Sports', /^(?:wired2fishtv|okhota i rybalka)\b/i],
 ['Local & Regional', /^rvtv (?:civic|grants pass|prime|voices)\b/i],
 ['Local & Regional', /^(?:bhtv\d+|can tv\d+|nctv\d+|sfgovtv\d*|phlgovtv|rctv3|communitytv|batv|best of batv|ctb perth|cape town tv|chch-dt|chco-tv|knxv-tv|kpvm-ld|ktoo|latest tv|irib(?: tv)?5|toronto 360|tv 16 toronto|yuma77)\b/i],
 ['Local & Regional', /\b(?:accessvision|akaku|atxn[1-3]|atl 26|auroratv|bhtv|big civic|bptv|bx omni|c31 melbourne|cable 14|can tv|capital city connection|cc-tv|ccx1|cerritos|cgtv|city of|city tv|citytv|cmac|cmap|collier|concord|contra costa|creatv|cvc public|cvtv|cypress|denver 8|derrytv|detroit channel|district of columbia|fc public|fctv|fernandina|fgtv|g10tv|glendale|greensboro|hillsborough|houston television|kfon|koct|la cityview|lake havasu|lakefront|lakewood|leominster|lex tv|littleton|mbtv|midpen media|montgomery channel|mrvtv|nactv|ncm main|nctv|nmbtv|olelo|pasco|pbc tv|pct channel|pctv|phillycam|phlgov|phxtv|pomona|psl tv|rctv|rocky hill|scottsdale|scvtv|sf commons|sfgov|sgtn|sgtv|sheffield live|smctv|stockton gov|tap tv|tbcn|temecula|tempe 11|the burbank|the monterey|the peninsula|thornton|tvsa public|ugtv|vcat|wcot|wehotv|willamette|witn22|youdotgov|yuma)\b/i],
 ['Local & Regional', /^(?:abadan|aflak|aftab|alborz|atrak|baran|boushehr|dena|esh rag[h]?|eshragh|fars|hamedan|hamoon|ilam|isfahan|jahanbin|karoon|kerman|khalij|khavaran|khorasan|khozestan|kish|kordestan|mahabad|qazvin|razavi|sabalan|sahand|sarbedaran|semnan|tabarestan|tehran|west azerbaijan|yazd|zagros)\b/i],
 ['Local & Regional', /^(?:fox \(united states\).*\b[kw][a-z]{2,5}|cbc television \w+-dt|abc tv (?:act|nt|qld|sa|tas|vic|wa)|bbc one (?![Ⓖ(]|$)|bbc two (?:northern ireland|wales)|bbc scotland|channel 9 \(australia\) (?:adelaide|brisbane|perth)|ctv \(canada\) cfto|mnt [kw][a-z]{2,5})/i]
];
module.exports=function(c,m){
 const base=classify(c,m);
 if(base!=='General TV')return base;
 const rule=reviewed.find(r=>r[1].test(c.name));
 return rule?rule[0]:base;
};
