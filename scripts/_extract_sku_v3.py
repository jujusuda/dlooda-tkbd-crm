# -*- coding: utf-8 -*-
from bs4 import BeautifulSoup
import json, re
soup = BeautifulSoup(open('monthly-report-2026-07-15_08-15.html', encoding='utf-8').read(), 'html.parser')

def parse_table(tbl):
    return [[c.get_text(' ', strip=True) for c in tr.find_all(['th','td'])] for tr in tbl.find_all('tr')]

def flatten_container(container, data=None, cur=None):
    """Flatten a container: track current h4/h5 heading and attach p/ul/ol/table/details to it."""
    if data is None:
        data = {'texts':[], 'lists':[], 'tables':[], 'subs':{}}
    for sib in container.children:
        if not getattr(sib, 'name', None): continue
        if sib.name in ('h2','h3') and 'SKU' in sib.get_text(strip=True):
            continue
        if sib.name in ('h4','h5'):
            cur = sib.get_text(strip=True)
            if cur not in data['subs']:
                data['subs'][cur] = {'texts':[], 'lists':[], 'tables':[]}
        elif sib.name == 'p':
            t = sib.get_text(' ', strip=True)
            if t:
                data['texts'].append(t)
                if cur: data['subs'][cur]['texts'].append(t)
        elif sib.name in ('ul','ol'):
            items = [li.get_text(' ', strip=True) for li in sib.find_all('li') if li.get_text(strip=True)]
            data['lists'].append(items)
            if cur: data['subs'][cur]['lists'].append(items)
        elif sib.name == 'table':
            tbl = parse_table(sib)
            data['tables'].append(tbl)
            if cur: data['subs'][cur]['tables'].append(tbl)
        elif sib.name == 'details':
            # details contain fold-body div with h5 + tables
            body = sib.find('div', class_='fold-body') or sib
            flatten_container(body, data, cur)
        elif sib.name == 'div':
            flatten_container(sib, data, cur)
    return data

order = ['2178','2190','2722','28173','2189','2789']
sku_all = {}
for sku in order:
    h = None
    for cand in soup.find_all('h3'):
        if cand.get_text(strip=True) == f'SKU {sku}':
            h = cand; break
    if not h:
        sku_all[sku] = None; continue
    sec = h.find_parent('section')
    sku_all[sku] = flatten_container(sec) if sec else flatten_container(h.parent)

# Merged 2178+2190
merged_h = None
for cand in soup.find_all(['h2','h3','h4']):
    if '2178 + 2190 合并分析' in cand.get_text(strip=True):
        merged_h = cand; break
merged_sec = merged_h.find_parent('section') if merged_h else None
merged = flatten_container(merged_sec) if merged_sec else None

# Global sections
sections = {}
for kw in ['全 SKU 达人效率榜','SKU 接力关系','SKU 机会矩阵','SKU 复投关系汇总','下月行动','达人亮点与流失预警']:
    for cand in soup.find_all(['h2','h3','h4']):
        if kw in cand.get_text(strip=True):
            sec = cand.find_parent('section')
            sections[kw] = flatten_container(sec) if sec else None
            break

out = {'sku_all': sku_all, 'merged': merged, 'sections': sections}
open('scripts/_sku_data_v3.json','w',encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=2))
print('saved scripts/_sku_data_v3.json')
