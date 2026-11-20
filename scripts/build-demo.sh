#!/usr/bin/env bash
# GitHub Pages 用のデモ版（AI なし）を out-demo/ に書き出す。
# 静的サイトではサーバー側の処理（API・合言葉）が使えないため、それらを除いたコピーでビルドする。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -C "$ROOT" --exclude=node_modules --exclude=.next --exclude=.git --exclude=out-demo -cf - . | tar -C "$WORK" -xf -
ln -s "$ROOT/node_modules" "$WORK/node_modules"
rm -rf "$WORK/src/app/api" "$WORK/src/app/login" "$WORK/src/middleware.ts"

(cd "$WORK" && NEXT_PUBLIC_DEMO=1 npx next build)
rm -rf "$ROOT/out-demo"
cp -r "$WORK/out" "$ROOT/out-demo"
touch "$ROOT/out-demo/.nojekyll"
echo "demo written to out-demo/"
