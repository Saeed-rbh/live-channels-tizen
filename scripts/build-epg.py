"""Build a small, exact-channel XMLTV index. All timestamps are UTC milliseconds."""
import concurrent.futures,datetime as dt,gzip,json,re,subprocess,sys,unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc

def stamp(value):
    try:return int(dt.datetime.strptime(value.strip(),'%Y%m%d%H%M%S %z').timestamp()*1000)
    except (ValueError,AttributeError):return None

def normal(value):
    value=re.sub(r'\([^)]*\)|\[[^]]*\]|@.*','',value)
    value=re.sub(r'\b(?:HD|SD|FHD|UHD|4K)\b','',value,flags=re.I)
    return ''.join(c for c in unicodedata.normalize('NFKD',value.lower()) if c.isalnum())

def soccer(title,categories):
    text=' '.join([title]+categories)
    return bool(re.search(r'soccer|football|champions league|premier league|la ?liga|bundesliga|serie a|fifa|uefa|فوتبال',text,re.I)) and not re.search(r'american football|college football|\bNFL\b',text,re.I)

def run():
    catalog=json.loads((ROOT/'LiveChannels/catalog.js').read_text().split('=',1)[1].strip().rstrip(';'))
    now=int(dt.datetime.now(UTC).timestamp()*1000)
    low,high=now-36*3600000,now+72*3600000
    cache=ROOT/'.cache/epg';cache.mkdir(parents=True,exist_ok=True)
    sources=json.loads((ROOT/'scripts/epg-sources.json').read_text())
    def fetch(source):
        path=cache/(source['id']+'.xml.gz')
        if '--cached' not in sys.argv:
            r=subprocess.run(['curl','-fLsS','--retry','1','--max-time','60',source['url'],'-o',str(path)],capture_output=True)
            if r.returncode:return source,None
        try:return source,ET.parse(gzip.open(path)).getroot()
        except (OSError,ET.ParseError):return source,None
    output={};health=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for source,root in pool.map(fetch,sources):
            if root is None:health.append({'id':source['id'],'status':'unavailable'});continue
            names={};programmes={}
            for c in root.findall('channel'):
                cid=c.get('id');values=[n.text or '' for n in c.findall('display-name')]
                values.append(re.sub(r'\.(?:uk|us2?|ir)$','',cid,flags=re.I).replace('.',' '))
                # IDs in the Persian feed are authoritative; avoid ambiguous generic English names.
                if source['id']=='persian':values=[cid]
                for v in values:names.setdefault(normal(v),set()).add(cid)
            for p in root.findall('programme'):
                start,end=stamp(p.get('start')),stamp(p.get('stop'))
                title=p.findtext('title','').strip()
                if not start or not end or end<=low or start>=high or end<=start or not title:continue
                # Generic placeholders do not describe an actual programme.
                if re.fullmatch(r'no (?:programme|program) information|programming|برنامه های شبکه',title,re.I):continue
                cats=[c.text or '' for c in p.findall('category')]
                programmes.setdefault(p.get('channel'),[]).append({'start':start,'end':end,'title':title,'football':bool(soccer(title,cats))})
            for ps in programmes.values():ps.sort(key=lambda p:p['start'])
            matched=0
            for c in catalog:
                raw_id=c.get('tvgId','');ident=raw_id.split('@')[0]
                variant=raw_id.split('@',1)[1] if '@' in raw_id else ''
                regional=bool(variant and not re.fullmatch(r'(?:SD|HD|FHD|UHD|4K|8K|[0-9]+[pi])',variant,re.I))
                country=re.search(r'\.([a-z]{2})$',ident,re.I)
                if source['id'] in ('uk','us') and country and country[1].lower()!=source['id']:continue
                keys=[normal(re.sub(r'\.[a-z]{2}$','',ident,flags=re.I))] if ident and not regional else []
                if regional:keys.append(normal(re.sub(r'\.[a-z]{2}$','',ident,flags=re.I)+re.sub(r'(?:HD|SD)$','',variant,flags=re.I)))
                if source['id']!='persian':keys.insert(0,normal(c['name']))
                if source['id']=='persian':
                    tv=re.match(r'^IRIB(?: TV)?([1-5])\b',c['name'],re.I)
                    if tv:keys.insert(0,normal('IRIB'+tv[1]+'.ir'))
                    if re.search('varzesh',c['name'],re.I):keys.insert(0,normal('VarzeshTV.ir'))
                cid=None
                if ident in programmes and not regional:cid=ident
                for key in keys:
                    candidates=names.get(key,set())
                    if not cid and len(candidates)==1:cid=next(iter(candidates))
                if cid not in programmes:continue
                ps=programmes[cid]
                if not any(p['end']>now for p in ps):continue
                if c['url'] not in output:
                    output[c['url']]={'source':source['id'],'channel':cid,'programmes':ps};matched+=1
            health.append({'id':source['id'],'status':'ok' if programmes else 'no_current_listings','matched':matched})
    payload={'generatedAt':now,'sources':health,'channels':output}
    # Never erase a still-useful cached guide merely because all providers failed.
    if not output:raise SystemExit('No current schedules: retaining previous guide')
    path=ROOT/'LiveChannels/schedules.json';path.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({'matched':len(output),'footballChannels':sum(c.get('footballCandidate',False) and c['url'] in output for c in catalog),'sources':health}))
if __name__=='__main__':run()
