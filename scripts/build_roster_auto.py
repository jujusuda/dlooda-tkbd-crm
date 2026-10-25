# -*- coding: utf-8 -*-
"""
从「每日工作.xlsx」提取名单库「自动达人名单」(模块1) 数据。
来源 sheet:
  - 自动达人名单 : 按列堆叠的 handle 池, 列头零星标签(B=1000以上/H=已发/I=手动/J=已发2722)
  - 2A08&28102自动 : 同上结构, A列 handle 池 + 标签行(28102 / 7月14之前老达人)

规则: 列(或行)遇到"标签单元格"开启新分组, 后续无标签单元格归属该组, 直到下一个标签。
handle 归一化(去@/转小写/过滤纯数字)。
输出: js/auto-data.js  ->  window.DloodaAuto = { groups:[{name, handles:[]}] }
"""
import openpyxl, re, os

SRC = "scripts/source_xlsx/每日工作_2026-10-25.xlsx"
OUT = "js/auto-data.js"

HANDLE_RE = re.compile(r'^[A-Za-z0-9_.][A-Za-z0-9._]{1,40}$')
def norm(h):
    if h is None: return None
    s = str(h).strip().lstrip('@').strip().lower()
    # 去掉可能混入的尾随说明
    s = s.split('\n')[0].split(' ')[0]
    if not s or not HANDLE_RE.match(s):
        return None
    return s

def collect_sheet_columns(ws):
    """按列提取: R1 值为"非 handle 形态"的单元格才算分组标签, 开启新组;
    其余列(含 R1 本身是 handle 的列)归属当前组, 且该列所有行(含R1)都计入 handle。"""
    groups = []  # list of [name, set]
    cur_name = None
    cur_set = None
    maxc = min(ws.max_column, 60)
    for c in range(1, maxc + 1):
        label = ws.cell(row=1, column=c).value
        col_handles = []
        for r in range(1, ws.max_row + 1):  # R1 也参与(若它是 handle)
            h = norm(ws.cell(row=r, column=c).value)
            if h:
                col_handles.append(h)
        is_label = (label not in (None, "")) and (norm(label) is None)
        if is_label:
            nm = str(label).strip().split('\n')[0]
            cur_name = nm
            cur_set = set()
            groups.append([cur_name, cur_set])
        if cur_set is None:
            cur_name = "组" + ws.cell(row=1, column=c).column_letter
            cur_set = set()
            groups.append([cur_name, cur_set])
        for h in col_handles:
            cur_set.add(h)
    return groups

def collect_sheet_rows(ws):
    """按行提取(2A08&28102自动): A列标签行开启分组, 后续 handle 归属, 直到下一个标签"""
    groups = []
    cur_name = None
    cur_set = None
    r = 1
    while r <= ws.max_row:
        a = ws.cell(row=r, column=1).value
        b = ws.cell(row=r, column=2).value
        # 标签判定: A 不像 handle(含中文/空格等) -> 作为分组名; B列仅补充说明
        if a not in (None, "") and norm(a) is None:
            nm = str(a).strip().split('\n')[0]
            if b not in (None, ""):
                nm += " · " + str(b).strip().split('\n')[0]
            cur_name = nm
            cur_set = set()
            groups.append([cur_name, cur_set])
        else:
            h = norm(a)
            if h:
                if cur_set is None:
                    cur_name = "默认"
                    cur_set = set()
                    groups.append([cur_name, cur_set])
                cur_set.add(h)
        r += 1
    return groups

def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    all_groups = []
    # 主表
    if '自动达人名单' in wb.sheetnames:
        g = collect_sheet_columns(wb['自动达人名单'])
        all_groups += g
        print("自动达人名单 -> %d 组" % len(g))
    # 补充表
    if '2A08&28102自动' in wb.sheetnames:
        g = collect_sheet_rows(wb['2A08&28102自动'])
        all_groups += g
        print("2A08&28102自动 -> %d 组" % len(g))

    # 过滤空组 + 排序(按人数降序)
    groups = []
    for name, hs in all_groups:
        if hs:
            groups.append({"name": name, "handles": sorted(hs)})
    groups.sort(key=lambda x: -len(x["handles"]))
    # 加稳定 id (g0, g1, ...) 供本机标记定位
    for i, g in enumerate(groups):
        g["id"] = "g%d" % i

    total = sum(len(g["handles"]) for g in groups)
    out = ("// 自动生成：自动达人名单（来源：每日工作.xlsx 自动达人名单 + 2A08&28102自动）\n"
           "// 结构: groups[] = { name, handles[] }  同组内去重；跨组允许重复\n"
           "window.DloodaAuto = " + __import__('json').dumps(
               {"groups": groups, "meta": {"totalHandles": total, "groupCount": len(groups)}},
               ensure_ascii=False, indent=1) + ";\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)
    print("写出 %s : %d 组 / %d handle" % (OUT, len(groups), total))
    for g in groups[:8]:
        print("  - %s : %d" % (g["name"], len(g["handles"])))

if __name__ == "__main__":
    main()
