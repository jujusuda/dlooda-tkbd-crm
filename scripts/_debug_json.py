"""Check all available fields in creator data"""
import json, re

with open(r'C:\Users\LENOVO\WorkBuddy\2026-08-02-13-13-32\js\real-data.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'JSON\.parse\("([\s\S]+?)"\)\s*;', content)
raw = m.group(1)
fixed = raw.replace('\\\\"', '\\"').replace('\\"', '"')
data = json.loads(fixed)

# Show all fields of first few creators
print("=== All fields (first 3 creators) ===")
for i, cr in enumerate(data['creators'][:3]):
    print(f"\nCreator {i+1}: {cr.get('name')}")
    for k, v in cr.items():
        if isinstance(v, list) and len(v) > 3:
            print(f"  {k}: [{v[:3]}, ...] ({len(v)} items)")
        else:
            print(f"  {k}: {v}")

# Search for order-related field names
print("\n\n=== Searching for order-related fields ===")
all_keys = set()
for cr in data['creators']:
    all_keys.update(cr.keys())
order_keys = [k for k in all_keys if 'order' in k.lower() or 'Order' in k]
print(f"Order-related keys: {order_keys}")
print(f"All keys: {sorted(all_keys)}")
