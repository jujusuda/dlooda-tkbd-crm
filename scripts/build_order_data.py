"""生成 js/order-data.js —— 订单级数据（按 视频×日期×SKU 聚合），供 CRM 前端分析新老视频。
用法：python scripts/build_order_data.py <xlsx> <real-data.js 或 /api/data 抓下来的文件>

要点：
- 订单日期用【创建时间】（缺则退回支付时间）—— 文件名截止日期不可靠，导出里实际含到 2026-11 的订单。
- 退款另外算：金额保留支付金额（毛额），同时单独存退款单数与退款金额，前端可算净额。
"""
import openpyxl, re, json, collections, sys, os

XLSX = sys.argv[1] if len(sys.argv) > 1 else r'E:\xwechat_files\wxid_od6e7r1klxs422_54c2\msg\file\2026-11\D店2025年9月-2026年10月22日总订单.xlsx'
LIVE = sys.argv[2] if len(sys.argv) > 2 else r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\work\_live.js'
OUT = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\js\order-data.js'

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
ws = wb['Sheet1']
it = ws.iter_rows(values_only=True)
h = [str(x).strip() if x else '' for x in next(it)]
I = {name: i for i, name in enumerate(h) if name}

def g(row, name):
    i = I.get(name)
    return row[i] if i is not None and i < len(row) else None

def norm_date(v):
    s = str(v or '').strip()
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', s)
    if m:
        return f'{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}'
    m2 = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    return s[:10] if m2 else ''

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
    day = norm_date(g(row, '创建时间')) or norm_date(g(row, '支付时间'))
    amt = round(float(g(row, '支付金额') or 0), 2)
    refund = 1 if str(g(row, '已全部退货或全额退款') or '').strip() == '是' else 0
    recs.append((str(cid).strip(), sku, day,
                 int(float(g(row, '下单件数') or 0)),
                 amt, refund, amt if refund else 0.0))

# 视频表：内容ID -> 发布日期 / 达人 / SKU
txt = open(LIVE, encoding='utf-8').read()
idx = txt.find('window.REAL_DATA')
start = txt.find('{', idx)
depth = 0
raw = None
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
    vlist.append([norm_date(v.get('date')) or str(v.get('date') or '')[:10],
                  v.get('creator') or '', str(v.get('sku') or '')])

buckets = {}
unmatched = {}
for cid, sku, day, units, amt, refund, refund_amt in recs:
    vi = vid_index.get(cid)
    if vi is None:
        b = unmatched.setdefault(cid, [day, sku, 0, 0, 0.0, 0, 0.0])
        b[2] += 1; b[3] += units; b[4] += amt; b[5] += refund; b[6] += refund_amt
        continue
    k = (vi, day)
    b = buckets.setdefault(k, [0, 0, 0.0, 0, 0.0])
    b[0] += 1; b[1] += units; b[2] += amt; b[3] += refund; b[4] += refund_amt

for cid, b in unmatched.items():
    vid_index[cid] = len(vlist)
    vlist.append(['', '', b[1]])

o = []
for (vi, day), b in buckets.items():
    o.append([vi, day, b[0], b[1], round(b[2], 2), b[3], round(b[4], 2)])
for cid, b in unmatched.items():
    o.append([vid_index[cid], b[0], b[2], b[3], round(b[4], 2), b[5], round(b[6], 2)])
o.sort(key=lambda r: (r[1], r[0]))

payload = {'g': '2026-11-09', 'v': vlist, 'o': o,
           'meta': {'orders': len(recs), 'videos': len(vlist), 'buckets': len(o),
                    'dateField': 'created'}}

js = 'window.ORDER_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(js)
print('订单:', len(recs), '| 视频:', len(vlist), '| 聚合行:', len(o))
print('输出:', OUT, round(os.path.getsize(OUT) / 1024 / 1024, 2), 'MB')
