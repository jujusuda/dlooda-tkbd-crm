import json
d = json.load(open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\scripts\_authoritative_data.json', encoding='utf-8'))
J, A = d['jul'], d['aug']
MAIN = ['2722','2178','2190','2189','28173','2789']

print("="*78)
print("【1】7月/8月 月度达人总出单 + 环比（与用户PPT表核对）")
print("="*78)
print(f"{'SKU':6} {'7月':>7} {'8月':>7} {'环比':>7}  {'用户PPT环比':>10}")
user_delta = {'2722':-11,'2178':449,'2190':176,'2189':547,'28173':525,'2789':-61,'2757':None}
for k in MAIN+['2757']:
    j = J.get(k,{}).get('orders')
    a = A[k]['orders']
    delta = a-j if j is not None else None
    ud = user_delta[k]
    ok = '✅' if (delta is None or ud is None or delta==ud) else '❌'
    print(f"{k:6} {str(j):>7} {a:>7} {str(delta):>7}  {str(ud):>10}  {ok}")

print()
print("="*78)
print("【2】覆盖效应 & 单产效应（恒等式：覆盖+单产 = 订单变化）")
print("="*78)
print(f"{'SKU':6} {'7月人均':>8} {'8月人均':>8} {'覆盖效应':>9} {'单产效应':>9} {'合计':>7} {'真实环比':>8} 校验")
for k in MAIN:
    j, a = J[k], A[k]
    p1 = j['orders']/j['order_creators']
    p2 = a['orders']/a['order_creators']
    cover = (a['order_creators']-j['order_creators'])*p1
    prod  = a['order_creators']*(p2-p1)
    s = round(cover+prod)
    real = a['orders']-j['orders']
    ok = '✅' if abs(s-real)<=2 else '❌'
    print(f"{k:6} {p1:8.1f} {p2:8.1f} {cover:9.0f} {prod:9.0f} {s:7} {real:8}  {ok}")

print()
print("="*78)
print("【3】Z-score 综合效率分（7个SKU全样本，8月）")
print("="*78)
allk = MAIN+['2757']
rate = {k: A[k]['creator_rate'] for k in allk}
out  = {k: A[k]['orders']/A[k]['order_creators'] for k in allk}
mr = sum(rate.values())/len(allk)
sr = (sum((rate[k]-mr)**2 for k in allk)/len(allk))**0.5
mo = sum(out.values())/len(allk)
so = (sum((out[k]-mo)**2 for k in allk)/len(allk))**0.5
print(f"出单率 μ={mr*100:.2f}% σ={sr*100:.2f}% | 人均产出 μ={mo:.1f} σ={so:.1f}")
rows=[]
for k in allk:
    zr = (rate[k]-mr)/sr
    zo = (out[k]-mo)/so
    rows.append((k, rate[k], out[k], zr, zo, zr+zo))
rows.sort(key=lambda r:-r[5])
print(f"{'SKU':6} {'达人出单率':>9} {'人均产出':>8} {'Z(出单率)':>10} {'Z(产出)':>8} {'综合分':>8}")
for k,r,zr,zo,sc in [(x[0],x[1],x[3],x[4],x[5]) for x in rows]:
    print(f"{k:6} {r*100:8.2f}% {out[k]:8.1f} {zr:10.2f} {zo:8.2f} {sc:8.2f}")

print()
print("="*78)
print("【4】产品×达人 漏斗效率（8月，回答'产品与达人配合效率'）")
print("="*78)
print(f"{'SKU':6} {'寄样':>4} {'履约率':>7} {'出单/履约':>9} {'人均产出':>8} {'件/寄样':>8} {'自然单占比':>9}")
for k in MAIN+['2757']:
    a = A[k]
    conv = a['order_creators']/a['fulfilled']   # 履约的人里多少出了单
    roi = a['orders']/a['send']
    print(f"{k:6} {a['send']:4} {a['fulfill_rate']*100:6.1f}% {conv*100:8.1f}% {a['orders']/a['order_creators']:8.1f} {roi:8.2f} {a['organic']*100:8.1f}%")
