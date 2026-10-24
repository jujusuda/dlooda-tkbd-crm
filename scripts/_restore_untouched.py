# -*- coding: utf-8 -*-
"""python-pptx 保存会规范化 XML（声明引号、\r\n、a:t 里的 &#10;），导致未改动的页面
与源不同。这里把「第14页及其依赖」之外的部件全部还原为源文件原始字节。"""
import zipfile, shutil

SRC = r"E:\xwechat_files\wxid_od6e7r1klxs422_54c2\temp\RWTemp\2026-10\8be9710a0a0dd58ff4cb419316577cc7\余慧玲9月月度汇报.pptx"
OUT = r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\余慧玲9月月度汇报_达人建联修改.pptx"
TMP = OUT + ".tmp"

KEEP_NEW = {"[Content_Types].xml", "ppt/slides/slide15.xml", "ppt/slides/_rels/slide15.xml.rels"}

src, out = zipfile.ZipFile(SRC), zipfile.ZipFile(OUT)
src_names, out_names = set(src.namelist()), set(out.namelist())
new_parts = out_names - src_names

zout = zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED)
reverted = kept = 0
for n in out.namelist():
    if n in KEEP_NEW or n in new_parts:
        data = out.read(n)
        kept += 1
    else:
        data = src.read(n) if n in src_names else out.read(n)
        reverted += 1
    zout.writestr(n, data)
zout.close()
src.close(); out.close()
shutil.move(TMP, OUT)
print("kept new:", kept, "| restored from source:", reverted)
print("new parts:", sorted(new_parts))
