# 積みログ

読書・ゲーム・アニメ・ドラマの「積み」を進めるための、スマートフォン向け進捗管理Webアプリです。

作品を登録し、最後に進めた日と進捗を記録できます。一定期間進んでいない作品はアラートに表示されます。データはブラウザの `localStorage` に保存されます。

## 機能

- 読書・ゲーム・アニメ・ドラマの登録
- ページ数、プレー時間、視聴話数の進捗記録
- 購入後または最終進捗更新後の放置アラート
- 進捗履歴の確認
- 登録項目の削除
- 種別フィルターと検索
- ブラウザの `localStorage` への保存

## 技術スタック

- React
- TypeScript
- Vite
- Lucide React

## ローカル起動

Node.js 20 以上を推奨します。

```bash
npm ci
npm run dev
```

## ビルド

```bash
npm run build
```

ビルド結果は `dist/` に出力されます。

## GitHub Pages

`.github/workflows/deploy-pages.yml` により、`main` ブランチへの push で GitHub Pages に自動デプロイされます。

初回のみ、GitHub リポジトリの `Settings > Pages > Build and deployment > Source` を `GitHub Actions` に設定してください。

## データについて

登録データは利用中のブラウザにのみ保存されます。別の端末やブラウザとの同期、バックアップ機能はありません。ブラウザのサイトデータを削除すると登録内容も削除されます。

## ライセンス

[MIT License](LICENSE)
