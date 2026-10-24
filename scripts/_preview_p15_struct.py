# -*- coding: utf-8 -*-
"""生成 v9_16(主视觉布局) 第15页 版式预览 SVG（忠实复刻坐标/数据/配色，非 PPT 真渲染）。"""
import math
INCH = 51.0
def px(i): return round(i*INCH,1)
W,H=680,383
parts=[]
def rect(x,y,w,h,fill,stroke="none",sw=0,r=0):
    parts.append(f'<rect x="{px(x)}" y="{px(y)}" width="{px(w)}" height="{px(h)}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
def txt(x,y,s,size,color,bold=False,anchor="start"):
    fw="font-weight:bold;" if bold else ""
    parts.append(f'<text x="{px(x)}" y="{px(y)+size*0.35}" font-size="{size}" fill="{color}" font-family="\'Microsoft YaHei\',sans-serif" {fw} text-anchor="{anchor}">{s}</text>')
def line(x1,y1,x2,y2,col,sw=1):
    parts.append(f'<line x1="{px(x1)}" y1="{px(y1)}" x2="{px(x2)}" y2="{px(y2)}" stroke="{col}" stroke-width="{sw}"/>')

INK='#1F1F1F'; BODY='#3D3D3D'; MUTE='#9A9A9A'; ACC='#B06579'; ACC_L='#E3B9C6'; GRAY='#6B6B6B'
CARD='#F7F4F5'; HDR='#EFE7EA'; ZEB='#FAF7F8'; LINE='#E6E0E2'; WHITE='#FFFFFF'

parts.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="{WHITE}"/>')
# title
rect(0.6,0.34,0.1,0.74,ACC)
txt(0.84,0.26,"达人合作结构：单次发布占比较高",17,INK,bold=True)
txt(12.73-3.43,0.40,"PART 03 · 达人端",8.5,MUTE,anchor="end")
txt(0.84,1.0,"9 月达人 - SKU 合作以单次发布为主，多次发布组合占比 30.5%",10.6,GRAY)
rect(0.6,1.5,12.13,0.012,LINE)

# ---- left narrow table ----
txt(0.6,1.6,"四款爆品素材概况",7.8,ACC,bold=True)
tx,ty,tw,th=0.6,1.94,2.5,1.7
cols_w=[0.72,0.56,0.5,0.52]; rows=5
ch_h=th/rows
hdr=['SKU','素材','达人','人均']
data=[['28173','161','90','1.79'],['2190','106','59','1.80'],['2178','84','55','1.53'],['2189','79','52','1.52']]
for ci,cw_ in enumerate(cols_w):
    rect(tx+sum(cols_w[:ci]),ty,cw_,ch_h,HDR)
    parts.append(f'<text x="{px(tx+sum(cols_w[:ci])+cw_/2)}" y="{px(ty)+ch_h*0.5+3.2}" font-size="6.4" fill="{INK}" font-family="\'Microsoft YaHei\',sans-serif" font-weight:bold; text-anchor="middle">{hdr[ci]}</text>')
for ri in range(rows-1):
    ry=ty+ch_h*(ri+1)
    for ci,cw_ in enumerate(cols_w):
        x=tx+sum(cols_w[:ci]); fill=WHITE if ri%2==0 else ZEB
        rect(x,ry,cw_,ch_h,fill,stroke=LINE,sw=0.5)
        val=data[ri][ci]; col=ACC if ci==3 else BODY; b=ci==3
        parts.append(f'<text x="{px(x+cw_/2)}" y="{px(ry)+ch_h*0.5+3}" font-size="6.6" fill="{col}" font-family="\'Microsoft YaHei\',sans-serif" {"font-weight:bold;" if b else ""} text-anchor="middle">{val}</text>')
txt(0.6,3.72,"全店 743 条 / 386 位",6.6,MUTE)
txt(0.6,3.98,"= 1.92 条 / 人",6.6,MUTE,bold=True)
txt(0.6,4.24,"（辅助指标）",6,MUTE)

# ---- main visual: doughnut ----
cx,cy,Ro,Ri = 5.9,3.3,1.5,0.92
cxp,cyp,Rop,Rip = px(cx),px(cy),px(Ro),px(Ri)
def pt(R,deg):
    a=math.radians(deg); return (cxp+R*math.cos(a), cyp+R*math.sin(a))
s0,s1,m1 = -90,160.2,270
po0=pt(Rop,s0); po1=pt(Rop,s1); po2=pt(Rop,m1)
large_s = 1 if (s1-s0)>180 else 0
large_m = 1 if (m1-s1)>180 else 0
single=f'<path d="M {cxp} {cyp} L {po0[0]} {po0[1]} A {Rop} {Rop} 0 {large_s} 1 {po1[0]} {po1[1]} Z" fill="{ACC_L}"/>'
mult  =f'<path d="M {cxp} {cyp} L {po1[0]} {po1[1]} A {Rop} {Rop} 0 {large_m} 1 {po2[0]} {po2[1]} Z" fill="{ACC}"/>'
parts.append(single); parts.append(mult)
parts.append(f'<circle cx="{cxp}" cy="{cyp}" r="{Rip}" fill="{WHITE}"/>')
# title above doughnut
txt(3.2,1.5,"达人 - SKU 组合发布次数分布",9.2,INK,bold=True)
# in-wedge labels (compute in inches, txt() converts to px)
rim = Ro*0.72
ls = (cx+rim*math.cos(math.radians((s0+s1)/2)), cy+rim*math.sin(math.radians((s0+s1)/2)))
lm = (cx+rim*math.cos(math.radians((s1+m1)/2)), cy+rim*math.sin(math.radians((s1+m1)/2)))
parts.append(f'<text x="{px(ls[0])}" y="{px(ls[1])+3}" font-size="9" fill="{INK}" font-family="\'Microsoft YaHei\',sans-serif" font-weight:bold; text-anchor="middle">69.5%</text>')
parts.append(f'<text x="{px(lm[0])}" y="{px(lm[1])+3}" font-size="9" fill="{WHITE}" font-family="\'Microsoft YaHei\',sans-serif" font-weight:bold; text-anchor="middle">30.5%</text>')

# ---- right: callouts + 三品类明细 ----
txt(9.55,1.66,"单次发布",8.5,GRAY)
txt(9.55,1.92,"69.5%",21,ACC,bold=True)
txt(9.55,2.56,"178 组 · 仅 1 条发布",7,MUTE)
txt(9.55,3.18,"多次发布",8.5,GRAY)
txt(9.55,3.44,"30.5%",21,INK,bold=True)
txt(9.55,4.08,"78 组 · 2 条及以上",7,MUTE)
txt(9.55,4.52,"三品类明细：",6.6,BODY,bold=True)
txt(9.55,4.78,"1 条 178 组 / 69.5%",6.6,MUTE)
txt(9.55,5.02,"2 条 43 组 / 16.8%",6.6,MUTE)
txt(9.55,5.26,"3 条+ 35 组 / 13.7%",6.6,MUTE)

# ---- bottom cards ----
CBY,CBH=5.2,1.0
rect(0.6,CBY,12.13,CBH,CARD,stroke=LINE,sw=0.75,r=4)
rect(0.6,CBY+0.13,0.08,CBH-0.26,ACC)
txt(0.84,CBY+0.1,"核心发现：",8.85,ACC,bold=True)
txt(1.7,CBY+0.1,"9 月达人 - SKU 合作以单次发布为主，占比 69.5%；多次发布组合占 30.5%。当前数据反映重复发布占比较低，但尚不能判断其是否影响出单表现，需结合达人出单情况进一步验证。",8.85,BODY)
OBY,OBH=6.35,0.82
rect(0.6,OBY,12.13,OBH,CARD,stroke=LINE,sw=0.75,r=4)
rect(0.6,OBY+0.13,0.08,OBH-0.26,ACC)
txt(0.84,OBY+0.1,"后续观察方向：",8.85,ACC,bold=True)
txt(1.85,OBY+0.1,"① 结合出单情况识别值得持续合作的达人　② 观察多次发布组合的出单表现　③ 区分有效复投与单纯增加素材数量",8.85,ACC,bold=True)

svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 680 383" font-family="\'Microsoft YaHei\',sans-serif">\n'+"\n".join(parts)+'\n</svg>'
open("scripts/_preview_p15_struct.svg","w",encoding="utf-8").write(svg)
print("WROTE scripts/_preview_p15_struct.svg")
