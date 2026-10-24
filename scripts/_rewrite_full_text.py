# -*- coding: utf-8 -*-
"""全文文字重写：基于 v9_1(5) 16 页版，只替换文字表述，不动数字/表格/布局。"""
import shutil, os
from pptx import Presentation

SRC = r"E:\xwechat_files\wxid_od6e7r1klxs422_54c2\temp\RWTemp\2026-10\8be9710a0a0dd58ff4cb419316577cc7\余慧玲9月月度汇报_v9_1(5).pptx"
OUT = r"C:\Users\LENOVO\Desktop\余慧玲9月月度汇报_全文文字重写.pptx"

prs = Presentation(SRC)

def set_tf_text(tf, new_text):
    new_lines = new_text.split("\n")
    paras = tf.paragraphs
    n = len(new_lines)
    for i, line in enumerate(new_lines):
        if i < len(paras):
            p = paras[i]
            runs = p.runs
            if runs:
                runs[0].text = line
                for r in runs[1:]:
                    r.text = ""
            else:
                p.add_run().text = line
        else:
            p = tf.add_paragraph()
            p.add_run().text = line
    # 删多余段
    for p in list(paras)[n:]:
        p._p.getparent().remove(p._p)

def set_cell_text(cell, new_text):
    tf = cell.text_frame
    set_tf_text(tf, new_text)

def repl(slide, needle, new, exact=False):
    for sh in slide.shapes:
        if not sh.has_text_frame:
            continue
        t = sh.text_frame.text
        if exact:
            if t.strip() == needle.strip():
                set_tf_text(sh.text_frame, new)
                return True
        else:
            if needle in t:
                set_tf_text(sh.text_frame, new)
                return True
    return False

def repl_table_contains(slide, needle, new):
    for sh in slide.shapes:
        if sh.has_table:
            for row in sh.table.rows:
                for c in row.cells:
                    if needle in c.text:
                        set_cell_text(c, new)
                        return True
    return False

# ---------- SLIDE 4 (idx3) 店铺整体 ----------
s = prs.slides[3]
repl(s, "9 月店铺表现延续增长，Q3 GMV 与订单同步回升", "9月延续增长，Q3 GMV、订单双创新高", exact=True)
repl(s, "单月 GMV 环比 +3.35%、订单 +3.66%，占 Q3 约 37%，创年内新高", "GMV 环比 +3.35%、订单 +3.66%，占 Q3 约 37%", exact=True)
repl(s, "Q3 GMV $425,760",
     "• Q3 GMV $425,760（+25.9%）、订单 20,421（+12.8%）\n• 9 月 GMV、订单环比都涨\n• 四款是秋冬长裤，9 月正处当季，爆品放量带动 GMV 创新高")

# ---------- SLIDE 5 (idx4) 常卖款月度出单 ----------
s = prs.slides[4]
repl(s, "2190 领跑、2189 补量成功 ｜", "四款合计 6,029、环比 +12.8%；2190 领跑、2189 补量成功")
repl(s, "四款常卖款 9 月合计出单 6,029、环比 +12.8%，整体盘子逐月走高、增长由头部拉动", "整体盘子逐月走高、增长由头部拉动")
repl(s, "2,883｜ 1696→1872→2883 连续走高，领跑", "2,883｜连续走高，领跑")
repl(s, "999｜ 176→723→999 三连升、环比 +38%", "999｜三连升、翻倍")
repl(s, "1,386｜ 1904→1386 冲高后回落", "1,386｜冲高回落")
repl(s, "761｜ 846→761 高点回落，寄样最多", "761｜高点回落，寄样最多")

# ---------- SLIDE 6 (idx5) 各款全景：改结论列 ----------
s = prs.slides[5]
tmap = {
    "长期主引擎": "稳定爆量主力",
    "出单回升\n稳量加投": "出单回升，稳量跟进",
    "上升补量\n持续观察": "上升补量，持续观察",
    "达人青睐\n持续放量": "达人认可，持续放量",
    "淘汰退出": "待观察",
}
for sh in s.shapes:
    if sh.has_table:
        for row in sh.table.rows:
            cell = list(row.cells)[-1]  # 结论列
            ct = cell.text.strip()
            for k, v in tmap.items():
                if k in ct:
                    set_cell_text(cell, v)
                    break

# ---------- SLIDE 8 (idx7) 2178+2190 ----------
s = prs.slides[7]
repl(s, "2178 + 2190｜同款同打法：少寄优寄奏效", "2178 + 2190｜同款同打法，少寄优寄见效", exact=True)
repl(s, "两款款式相同、趋势同步", "同款同走势，上月少寄优寄，出单率、视频出单率一起回升")
repl(s, "两款出单端与视频端走势均同步", "结论　两款走势同步：7→8 月降、8→9 月升，方向一致")
repl(s, "达人｜小寄样、精选高潜达人",
     "达人：寄得少、寄得好，出单效率上来\n产品：价格微降，更好转化\n季节：秋冬款当季，长裤放量")
repl(s, "2190｜大爆单达人带动跟投",
     "2190：有达人爆单带动，出单率回升明显\n2178：没有爆单带动，回升较小")
repl(s, "两款统一沿用",
     "① 两款继续少寄优寄（已验证有效）\n② 2190 借爆单达人，继续放量\n③ 2178 找爆单达人带，补寄样和视频")

# ---------- SLIDE 9 (idx8) 2189+28173 ----------
s = prs.slides[8]
repl(s, "月度出单上升", "月度出单 176→723→999 三连升", exact=True)
repl(s, "击率提升，点击量也有所增长", "点击率升、转化率降，承接再观察")
repl(s, "① 补视频 / 达人供给", "① 补视频、补达人 ② 重点跟出单率高的")
repl(s, "出单达人稳定、出单率稳定", "寄样逐月加码、出单达人稳定", exact=True)
repl(s, "放量型——多寄不稀释", "9月小幅回落是视频少了 + 沉淀期，不是转化崩")

# ---------- SLIDE 10 (idx9) 2881+28102 ----------
s = prs.slides[9]
repl(s, "① 量：不是原因", "① 量：寄样、视频都更多，出单却更少——问题不在量，在内容转化")
repl(s, "② 质：内容转化",
     "② 质：2881 内容转化好，一推就出单；28102 素材没跑通，达人不愿带\n状态结论：两款都在观察期：2881 暂不放大，28102 暂不淘汰，待数据进一步验证")

# ---------- SLIDE 11 (idx10) 2L06 ----------
s = prs.slides[10]
repl(s, "首月测试已出现初步销售及自然单信号", "测款首月就有单、有自然承接，点击率还超去年爆款，值得明年春夏备大货")
repl(s, "对比：月度出单 74 单是 2722",
     "出单量是去年爆款的 2 倍多，最能打\n点击率更高，内容更吸引人\n转化略低，但出单照样更多")
repl(s, "结论：2722 当年测款即春夏爆款", "2722 当年测款就是爆款；2L06 表现不输，定为明年春夏款")

# ---------- SLIDE 13 (idx12) 素材供给 -> 达人合作结构 ----------
s = prs.slides[12]
repl(s, "达人素材供给：人均 1.92 条，靠人头铺量", "达人合作结构：单次发布占比较高", exact=True)
repl(s, "达人只发 1 条（近七成）", "单次发布为主")
repl(s, "现象 / 结论", "核心发现", exact=True)
repl(s, "素材产出靠达人数量铺量", "单次发布为主占 69.5%、多次占 30.5%；重复发布占比低，是否影响出单需结合出单情况验证")
repl(s, "达人产出分布（品 × 达人组合）", "达人-SKU 组合发布次数分布", exact=True)
repl(s, "落点策略　 激活素材量", "后续观察方向：① 结合出单情况识别值得持续合作的达人 ② 观察多次发布组合的出单表现 ③ 区分有效复投与单纯增加素材数量")

# ---------- SLIDE 14 (idx13) 达人建联 ----------
s = prs.slides[13]
repl(s, "达人建联", "达人建联：建联 27 → 已发视频 20 → 已出单 17", exact=True)
repl(s, "抖音号 / 官号 / 邮件私信建联", "抖音号 / 官号 / 邮件私信建联；四款爆品共建联 27 位，其中 17 位已出单", exact=True)
repl(s, "后续联系达人更方便", "WhatsApp 已添加 10 位，后续联系更方便")
repl(s, "已寄样，待发视频", "付费达人 已合作 2 位，已寄样、待发视频")

# ---------- SLIDE 16 (idx15) 下月行动：改主表 ----------
s = prs.slides[15]
for sh in s.shapes:
    if sh.has_table:
        tb = sh.table
        # 判断是主表还是测品表：看表头
        hdr = [c.text.strip() for c in tb.rows[0].cells]
        if "方向" in hdr:  # 主表
            for row in list(tb.rows)[1:]:
                cells = row.cells
                sku = cells[0].text.strip()
                if sku == "2190":
                    set_cell_text(cells[1], "扩量")
                    set_cell_text(cells[2], "保持并适度扩寄样")
                elif sku == "28173":
                    set_cell_text(cells[2], "继续放大寄样、稳住出单率 30-34%")
                elif sku == "2178":
                    set_cell_text(cells[2], "加寄样兑现出单率")

prs.save(OUT)
print("saved:", OUT)
