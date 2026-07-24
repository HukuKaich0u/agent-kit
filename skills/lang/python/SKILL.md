---
name: python
description: Use when writing or reviewing Python — type hints and strict typing, error handling (specific exceptions, no bare except), mutable default arguments, dataclasses vs dicts, context managers for resources, iterator/comprehension choices, and async pitfalls (blocking calls in async, sync/async boundaries). Trigger on `.py` / `pyproject.toml` work even when "Python" is not named. This is a language-idioms skill, not a project bootstrap — for package/venv scaffolding, ordinary docs suffice.
---

# Python Best Practices

このスキルは Python を書く・レビューするときに常に参照する。対象は Claude Sonnet /
GPT-5.4 系のモデルで、典型的な失敗は型ヒントの欠落・不正確さ、例外の握りつぶし
（`except:` / `except Exception: pass`）、mutable default 引数の罠、そして「動けばいい」
スクリプトを本番コードに混ぜること。各節は判断基準を与える。「良いコードを書け」ではなく
「この条件ならこうする」で判断する。

## 1. 型ヒント

**決定則**: 公開関数・メソッドの引数と戻り値には必ず型ヒントを付ける。内部の自明な
ローカル変数には不要。`mypy --strict` か `pyright` が通ることを目標にする。

- `Optional[X]`（= `X | None`）を正確に。None を返しうるなら戻り値型に明示する。
  3.10+ なら `X | None` 構文を使う。
- `Any` は型が本当に不定なときだけ。安易な `Any` は型チェックを無効化する。
  ジェネリックには `TypeVar` / `Generic`、構造的型には `Protocol` を使う。
- コレクションは要素型まで書く（`list[int]`、`dict[str, User]`）。3.9+ は組み込みジェネリクス、
  それ以前は `typing.List` 等。対象バージョンを確認する。

```python
# NG: 型ヒントなし・None を隠す
def find_user(id):
    return db.get(id)  # None を返しうるが呼び出し元に伝わらない

# OK
def find_user(id: str) -> User | None:
    return db.get(id)
```

## 2. エラー処理

**具体的な例外を捕捉する。握りつぶさない。**

- `except:`（bare）と `except Exception: pass` は禁止。捕まえる例外は具体的に
  (`except KeyError:`、`except (OSError, ValueError):`)。想定外の例外は伝播させる。
- 再送出するときは `raise NewError(...) from err` で元の例外を鎖に残す（トレースバックが切れない)。
- ドメイン固有の失敗は独自例外クラス（`class ConfigError(Exception)`）を定義し、
  呼び出し元が種別で分岐できるようにする。文字列で分岐しない。
- クリーンアップは `try/finally` ではなく context manager(`with`)を優先する。

```python
# NG: 握りつぶし・チェーン切断
try:
    cfg = load()
except Exception:
    pass

# OK: 具体的に捕捉し、文脈を足して再送出
try:
    cfg = load()
except FileNotFoundError as err:
    raise ConfigError(f"config missing: {path}") from err
```

## 3. mutable default 引数

**関数のデフォルト引数に `[]` / `{}` / `set()` を書かない。** デフォルトは定義時に一度だけ
評価され、全呼び出しで共有されるため、リストに追記すると次の呼び出しに漏れる。

```python
# NG: 全呼び出しで同じリストを共有する古典的バグ
def add(item, bucket=[]):
    bucket.append(item)
    return bucket

# OK: None 番兵
def add(item, bucket: list | None = None) -> list:
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

## 4. データ構造: dataclass / dict / TypedDict

- 構造の決まったデータは生 `dict` でなく **`@dataclass`**（または `pydantic` / `attrs`）。
  フィールドが型付きになり、タイポや欠落をチェックできる。`__init__` 手書きも不要。
- JSON 境界など dict のまま扱う必要がある場合は **`TypedDict`** でキーと型を宣言する。
- イミュータブルにしたいなら `@dataclass(frozen=True)`。ハッシュ可能になり set/dict キーに使える。

```python
# NG: 生 dict — キーのタイポや欠落を検知できない
user = {"name": "a", "emial": "x"}  # typo が通る

# OK
from dataclasses import dataclass
@dataclass(frozen=True)
class User:
    name: str
    email: str
```

## 5. リソース・イテレーション・比較

- **リソースは context manager で**: ファイル・ロック・DB 接続・ネットワークは
  `with open(...) as f:` で確実にクローズする。手動 `f.close()` は例外時に漏れる。
- **内包表記 vs ループ**: 単純な変換・フィルタは内包表記（`[x*2 for x in xs if x > 0]`）。
  副作用が主目的、ネストが深い、条件が複雑なら通常のループの方が読みやすい。内包表記に
  副作用を詰め込まない。大きなデータはジェネレータ式 `(... for ...)` で遅延評価する。
- **`is` vs `==`**: `None` / `True` / `False` の判定は `is`（`if x is None`）。値の同値は `==`。
  `if x == None` は書かない。
- **EAFP**: 「許可より許し」— `if key in d: d[key]` より `try: d[key] except KeyError:` が
  Python 的な場面が多い（が、`d.get(key, default)` で済むならそれが最短）。

## 6. 非同期のよくある落とし穴

- **async の中で同期ブロッキングを直接呼ばない**: 同期の `requests.get`、`time.sleep`、
  重い CPU 計算、同期 DB ドライバはイベントループを止める。`asyncio.to_thread(...)` に
  逃がすか、async 対応ライブラリ（`httpx`、`aiofiles` 等）を使う。`time.sleep` ではなく
  `await asyncio.sleep`。
- **await 忘れ**: コルーチンを `await` せず呼ぶと coroutine オブジェクトが作られるだけで
  実行されない（`RuntimeWarning: coroutine was never awaited`）。返り値を使わなくても await する。
- **同期関数を async にするだけでは並行にならない**: `async def` を付けても中身が同期
  ブロッキングなら意味がない。並行性が要るのは I/O 待ちが支配的な場合。CPU バウンドは
  `multiprocessing` / `ProcessPoolExecutor`。

```python
# NG: async 内で同期ブロッキング — イベントループが止まる
async def fetch():
    return requests.get(url).json()  # 同期呼び出し

# OK
async def fetch():
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        return r.json()
```

## AI がよく間違う Python

| 間違い | 正しくは |
|---|---|
| 公開関数に型ヒントを付けない / `Any` で逃げる | 引数・戻り値に正確な型。None を返すなら `X \| None` |
| `except:` / `except Exception: pass` で握りつぶす | 具体的な例外を捕捉、想定外は伝播、`raise ... from err` |
| default 引数に `[]` / `{}` を書く | `None` 番兵にして関数内で生成 |
| 構造データを生 dict で回す | `@dataclass` / `TypedDict` / `pydantic` で型付け |
| ファイル等を手動 open/close | `with` (context manager) で確実にクローズ |
| `if x == None` | `if x is None` |
| async 内で `requests` / `time.sleep` を呼ぶ | `httpx` / `asyncio.to_thread` / `await asyncio.sleep` |
| コルーチンを await し忘れる | 返り値を使わなくても `await` する |
| `os.path` の文字列連結でパス操作 | `pathlib.Path` を使う |
| 存在しない関数/引数を生成（API ハルシネーション） | 公式 docs / 実際のシグネチャを確認してから使う |

## API・依存・規約

- 依存とツール設定は `pyproject.toml` に集約する。`setup.py` 単独の新規プロジェクトは避ける。
  パッケージ管理は `uv` / `pip` / `poetry` などプロジェクトの既存方式に合わせる（勝手に切り替えない）。
- 仮想環境（venv / uv）前提で作業する。グローバルに `pip install` しない。
- 公開 API は `__all__` で明示するか、非公開はアンダースコア始まり（`_helper`）にする。
- 標準ライブラリで足りるものを外部依存に置き換えない（`json`、`pathlib`、`dataclasses`、
  `itertools`、`functools` は厚い）。
- f-string を使う(`f"{x}"`）。`%` フォーマットや `.format()` の新規利用は避ける。ログは
  遅延評価のため `logger.info("x=%s", x)` 形式を使う（f-string だと常に文字列化される）。

## ツールゲート（完了の定義)

- `ruff check`（または既存の flake8 等）が警告ゼロ。`ruff format --check`(または `black --check`)
  が差分ゼロ（コミット前に整形）。
- `mypy --strict`（または `pyright`）が型エラーゼロ。既存プロジェクトの設定に従う。
- `pytest` がグリーン。
- 実装中は速いフィードバックのため型チェッカを走らせ、区切りごとに lint/format/test を通す。

## Agent compatibility

- Claude と Codex のどちらでも使える。Python のコーディング規約 + `ruff` / `mypy` / `pytest` が
  あればよく、harness 非依存。
