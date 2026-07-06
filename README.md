# KY(危険予知)活動記録

シオンテクノス株式会社の現場向け、KY(危険予知)活動記録アプリです。

- 公開URL: https://uchiyamazion.github.io/ky-katsudou/
- ac-inspection / fron-kanri と同じ共有GASバックエンド（自社案件SPS スプレッドシート）にデータを保存します。
- バックエンド(`Code.gs`)は ac-inspection リポジトリで一元管理しています。`ky_list` / `ky_create` / `ky_delete` の action を追加済みです。GASの再デプロイ時は ac-inspection 側の Apps Script エディタに最新の Code.gs を貼り付けてください。

## 機能
- 新規記録：日付・現場名・作業内容・作業者・危険予知（危険のポイント＋対策、複数追加可）・重点実施項目・確認者を入力して保存
- 記録一覧：保存済みのKY活動を新しい順に一覧表示、タップで詳細確認
- データはスプレッドシート「KY記録」シートに自動保存（初回保存時にシート・ヘッダーを自動作成）

## 技術構成
- GitHub Pages（静的フロントエンド、バックエンドなし）
- Google Apps Script + Google スプレッドシート（共有バックエンド）
- `js/config.js` に GAS_URL を設定（ac-inspection と同一URL）
