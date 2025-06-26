# 画像モザイク加工ツール 要件定義書

## 📋 システム概要

- **プラットフォーム**: iOS Safari (PWA対応)
- **技術スタック**: HTML5 Canvas, JavaScript ES6+, CSS3
- **配布方法**: Web配信 (HTTPS必須)

## 🎯 機能要件

### 1. 画像選択機能

```
- 入力: <input type="file" accept="image/*">
- 対応形式: JPEG, PNG, WebP
- 最大ファイルサイズ: 50MB (メモリ制限考慮)
- エラーハンドリング: 非対応形式、サイズ超過時の警告
```

### 2. 画像表示・操作機能

```
- Canvas要素での画像レンダリング
- ピンチジェスチャー対応:
  - 最小倍率: 0.1x
  - 最大倍率: 5.0x
  - パン操作対応
- タッチイベント: touchstart, touchmove, touchend
- デバイス解像度対応 (Retina対応)
```

### 3. モザイク機能

```
- 粒度設定:
  - 範囲: 1px - 100px
  - UI: スライダー + 数値入力
  - リアルタイムプレビュー
- 描画モード:
  - モザイク描画モード
  - 消しゴムモード (トグル切り替え)
- アルゴリズム: ブロック平均化方式
```

### 4. 描画システム

```
- レイヤー構造:
  - 背景レイヤー (元画像)
  - モザイクレイヤー (編集可能)
  - プレビューレイヤー (リアルタイム表示)
- 描画方式: パス追跡によるブラシ描画
- パフォーマンス: requestAnimationFrame使用
```

### 5. 履歴管理 (Undo/Redo)

```
- データ構造: Command Pattern実装
- 保存方式: ImageData配列 (メモリ効率考慮)
- 操作対象:
  - Ctrl+Z: 直前の操作取り消し
  - Ctrl+Y: 取り消した操作の復元
- iOS対応: タッチジェスチャーでの代替操作
```

### 6. 保存機能

```
- 出力形式: PNG (透明度保持)
- ファイル名規則: {元ファイル名}_mosa.{拡張子}
- 保存方式: Canvas.toBlob() → downloadリンク生成
- 品質設定: 元画像と同等の解像度維持
```

## 🔧 技術仕様

### Canvas実装

```javascript
// 基本構造
class MosaicEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.layers = {
            original: null,    // 元画像
            mosaic: null,      // モザイクレイヤー
            preview: null      // プレビュー
        };
        this.history = new HistoryManager();
        this.settings = {
            mosaicSize: 10,
            brushSize: 20,
            mode: 'mosaic' // 'mosaic' | 'eraser'
        };
    }
}
```

### モザイク処理アルゴリズム

```javascript
function applyMosaicToRegion(imageData, x, y, width, height, blockSize) {
    const data = imageData.data;
    const canvasWidth = imageData.width;
    
    for (let blockY = y; blockY < y + height; blockY += blockSize) {
        for (let blockX = x; blockX < x + width; blockX += blockSize) {
            const avgColor = calculateAverageColor(
                data, blockX, blockY, blockSize, canvasWidth
            );
            fillBlock(data, blockX, blockY, blockSize, avgColor, canvasWidth);
        }
    }
}
```

### タッチイベント処理

```javascript
// マルチタッチ対応
handleTouchStart(e) {
    e.preventDefault();
    const touches = e.touches;
    
    if (touches.length === 1) {
        // 描画開始
        this.startDrawing(touches[0]);
    } else if (touches.length === 2) {
        // ピンチ開始
        this.startPinch(touches);
    }
}
```

## 🎨 UI/UX仕様

### レスポンシブデザイン

```css
/* iPhone対応 */
@media screen and (max-width: 414px) {
    .canvas-container {
        width: 100vw;
        height: calc(100vh - 120px);
    }
    
    .toolbar {
        position: fixed;
        bottom: 0;
        height: 120px;
    }
}
```

### コントロールパネル

- モザイク粒度スライダー
- モード切り替えボタン (モザイク/消しゴム)
- Undo/Redoボタン
- 完了ボタン
- プログレスインジケーター (処理中表示)

## ⚡ パフォーマンス要件

### メモリ管理

```
- 最大履歴数: 20回 (メモリ制限)
- 画像サイズ制限: 4096x4096px
- キャッシュ戦略: LRU方式での履歴管理
```

### 処理速度

```
- モザイク描画レスポンス: <100ms
- ピンチ操作レスポンス: 60fps維持
- ファイル読み込み: プログレス表示
```

## 🚨 エラーハンドリング

### 想定エラー

- ファイル読み込み失敗
- メモリ不足
- Canvas描画エラー
- 保存失敗

### ユーザーフィードバック

- エラー時のtoast通知
- 処理中のローディング表示
- 操作ガイドの表示

## 🔒 セキュリティ・プライバシー

- 画像処理: 完全クライアントサイド
- データ送信: なし (プライバシー保護)
- ファイルアクセス: ユーザー明示的選択のみ

## 📅 開発・テスト計画

### 開発フェーズ

```
Phase 1: 基本Canvas実装 (2日)
Phase 2: モザイク機能 (3日)
Phase 3: タッチ操作 (2日)
Phase 4: 履歴管理 (2日)
Phase 5: UI/UX調整 (1日)
```

### テスト項目

- 各種iPhone端末での動作確認
- 大容量画像での処理確認
- メモリリーク確認
- パフォーマンス測定

## 📱 対応端末

### 推奨環境

- iOS 14.0以上
- Safari 14.0以上
- iPhone 8以降 (メモリ制限考慮)

### 最低動作環境

- iOS 12.0以上
- Safari 12.0以上
- iPhone 7以降

## 🔄 今後の拡張可能性

- 他の画像フィルター追加
- クラウド保存機能
- 複数画像の一括処理
- SNS共有機能 