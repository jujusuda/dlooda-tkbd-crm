# -*- coding: utf-8 -*-
"""从 每日工作.xlsx 的「裙子/裤子-指定达人定向名单」提取：
店铺 / 标题 / 产品 / 备注 / 达人 handle / 产品图片 → 生成 js/designated-data.js
图片压缩到最长边 360px 存入 images/designated/
"""
import io
import json
import os
import re
import sys
import zipfile

import openpyxl
from PIL import Image

XLSX = sys.argv[1] if len(sys.argv) > 1 else '每日工作.xlsx'
OUT_JS = sys.argv[2] if len(sys.argv) > 2 else 'js/designated-data.js'
IMG_DIR = sys.argv[3] if len(sys.argv) > 3 else 'images/designated'

SHEETS = [
    ('dress', '裙子-指定达人定向名单', 'drawing3.xml'),
    ('pants', '裤子-指定达人定向名单', 'drawing4.xml'),
]

HANDLE_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._]{1,40}$')


def cell_str(ws, r, c):
    v = ws.cell(row=r, column=c).value
    if v is None:
        return ''
    return str(v).strip()


def parse_drawing(z, drawing_name):
    """返回 {0基列号: media路径}"""
    xml = z.read('xl/drawings/' + drawing_name).decode('utf-8', 'ignore')
    rel = z.read('xl/drawings/_rels/%s.rels' % drawing_name).decode('utf-8', 'ignore')
    rmap = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rel))
    out = {}
    for a in re.findall(r'<xdr:oneCellAnchor>.*?</xdr:oneCellAnchor>', xml, re.S):
        m_col = re.search(r'<xdr:col>(\d+)</xdr:col>', a)
        m_emb = re.search(r'r:embed="(rId\d+)"', a)
        if not (m_col and m_emb):
            continue
        tgt = rmap.get(m_emb.group(1), '')
        tgt = tgt.replace('../', '')
        if tgt and not tgt.startswith('xl/'):
            tgt = 'xl/' + tgt
        if tgt.startswith('xl/'):
            out[int(m_col.group(1))] = tgt
    return out


def save_img(z, media_path, dest_path):
    raw = z.read(media_path)
    try:
        im = Image.open(io.BytesIO(raw))
        im = im.convert('RGB')
        im.thumbnail((360, 360))
        im.save(dest_path, 'JPEG', quality=82, optimize=True)
    except Exception as e:
        # 无法解码就原样落盘
        with open(dest_path, 'wb') as f:
            f.write(raw)
        return raw and len(raw), str(e)
    return os.path.getsize(dest_path), ''


def main():
    z = zipfile.ZipFile(XLSX)
    wb = openpyxl.load_workbook(XLSX, read_only=False, data_only=True)
    os.makedirs(IMG_DIR, exist_ok=True)

    cats = []
    total_handles = 0
    dup_store = 0
    for cat_id, sheet_name, drawing in SHEETS:
        ws = wb[sheet_name]
        colmap = parse_drawing(z, drawing)
        maxc = max(colmap.keys()) + 1 if colmap else 0
        # 表格实际使用列可能多于图片列，以两者较大值为准
        maxc = max(maxc, 71)
        items = []
        store_seen = {}  # store -> set(handle) 店铺内去重
        # 从第 2 列开始（第 1 列是标签/序号列）
        for ci in range(2, maxc + 1):
            store = cell_str(ws, 2, ci)
            title = cell_str(ws, 3, ci)
            product = cell_str(ws, 4, ci)
            note = cell_str(ws, 1, ci)
            # 店铺横向填充（右侧空列沿用左侧店铺）
            if not store:
                for cj in range(ci - 1, 1, -1):
                    s = cell_str(ws, 2, cj)
                    if s and s != '店铺':
                        store = s
                        break
            # 产品横向填充
            if not product:
                for cj in range(ci - 1, 1, -1):
                    s = cell_str(ws, 4, cj)
                    if s and s != '产品':
                        product = s
                        break
            if store == '店铺':
                store = ''
            # 标签列（store=店铺 / product=产品）整列跳过，绝不当作卡片
            if store == '店铺' or product == '产品':
                continue
            # 收集 handle（列内保持顺序）
            handles = []
            for r in range(5, ws.max_row + 1):
                v = cell_str(ws, r, ci)
                if not v:
                    continue
                v = v.lstrip('@').strip().lower()
                if v.isdigit():
                    continue
                if not HANDLE_RE.match(v):
                    continue
                handles.append(v)
            if not handles:
                continue
            if not store:
                store = '(未标注店铺)' + ('·' + note if note else '')
            # 店铺内去重（保留首次出现，后续列的重复丢弃）
            seen = store_seen.setdefault(store, set())
            uniq = []
            for h in handles:
                if h in seen:
                    dup_store += 1
                    continue
                seen.add(h)
                uniq.append(h)
            if not uniq and not colmap.get(ci - 1):
                continue
            # 图片
            img_rel = ''
            media = colmap.get(ci - 1)
            if media:
                ext = os.path.splitext(media)[1] or '.png'
                fname = '%s-%02d%s' % (cat_id, ci, '.jpg')
                dest = os.path.join(IMG_DIR, fname)
                sz, err = save_img(z, media, dest)
                if err:
                    print('  img warn:', fname, err)
                img_rel = 'images/designated/' + fname
            items.append({
                'id': '%s-c%02d' % (cat_id, ci),
                'store': store,
                'title': title,
                'product': product,
                'note': note,
                'img': img_rel,
                'handles': uniq,
            })
            total_handles += len(uniq)
        cats.append({'id': cat_id, 'name': '裙子' if cat_id == 'dress' else '裤子', 'items': items})
        print('%s: %d 卡片, 店铺 %d 家' % (sheet_name, len(items), len(store_seen)))

    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* 自动生成：scripts/build_designated_data.py — 指定达人定向名单（裙子/裤子） */\n')
        f.write('(function (global) {\n')
        f.write("  global.DloodaDesignated = %s;\n" % json.dumps(
            {'cats': cats}, ensure_ascii=False, separators=(',', ':')))
        f.write('})(window);\n')
    print('TOTAL: %d 卡片, %d handle, 店铺内去重丢弃 %d' % (
        sum(len(c['items']) for c in cats), total_handles, dup_store))
    # 图片体积
    tot = 0
    for fn in os.listdir(IMG_DIR):
        tot += os.path.getsize(os.path.join(IMG_DIR, fn))
    print('图片目录总大小: %.1f MB' % (tot / 1048576))


if __name__ == '__main__':
    main()
