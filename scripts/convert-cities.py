#!/usr/bin/env python3
"""
Convert lutangar/cities.json to optimized format for MyStarsSpace.
Outputs a compact JSON array: [name, lat, lng, countryISO]
Stored as public/cities.json for lazy loading.
"""
import json, sys

# Read the raw file (may have markdown header)
with open(sys.argv[1]) as f:
    content = f.read()

# Find JSON array start
start = content.index('[')
raw = json.loads(content[start:])
print(f"Input: {len(raw)} cities")

# Convert to compact format: [name, lat, lng, country_iso]
# This reduces file size by ~60%
cities = []
seen = set()
for c in raw:
    key = (c['name'], c['country'])
    if key in seen:
        continue
    seen.add(key)
    cities.append([
        c['name'],
        round(float(c['lat']), 4),
        round(float(c['lng']), 4),
        c['country']
    ])

print(f"Output: {len(cities)} unique cities")

# Write compact JSON
out_path = sys.argv[2] if len(sys.argv) > 2 else '/Users/mac/Projects/MyStarsSpace/public/cities.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(cities, f, ensure_ascii=False, separators=(',', ':'))

import os
size = os.path.getsize(out_path)
print(f"Output file: {out_path} ({size:,} bytes, ~{size//1024}KB)")
