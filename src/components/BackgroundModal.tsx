import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Sliders,
  RotateCcw,
  Palette,
  ZoomIn,
  ZoomOut,
  Move,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
} from 'lucide-react';

export interface BackgroundPosition {
  x: number; // percentage (0 to 100) or offset in px
  y: number; // percentage (0 to 100) or offset in px
  zoom: number; // scale (1.0 to 3.0)
}

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBgImage: string | null;
  currentOpacity: number;
  currentBlur: number;
  currentPosition?: BackgroundPosition | null;
  onSaveBackground: (
    bgImage: string | null,
    opacity: number,
    blur: number,
    position?: BackgroundPosition | null
  ) => void;
}



export const BackgroundModal: React.FC<BackgroundModalProps> = ({
  isOpen,
  onClose,
  currentBgImage,
  currentOpacity,
  currentBlur,
  currentPosition,
  onSaveBackground,
}) => {
  const [selectedBg, setSelectedBg] = useState<string | null>(currentBgImage);
  const [opacity, setOpacity] = useState<number>(currentOpacity);
  const [blur, setBlur] = useState<number>(currentBlur);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Framing & Pan/Zoom interactive states
  const [zoom, setZoom] = useState<number>(currentPosition?.zoom || 1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Framing display toggles
  const [showAppOverlay, setShowAppOverlay] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showDimmingPreview, setShowDimmingPreview] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedBg(currentBgImage);
      setOpacity(currentOpacity);
      setBlur(currentBlur);
      setZoom(currentPosition?.zoom || 1.0);
      setPanOffset({ x: 0, y: 0 });
      setErrorMsg(null);
      setIsProcessingSave(false);
    }
  }, [isOpen, currentBgImage, currentOpacity, currentBlur, currentPosition]);

  // Handle pointer down for drag/pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedBg) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPan({ x: panOffset.x, y: panOffset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Handle pointer move for drag/pan
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPanOffset({
      x: initialPan.x + dx,
      y: initialPan.y + dy,
    });
  };

  // Handle pointer up
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Mouse wheel zoom inside frame
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!selectedBg) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.min(3.0, Math.max(1.0, next));
    });
  };

  // Reset pan and zoom
  const handleResetFraming = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Compress & convert file to data URL
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        setIsUploading(false);
        setErrorMsg('ไม่สามารถอ่านไฟล์ได้');
        return;
      }

      // Pre-process and scale large photos to max 1920px for optimal performance
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setSelectedBg(compressedDataUrl);
        } else {
          setSelectedBg(result);
        }
        // Reset pan & zoom for the freshly uploaded image
        setZoom(1.0);
        setPanOffset({ x: 0, y: 0 });
        setIsUploading(false);
      };
      img.onerror = () => {
        setSelectedBg(result);
        setZoom(1.0);
        setPanOffset({ x: 0, y: 0 });
        setIsUploading(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setIsUploading(false);
      setErrorMsg('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Render and crop the framed image via offscreen canvas
  const handleApply = async () => {
    if (!selectedBg) {
      onSaveBackground(null, opacity, blur, null);
      onClose();
      return;
    }

    setIsProcessingSave(true);

    try {
      // Calculate CSS background position percentage as fallback
      const frameW = frameRef.current?.clientWidth || 600;
      const frameH = frameRef.current?.clientHeight || 340;

      // Calculate percentage offset for CSS background-position (50% is center)
      const maxPanRangeX = Math.max(1, (frameW * (zoom - 1)) / 2 + 100);
      const maxPanRangeY = Math.max(1, (frameH * (zoom - 1)) / 2 + 100);
      const posX = Math.round(50 + (panOffset.x / maxPanRangeX) * 50);
      const posY = Math.round(50 + (panOffset.y / maxPanRangeY) * 50);
      const clampedX = Math.min(100, Math.max(0, posX));
      const clampedY = Math.min(100, Math.max(0, posY));

      const positionData: BackgroundPosition = {
        x: clampedX,
        y: clampedY,
        zoom,
      };

      // Attempt to export exact high-res framed canvas if possible
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = selectedBg;
      });

      const canvasW = 1920;
      const canvasH = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Base cover scale
        const scaleBase = Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
        const finalDrawWidth = img.naturalWidth * scaleBase * zoom;
        const finalDrawHeight = img.naturalHeight * scaleBase * zoom;

        // Map pan offset from preview frame coordinates to canvas coordinates
        const scaleToCanvas = canvasW / (frameW || 1);
        const canvasPanX = panOffset.x * scaleToCanvas;
        const canvasPanY = panOffset.y * scaleToCanvas;

        const drawX = (canvasW - finalDrawWidth) / 2 + canvasPanX;
        const drawY = (canvasH - finalDrawHeight) / 2 + canvasPanY;

        ctx.drawImage(img, drawX, drawY, finalDrawWidth, finalDrawHeight);
        const framedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Save framed result
        onSaveBackground(framedDataUrl, opacity, blur, positionData);
      } else {
        onSaveBackground(selectedBg, opacity, blur, positionData);
      }
    } catch {
      // Fallback: If canvas tainted by CORS on external URL, save with CSS position
      const frameW = frameRef.current?.clientWidth || 600;
      const frameH = frameRef.current?.clientHeight || 340;
      const maxPanRangeX = Math.max(1, (frameW * (zoom - 1)) / 2 + 100);
      const maxPanRangeY = Math.max(1, (frameH * (zoom - 1)) / 2 + 100);
      const posX = Math.round(50 + (panOffset.x / maxPanRangeX) * 50);
      const posY = Math.round(50 + (panOffset.y / maxPanRangeY) * 50);

      onSaveBackground(selectedBg, opacity, blur, {
        x: Math.min(100, Math.max(0, posX)),
        y: Math.min(100, Math.max(0, posY)),
        zoom,
      });
    } finally {
      setIsProcessingSave(false);
      onClose();
    }
  };

  const handleResetToDefault = () => {
    setSelectedBg(null);
    setOpacity(65);
    setBlur(4);
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    onSaveBackground(null, 65, 4, null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ปรับแต่งภาพพื้นหลัง (Custom Background)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  กรอบจำลองแอพ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                เลือกรูปภาพ ปรับย่อ-ขยาย และเลื่อนตำแหน่งมุมมองที่คุณต้องการให้แสดงในแอป
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Interactive Framing Box / Viewport Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Move className="w-4 h-4 text-cyan-400" />
                <span>กรอบภาพที่จะแสดงในแอพ (คลิกลากเพื่อเลื่อน • ซูมเข้าออก)</span>
              </label>

              {/* Viewport Control Badges & Toggles */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAppOverlay(!showAppOverlay)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1 cursor-pointer ${
                    showAppOverlay
                      ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="เปิด/ปิดการจำลองหน้าจอแอป เพื่อดูตำแหน่งการวางการ์ดและปุ่ม"
                >
                  <Layers className="w-3 h-3" />
                  <span>{showAppOverlay ? 'โครงสร้างแอป: เปิด' : 'โครงสร้างแอป: ปิด'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1 cursor-pointer ${
                    showGrid
                      ? 'bg-cyan-600/30 border-cyan-500/60 text-cyan-300 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="เปิด/ปิด เส้นตารางจุดตัด 9 ช่อง (Rule of Thirds)"
                >
                  <Grid3X3 className="w-3 h-3" />
                  <span>ตาราง</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDimmingPreview(!showDimmingPreview)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1 cursor-pointer ${
                    showDimmingPreview
                      ? 'bg-slate-700 text-slate-200 border-slate-600'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                  title="เปิด/ปิด ตัวอย่างเอฟเฟกต์มืดและเบลอ (Glassmorphism)"
                >
                  {showDimmingPreview ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                  <span>เงาจริง</span>
                </button>
              </div>
            </div>

            {/* The Framing Box Container */}
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
              className={`w-full h-56 sm:h-72 rounded-2xl relative overflow-hidden select-none border-2 transition-all duration-150 touch-none ${
                selectedBg
                  ? 'border-cyan-500/50 shadow-xl shadow-cyan-950/20 cursor-grab active:cursor-grabbing bg-slate-950'
                  : 'border-slate-800 bg-[#0b0f19] flex items-center justify-center'
              }`}
            >
              {selectedBg ? (
                <>
                  {/* Scaled and Panned Image Layer */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={selectedBg}
                      alt="Wallpaper Framing Target"
                      className="w-full h-full object-cover max-w-none max-h-none pointer-events-none"
                      draggable={false}
                    />
                  </div>

                  {/* Optional Real-time Glassmorphism Dimming & Blur Overlay */}
                  {showDimmingPreview && (
                    <div
                      className="absolute inset-0 pointer-events-none transition-all duration-200 z-10"
                      style={{
                        backgroundColor: `rgba(11, 15, 25, ${opacity / 100})`,
                        backdropFilter: blur > 0 ? `blur(${Math.min(blur, 6)}px)` : undefined,
                      }}
                    />
                  )}

                  {/* Rule of Thirds Grid Lines (Subtle alignment guide) */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/10">
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-r border-b border-white/10" />
                      <div className="border-b border-white/10" />
                      <div className="border-r border-white/10" />
                      <div className="border-r border-white/10" />
                      <div />
                    </div>
                  )}

                  {/* Corner Camera / Viewfinder Crop Markers */}
                  <div className="absolute inset-3 pointer-events-none z-20">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm shadow-sm" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm shadow-sm" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm shadow-sm" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-sm shadow-sm" />
                  </div>

                  {/* Translucent Mock App Wireframe (Shows how actual cards sit over image) */}
                  {showAppOverlay && (
                    <div className="absolute inset-0 pointer-events-none z-25 flex flex-col justify-between p-3.5 bg-slate-950/20">
                      {/* Mock Header */}
                      <div className="h-6 rounded-lg bg-slate-900/60 border border-white/10 flex items-center justify-between px-2.5 backdrop-blur-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded bg-indigo-500/80" />
                          <div className="w-16 h-2 rounded bg-white/40" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-2.5 rounded bg-indigo-500/50" />
                          <div className="w-3.5 h-3.5 rounded bg-white/30" />
                        </div>
                      </div>

                      {/* Mock Stat Cards */}
                      <div className="grid grid-cols-4 gap-1.5 my-auto">
                        <div className="h-10 rounded-lg bg-slate-900/50 border border-white/10 p-1 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-white/30" />
                          <div className="w-12 h-2.5 rounded bg-white/60 font-bold" />
                        </div>
                        <div className="h-10 rounded-lg bg-slate-900/50 border border-white/10 p-1 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-rose-400/40" />
                          <div className="w-12 h-2.5 rounded bg-rose-300/70 font-bold" />
                        </div>
                        <div className="h-10 rounded-lg bg-slate-900/50 border border-white/10 p-1 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-emerald-400/40" />
                          <div className="w-12 h-2.5 rounded bg-emerald-300/70 font-bold" />
                        </div>
                        <div className="h-10 rounded-lg bg-slate-900/50 border border-white/10 p-1 flex flex-col justify-between">
                          <div className="w-8 h-1.5 rounded bg-amber-400/40" />
                          <div className="w-12 h-2.5 rounded bg-amber-300/70 font-bold" />
                        </div>
                      </div>

                      {/* Mock Donut Chart and Card List row */}
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5 h-16 rounded-lg bg-slate-900/50 border border-white/10 flex items-center justify-center p-1">
                          <div className="w-11 h-11 rounded-full border-2 border-indigo-400/70 border-t-cyan-400/70 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-slate-900/80" />
                          </div>
                        </div>
                        <div className="col-span-7 h-16 rounded-lg bg-slate-900/50 border border-white/10 p-1.5 flex flex-col justify-around">
                          <div className="w-20 h-2 rounded bg-white/40" />
                          <div className="w-full h-2 rounded bg-indigo-500/30" />
                          <div className="w-16 h-1.5 rounded bg-white/20" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drag & Pan floating indicator badge */}
                  <div className="absolute bottom-2 left-2 z-30 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/85 border border-slate-700/80 text-[10px] text-slate-300 backdrop-blur-sm shadow-md">
                    <Move className="w-3 h-3 text-cyan-400" />
                    <span>ลากเพื่อเลื่อนมุมมอง</span>
                    {(panOffset.x !== 0 || panOffset.y !== 0) && (
                      <span className="text-cyan-300 font-mono">
                        ({panOffset.x > 0 ? `+${Math.round(panOffset.x)}` : Math.round(panOffset.x)},{' '}
                        {panOffset.y > 0 ? `+${Math.round(panOffset.y)}` : Math.round(panOffset.y)})
                      </span>
                    )}
                  </div>

                  {/* Zoom indicator badge */}
                  <div className="absolute bottom-2 right-2 z-30 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/85 border border-slate-700/80 text-[10px] text-slate-300 backdrop-blur-sm shadow-md font-mono">
                    <ZoomIn className="w-3 h-3 text-indigo-400" />
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">ยังไม่ได้เลือกรูปภาพพื้นหลัง</span>
                    <span className="text-[11px] text-slate-500">
                      อัปโหลดรูปภาพของคุณเองด้านล่างเพื่อเริ่มจัดวางกรอบภาพ
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Viewport Framing Controls Bar (Zoom Slider, Reset, Quick Zoom) */}
            {selectedBg && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Zoom Adjuster */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(1.0, Math.round((prev - 0.1) * 10) / 10))}
                    disabled={zoom <= 1.0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer shrink-0"
                    title="ย่อขนาด"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-xs font-mono font-semibold text-indigo-300 w-12 text-right shrink-0">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(3.0, Math.round((prev + 0.1) * 10) / 10))}
                    disabled={zoom >= 3.0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer shrink-0"
                    title="ขยายขนาด"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets: 1.0x, 1.5x, 2.0x, and Center */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setZoom(1.0)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                      zoom === 1.0
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    1.0x ปกติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1.5)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                      zoom === 1.5
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    1.5x
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(2.0)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                      zoom === 2.0
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    2.0x
                  </button>

                  <button
                    type="button"
                    onClick={handleResetFraming}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 cursor-pointer ml-1"
                    title="จัดภาพให้อยู่ตรงกลาง และคืนขนาดปกติ"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                    <span>จัดกึ่งกลาง</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Upload Your Own Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              อัปโหลดรูปภาพของคุณเอง
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-950/10 hover:bg-indigo-950/20 rounded-2xl p-4 text-center cursor-pointer transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="flex items-center justify-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-300 transition block">
                    {isUploading ? 'กำลังประมวลผลรูปภาพ...' : 'คลิกเพื่อเลือกไฟล์ หรือ ลากรูปภาพมาวางที่นี่'}
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    รองรับ JPG, PNG, WebP (สามารถย่อขยายและจัดวางกรอบภาพได้ตามใจชอบ)
                  </p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium">{errorMsg}</p>
            )}
          </div>

          {/* 3. Current Background Status & Management */}
          {selectedBg ? (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-10 rounded-xl border border-slate-700 bg-cover bg-center shrink-0 shadow-md relative overflow-hidden"
                  style={{ backgroundImage: `url(${selectedBg})` }}
                />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">
                    รูปภาพพื้นหลังที่เลือกอยู่
                  </span>
                  <span className="text-[10px] text-cyan-400 font-medium flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3" /> พร้อมปรับแต่งกรอบและใช้งาน
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedBg(null);
                  setPanOffset({ x: 0, y: 0 });
                  setZoom(1.0);
                }}
                className="px-3 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition flex items-center gap-1.5 text-xs cursor-pointer font-medium shrink-0"
                title="ลบภาพพื้นหลังและกลับไปใช้ธีมเริ่มต้น"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบภาพ / คืนค่าเริ่มต้น</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">
                    ธีมเริ่มต้น (Dark Theme)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ไม่มีภาพพื้นหลัง (อัปโหลดรูปภาพด้านบนเพื่อใส่ภาพพื้นหลังของคุณ)
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                ค่าเริ่มต้น
              </span>
            </div>
          )}

          {/* 4. Background Adjustments (Dimming & Blur) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white tracking-tight">
                  ปรับระดับความมืดและความเบลอ (Glassmorphism)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">แสดงผลจริงในกรอบด้านบน</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opacity / Dimming Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span>ความมืดของชั้นบังตา (Dark Overlay)</span>
                  <span className="font-semibold text-indigo-300 font-mono">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  step="5"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  แนะนำ 60%-75% เพื่อให้การ์ดและตัวเลขในระบบอ่านง่ายคมชัด
                </p>
              </div>

              {/* Blur Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span>ความเบลอของพื้นหลัง (Frosted Blur)</span>
                  <span className="font-semibold text-indigo-300 font-mono">{blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="16"
                  step="2"
                  value={blur}
                  onChange={(e) => setBlur(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  เพิ่มมิติความนุ่มนวลแบบกระจกฝ้า (Frosted Glass Effect)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้น</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessingSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessingSave ? 'กำลังบันทึกภาพ...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
