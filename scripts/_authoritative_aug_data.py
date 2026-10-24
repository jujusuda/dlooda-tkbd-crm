# -*- coding: utf-8 -*-
# 用户 2026-09-13 提供的权威数据（飞书/Excel 导出表，文字粘贴版）
# 关键口径：常卖款统一按「上上个月15日 ~ 上个月15日」统计
#   7月常卖 = 5/15 ~ 6/15
#   8月常卖 = 6/15 ~ 7/15
# 订单数以「月度达人总出单」列为准（非「转化单数」、非「入账订单」）

# 每个 SKU 的月份数据：键=月('7'/'8')
# 字段含义：
#   ship=寄样数量, fulfill=履约达人数, fulfill_rate=履约率, order_creators=出单达人数,
#   creator_rate=达人出单率(出单达人/履约达人), vids=视频数量, vids_order=出单视频数,
#   vid_rate=视频出单率, views=总播放量, clicks=总点击次数, conv=转化单数,
#   ctr=点击率, cvr=转化率, organic=自然单占比, orders=月度达人总出单

DATA = {
    '2722': {'name': 'Crossover Skort', 'type': '常卖', 'months': {
        '7': dict(ship=105, fulfill=84, fulfill_rate=0.80, order_creators=22, creator_rate=0.2750, vids=556, vids_order=141, vid_rate=0.2536, views=3618554, clicks=125190, conv=1805, ctr=0.0346, cvr=0.0144, organic=0.76, orders=1509),
        '8': dict(ship=45,  fulfill=37, fulfill_rate=0.8222, order_creators=12, creator_rate=0.3429, vids=471, vids_order=155, vid_rate=0.3291, views=3148354, clicks=101610, conv=2005, ctr=0.0323, cvr=0.0197, organic=0.8030, orders=1640),
    }},
    '2178': {'name': 'Work Pants Micro Flare', 'type': '常卖', 'months': {
        '7': dict(ship=33, fulfill=28, fulfill_rate=0.8485, order_creators=4, creator_rate=0.16, vids=267, vids_order=94, vid_rate=0.3521, views=3658449, clicks=131488, conv=1587, ctr=0.0359, cvr=0.0121, organic=0.79, orders=1289),
        '8': dict(ship=73, fulfill=56, fulfill_rate=0.7671, order_creators=5, creator_rate=0.0980, vids=255, vids_order=70, vid_rate=0.2745, views=2847143, clicks=103934, conv=1616, ctr=0.0365, cvr=0.0155, organic=0.7910, orders=1768),
    }},
    '2190': {'name': 'Work Pants Upgraded', 'type': '常卖', 'months': {
        '7': dict(ship=27, fulfill=27, fulfill_rate=1.00, order_creators=5, creator_rate=0.2083, vids=211, vids_order=61, vid_rate=0.2891, views=2540712, clicks=64592, conv=1730, ctr=0.0254, cvr=0.0268, organic=0.69, orders=1506),
        '8': dict(ship=55, fulfill=46, fulfill_rate=0.8364, order_creators=3, creator_rate=0.0750, vids=217, vids_order=60, vid_rate=0.2765, views=2203093, clicks=60298, conv=1841, ctr=0.0274, cvr=0.0305, organic=0.82, orders=1776),
    }},
    '2189': {'name': 'Work Pants Classic', 'type': '常卖', 'months': {
        '7': dict(ship=33, fulfill=29, fulfill_rate=0.8788, order_creators=14, creator_rate=0.56, vids=106, vids_order=40, vid_rate=0.3774, views=160240, clicks=7645, conv=186, ctr=0.0477, cvr=0.0243, organic=0.6980, orders=148),
        '8': dict(ship=38, fulfill=35, fulfill_rate=0.9211, order_creators=8, creator_rate=0.2286, vids=162, vids_order=58, vid_rate=0.3580, views=731282, clicks=26306, conv=932, ctr=0.0360, cvr=0.0354, organic=0.6150, orders=681),
    }},
    '28173': {'name': 'Wide Leg Work Pants', 'type': '常卖', 'months': {
        '7': dict(ship=67, fulfill=59, fulfill_rate=0.8806, order_creators=16, creator_rate=0.3019, vids=138, vids_order=33, vid_rate=0.2391, views=251397, clicks=11936, conv=298, ctr=0.0475, cvr=0.0250, organic=0.6070, orders=252),
        '8': dict(ship=86, fulfill=78, fulfill_rate=0.9070, order_creators=25, creator_rate=0.3378, vids=265, vids_order=84, vid_rate=0.3170, views=650131, clicks=36194, conv=843, ctr=0.0557, cvr=0.0233, organic=0.8160, orders=771),
    }},
    '2789': {'name': 'Four-Pocket Skort', 'type': '常卖', 'months': {
        '7': dict(ship=53, fulfill=45, fulfill_rate=0.8491, order_creators=12, creator_rate=0.30, vids=59, vids_order=17, vid_rate=0.2881, views=79817, clicks=3922, conv=107, ctr=0.0491, cvr=0.0273, organic=0.3010, orders=88),
        '8': dict(ship=32, fulfill=23, fulfill_rate=0.7188, order_creators=7, creator_rate=0.3333, vids=61, vids_order=13, vid_rate=0.2131, views=53003, clicks=2129, conv=38, ctr=0.0402, cvr=0.0178, organic=0.4590, orders=37),
    }},
    '2757': {'name': 'Lace Skort', 'type': '测款', 'months': {
        '8': dict(ship=35, fulfill=29, fulfill_rate=None, order_creators=8, creator_rate=0.3077, vids=38, vids_order=10, vid_rate=0.2632, views=110685, clicks=3323, conv=35, ctr=0.0300, cvr=0.0105, organic=0.4050, orders=37),
    }},
    # 测款(7月)，非核心但保留
    '28193': {'name': '测款A', 'type': '测款', 'months': {
        '7': dict(ship=32, fulfill=20, fulfill_rate=0.625, order_creators=3, creator_rate=0.15, vids=24, vids_order=3, vid_rate=0.125, views=15421, clicks=208, conv=4, ctr=0.0135, cvr=0.0192, organic=1.00, orders=5),
    }},
    '2A19': {'name': '测款B', 'type': '测款', 'months': {
        '7': dict(ship=76, fulfill=48, fulfill_rate=0.6316, order_creators=11, creator_rate=0.2245, vids=42, vids_order=6, vid_rate=0.1429, views=27013, clicks=1169, conv=11, ctr=0.0433, cvr=0.0094, organic=0.7690, orders=13),
    }},
}

def avg(xs):
    return sum(xs) / len(xs)

def std_pop(xs):
    m = avg(xs)
    return (sum((x - m) ** 2 for x in xs) / len(xs)) ** 0.5

if __name__ == '__main__':
    core = ['2722','2178','2190','2189','28173','2789']  # 6 个常卖
    print('=' * 90)
    print('① 真实数据对账（月度达人总出单 为订单准）')
    print('=' * 90)
    print(f'{"SKU":6} {"7月订单":>9} {"8月订单":>9} {"环比":>8} {"7月出单人":>9} {"8月出单人":>9} {"8月人均":>9}')
    for s in core:
        m7, m8 = DATA[s]['months']['7'], DATA[s]['months']['8']
        o7, o8 = m7['orders'], m8['orders']
        n7, n8 = m7['order_creators'], m8['order_creators']
        per8 = o8 / n8
        print(f'{s:6} {o7:9} {o8:9} {o8-o7:+8} {n7:9} {n8:9} {per8:9.1f}')

    print()
    print('=' * 90)
    print('② 覆盖效应 & 单产效应（公式：覆盖=(N2-N1)×P1，单产=N2×(P2-P1)，和=订单变化）')
    print('=' * 90)
    print(f'{"SKU":6} {"P1(7月人均)":>12} {"P2(8月人均)":>12} {"覆盖(件)":>10} {"单产(件)":>10} {"合计":>8} {"真实环比":>9} {"校验":>5}')
    for s in core:
        m7, m8 = DATA[s]['months']['7'], DATA[s]['months']['8']
        o7, o8 = m7['orders'], m8['orders']
        n7, n8 = m7['order_creators'], m8['order_creators']
        p1, p2 = o7 / n7, o8 / n8
        cov = (n2 := n8) and (n8 - n7) * p1
        prod = n8 * (p2 - p1)
        chk = o8 - o7
        ok = 'OK' if abs((cov + prod) - chk) < 3 else 'XX'
        print(f'{s:6} {p1:12.1f} {p2:12.1f} {cov:10.0f} {prod:10.0f} {cov+prod:8.0f} {chk:9.0f} {ok:>5}')

    print()
    print('=' * 90)
    print('③ Z-score 效率分（综合分 = Z(达人出单率) + Z(人均产出)，7个SKU全样本）')
    print('=' * 90)
    all7 = core + ['2757']
    cr = [DATA[s]['months']['8']['creator_rate'] for s in all7]
    per = [DATA[s]['months']['8']['orders'] / DATA[s]['months']['8']['order_creators'] for s in all7]
    muc, sup = avg(cr), std_pop(cr)
    mup, supp = avg(per), std_pop(per)
    print(f'出单率 μ={muc*100:.2f}% σ={sup*100:.2f}%  |  人均产出 μ={mup:.1f} σ={supp:.1f}')
    rows = []
    for s in all7:
        c = DATA[s]['months']['8']['creator_rate']
        p = DATA[s]['months']['8']['orders'] / DATA[s]['months']['8']['order_creators']
        zc, zp = (c - muc) / sup, (p - mup) / supp
        rows.append((s, c, p, zc, zp, zc + zp))
    rows.sort(key=lambda r: -r[5])
    print(f'{"排名":4} {"SKU":6} {"达人出单率":>10} {"人均产出":>9} {"Z(出单率)":>10} {"Z(产出)":>8} {"综合分":>8}')
    for i, (s, c, p, zc, zp, tot) in enumerate(rows, 1):
        print(f'{i:<4} {s:6} {c*100:9.2f}% {p:9.1f} {zc:+10.2f} {zp:+8.2f} {tot:+8.2f}')

    print()
    print('=' * 90)
    print('④ 产品×达人 效率漏斗（8月）')
    print('=' * 90)
    print(f'{"SKU":6} {"寄样":>5} {"履约":>5} {"出单达人":>8} {"总出单":>7} {"履约率":>7} {"出单/履约":>9} {"人均":>7} {"件/寄样":>8} {"自然单":>7}')
    for s in core:
        m = DATA[s]['months']['8']
        fcr = m['orders'] / m['ship']
        print(f'{s:6} {m["ship"]:5} {m["fulfill"]:5} {m["order_creators"]:8} {m["orders"]:7} {m["fulfill_rate"]*100:6.1f}% {m["creator_rate"]*100:8.1f}% {m["orders"]/m["order_creators"]:7.1f} {fcr:8.1f} {m["organic"]*100:6.1f}%')
