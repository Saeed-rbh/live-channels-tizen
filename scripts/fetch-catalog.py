import json,subprocess,concurrent.futures
from pathlib import Path
base=Path('.cache/catalog/merged');base.mkdir(parents=True,exist_ok=True)
for kind in ['channels', 'feeds']:
 subprocess.run(['curl','-fLsS','--max-time','30','https://iptv-org.github.io/api/'+kind+'.json','-o','.cache/catalog/'+('channel-metadata.json' if kind=='channels' else 'feed-metadata.json')],check=True)
urls=json.load(open('scripts/playlist-sources.json'))
def get(item):
 i,url=item;p=base/(str(i)+'.m3u');r=subprocess.run(['curl','-fLsS','--max-time','30',url,'-o',str(p)],capture_output=True);return dict(url=url,path=str(p),ok=r.returncode==0)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(get,enumerate(urls)))
(base/'sources.json').write_text(json.dumps(rows));print('Loaded',sum(r['ok'] for r in rows),'of',len(rows))
