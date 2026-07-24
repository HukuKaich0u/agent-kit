---
name: go
description: Use when writing or reviewing Go — error wrapping and sentinel/typed errors, goroutine lifetime and leak prevention, context propagation and cancellation, interface design (accept interfaces, return structs), nil pitfalls (nil interface vs nil pointer, nil map/slice), and defer/channel idioms. Trigger on `.go` / `go.mod` work even when "Go" is not named. This is a language-idioms skill, not a project bootstrap — for `go mod init` scaffolding or layout decisions, ordinary docs suffice.
---

# Go Best Practices

このスキルは Go を書く・レビューするときに常に参照する。対象は Claude Sonnet /
GPT-5.4 系のモデルで、典型的な失敗は goroutine のリーク（起動したが終了経路がない）、
error の握りつぶし・過剰な wrap、そして「他言語の癖を Go に持ち込む」こと
（過剰な interface、getter/setter の乱用、例外的な制御フロー）。各節は判断基準を
与える。「良いコードを書け」ではなく「この条件ならこうする」で判断する。

## 1. エラー処理

**決定則**: エラーは値。`panic` で制御フローを作らない。呼び出し元へは `error` を返し、
文脈を足すときだけ `fmt.Errorf("...: %w", err)` で wrap する。

- 呼び出し元が種別で分岐する（リトライ可能か、Not Found か）→ **sentinel error**
  (`var ErrNotFound = errors.New(...)`) か **typed error**（`error` を実装した struct）を
  定義し、`errors.Is` / `errors.As` で判定させる。文字列比較（`err.Error() == "..."`）はしない。
- 文脈を足す必要がないなら wrap せずそのまま返す。全 return で機械的に wrap すると
  `failed to X: failed to Y: failed to Z:` と冗長になる。**追加情報があるときだけ** wrap する。
- `panic` はプログラマのバグ（不変条件違反、初期化失敗）に限る。ユーザー入力や I/O 失敗で
  panic しない。ライブラリの公開 API は panic せず error を返す。

```go
// sentinel + wrap
var ErrNotFound = errors.New("not found")

func (s *Store) Get(id string) (*User, error) {
    u, ok := s.users[id]
    if !ok {
        return nil, fmt.Errorf("get user %q: %w", id, ErrNotFound)
    }
    return u, nil
}

// 呼び出し元は errors.Is で分岐（文字列比較しない）
if errors.Is(err, ErrNotFound) { /* 404 */ }
```

## 2. goroutine のライフタイムとリーク防止

**起動する goroutine には必ず終了経路を用意する。** 「起動しっぱなしで誰も終わらせない」
のが Go で最も多い finding。

1. **終了条件を先に決める**: `context.Context` のキャンセル、channel の close、`sync.WaitGroup`
   のいずれで終わるかを goroutine を書く前に決める。
2. **`context` を伝播する**: 長時間動く処理・外部 I/O には第一引数で `ctx context.Context` を
   受け取り、`ctx.Done()` を select で監視する。`context` を struct に埋めて持ち回らない。
3. **channel 送信でブロックしないか確認**: 受信側が先に消えると送信 goroutine が永久に
   ブロックしてリークする。`select { case ch <- v: case <-ctx.Done(): }` で逃げ道を作る。
4. **`WaitGroup` で完了を待つ**: fire-and-forget にせず、呼び出し元が全 goroutine の終了を
   `wg.Wait()` で待てるようにする（テスト可能性・graceful shutdown のため）。

```go
// NG: 終了経路のない goroutine（リーク）
go func() {
    for v := range in { process(v) } // in が閉じられなければ永久に生存
}()

// OK: ctx で終了、送信もブロックしない
func worker(ctx context.Context, in <-chan Job, out chan<- Result) {
    for {
        select {
        case <-ctx.Done():
            return
        case j, ok := <-in:
            if !ok { return }
            select {
            case out <- process(j):
            case <-ctx.Done():
                return
            }
        }
    }
}
```

## 3. インターフェース設計

**「インターフェースを受け取り、struct を返す」。** インターフェースは**利用側**で
（消費する場所で）定義する。定義側で「将来のため」に interface を切らない。

- 実装が1つしかないのに interface を切らない。抽象化は2つ目の実装かテストのモックが
  実際に必要になってから。過剰な interface は Go では最も多い over-engineering。
- interface は小さく保つ（1〜3メソッド）。`io.Reader` / `io.Writer` が手本。大きな
  interface は分割する。
- getter/setter を機械的に作らない。フィールドは公開するかしないかで、`GetName()` /
  `SetName()` のような Java 風アクセサは Go の慣習に反する。

```go
// NG: 実装1つなのに定義側で interface、getter も作る
type UserService interface { GetUser(id string) (*User, error) }
func (u *User) GetName() string { return u.name }

// OK: 消費側が必要な最小 interface を定義、struct を返す
func NewStore(db *sql.DB) *Store { return &Store{db: db} } // 具体型を返す

// 消費側でだけ小さな interface を切る
type userGetter interface { Get(id string) (*User, error) }
func Handler(g userGetter) http.HandlerFunc { /* ... */ }
```

## 4. nil の落とし穴

- **nil interface ≠ nil ポインタ**: `*T` の nil を interface に入れると、interface 自体は
  非 nil になる。`error` を返す関数で `var e *MyError = nil; return e` すると呼び出し元の
  `err != nil` が true になる。**error を返さないなら明示的に `return nil`** を返す。
- **nil map への書き込みは panic**: 読み取りは安全（ゼロ値を返す）だが書き込みは panic。
  使う前に `make(map[K]V)` する。
- **nil slice は append 可能**: `var s []T` に `append` してよい。空 slice を `make` で
  わざわざ作る必要はない（返り値の nil/空の区別が API 契約上重要な場合のみ気にする）。

```go
// NG: typed nil を error として返すと呼び出し元で err != nil になる
func do() error {
    var e *MyError // nil
    return e       // interface は非 nil！
}

// OK
func do() error {
    if !failed { return nil } // 明示的な nil
    return &MyError{...}
}
```

## 5. defer・スライス・ループのイディオム

- **`defer` でクローズ・アンロック**: `f, err := os.Open(...)` の直後に
  `defer f.Close()`。ただしループ内の `defer` は関数終了まで溜まるので、ループ本体を
  関数に切り出すか明示的にクローズする。
- **`defer` された `Close()` のエラー**: 書き込みファイルは `Close()` のエラーが重要
  （flush 失敗）。named return + `defer func() { err = f.Close() }()` で拾う。読み取り専用なら無視でよい。
- **ループ変数のキャプチャ**: Go 1.22 以降は各イテレーションで新しい変数になり従来の罠は
  解消されたが、対象の Go バージョンを確認する。1.21 以前を対象にするなら
  `v := v` でシャドウしてから goroutine/クロージャに渡す。
- **スライスの共有**: `append` は容量が足りれば元の配列を書き換える。部分スライスを
  別途保持しているなら `slices.Clone` するか、full slice expression `s[a:b:b]` で容量を切る。

## AI がよく間違う Go

| 間違い | 正しくは |
|---|---|
| goroutine を起動して終了経路を作らない | ctx キャンセル / channel close / WaitGroup のどれで終わるか先に決める |
| 全 return で機械的に `fmt.Errorf("...: %w")` する | 追加情報があるときだけ wrap。無いならそのまま返す |
| `err.Error()` の文字列比較で分岐 | sentinel + `errors.Is`、typed error + `errors.As` |
| 実装1つなのに定義側で interface を切る | 消費側で最小 interface を定義、生成側は具体型を返す |
| getter/setter を機械的に生成する | フィールド公開/非公開で表現。Java 風アクセサは不要 |
| typed nil ポインタを error として返す | error を返さないなら明示的に `return nil` |
| nil map に書き込む | `make` してから書く（読みは安全、書きは panic） |
| `panic` で通常のエラーを表現 | error を返す。panic はプログラマのバグに限る |
| ループ内で `defer` を溜める | 本体を関数に切り出すか明示クローズ |
| `context.Context` を struct に埋める | 第一引数で明示的に受け渡す |
| 存在しないメソッド/パッケージを生成（API ハルシネーション） | `go doc <pkg>` / pkg.go.dev で実シグネチャを確認 |

## API・依存・規約

- パッケージ名は短く小文字、複数形にしない（`util` より用途別の小さいパッケージ）。
  `utils` / `common` / `base` のようなゴミ箱パッケージを作らない。
- 公開 API は最小限。エクスポートは大文字始まりで、公開する必要のないものは小文字にする。
- 依存追加は `go get`、バージョンは `go.mod` で管理。`go mod tidy` を保つ。標準ライブラリで
  足りるものを外部依存に置き換えない（Go は標準ライブラリが厚い）。
- struct のゼロ値が使える設計を優先する（`sync.Mutex` は `var mu sync.Mutex` で即使える）。
  コンストラクタが必須にならないよう、ゼロ値が有効な状態になるようにする。
- `interface{}` / `any` は本当に型が不定なときだけ。ジェネリクス（1.18+）で書けるなら
  型パラメータを使う。

## ツールゲート（完了の定義)

- `go vet ./...` が警告ゼロで通ること。
- `gofmt -l .`（または `goimports -l .`）が差分ゼロ（コミット前に `gofmt -w` / `goimports -w`)。
- `golangci-lint run`（導入されていれば）が通ること。
- `go test ./...` がグリーン。競合が疑わしい箇所は `go test -race` で確認する。
- 実装中の速いフィードバックには `go build ./...` を使い、区切りごとに上記を走らせる。

## Agent compatibility

- Claude と Codex のどちらでも使える。Go のコーディング規約 + `go` / `gofmt` / `go vet` が
  あればよく、harness 非依存。
