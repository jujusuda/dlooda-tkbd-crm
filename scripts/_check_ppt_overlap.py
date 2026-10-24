# -*- coding: utf-8 -*-
"""Overlap check for pptx text boxes, ignoring background shapes."""
import os, sys
from pptx import Presentation
from pptx.util import Emu, Inches

pptx_path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\Dlooda_8月月度汇报_v6.pptx"
prs = Presentation(pptx_path)

def bbox(shape):
    try:
        return (shape.left, shape.top, shape.width, shape.height)
    except Exception:
        return None

def iou(a, b):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix = max(ax, bx); iy = max(ay, by)
    ix2 = min(ax2, bx2); iy2 = min(ay2, by2)
    if ix >= ix2 or iy >= iy2:
        return 0.0
    inter = (ix2 - ix) * (iy2 - iy)
    area_a = aw * ah
    area_b = bw * bh
    return inter / min(area_a, area_b)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

for idx, slide in enumerate(prs.slides, start=1):
    boxes = []
    for shp in slide.shapes:
        bb = bbox(shp)
        if bb is None:
            continue
        # skip thin separators
        if bb[2] < Emu(10000) or bb[3] < Emu(10000):
            continue
        # skip full-slide background shapes
        if bb[2] >= SLIDE_W * 0.95 and bb[3] >= SLIDE_H * 0.95:
            continue
        text = ""
        try:
            if shp.has_text_frame:
                text = shp.text_frame.text.strip()[:60]
        except Exception:
            pass
        # only keep shapes that actually carry visible text, or are metric cards / small boxes
        if not text and bb[2] > Inches(2):
            continue
        boxes.append((bb, text, shp.shape_type))
    overlaps = []
    for i in range(len(boxes)):
        for j in range(i+1, len(boxes)):
            v = iou(boxes[i][0], boxes[j][0])
            if v > 0.10:
                overlaps.append((v, boxes[i][1], boxes[j][1]))
    print(f"Slide {idx}: {len(overlaps)} overlaps")
    for v, t1, t2 in overlaps[:10]:
        print(f"  IoU={v:.2f} | {t1!r} vs {t2!r}")
