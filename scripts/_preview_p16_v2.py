# -*- coding: utf-8 -*-
# 生成 v9_14 v2.1 第16页的 SVG 版式预览（坐标/数据/配色与 PPT 一致），用于用户确认版式。
import os
S = 51.0
def px(v): return round(v*S, 1)

FUN1='#C97F95'; FUN2='#B06579'; FUN3='#9A4F66'; ACC='#B06579'
INK='#1F1F1F'; BODY='#3D3D3D'; MUTE='#9A9A9A'; GRAY='#6B6B6B'
CARD='#F7F4F5'; HDR='#EFE7EA'; ZEB='#FAF7F8'; LINE='#E6E0E2'; WHITE='#FFFFFF'
FF="'Microsoft YaHei', sans-serif"

svg=[]
def add(s): svg.append(s)
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="404" viewBox="0 0 680 404" font-family="{FF}" role="img"><title>达人建联页 v2.1 左右分栏版式预览</title>')
add(f'<rect x="0" y="0" width="680" height="383" fill="#FFFFFF"/>')

# 标题区
add(f'<rect x="{px(0.6)}" y="{px(0.34)}" width="{px(0.1)}" height="{px(0.74)}" fill="{ACC}"/>')
add(f'<text x="{px(0.84)}" y="{px(0.62)}" font-size="17" font-weight="bold" fill="{INK}">达人建联：建联 27 → 已发视频 20 → 已出单 17</text>')
add(f'<text x="{px(12.73)}" y="{px(0.62)}" font-size="8.5" fill="{MUTE}" text-anchor="end">PART 03 · 达人端</text>')
add(f'<text x="{px(0.84)}" y="{px(1.12)}" font-size="10.6" fill="{GRAY}">抖音号 / 官号 / 邮件私信建联；四款爆品共成功建联 27 位，其中 17 位已出单</text>')
add(f'<rect x="{px(0.6)}" y="{px(1.5)}" width="{px(12.13)}" height="0.6" fill="{LINE}"/>')

# 左栏漏斗（无描边连续锥形）
CX=px(3.425)
def trap(vt,vb,yt,yb,fill):
    ht=px(vt*0.159259/2); hb=px(vb*0.159259/2)
    y_t=px(yt); y_b=px(yb)
    add(f'<polygon points="{CX-ht},{y_t} {CX+ht},{y_t} {CX+hb},{y_b} {CX-hb},{y_b}" fill="{fill}"/>')
trap(27,20,1.66,2.61,FUN1)
trap(20,17,2.89,3.84,FUN2)
trap(17,11,4.12,5.07,FUN3)
def txt(cx,cy,lines):
    y=cy
    for (t,sz,b,col) in lines:
        add(f'<text x="{cx}" y="{y}" font-size="{sz}" font-weight="{"bold" if b else "normal"}" fill="{col}" text-anchor="middle">{t}</text>')
        y+=sz+3
txt(CX, px(2.135)-6, [('27',22.6,True,WHITE),('成功建联',9.2,True,WHITE)])
txt(CX, px(3.365)-6, [('20',22.6,True,WHITE),('已发视频',9.2,True,WHITE)])
txt(CX, px(4.595)-6, [('17',22.6,True,WHITE),('已出单',9.2,True,WHITE)])
# 层间转化率（单行）
txt(CX, px(2.75), [('建联→发视频  74.1%（流失 26% · 最大环节）',8.5,True,ACC)])
txt(CX, px(4.00), [('发视频→出单  85.0%（转化健康）',8.5,True,ACC)])
txt(CX, px(5.22), [('整体建联→出单  63.0%',9.2,True,ACC)])
add(f'<text x="{px(0.7)}" y="{px(5.55)}" font-size="8.2" fill="{BODY}"><tspan x="{px(0.7)}" dy="0">分析：建联→发视频流失最大（约 26%），</tspan><tspan x="{px(0.7)}" dy="11">下一步重点催发视频、筛选高意愿达人。</tspan></text>')

# 右栏：各品明细表
RX=px(6.45); RY=px(1.94)
add(f'<text x="{RX}" y="{px(1.80)}" font-size="9.2" font-weight="bold" fill="{ACC}">各品建联明细</text>')
cols=[1.55,1.55,1.95,1.20]; cw=[px(c) for c in cols]
xs=[RX]
for w in cw: xs.append(xs[-1]+w)
rows=[('品','建联','已发视频','已出单'),('2178','9','7','7'),('2190','13','9','6'),('28173','3','2','2'),('2189','2','2','2'),('合计','27','20','17')]
rh=px(0.30)
for ri,row in enumerate(rows):
    y=RY+ri*rh
    if ri==0 or ri==5: fill=HDR
    else: fill= WHITE if ri%2==1 else ZEB
    add(f'<rect x="{RX}" y="{y}" width="{px(6.25)}" height="{rh}" fill="{fill}"/>')
    cy=y+rh/2+2.5
    for ci,val in enumerate(row):
        col=ACC if (ci>=1 and ri not in (0,5)) else (INK if ri==5 else BODY)
        b=(ri in (0,5)) or (ci>=1)
        add(f'<text x="{xs[ci]+cw[ci]/2}" y="{cy}" font-size="8.5" font-weight="{"bold" if b else "normal"}" fill="{col}" text-anchor="middle">{val}</text>')
add(f'<rect x="{RX}" y="{RY}" width="{px(6.25)}" height="{rh*6}" fill="none" stroke="{LINE}" stroke-width="1"/>')
for i in range(1,len(xs)):
    add(f'<line x1="{xs[i]}" y1="{RY}" x2="{xs[i]}" y2="{RY+rh*6}" stroke="{LINE}" stroke-width="0.8"/>')
for ri in range(1,6):
    y=RY+ri*rh
    add(f'<line x1="{RX}" y1="{y}" x2="{RX+px(6.25)}" y2="{y}" stroke="{LINE}" stroke-width="0.8"/>')

# 右栏：渠道卡（大字数量）
add(f'<text x="{RX}" y="{px(3.98)}" font-size="9.2" font-weight="bold" fill="{ACC}">渠道 / 深绑（独立，不进主漏斗）</text>')
def card(cy,num,title,sub):
    add(f'<rect x="{RX}" y="{cy}" width="{px(6.25)}" height="{px(0.85)}" rx="6" fill="{CARD}" stroke="{LINE}" stroke-width="0.8"/>')
    cxc=RX+px(0.2)+px(0.29); cyc=cy+px(0.14)+px(0.29)
    add(f'<circle cx="{cxc}" cy="{cyc}" r="{px(0.29)}" fill="{ACC}"/>')
    add(f'<text x="{cxc}" y="{cyc+5}" font-size="16.5" font-weight="bold" fill="{WHITE}" text-anchor="middle">{num}</text>')
    add(f'<text x="{RX+px(0.95)}" y="{cy+px(0.36)}" font-size="11" font-weight="bold" fill="{INK}">{title}</text>')
    add(f'<text x="{RX+px(0.95)}" y="{cy+px(0.64)}" font-size="8.2" fill="{GRAY}">{sub}</text>')
card(px(4.20),'10','WhatsApp 深绑 10 位','绑定更深，出单更稳定')
card(px(5.15),'2','付费达人 2 位','已寄样，待发视频（推进中）')

# 底部通栏策略
BY=px(6.30)
add(f'<rect x="{px(0.6)}" y="{BY}" width="{px(12.13)}" height="{px(0.62)}" rx="6" fill="{CARD}" stroke="{LINE}" stroke-width="0.8"/>')
add(f'<rect x="{px(0.6)}" y="{BY+px(0.14)}" width="{px(0.08)}" height="{px(0.34)}" fill="{ACC}"/>')
add(f'<text x="{px(0.84)}" y="{BY+px(0.40)}" font-size="9.6" font-weight="bold" fill="{ACC}">落点策略　① 扩大建联规模　② WhatsApp 加深绑定　③ 推进付费达人合作落地</text>')

add(f'<text x="10" y="384" font-size="8" fill="{MUTE}">版式预览（坐标/数据/配色与 PPT 一致，非 PowerPoint 真渲染；虚线为预览参考，PPT 内无边框）</text>')
add('</svg>')
out=os.path.join(os.path.dirname(__file__),'_preview_p16_v2.svg')
open(out,'w',encoding='utf-8').write('\n'.join(svg))
print('SVG written:',out,'len',len('\n'.join(svg)))
