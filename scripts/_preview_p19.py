# -*- coding: utf-8 -*-
"""生成 v9_15 第19页（下月行动）的 SVG 版式预览（忠实复刻坐标/数据/配色，非 PPT 真渲染）。"""
import json

W, H = 680, 360
SC = W / 13.33  # 51.01 px/inch
def px(v): return v * SC

ACC='#B06579'; INK='#1F1F1F'; BODY='#3D3D3D'; MUTE='#9A9A9A'
CARD='#F7F4F5'; HDR='#EFE7EA'; ZEB='#FAF7F8'; LINE='#E6E0E2'; WHITE='#FFFFFF'

parts = []
def rect(x,y,w,h,fill,stroke=LINE,sw=1,rx=0):
    parts.append(f'<rect x="{px(x):.1f}" y="{px(y):.1f}" width="{px(w):.1f}" height="{px(h):.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
def text(x,y,s,size,color,bold=False,anchor='start'):
    fw='font-weight="bold"' if bold else ''
    parts.append(f'<text x="{px(x):.1f}" y="{px(y):.1f}" font-family="\'Microsoft YaHei\',sans-serif" font-size="{size}" fill="{color}" {fw} text-anchor="{anchor}">{s}</text>')

# background
parts.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{WHITE}"/>')
# title accent bar
rect(0.6,0.34,0.1,0.74,ACC,stroke='none')
text(0.84,0.75,'下月行动：爆品守量 + 测品扩测',22,INK,bold=True)
text(12.73,0.7,'PART 04 · 下月行动',11,MUTE,anchor='end')
text(0.84,1.45,'把 9 月数据结论翻译成动作；结构从「爆品为主」转向「爆品守量 + 测品扩测」',13.5,BODY)
rect(0.6,1.6,12.13,0.012,LINE,stroke='none')

# number card
rect(0.6,1.7,12.13,0.92,CARD,rx=6)
rect(0.6,1.84,0.09,0.64,ACC,stroke='none')
text(0.95,2.4,'560 件',34,ACC,bold=True)
text(0.97,2.62,'10 月寄样目标',12.5,BODY)
rect(9.75,1.9,2.7,0.5,ACC,stroke='none',rx=6)
text(11.1,2.24,'+27.0%',17,WHITE,bold=True,anchor='middle')
text(11.1,2.62,'9 月 441 → 10 月 560',10.5,MUTE,anchor='middle')

# section titles
text(0.6,2.82,'下月寄样 SKU（爆品）',12.5,ACC,bold=True)
text(6.9,2.82,'下月新增测品寄样目标',12.5,ACC,bold=True)

# main table (4 cols, 6 rows) start y2.9
main_hdr=['SKU','方向','动作','下月寄样目标']
main_rows=[
 ('2190','扩量','保持并适度扩寄样','40'),
 ('28173','放量','继续放大寄样、稳住出单率 30-34%','70'),
 ('2178','守量','加寄样兑现出单率','40'),
 ('2189','补量','补视频与达人供给','40'),
 ('合计','','','190'),
]
mcw=[1.2,0.95,2.95,0.9]; mx0=0.6; my0=2.9; mrh=[0.4]+[0.44]*4+[0.38]; mrh= [0.38,0.44,0.44,0.44,0.44,0.38]
cum=0
# header
cx=mx0
for j,cw in enumerate(mcw):
    rect(cx,my0,mcw[j],0.38,HDR,stroke=LINE)
    text(cx+mcw[j]/2,my0+0.25,main_hdr[j],10.5,INK,bold=True,anchor='middle')
    cx+=mcw[j]
# rows
for i,row in enumerate(main_rows):
    ry=my0+0.38+i*0.44
    fill=HDR if i==4 else (WHITE if i%2==0 else ZEB)
    cx=mx0
    for j,cw in enumerate(mcw):
        rect(cx,ry,cw,0.44,fill,stroke=LINE)
        val=row[j]
        if val=='':
            cx+=cw; continue
        if j==3:
            text(cx+cw/2,ry+0.29,val,11,ACC,bold=True,anchor='middle') if i!=4 else text(cx+cw/2,ry+0.29,val,11,INK,bold=True,anchor='middle')
        elif j==1:
            text(cx+cw/2,ry+0.29,val,10.5,ACC,bold=True,anchor='middle')
        elif j==0:
            text(cx+cw/2,ry+0.29,val,10.5,INK if i!=4 else INK,bold=(i==4),anchor='middle')
        else:
            text(cx+0.08,ry+0.29,val,10,BODY)
        cx+=cw

# test table (3 cols, 9 rows)
test_hdr=['定位','SKU','月目标']
test_rows=[
 ('测款','2A16','100'),('测款','2F08','20'),('测款','2A51','50'),('测款','2A50','50'),
 ('测款','2H43','50'),('测款','2Q02','50'),('测款','2C33','50'),('合计','','370'),
]
tcw=[1.3,2.0,2.7]; tx0=6.9; tyr=2.9; trh=0.30
cx=tx0
for j,cw in enumerate(tcw):
    rect(cx,tyr,cw,0.38,HDR,stroke=LINE)
    text(cx+cw/2,tyr+0.25,test_hdr[j],10.5,INK,bold=True,anchor='middle')
    cx+=cw
for i,row in enumerate(test_rows):
    ry=tyr+0.38+i*0.30
    fill=HDR if i==7 else (WHITE if i%2==0 else ZEB)
    cx=tx0
    for j,cw in enumerate(tcw):
        rect(cx,ry,cw,0.30,fill,stroke=LINE)
        val=row[j]
        if val=='':
            cx+=cw; continue
        if j==2:
            text(cx+cw/2,ry+0.21,val,10.5,ACC,bold=(i!=7),anchor='middle')
        elif j==1:
            text(cx+cw/2,ry+0.21,val,10.5,INK,bold=(i==7),anchor='middle')
        else:
            text(cx+0.08,ry+0.21,val,10,BODY)
        cx+=cw

text(12.73,5.74,'测品合计 370 件 | 总目标 = 爆品 190 + 测品 370 = 560 件',9.5,ACC,bold=True,anchor='end')

# 口径备注
rect(0.6,6.32,0.09,0.34,ACC,stroke='none')
text(0.84,6.55,'※ 目标口径同「本月新增寄样记录」，与概览表寄样端口径不同',10.5,MUTE)

svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 680 {H}" font-family="\'Microsoft YaHei\', sans-serif">\n' + "\n".join(parts) + '\n</svg>'
open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\scripts\_preview_p19.svg','w',encoding='utf-8').write(svg)
print("SVG written, len=", len(svg))
