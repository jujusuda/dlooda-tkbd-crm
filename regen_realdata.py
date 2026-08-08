#!/usr/bin/env python3
# 从飞书多维表格重新生成 js/real-data.js（修正视频链接根因）
# 严格复用 server/config.json 字段映射 + sync.mjs 的 extractUrl 逻辑
import urllib.request, urllib.parse, json, subprocess, datetime, os, sys, re

# 从环境变量或项目根目录 .env 文件读取飞书凭据，避免把 secret 写入代码
ROOT = os.path.dirname(os.path.abspath(__file__))

def _load_dotenv():
    path = os.path.join(ROOT, '.env')
    if not os.path.exists(path):
        return {}
    env = {}
    with open(path, encoding='utf-8') as fp:
        for line in fp:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

_dotenv = _load_dotenv()

def _env(key, fallback=None):
    return os.environ.get(key) or _dotenv.get(key) or fallback

APP_ID = _env('FEISHU_APP_ID')
APP_SECRET = _env('FEISHU_APP_SECRET')
BASE = _env('FEISHU_BASE_APP_TOKEN')

if not APP_ID or not APP_SECRET or not BASE:
    print('ERROR: 缺少飞书凭据。')
    print('请在项目根目录创建 .env 文件并写入：')
    print('  FEISHU_APP_ID=cli_xxxxxxxxxx')
    print('  FEISHU_APP_SECRET=xxxxxxxxxx')
    print('  FEISHU_BASE_APP_TOKEN=<你的 base app token>')
    print('或者设置环境变量后再运行本脚本。')
    sys.exit(1)

OUT = os.path.join(ROOT, 'js', 'real-data.js')
CFG = json.load(open(os.path.join(ROOT, 'server', 'config.json'), encoding='utf-8'))['feishu']['tables']

def get_token():
    out = subprocess.check_output(
        ['curl', '-s', '-X', 'POST',
         'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
         '-H', 'Content-Type: application/json',
         '-d', json.dumps({'app_id': APP_ID, 'app_secret': APP_SECRET})])
    return json.loads(out).get('tenant_access_token', '')

TOKEN = get_token()
if not TOKEN:
    print('获取 token 失败'); sys.exit(1)

def api_get(url):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + TOKEN})
    return json.load(urllib.request.urlopen(req))

def get_all(table_id):
    items, pt = [], ''
    while True:
        url = f'https://open.feishu.cn/open-apis/bitable/v1/apps/{BASE}/tables/{table_id}/records?page_size=100'
        if pt:
            url += '&page_token=' + urllib.parse.quote(pt)
        d = api_get(url)
        items.extend(d.get('data', {}).get('items', []))
        pt = d.get('data', {}).get('page_token', '')
        if not pt:
            break
    return items

def g(f, name):
    v = f.get(name)
    return v if v is not None else None

def extract_url(u):
    if not u:
        return ''
    if isinstance(u, str):
        return u.strip()
    if isinstance(u, list):
        return extract_url(u[0]) if u else ''
    if isinstance(u, dict):
        return (u.get('link') or u.get('url') or u.get('text') or '').strip()
    return str(u).strip()

def parse_date(v):
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        try:
            return datetime.datetime.fromtimestamp(v / 1000).strftime('%Y-%m-%d %H:%M') if v > 1e12 else datetime.datetime.fromtimestamp(v).strftime('%Y-%m-%d')
        except Exception:
            return str(v)
    return str(v).strip()

def num(v):
    if v in (None, '', 0, 0.0):
        return None if v in (None, '') else v
    try:
        return v if isinstance(v, (int, float)) else (None if str(v).strip() == '' else float(str(v)))
    except Exception:
        return None

def build_sample(rec, F):
    f = rec.get('fields', {})
    videos = []
    idxs = sorted(int(m.group(1)) for k in f for m in [re.match(r'^视频(\d+)$', k)] if m)
    for i in idxs:
        u = extract_url(f.get('视频' + str(i)))
        t = parse_date(f.get('视频' + str(i) + '时间'))
        if u:
            videos.append({'url': u, 'time': t})
    return {
        '_rid': rec.get('record_id'), 'creator': g(f, F['creator']), 'official': g(f, F['official']),
        'stars': g(f, F['stars']), 'creatorType': g(f, F['creatorType']),
        'orderCount': g(f, F['orderCount']), 'reinvest': g(f, F['reinvest']),
        'approval': g(f, F['approval']), 'language': g(f, F['language']),
        'bodyType': g(f, F['bodyType']), 'age': g(f, F['age']),
        'fulfillment': g(f, F['fulfillment']), 'category': g(f, F['category']),
        'note': g(f, F['note']), 'color': g(f, F['color']), 'sku': g(f, F['sku']),
        'sampleTime': parse_date(g(f, F['sampleTime'])), 'updateTime': parse_date(g(f, F['updateTime'])),
        'fulfillMethod': g(f, F['fulfillMethod']), 'videos': videos,
    }

def build_pending(rec, F):
    f = rec.get('fields', {})
    return {'_rid': rec.get('record_id'), 'name': g(f, F['name']), 'official': g(f, F['official']),
        'stars': g(f, F['stars']), 'bodyType': g(f, F['bodyType']), 'age': g(f, F['age']),
        'fulfillment': g(f, F['fulfillment']), 'category': g(f, F['category']), 'note': g(f, F['note']),
        'color': g(f, F['color']), 'sku': g(f, F['sku']), 'rejectReason': g(f, F['rejectReason']),
        'reprocessTime': parse_date(g(f, F['reprocessTime'])), 'result': g(f, F['result'])}

def build_invite(rec, F):
    f = rec.get('fields', {})
    return {'_rid': rec.get('record_id'), 'date': parse_date(g(f, F['date'])), 'sku': g(f, F['sku']),
        'creatorId': g(f, F['creatorId']), 'category': g(f, F['category']), 'commission': g(f, F['commission']),
        'validDays': g(f, F['validDays']), 'planTarget': num(g(f, F['planTarget'])), 'achieved': num(g(f, F['achieved'])),
        'note': g(f, F['note']), 'script': g(f, F['script'])}

def build_task(rec, F):
    f = rec.get('fields', {})
    return {'_rid': rec.get('record_id'), 'sku': g(f, F['sku']), 'priority': g(f, F['priority']),
        'positioning': g(f, F['positioning']), 'startTime': parse_date(g(f, F['startTime'])),
        'target': num(g(f, F['target'])), 'completed': num(g(f, F['completed'])),
        'uncompleted': num(g(f, F['uncompleted'])), 'avgDaily': num(g(f, F['avgDaily'])),
        'todayCompleted': num(g(f, F['todayCompleted'])), 'note': g(f, F['note'])}

def build_product(rec, F):
    f = rec.get('fields', {})
    return {'_rid': rec.get('record_id'), 'sku': g(f, F['sku']), 'positioning': g(f, F['positioning']),
        'productId': g(f, F['productId'])}

def build_offline(rec, F):
    f = rec.get('fields', {})
    return {'_rid': rec.get('record_id'), 'creator': g(f, F['creator']), 'sku': g(f, F['sku']),
        'color': g(f, F['color']), 'sampleTime': parse_date(g(f, F['sampleTime'])), 'note': g(f, F['note'])}

print('拉取飞书数据...')
raw = {k: get_all(CFG[k]['tableId']) for k in ['daily', 'pending', 'invites', 'tasks', 'offline', 'products']}
print('counts:', {k: len(v) for k, v in raw.items()})

samples_all = [build_sample(r, CFG['daily']['fields']) for r in raw['daily']]
samples = [s for s in samples_all if s['creator']]
print('daily raw=%d, samples(filtered)=%d' % (len(samples_all), len(samples)))
if samples_all and not samples:
    print('WARN: 全部样本 creator 为空，第一条字段:', list(samples_all[0]['creator'] and {}) or 'creator=None')
    print('  第一条 fields:', list(raw['daily'][0]['fields'].keys()))

creators_map = {}
for s in samples:
    n = s['creator']
    if n not in creators_map:
        creators_map[n] = {'name': n, 'official': s['official'], 'stars': s['stars'], 'creatorType': s['creatorType'],
            'bodyType': s['bodyType'], 'age': s['age'], 'fulfillment': s['fulfillment'], 'category': s['category'],
            'note': s['note'], 'sampleCount': 0, 'videoCount': 0, 'skus': [], 'lastSampleTime': None}
    c = creators_map[n]
    c['sampleCount'] += 1; c['videoCount'] += len(s['videos'])
    if s['sku'] and s['sku'] not in c['skus']:
        c['skus'].append(s['sku'])
    if s['sampleTime'] and (c['lastSampleTime'] is None or s['sampleTime'] > c['lastSampleTime']):
        c['lastSampleTime'] = s['sampleTime']
creators = list(creators_map.values())

pending = [p for p in (build_pending(r, CFG['pending']['fields']) for r in raw['pending']) if p['name']]
invites = [i for i in (build_invite(r, CFG['invites']['fields']) for r in raw['invites']) if (i['date'] or i['sku'])]
tasks = [t for t in (build_task(r, CFG['tasks']['fields']) for r in raw['tasks']) if t['sku']]
products = [p for p in (build_product(r, CFG['products']['fields']) for r in raw['products']) if p['sku']]
offline = [o for o in (build_offline(r, CFG['offline']['fields']) for r in raw['offline']) if (o['creator'] or o['sku'])]

stats = {'creatorCount': len(creators), 'sampleCount': len(samples), 'pendingCount': len(pending),
    'inviteCount': len(invites), 'taskCount': len(tasks), 'skuCount': len(products),
    'offlineCount': len(offline), 'videoCount': sum(len(s['videos']) for s in samples),
    'syncedAt': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}

data = {'creators': creators, 'samples': samples, 'pending': pending, 'invites': invites,
        'tasks': tasks, 'skus': products, 'offline': offline}

with open(OUT, 'w', encoding='utf-8') as fp:
    fp.write('// Auto-generated from Feishu Bitable (OpenAPI)\n')
    fp.write('// Generated: ' + stats['syncedAt'] + '\n')
    fp.write('// DO NOT EDIT MANUALLY - regenerate via server sync\n\n')
    fp.write('window.REAL_DATA = ')
    json.dump(data, fp, ensure_ascii=False, indent=2)
    fp.write(';\n\nwindow.REAL_DATA_STATS = ')
    json.dump(stats, fp, ensure_ascii=False, indent=2)
    fp.write(';\n')

valid = sum(1 for s in samples for v in s['videos'] if v['url'] and v['url'] != '[object Object]')
print('生成完成。有效视频链接: %d / %d' % (valid, stats['videoCount']))
print('samples=%d creators=%d pending=%d invites=%d tasks=%d skus=%d offline=%d' % (
    stats['sampleCount'], stats['creatorCount'], stats['pendingCount'], stats['inviteCount'],
    stats['taskCount'], stats['skuCount'], stats['offlineCount']))
