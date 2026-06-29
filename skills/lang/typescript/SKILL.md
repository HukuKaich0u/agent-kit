---
name: typescript-best-practices
description: Use when writing or reviewing TypeScript — strict-mode type design, naming, error handling, and module/API layout, plus runtime-specific notes for Node libraries / CLIs, Cloudflare Workers, and React frontends. Trigger on `.ts` / `.tsx` / `tsconfig.json` work even when "TypeScript" is not named. For a structured frontend review pass, defer to the `frontend-review-*` skills.
---

# TypeScript Best Practices

汎用 TypeScript のベストプラクティス（土台）と、ランタイム別（Node ライブラリ/CLI、
Cloudflare Workers、React フロントエンド）の要点をまとめたスキル。記述・レビュー時に
常に参照する。フロントエンドの構造レビュー（CI / hygiene / deps / testing / security /
state / performance）が目的なら、専用の `frontend-review-*` skill に委ねる。

## このスキルを使うべきとき

- `.ts` / `.tsx` を書く・レビューする、`tsconfig.json` を設定するとき
- 型設計・API 設計の判断、strict 設定の確認、エラー処理方針の決定
- ライブラリ / CLI を npm 公開する前のチェック

使わないとき:
- フレームワークの初回 scaffolding（Vite/Next 等のドキュメントで足りる）
- フロントエンド固有の構造レビュー → `frontend-review-*`

## 土台（runtime 非依存）

### tsconfig は strict が前提

- `strict: true` は最低ライン。加えて `noUncheckedIndexedAccess`（配列・レコードアクセスに
  `undefined` を入れる）、`exactOptionalPropertyTypes`、`noImplicitOverride` を有効にする。
- `@ts-nocheck` / `@ts-ignore` は原則禁止。どうしても必要なら `@ts-expect-error` を使い、
  理由をコメントで添える（`@ts-expect-error` は不要になると未使用エラーで気づける）。
- ライブラリを公開するなら `declaration: true` で `.d.ts` を出す。`moduleResolution` は
  `bundler`（バンドラ前提）か `nodenext`（Node 直実行）を用途で選ぶ。

### 型設計

- **`any` を避け `unknown` を使う**。外部入力は `unknown` で受けてから絞り込む（型ガード /
  zod 等のスキーマ）。`as` キャストは最後の手段で、理由をコメントする。
- 特定用途の値には branded type / opaque type を検討する（`type UserId = string & { __brand: "UserId" }`）。
  プリミティブの取り違えをコンパイル時に防げる。
- 取りうる状態は **discriminated union** で表す（`{ type: "ok"; value: T } | { type: "err"; error: E }`）。
  boolean フラグの組み合わせより状態が明示的になり、`switch` で網羅チェックが効く。
- `interface` と `type` は、拡張・宣言マージが要るなら `interface`、union / mapped / conditional
  が要るなら `type`。プロジェクト内で一貫させる。
- `enum` は避け、`as const` のオブジェクト + `typeof` union を使う（`enum` は実体を生み、
  tree-shaking や型の挙動に癖がある）。

### 命名・モジュール

- 公開 API は `index.ts`（または `src/lib.ts`）に集約し、内部実装は出さない。barrel export は
  公開境界の制御に使い、内部の循環 import を生まないよう注意する。
- ファイル名は `kebab-case`、型は `PascalCase`、値は `camelCase`、定数 union は用途で判断。
- 副作用のある import を分け、純粋なモジュールは副作用フリーに保つ（tree-shaking が効く）。

### エラー処理

- 例外を投げるか `Result` 型（`{ ok: true; value } | { ok: false; error }`）を返すかを
  境界ごとに決める。ライブラリの公開 API は型に出る `Result` の方が呼び手に親切なことが多い。
- `catch (e)` の `e` は `unknown`。`instanceof` で絞るか、`Error` でラップし直す。生の文字列を
  throw しない。
- 非同期は async/await に統一し、未処理 Promise（floating promise）を残さない。lint の
  `no-floating-promises` を有効にする。

### 依存・ツール

- 依存追加時は npm の最新安定版を確認し、deprecated / メンテ停止を避ける（`frontend-review-deps`
  / `dep-lib-review` の triage が使える）。
- フォーマット・lint は biome か eslint+prettier。作業の区切りで型チェック（`tsc --noEmit`）と
  lint を走らせる。

## ランタイム別

### Node ライブラリ / CLI

- `package.json` の `exports` フィールドで公開エントリを明示する（`main`/`module`/`types` だけに
  頼らない）。ESM 前提なら `"type": "module"`。
- デュアルパッケージ（ESM+CJS）は配布が複雑化する。新規はまず ESM-only で始め、需要が出たら
  tsup / unbuild 等で両出力する。
- CLI は実体（ロジック）を `src/lib.ts` に、エントリ（引数パース）を `src/cli.ts` に分け、ロジックを
  テスト可能に保つ。shebang は `#!/usr/bin/env node`。
- publish 前チェック: `tsc --noEmit` / テスト / `exports` の解決確認（`publint` や
  `@arethetypeswrong/cli`）/ `files` か `.npmignore` で配布物を絞る / バージョン更新。

### Cloudflare Workers

- 型は `@cloudflare/workers-types`(または `wrangler types` 生成の `Env`)を使う。`process.env` ではなく
  ハンドラ引数の `env` からバインディングを取る。
- Node 組み込みAPIは限定的。`nodejs_compat` フラグの要否を確認し、fs 等は前提にしない。
- ルーティング/型は Hono などが定番。OTel やエラー追跡は `cloudflare-workers-otel-utels`、
  デプロイは `cloudflare-deploy` を参照。

### React / TypeScript フロントエンド

- props は `interface` か `type` で明示、`React.FC` より関数シグネチャに直接型を付ける流儀が主流。
- イベントハンドラやrefの型は DOM 型（`React.ChangeEvent<HTMLInputElement>` 等）を正確に。
- 状態・再レンダリング・Suspense などの**構造レビューは `frontend-review-*` / perspective skill に委ねる**。
  この skill は型の付け方の土台までを担当する。

## AI がよく間違う TypeScript

| 間違い | 正しくは |
|---|---|
| 配列アクセスを `T` 扱いして `undefined` を見落とす | `noUncheckedIndexedAccess` を有効にし、`arr[i]` は `T \| undefined` として扱う |
| `enum` を生成する | `as const` オブジェクト + `typeof obj[keyof typeof obj]` union |
| `catch (e: any)` | `catch (e)` の `e` は `unknown`。絞り込んでから使う |
| `Object.keys(x)` の戻りを `keyof typeof x` と思い込む | `Object.keys` は `string[]`。型付きが要るなら明示キャストか専用ヘルパ |
| `as` で強引にキャスト | 型ガード / スキーマ検証で絞る。`as` は理由付きの最終手段 |
| floating promise を放置 | `await` するか `void` を明示。`no-floating-promises` を lint で検出 |
| `// @ts-ignore` で握りつぶす | `// @ts-expect-error <理由>` を使う（不要化を検出できる） |

## Quick Reference

```ts
// discriminated union + 網羅チェック
type Shape = { kind: "circle"; r: number } | { kind: "square"; size: number };
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r ** 2;
    case "square": return s.size ** 2;
    default: { const _exhaustive: never = s; return _exhaustive; }
  }
}

// as const → union（enum の代わり）
const Role = { Admin: "admin", User: "user" } as const;
type Role = (typeof Role)[keyof typeof Role]; // "admin" | "user"

// unknown で外部入力を受ける
function parse(input: unknown): Config {
  if (typeof input !== "object" || input === null) throw new Error("invalid");
  // …絞り込み or zod schema…
}
```

## Agent compatibility

- Claude と Codex のどちらでも使える。TypeScript のコーディング規約 + ランタイム別要点で
  harness 非依存(`tsc` / linter があればよい)。
- ランタイム別セクションは該当する環境のときだけ読めばよい。フロントエンドの構造レビューは
  `frontend-review-*` に委譲する設計。
