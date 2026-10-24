# -*- coding: utf-8 -*-
"""
把「话术１(1).xlsx」转换为网站可用的话术库数据文件 js/scripts-data.js

用法：
  python scripts/build_dm_scripts.py <xlsx路径> <输出js路径>

输出 window.DloodaScriptLibrary = { updated, groups:[...] }
"""
import sys, json, re, openpyxl

HEADER_WORDS = {'话术', '翻译', '情况', '主题', '正文', '备注', '场景'}


def has_cjk(s):
    return bool(re.search(r'[\u4e00-\u9fff]', s or ''))


def cells(ws, r, maxc=None):
    maxc = maxc or ws.max_column
    return [ws.cell(row=r, column=c).value for c in range(1, maxc + 1)]


def next_nonempty(row, start):
    for v in row[start:]:
        if v not in (None, '') and str(v).strip() not in HEADER_WORDS:
            return str(v).strip()
    return ''


def parse_common(ws):
    """常用私信：col1=场景, col2=EN, col3=中文, col4+ = 变体"""
    items = []
    last_scene = ''
    for r in range(1, ws.max_row + 1):
        row = [str(v).strip() if v not in (None, '') else '' for v in cells(ws, r, 8)]
        if not any(row):
            continue
        if r == 1:  # 首行是错位的表头 + 一条话术
            en = row[0]
            if en:
                items.append({'scene': '开场搭讪（通用）', 'en': en, 'zh': '', 'alt': []})
            continue
        scene, en, zh = row[0], row[1], row[2]
        if scene in HEADER_WORDS:
            continue
        if scene:
            last_scene = scene.replace('\n', ' ')
        if not en and not zh:
            continue
        alt = [x for x in row[3:] if x and x not in HEADER_WORDS]
        items.append({'scene': (scene or last_scene or '常用').replace('\n', ' '),
                      'en': en, 'zh': zh, 'alt': alt})
    return items


def parse_email_outreach(ws):
    """邮件建联：分节标题 + 主题N / 正文N 对"""
    items = []
    section = ''
    for r in range(1, ws.max_row + 1):
        row = [str(v).strip() if v not in (None, '') else '' for v in cells(ws, r, 20)]
        if not any(row):
            continue
        head = row[0]
        if has_cjk(head) and not re.match(r'^(主题|正文)\d*$', head) and len(head) < 40:
            section = head
            continue
        subject = body = ''
        for i, v in enumerate(row):
            if re.match(r'^主题\d*$', v):
                subject = next_nonempty(row, i + 1)
            elif re.match(r'^正文\d*$', v):
                body = next_nonempty(row, i + 1)
        if subject or body:
            items.append({'group': section, 'subject': subject, 'body': body})
    return items


def parse_email_reply(ws):
    """邮箱话术：分节 + col1 场景/中文, col2 EN, col3 主题"""
    items = []
    section = ''
    for r in range(2, ws.max_row + 1):
        row = [str(v).strip() if v not in (None, '') else '' for v in cells(ws, r, 6)]
        if not any(row):
            continue
        c1, c2, c3 = row[0], row[1] if len(row) > 1 else '', row[2] if len(row) > 2 else ''
        if c1 and not c2 and not c3:
            if len(c1) < 40:
                section = c1
                continue
        if not c2 and not c3:
            continue
        if len(c1) > 60:
            zh, scene = c1, (section + ' · 变体') if section else '邮箱话术'
        else:
            scene, zh = (c1 or section or '邮箱话术'), ''
        en = c2
        subject = c3 if len(c3) < 80 else ''
        items.append({'group': section, 'scene': scene, 'en': en, 'zh': zh, 'subject': subject})
    return items


def col_join(ws, col, r1, r2):
    out = []
    for r in range(r1, r2 + 1):
        v = ws.cell(row=r, column=col).value
        if v not in (None, ''):
            out.append(str(v).strip())
    return '\n'.join(out)


def parse_video_script(ws):
    return [
        {'scene': '寄样后 · 拍摄指导（中英对照）',
         'zh': col_join(ws, 2, 3, 9), 'en': col_join(ws, 6, 3, 10), 'alt': []},
        {'scene': 'How to make a viral marketing video（爆款7要素）',
         'en': col_join(ws, 10, 2, 9), 'zh': '', 'alt': []},
        {'scene': 'Secret for improving video GMV（提升GMV 5要点）',
         'en': col_join(ws, 12, 2, 9), 'zh': '', 'alt': []},
    ]


def parse_live(ws):
    return [{'scene': '直播要求（达人须知）', 'zh': col_join(ws, 2, 2, 7), 'en': '', 'alt': []}]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else r"话术１(1).xlsx"
    dst = sys.argv[2] if len(sys.argv) > 2 else "js/scripts-data.js"
    wb = openpyxl.load_workbook(src, data_only=True)

    groups = [
        {'id': 'common', 'name': '常用私信', 'kind': 'dm',
         'desc': '日常私信场景：催视频、要代码、砍价、换货、推款互推等',
         'items': parse_common(wb['常用'])},
        {'id': 'email_outreach', 'name': '邮件建联', 'kind': 'email',
         'desc': '主动发邮件建联：老达人引导回复 / 新达人寄样 / 付费合作',
         'items': parse_email_outreach(wb['邮件建联'])},
        {'id': 'email_reply', 'name': '邮箱回复话术', 'kind': 'email',
         'desc': '达人回复后的应对：报价砍价、拒绝、催交付视频、付费/普通合作',
         'items': parse_email_reply(wb['邮箱话术'])},
        {'id': 'video_script', 'name': '视频脚本 & 拍摄指导', 'kind': 'text',
         'desc': '寄样后发给达人的拍摄脚本与爆款要素',
         'items': parse_video_script(wb['视频脚本'])},
        {'id': 'live', 'name': '直播脚本及话术', 'kind': 'text',
         'desc': '直播合作要求',
         'items': parse_live(wb['直播脚本以及话术'])},
    ]
    wb.close()

    data = {'updated': '2026-10-24', 'source': '话术１(1).xlsx', 'groups': groups}
    js = ('/* 自动生成：话术库数据（由 scripts/build_dm_scripts.py 从「话术１(1).xlsx」导出，勿手工改） */\n'
          'window.DloodaScriptLibrary = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(js)
    for g in groups:
        print(f"  {g['name']}: {len(g['items'])} 条")
    print("written ->", dst)


if __name__ == '__main__':
    main()
