"""Extract Pareto data - with correct two-pass JS string decoding"""
import json, re

with open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\js\real-data.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'JSON\.parse\("([\s\S]+?)"\)\s*;', content)
raw = m.group(1)

# Two-pass decode of JS string escapes:
# Pass 1: \\" -> \"  (handles \\" which was originally \" in the data, i.e., literal backslash+quote)
fixed = raw.replace('\\\\"', '\\"')
# Pass 2: \" -> "   (handles remaining \" which are JSON-escaped quotes)
fixed = fixed.replace('\\"', '"')

data = json.loads(fixed)
print(f"OK! creators: {len(data['creators'])}")

# === Pareto Analysis ===
target_skus = ['2178', '2190', '2722', '2189', '28173', '2789', '2757']
sku_map = {sku: [] for sku in target_skus}

for c in data['creators']:
    try:
        oc = int(c.get('orderCount') or 0)
    except (ValueError, TypeError):
        continue
    if oc <= 0:
        continue
    skus = c.get('skus', [])
    if not isinstance(skus, list):
        continue
    for s in skus:
        if s in sku_map:
            sku_map[s].append({'name': c['name'], 'orders': oc})

output = {}
print("\n=== PARETO ANALYSIS ===")
for sku in target_skus:
    lst = sorted(sku_map[sku], key=lambda x: -x['orders'])
    total = sum(x['orders'] for x in lst)
    n = len(lst)

    if n == 0:
        output[sku] = {'total_orders': 0, 'creator_count': 0, 'top_creators': [],
                       'pareto': {'top20_pct': 0}}
        print(f"{sku}: no order creators")
        continue

    t20 = max(1, round(n * 0.2))
    t20_sum = sum(x['orders'] for x in lst[:t20])
    t20_pct = t20_sum / total * 100 if total > 0 else 0

    print(f"{sku}: {n} creators, total={total}, top20%({t20})={t20_sum}({t20_pct:.1f}%)")

    top_list = []
    for i, o in enumerate(lst[:10]):
        label = chr(65 + i)
        pct = round(o['orders'] / total * 100, 1) if total > 0 else 0
        top_list.append({'label': label, 'name': o['name'], 'orders': o['orders'], 'pct': pct})
        if i < 5:
            print(f"  {label}. {o['name']}: {o['orders']} ({pct}%)")

    output[sku] = {
        'total_orders': total,
        'creator_count': n,
        'top_creators': top_list,
        'pareto': {'top20_count': t20, 'top20_orders': t20_sum, 'total': total,
                  'top20_pct': round(t20_pct, 1)}
    }

out_path = r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\scripts\_pareto_data.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nSaved to {out_path}")
