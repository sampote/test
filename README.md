# Yell for You

Web面接をAIで完全攻略する、Claude API を使った面接対策サイト。

## 機能

- **プロフィール入力** — 経歴・強み・弱みなど、面接で使う素材を事前登録
- **会社情報入力** — 志望企業の事業内容・社風・求める人物像を登録
- **面接シミュレーター** — マイク録音 / テキスト入力した質問に対し、Claude があなた専用の模範回答を生成
- **応援メッセージ** — がんばるあなたへのエール

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Claude API キーの設定

[Anthropic Console](https://console.anthropic.com/) で API キーを発行し、環境変数に設定：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. サーバー起動

```bash
npm start
# → http://localhost:3000 で起動
```

API キーが未設定の場合は、回答生成時にオフライン用のテンプレートにフォールバックします。

## 構成

- `index.html` / `profile.html` / `company.html` / `interview.html` — フロントエンド
- `styles.css` / `script.js` — スタイルとクライアントロジック
- `server.js` — Express + Anthropic SDK のバックエンド
- 使用モデル: `claude-opus-4-8`

## データの扱い

- プロフィール・会社情報は **ブラウザの localStorage に保存** され、外部送信はされません
- 回答生成のリクエスト時のみ、入力内容がサーバー経由で Anthropic API に送信されます
- API キーはサーバー環境変数に置かれ、ブラウザには露出しません
