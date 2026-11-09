"""生成 js/order-data.js —— 订单级数据（按 视频×日期×SKU 聚合），供 CRM 前端分析新老视频。
用法：python scripts/build_order_data.py <xlsx> <real-data.js 或 /api/data 抓下来的文件>
"""
import openpyxl, re, json, collections, sys, os

XLSX = sys.argv[1] if len(sys.argv) > 1 else r'E:\xwechat_files\wxid_od6e7r1klxs422_54c2\msg\file\2026-11\D店2025年9月-2026年10月22日总订单.xlsx'
LIVE = sys.argv[2] if len(sys.argv) > 2 else r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\work\_live.js'
OUT = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\js\order-data.js'

# ---------- 1. 订单表 ----------
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb['Sheet1']
it = ws.iter_rows(values_only=True)
h = [str(x).strip() if x else '' for x in next(it)]
I = {name: i for i, name in enumerate(h) if name}

def g(row, name):
    i = I.get(name)
    return row[i] if i is not None and i < len(row) else None

sku_re = re.compile(r'DLTK\w*?(\d{4,5})H', re.I)
pid_map = collections.defaultdict(collections.Counter)
rows = []
for row in it:
    s = g(row, '卖家 SKU'); pid = g(row, '商品 ID')
    m = sku_re.search(str(s)) if s else None
    if m and pid:
        pid_map[str(pid)][m.group(1)] += 1
    rows.append(row)

recs = []
for row in rows:
    cid = g(row, '内容ID')
    if not cid:
        continue
    s = g(row, '卖家 SKU'); pid = g(row, '商品 ID')
    m = sku_re.search(str(s)) if s else None
    sku = m.group(1) if m else ''
    if not sku and pid and str(pid) in pid_map:
        sku = pid_map[str(pid)].most_common(1)[0][0]
    pay = str(g(row, '支付时间') or '')
    pm = re.match(r'(\d{2})/(\d{2})/(\d{4})', pay)
    day = f'{pm.group(3)}-{pm.group(2)}-{pm.group(1)}' if pm else ''
    recs.append((str(cid).strip(), sku, day,
                 int(float(g(row, '下单件数') or 0)),
                 round(float(g(row, '支付金额') or 0), 2),
                 1 if str(g(row, '已全部退货或全额退款') or '').strip() == '是' else 0,
                 str(g(row, '达人用户名') or '').strip()))

# ---------- 2. 视频表（内容ID -> 发布日期 / 达人 / SKU） ----------
txt = open(LIVE, encoding='utf-8').read()
vm = re.search(r'window\.REAL_DATA\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:window\.|$)', txt)
raw = None
if vm:
    try:
        raw = json.loads(vm.group(1))
    except Exception:
        raw = None
if raw is None:
    idx = txt.find('window.REAL_DATA')
    start = txt.find('{', idx)
    depth = 0
    for i in range(start, len(txt)):
        if txt[i] == '{':
            depth += 1
        elif txt[i] == '}':
            depth -= 1
            if depth == 0:
                raw = json.loads(txt[start:i + 1])
                break
videos = (raw or {}).get('videos') or []
id_re = re.compile(r'/video/(\d+)')

vid_index = {}
vlist = []
for v in videos:
    mm = id_re.search(v.get('url') or '')
    if not mm:
        continue
    vid_index[mm.group(1)] = len(vlist)
    vlist.append([str(v.get('date') or '')[:10], v.get('creator') or '', str(v.get('sku') or '')])

# ---------- 3. 聚合到 (视频, 日期) ----------
buckets = {}
unmatched = {}
for cid, sku, day, units, amt, refund, creator in recs:
    vi = vid_index.get(cid)
    if vi is None:
        key = ('u', cid)
        b = unmatched.setdefault(key, [day, creator, sku, 0, 0, 0.0, 0])
        b[3] += 1; b[4] += units; b[5] += amt; b[6] += refund
        continue
    k = (vi, day)
    b = buckets.setdefault(k, [0, 0, 0.0, 0])
    b[0] += 1; b[1] += units; b[2] += amt; b[3] += refund

# 未匹配视频也进 v 列表（日期为空，前端计入「未知视频」）
for (tag, cid), b in unmatched.items():
    vid_index[cid] = len(vlist)
    vlist.append(['', b[1], b[2]])

o = []
for (vi, day), b in buckets.items():
    o.append([vi, day, b[0], b[1], round(b[2], 2), b[3]])
for (tag, cid), b in unmatched.items():
    o.append([vid_index[cid], b[0], b[3], b[4], round(b[5], 2), b[6]])

o.sort(key=lambda r: (r[1], r[0]))

payload = {'g': '2026-11-08', 'v': vlist, 'o': o,
           'meta': {'orders': len(recs), 'videos': len(vlist), 'buckets': len(o)}}

js = 'window.ORDER_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(js)
print('订单:', len(recs), '| 视频:', len(vlist), '| 聚合行:', len(o))
print('输出:', OUT, round(os.path.getsize(OUT) / 1024 / 1024, 2), 'MB')
