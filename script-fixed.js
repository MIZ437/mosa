class MosaicEditor {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        this.originalImage = null;
        this.originalImageData = null;
        this.currentImageData = null;
        this.fileName = '';
        
        this.settings = {
            mosaicSize: 10,
            brushSize: 20,
            mode: 'mosaic' // 'mosaic' | 'eraser'
        };
        
        this.isDrawing = false;
        this.lastPoint = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.history = new HistoryManager();
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // ファイル選択
        document.getElementById('selectImageBtn').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });
        
        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });
        
        // モード切り替え
        document.getElementById('mosaicMode').addEventListener('click', () => {
            this.setMode('mosaic');
        });
        
        document.getElementById('eraserMode').addEventListener('click', () => {
            this.setMode('eraser');
        });
        
        // 設定変更
        document.getElementById('mosaicSize').addEventListener('input', (e) => {
            this.settings.mosaicSize = parseInt(e.target.value);
            document.getElementById('mosaicSizeInput').value = e.target.value;
        });
        
        document.getElementById('mosaicSizeInput').addEventListener('input', (e) => {
            const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 1));
            this.settings.mosaicSize = value;
            document.getElementById('mosaicSize').value = value;
            e.target.value = value;
        });
        
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.settings.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = e.target.value + 'px';
        });
        
        // Undo/Redo
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undo();
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            this.redo();
        });
        
        // 完了
        document.getElementById('completeBtn').addEventListener('click', () => {
            this.saveImage();
        });
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
            }
        });
        
        // タッチイベント
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        let lastTouchDistance = 0;
        let isPinching = false;
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touches = e.touches;
            
            if (touches.length === 1) {
                // 単一タッチ - 描画開始
                const touch = touches[0];
                const point = this.getTouchPoint(touch);
                this.startDrawing(point);
                isPinching = false;
            } else if (touches.length === 2) {
                // ピンチ開始
                const distance = this.getTouchDistance(touches[0], touches[1]);
                lastTouchDistance = distance;
                isPinching = true;
                this.stopDrawing();
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = e.touches;
            
            if (touches.length === 1 && !isPinching) {
                // 描画
                const touch = touches[0];
                const point = this.getTouchPoint(touch);
                this.continueDrawing(point);
            } else if (touches.length === 2) {
                // ピンチ操作
                const distance = this.getTouchDistance(touches[0], touches[1]);
                const scaleFactor = distance / lastTouchDistance;
                this.handlePinch(scaleFactor);
                lastTouchDistance = distance;
            }
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.stopDrawing();
                isPinching = false;
            }
        });
        
        // マウスイベント（デバッグ用）
        this.canvas.addEventListener('mousedown', (e) => {
            const point = this.getMousePoint(e);
            this.startDrawing(point);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                const point = this.getMousePoint(e);
                this.continueDrawing(point);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.stopDrawing();
        });
    }
    
    getTouchPoint(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    getMousePoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    getTouchDistance(touch1, touch2) {
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    handlePinch(scaleFactor) {
        // ピンチ操作でのズーム（将来実装）
        console.log('Pinch scale:', scaleFactor);
    }
    
    async loadImage(file) {
        if (!file) return;
        
        console.log('Loading image:', file.name, file.type, file.size);
        
        // ファイルサイズチェック
        if (file.size > 50 * 1024 * 1024) {
            this.showToast('ファイルサイズが大きすぎます（最大50MB）');
            return;
        }
        
        // ファイル形式チェック
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
            this.showToast('対応していないファイル形式です');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.fileName = file.name.replace(/\.[^/.]+$/, '');
                
                this.setupCanvas(img);
                
                this.showLoading(false);
                this.showToast('画像を読み込みました');
            };
            
            img.onerror = () => {
                this.showLoading(false);
                this.showToast('画像の読み込みに失敗しました');
            };
            
            img.src = URL.createObjectURL(file);
        } catch (error) {
            this.showLoading(false);
            this.showToast('エラーが発生しました');
            console.error('Image load error:', error);
        }
    }
    
    setupCanvas(img) {
        // UI切り替えを先に行う
        document.getElementById('imageSelector').style.display = 'none';
        document.getElementById('canvasContainer').style.display = 'flex';
        document.getElementById('toolbar').style.display = 'flex';
        
        // 少し待ってからキャンバス設定（レイアウトが確定するまで）
        setTimeout(() => {
            // キャンバスサイズを画像に合わせて設定
            const container = document.querySelector('.canvas-wrapper');
            let containerWidth = container.clientWidth;
            let containerHeight = container.clientHeight;
            
            // コンテナサイズが0の場合のフォールバック
            if (containerWidth === 0 || containerHeight === 0) {
                containerWidth = window.innerWidth;
                containerHeight = window.innerHeight - 200; // ヘッダーとツールバー分を引く
            }
            
            const imgAspect = img.width / img.height;
            const containerAspect = containerWidth / containerHeight;
            
            let canvasWidth, canvasHeight;
            
            if (imgAspect > containerAspect) {
                canvasWidth = Math.min(containerWidth * 0.9, img.width);
                canvasHeight = canvasWidth / imgAspect;
            } else {
                canvasHeight = Math.min(containerHeight * 0.9, img.height);
                canvasWidth = canvasHeight * imgAspect;
            }
            
            // キャンバスサイズ設定
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.canvas.style.width = canvasWidth + 'px';
            this.canvas.style.height = canvasHeight + 'px';
            
            this.overlayCanvas.width = img.width;
            this.overlayCanvas.height = img.height;
            this.overlayCanvas.style.width = canvasWidth + 'px';
            this.overlayCanvas.style.height = canvasHeight + 'px';
            
            // 画像を描画
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            
            // 元画像データを保存
            this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // 履歴初期化
            this.history.clear();
            this.history.save(this.currentImageData);
            this.updateHistoryButtons();
            
            console.log('Canvas setup complete:', {
                imageSize: `${img.width}x${img.height}`,
                canvasSize: `${canvasWidth}x${canvasHeight}`,
                containerSize: `${containerWidth}x${containerHeight}`
            });
        }, 100);
    }
    
    setMode(mode) {
        this.settings.mode = mode;
        
        document.getElementById('mosaicMode').classList.toggle('active', mode === 'mosaic');
        document.getElementById('eraserMode').classList.toggle('active', mode === 'eraser');
    }
    
    startDrawing(point) {
        this.isDrawing = true;
        this.lastPoint = point;
        this.drawAtPoint(point);
    }
    
    continueDrawing(point) {
        if (!this.isDrawing) return;
        
        // 前回の点から現在の点まで線を引く
        this.drawLine(this.lastPoint, point);
        this.lastPoint = point;
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.lastPoint = null;
        
        // 履歴に保存
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.save(this.currentImageData);
        this.updateHistoryButtons();
    }
    
    drawLine(from, to) {
        const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
        const steps = Math.max(1, Math.floor(distance / 2));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + (to.x - from.x) * t;
            const y = from.y + (to.y - from.y) * t;
            this.drawAtPoint({ x, y });
        }
    }
    
    drawAtPoint(point) {
        const brushSize = this.settings.brushSize;
        const halfBrush = brushSize / 2;
        
        const startX = Math.max(0, Math.floor(point.x - halfBrush));
        const startY = Math.max(0, Math.floor(point.y - halfBrush));
        const endX = Math.min(this.canvas.width, Math.ceil(point.x + halfBrush));
        const endY = Math.min(this.canvas.height, Math.ceil(point.y + halfBrush));
        
        if (this.settings.mode === 'mosaic') {
            this.applyMosaicToRegion(startX, startY, endX - startX, endY - startY);
        } else {
            this.eraseRegion(startX, startY, endX - startX, endY - startY);
        }
    }
    
    applyMosaicToRegion(x, y, width, height) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const blockSize = this.settings.mosaicSize;
        
        for (let blockY = y; blockY < y + height; blockY += blockSize) {
            for (let blockX = x; blockX < x + width; blockX += blockSize) {
                const actualBlockWidth = Math.min(blockSize, x + width - blockX);
                const actualBlockHeight = Math.min(blockSize, y + height - blockY);
                
                if (actualBlockWidth <= 0 || actualBlockHeight <= 0) continue;
                
                // ブロック内の平均色を計算
                let r = 0, g = 0, b = 0, a = 0;
                let pixelCount = 0;
                
                for (let py = blockY; py < blockY + actualBlockHeight; py++) {
                    for (let px = blockX; px < blockX + actualBlockWidth; px++) {
                        if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                            const index = (py * this.canvas.width + px) * 4;
                            r += data[index];
                            g += data[index + 1];
                            b += data[index + 2];
                            a += data[index + 3];
                            pixelCount++;
                        }
                    }
                }
                
                if (pixelCount === 0) continue;
                
                r = Math.round(r / pixelCount);
                g = Math.round(g / pixelCount);
                b = Math.round(b / pixelCount);
                a = Math.round(a / pixelCount);
                
                // ブロックを平均色で塗りつぶし
                for (let py = blockY; py < blockY + actualBlockHeight; py++) {
                    for (let px = blockX; px < blockX + actualBlockWidth; px++) {
                        if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                            const index = (py * this.canvas.width + px) * 4;
                            data[index] = r;
                            data[index + 1] = g;
                            data[index + 2] = b;
                            data[index + 3] = a;
                        }
                    }
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    eraseRegion(x, y, width, height) {
        // 元画像データから該当領域を復元
        const originalData = this.originalImageData.data;
        const currentData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = currentData.data;
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                if (px >= 0 && px < this.canvas.width && py >= 0 && py < this.canvas.height) {
                    const index = (py * this.canvas.width + px) * 4;
                    data[index] = originalData[index];
                    data[index + 1] = originalData[index + 1];
                    data[index + 2] = originalData[index + 2];
                    data[index + 3] = originalData[index + 3];
                }
            }
        }
        
        this.ctx.putImageData(currentData, 0, 0);
    }
    
    undo() {
        const imageData = this.history.undo();
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
            this.currentImageData = imageData;
            this.updateHistoryButtons();
        }
    }
    
    redo() {
        const imageData = this.history.redo();
        if (imageData) {
            this.ctx.putImageData(imageData, 0, 0);
            this.currentImageData = imageData;
            this.updateHistoryButtons();
        }
    }
    
    updateHistoryButtons() {
        document.getElementById('undoBtn').disabled = !this.history.canUndo();
        document.getElementById('redoBtn').disabled = !this.history.canRedo();
    }
    
    saveImage() {
        if (!this.originalImage) return;
        
        this.showLoading(true);
        
        try {
            this.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${this.fileName}_mosa.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showLoading(false);
                this.showToast('画像を保存しました');
            }, 'image/png');
        } catch (error) {
            this.showLoading(false);
            this.showToast('保存に失敗しました');
            console.error('Save error:', error);
        }
    }
    
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }
    
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

class HistoryManager {
    constructor(maxHistory = 20) {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = maxHistory;
    }
    
    save(imageData) {
        // 現在位置以降の履歴を削除
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // 新しい状態を追加
        const clonedData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
        this.history.push(clonedData);
        
        // 最大履歴数を超えた場合、古いものを削除
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
    }
    
    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            return this.history[this.currentIndex];
        }
        return null;
    }
    
    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            return this.history[this.currentIndex];
        }
        return null;
    }
    
    canUndo() {
        return this.currentIndex > 0;
    }
    
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    clear() {
        this.history = [];
        this.currentIndex = -1;
    }
}

// Service Worker登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.mosaicEditor = new MosaicEditor();
}); 