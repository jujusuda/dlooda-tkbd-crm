# -*- coding: utf-8 -*-
from pptx.enum.chart import XL_LABEL_POSITION
for m in XL_LABEL_POSITION:
    try:
        print(m.name, m.value, "-> xml:", m.to_xml())
    except Exception as e:
        print(m.name, m.value, "-> (no to_xml)", e)
