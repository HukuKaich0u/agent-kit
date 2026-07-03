---
name: rust
description: Use when writing or reviewing Rust — error handling design, borrow-checker strategy, ownership in function signatures, iterator vs loop choice, type-driven design (newtypes, exhaustive match), and async pitfalls (Send bounds, blocking in async, cancellation safety). Trigger on `.rs` / `Cargo.toml` work even when "Rust" is not named. This is a language-idioms skill, not a project bootstrap — for `cargo new` scaffolding or workspace layout decisions, ordinary docs suffice.
---

# Rust Best Practices

このスキルは Rust を書く・レビューするときに常に参照する。対象は Claude Sonnet /
GPT-5.4 系のモデルで、典型的な失敗は API のハルシネーション（存在しないメソッド名を
生成する）と、borrow checker に負けて `clone()` を乱発することの二つ。各節は判断基準を
与える。「良いコードを書け」ではなく「この条件ならこうする」で判断する。

## 1. エラー処理

**決定則**: ライブラリは `thiserror`、バイナリ（CLI/サーバのエントリポイント）は
`anyhow`。両方を同じクレートで使い分けてよい — 内部ロジックが `thiserror` の enum を
返し、`main` がそれを `anyhow::Error` に変換して集約するのが典型形。

- 呼び出し元がエラー種別で分岐する必要がある（リトライ可能か、どのフィールドが不正か）
  → `thiserror` で enum を定義する。分岐が要らない・とにかく表示できればいい
  → `anyhow::Error` で十分。
- `unwrap()` / `expect()` はテストコード、`main`、および「証明可能に失敗しない」場合
  （例: 直前に `is_empty()` を確認した後の `first().unwrap()`）以外では使わない。
  後者のケースでも `unwrap()` ではなく `expect("why")` を使い、なぜ失敗しないかを書く。

```rust
// ライブラリ: thiserror で分岐可能なエラーを定義
#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("config file not found: {0}")]
    NotFound(std::path::PathBuf),
    #[error("invalid TOML: {0}")]
    Parse(#[from] toml::de::Error),
}

// バイナリ: anyhow で集約し `?` で伝播
fn main() -> anyhow::Result<()> {
    let cfg = load_config("app.toml").context("failed to load config")?;
    run(cfg)
}

// 証明可能に失敗しない場合は expect に理由を書く
let first = non_empty_vec.first().expect("checked non-empty above");
```

## 2. Borrow checker と戦うときのエスカレーション順序

AI は borrow checker のエラーを見ると即座に `.clone()` で黙らせがちだが、これは
ホットパスでは finding になる。以下の順に検討し、上位で解決できないときだけ次に進む。

1. **スコープを再構成する**: 借用の生存期間を短くするだけで解決することが多い
   （ブロックで囲む、早めに値を drop する、借用してから所有権が要る処理を後にする）。
2. **`&` / `&mut` を遅く取る**: 可変借用と不変借用が衝突するなら、可変借用が必要な
   箇所まで借用を遅延させる（NLL で多くは解決する）。
3. **`clone()` は小さい・稀なデータなら許容する**: 数バイト〜数十バイトの値、
   ループの外側で一度だけ、初期化コードなど。問題視すべきは**ホットパスでの
   over-cloning**（リクエストごと・ループの内側で `String`/`Vec` を複製する）であり、
   `clone()` 自体が悪ではない。
4. **`Rc/Arc<RefCell/Mutex>` は共有所有権が本当に必要なときだけ**: 複数の場所から
   同じデータを書き換える必要がある（グラフ構造、コールバック間の共有状態）場合に限る。
   「borrow checker がうるさいから」で導入しない。

```rust
// NG: ループ内で毎回 clone（ホットパスでの over-cloning）
for req in requests {
    let name = self.name.clone(); // 呼ばれるたびに複製
    process(req, name);
}

// OK: ループの外で一度だけ、または参照で渡す
let name = &self.name;
for req in requests {
    process(req, name);
}
```

## 3. API のオーナーシップ設計

引数は「借用できる最も緩い型」を取り、戻り値は所有権を返す。

- `String` ではなく `&str` を引数に取る（呼び出し側が `String` も `&str` リテラルも
  渡せる）。
- `Vec<T>` ではなく `&[T]` を引数に取る。
- パスは `impl AsRef<Path>` を引数に取る（`&str` / `String` / `PathBuf` すべて渡せる）。
- 戻り値は基本的に所有型（`String`, `Vec<T>`, `PathBuf`）。ライフタイムを戻り値にまで
  引きずると呼び出し側の柔軟性が落ちる。

```rust
// NG: 呼び出し側に無駄な所有権要求を強いる
fn greet(name: String) -> String { format!("Hello, {name}") }

// OK
fn greet(name: &str) -> String { format!("Hello, {name}") }

fn read_lines(path: impl AsRef<std::path::Path>) -> std::io::Result<Vec<String>> {
    std::fs::read_to_string(path).map(|s| s.lines().map(String::from).collect())
}
```

## 4. イテレータ vs for ループ

デフォルトはイテレータ（`map`/`filter`/`collect`/`fold` 等）。ただし以下は for ループの
方が明確なので無理にイテレータ化しない。

- 複数の副作用（ログ出力とカウンタ更新など）を同時に行う場合。
- 早期リターン・`break` に複雑な状態が絡む場合（`try_fold` で書けなくはないが
  可読性が落ちるならループでよい）。
- 複数のコレクションを同時にインデックスで更新する場合。

```rust
// イテレータが自然
let total: u64 = orders.iter().map(|o| o.amount).sum();
let active: Vec<&User> = users.iter().filter(|u| u.is_active).collect();

// ループの方が明確（複数の副作用 + 早期リターン）
for (i, item) in items.iter().enumerate() {
    if item.is_invalid() {
        log::warn!("invalid item at {i}");
        return Err(Error::InvalidItem(i));
    }
    stats.record(item);
}
```

## 5. 型駆動設計

- **newtype パターン**: ドメイン ID は生の `u64`/`String` ではなく専用型にする。
  取り違えをコンパイル時に防ぐ。
  ```rust
  #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
  pub struct UserId(u64);
  #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
  pub struct OrderId(u64);
  // fn charge(user: UserId, order: OrderId) — 引数の順序を間違えてもコンパイルが通らない
  ```
- **網羅的な `match`**: 自分で定義した enum を match するときは `_` アームを避ける。
  バリアントを追加したときにコンパイルエラーで気づけることが `_` より重要。
  外部クレートの enum で `#[non_exhaustive]` が付いている場合のみ `_` が必要になる。
  ```rust
  enum Status { Pending, Active, Closed }
  // NG: 新しいバリアント追加時に気づけない
  match status { Status::Active => handle_active(), _ => {} }
  // OK: 網羅的
  match status {
      Status::Pending => handle_pending(),
      Status::Active => handle_active(),
      Status::Closed => handle_closed(),
  }
  ```
- **`Option`/`Result` コンビネータ vs `match` の可読性ルール**: 単純な変換・デフォルト値
  （`map`, `unwrap_or`, `unwrap_or_else`, `?`）はコンビネータの方が短く明確。分岐後の
  処理が複数行になる、または両アームで異なる型のエラー処理をする場合は `match`
  （または `if let` / `let else`）の方が読みやすい。コンビネータを深くネストして
  1行が長くなるくらいなら `match` に展開する。

## 6. 非同期のよくある落とし穴

- **`std::sync::Mutex` を `.await` を跨いで保持しない**: ロックガードが `.await` の
  向こう側まで生存すると、他タスクを長時間ブロックし、実行環境によっては
  デッドロックする。ロックを取ったら値をコピー/クローンしてすぐ drop するか、
  `tokio::sync::Mutex` に切り替える（それでも保持時間は最小化する）。
  ```rust
  // NG: ガードが await を跨ぐ
  let guard = std_mutex.lock().unwrap();
  do_async_work(&guard).await; // ガードが生きたまま他タスクをブロック

  // OK: ロック区間を await の外に出す
  let value = { std_mutex.lock().unwrap().clone() };
  do_async_work(&value).await;
  ```
- **非 `Send` 型を `.await` を跨いで保持しない**: `Rc<T>`、`RefCell` の借用ガードなどを
  タスク間で送る必要がある `async fn` の中で保持すると、`Send` が要求される
  コンテキスト（`tokio::spawn` 等）でコンパイルエラーになる。`Rc` → `Arc`、
  `RefCell` → `tokio::sync::Mutex`/`RwLock` に置き換える。
- **同期のブロッキング呼び出しを async の中で直接呼ばない**: ファイル I/O の同期版、
  CPU 重い計算、同期 DB ドライバなどは async ランタイムのワーカースレッドを
  ブロックする。`tokio::task::spawn_blocking` に包む。
  ```rust
  // NG: async タスク内で同期のブロッキング処理
  async fn handler() { let data = std::fs::read_to_string("big.json").unwrap(); }

  // OK
  async fn handler() -> anyhow::Result<String> {
      Ok(tokio::task::spawn_blocking(|| std::fs::read_to_string("big.json")).await??)
  }
  ```
- **`tokio::select!` のキャンセル安全性**: `select!` で選ばれなかった分岐の future は
  その時点までの進行を破棄される。ループで繰り返し `select!` する場合、各分岐の
  future が「途中でキャンセルされても安全」（cancellation-safe）かを確認する。
  例えば `tokio::sync::mpsc::Receiver::recv()` は安全だが、独自に部分読み込み状態を
  保持する future はキャンセルで状態を失うことがある。安全でない場合は、進行状態を
  ループの外の変数に持たせて次回の `select!` から再開できるようにする。

## AI がよく間違う Rust

| 間違い | 正しくは |
|---|---|
| borrow checker のエラーをホットループ内で `.clone()` して黙らせる | スコープ再構成・借用の遅延を先に試す。ホットパスでの over-cloning が finding |
| `unwrap()` の連鎖 | `?` で伝播、または `expect("理由")` に置き換える。テスト/main/証明可能な場合のみ許容 |
| 引数に `String` / `Vec<T>` を取る | `&str` / `&[T]` を取り、必要なら呼び出し側で借用のまま渡せるようにする |
| `collect()` してからもう一度 iterate する | 中間 `Vec` を作らず `Iterator` チェーンをつなげる（必要なら `itertools`） |
| とりあえず `Arc<Mutex<T>>` から始める | まず所有権の再設計・スコープ短縮を検討。共有可変状態が本当に必要な場合のみ |
| `#[must_use]` や未使用 `Result` の warning を無視する | `Result` を握りつぶさず `?` / `.context()` で処理するか、意図的なら `let _ =` で明示 |
| ライフタイムエラーに対して型を複雑化する（`'static` 境界の濫用等） | 多くはデータ構造・所有権モデルの再設計で解決する。まず「誰が所有すべきか」に戻る |
| 存在しないメソッド名を生成する（API ハルシネーション） | 標準ライブラリ/クレートの実際のシグネチャを確認してから使う。`cargo doc --open` や docs.rs で検証 |
| 自分で定義した enum の match に `_` アームを付ける | 網羅的に書く。バリアント追加時にコンパイルエラーで検知できるようにする |
| `std::sync::Mutex` のガードを `.await` を跨いで保持する | ロック区間を await の外に出す、または `tokio::sync::Mutex` を使う |

## API・依存関係・特定クレートの規約

- 公開 API は `src/lib.rs` にまとめ、CLI のエントリポイント（引数パース等）だけを
  `src/main.rs` に置く。複数バイナリがあるなら `src/bin/` 以下にそれぞれ配置する。
- ディレクトリ下に `mod.rs` を作らず `[module_name].rs` + 同名ディレクトリの構成にする
  （2018 edition 以降の慣習）。
- 公開/非公開は熟慮する。`pub(crate)` の濫用も、なんでも `pub` にするのも避ける。
- 依存追加時は crates.io で最新版を確認し、クレートの性質に応じた粒度でバージョン
  指定する（ライブラリは緩め、バイナリは固定寄り）。ドキュメントは docs.rs か
  ダウンロードしたソースを確認する。
- newtype には `Clone`, `Debug` を基本 derive し、可能なら `Copy`, `PartialEq`, `Eq`,
  `Default` も付ける。無駄に多くのトレイトを実装する必要はない。
- serde を使う公開型は `Serialize` と `Deserialize` の両方を実装することが多い。
  `#[serde(rename_all = "snake_case")]` や `#[serde(tag = "...")]` を積極的に使う。
- `unsafe`、`Box::leak`、`std::mem::forget` は原則使わない。多少の最適化目的での
  使用は推奨しない。使う場合は事前に確認を取る。`#[allow(...)]` や
  `#![feature(...)]`（unstable機能）の利用も同様に慎重に扱う。

## ツールゲート（完了の定義）

- `cargo clippy -- -D warnings`（または `cargo clippy --all-targets -- -D warnings`）が
  警告ゼロで通ること。
- `cargo fmt --check` が差分ゼロで通ること（コミット前は `cargo fmt` で整形する）。
- 実装中の速いフィードバックには `cargo check` を使い、区切りごとに上記2つを走らせる。

## Agent compatibility

- Claude と Codex のどちらでも使える。Rust のコーディング規約 + `cargo` / `clippy` があれば
  よく、harness 非依存。
