from pptx import Presentation

SRC = r'E:\xwechat_files\wxid_od6e7r1klxs422_54c2\temp\RWTemp\2026-09\8be9710a0a0dd58ff4cb419316577cc7\8月余慧玲8月月度汇报(3).pptx'
p = Presentation(SRC)

for idx in (15, 18):  # 0-indexed -> P16, P19
    s = list(p.slides)[idx]
    print('========== SLIDE %d ==========' % (idx+1))
    for i, sh in enumerate(s.shapes):
        top = sh.top/914400 if sh.top is not None else None
        left = sh.left/914400 if sh.left is not None else None
        w = sh.width/914400 if sh.width is not None else None
        h = sh.height/914400 if sh.height is not None else None
        fill=''
        try:
            if sh.fill.type==1: fill='fill=#%s'%str(sh.fill.fore_color.rgb)
            elif sh.fill.type==0: fill='fill=NONE'
            else: fill='fill=t%s'%sh.fill.type
        except Exception: fill='fill=?'
        txt=''
        if sh.has_text_frame:
            txt=' | '.join(pp.text for pp in sh.text_frame.paragraphs if pp.text.strip())[:40]
            # also show first run color
            cols=set()
            for pp in sh.text_frame.paragraphs:
                for r in pp.runs:
                    try:
                        if r.font.color and r.font.color.type is not None:
                            cols.add('#%s'%str(r.font.color.rgb))
                    except: pass
            if cols: txt += ' [runcols=%s]'%','.join(sorted(cols))
        print('  [%d] L=%.2f T=%.2f W=%.2f H=%.2f %s [%s]'%(i,left,top,w,h,fill,txt))
