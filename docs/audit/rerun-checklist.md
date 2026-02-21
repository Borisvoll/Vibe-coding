# BORIS OS — Rerun Audit Checklist

**Purpose:** Commands and searches to repeat this audit in future sessions.

---

## 1. Test Health

```bash
# Run full test suite
npm test

# Count tests
npx vitest run 2>&1 | grep "Tests"

# Check for skipped tests
grep -rn "\.skip\|xit\|xdescribe\|it\.skip\|describe\.skip" tests/
```

## 2. Dead Imports (files importing modules that don't exist)

```bash
# Find imports of deleted files
grep -rn "from.*router\.js\|from.*state\.js\|from.*shortcuts\.js" src/ --include="*.js" --include="*.jsx"

# Find imports of shell.js (should be zero after cleanup)
grep -rn "from.*os/shell" src/ --include="*.js" --include="*.jsx"

# Find imports of deepLinks.js
grep -rn "from.*deepLinks" src/ --include="*.js" --include="*.jsx"

# Find imports of featureFlags.js
grep -rn "from.*featureFlags" src/ --include="*.js" --include="*.jsx"
```

## 3. Orphaned Files (not imported anywhere)

```bash
# List all JS/JSX source files
find src/ -name "*.js" -o -name "*.jsx" | sort > /tmp/all-sources.txt

# For each file, check if it's imported by any other file
while IFS= read -r file; do
  base=$(basename "$file" | sed 's/\.[^.]*$//')
  count=$(grep -rn "$base" src/ --include="*.js" --include="*.jsx" | grep -v "$file" | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "ORPHAN: $file"
  fi
done < /tmp/all-sources.txt
```

## 4. React vs Vanilla Route Coverage

```bash
# List React routes
grep -n 'path=' src/react/App.jsx

# Check which route components are placeholders
grep -rn "wordt gemigreerd\|placeholder\|TODO\|FIXME" src/react/routes/

# Check VanillaBridge usage
grep -rn "VanillaBridge" src/react/ --include="*.jsx"
```

## 5. Block Registry Health

```bash
# Count registered blocks
grep -c "registry.register" src/blocks/registerBlocks.js

# List block directories
ls -d src/blocks/*/

# Find blocks not imported in registerBlocks.js
for dir in src/blocks/*/; do
  block=$(basename "$dir")
  if ! grep -q "$block" src/blocks/registerBlocks.js; then
    echo "UNREGISTERED: $block"
  fi
done
```

## 6. Styling Consistency

```bash
# Find hardcoded hex colors in React components
grep -rn "#[0-9a-fA-F]\{3,6\}" src/react/ --include="*.jsx"

# Find arbitrary Tailwind values (should use mapped tokens)
grep -rn "\[var(--" src/react/ --include="*.jsx" | head -20

# Count CSS files
find src/ -name "*.css" | wc -l

# Check Tailwind token mapping completeness
grep "var(--" src/react/tailwind.css | wc -l
```

## 7. Event Bus Health

```bash
# List all event names
grep -rno "eventBus\.\(on\|emit\)('[^']*'" src/ --include="*.js" --include="*.jsx" | \
  sed "s/.*('\([^']*\)'/\1/" | sort -u

# Find events emitted but never subscribed
# (manual comparison of emit vs on lists)

# Find events subscribed but never emitted
grep -rn "eventBus.on(" src/ --include="*.js" --include="*.jsx"
grep -rn "eventBus.emit(" src/ --include="*.js" --include="*.jsx"
```

## 8. Store Adapter Health

```bash
# Verify no stores import React
grep -rn "from 'react\|from \"react\|import React" src/stores/

# Verify all stores are tested
for store in src/stores/*.js; do
  base=$(basename "$store" .js)
  if ! ls tests/stores/${base}*.test.js 2>/dev/null | grep -q .; then
    echo "UNTESTED: $store"
  fi
done
```

## 9. Bundle Size

```bash
# Build and check sizes
npm run build 2>&1 | grep -E "\.js|\.css|gzip"
```

## 10. Dead CSS Detection (heuristic)

```bash
# Find CSS classes defined in block stylesheets
grep -rho "\.[a-z][a-z0-9_-]*" src/blocks/*/styles.css | sort -u > /tmp/css-classes.txt

# Check which are used in view.js files
while IFS= read -r cls; do
  classname="${cls#.}"
  if ! grep -qr "$classname" src/blocks/ --include="*.js"; then
    echo "UNUSED CSS: $cls"
  fi
done < /tmp/css-classes.txt
```

---

## Quick Summary Check

Run this one-liner after any significant change:

```bash
npm test && npm run build && echo "---" && \
grep -c "registry.register" src/blocks/registerBlocks.js && \
grep -rn "wordt gemigreerd" src/react/routes/ | wc -l && \
echo "Above: test+build, registered blocks, placeholder routes"
```

Expected after full cleanup:
- Tests: 495+ passing
- Build: green
- Registered blocks: depends on pruning decisions
- Placeholder routes: 0 (all routes functional)
