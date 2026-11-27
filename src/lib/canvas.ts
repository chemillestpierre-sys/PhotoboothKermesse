import {PhotoboothSettings} from '../types';

export interface ViewfinderCropRects {
  videoRect: DOMRect;
  viewfinderRect: DOMRect;
  mirroredPreview?: boolean;
}

export async function composePhotoBlob(
  video: HTMLVideoElement,
  settings: PhotoboothSettings,
  cropRects?: ViewfinderCropRects | null,
): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const isLandscape = settings.photoOrientation !== 'portrait';
  const photoWidth = isLandscape ? 1800 : 1200;
  const photoHeight = isLandscape ? 1200 : 1800;
  const bannerHeight = isLandscape ? 116 : 196;
  const imageAreaHeight = photoHeight - bannerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = photoWidth;
  canvas.height = photoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte canvas indisponible');
  }

  // White base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, photoWidth, photoHeight);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error('Flux vidéo non prêt');
  }

  // Compute source region from the exact viewfinder frame if available
  let baseSx = 0;
  let baseSy = 0;
  let baseSw = vw;
  let baseSh = vh;

  if (
    cropRects &&
    cropRects.videoRect.width > 0 &&
    cropRects.videoRect.height > 0 &&
    cropRects.viewfinderRect.width > 0 &&
    cropRects.viewfinderRect.height > 0
  ) {
    const {videoRect, viewfinderRect, mirroredPreview} = cropRects;
    const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
    const renderedW = vw * scale;
    const renderedH = vh * scale;
    const renderedLeft = videoRect.left + (videoRect.width - renderedW) / 2;
    const renderedTop = videoRect.top + (videoRect.height - renderedH) / 2;

    const rawSx = mirroredPreview
      ? (renderedLeft + renderedW - viewfinderRect.right) / scale
      : (viewfinderRect.left - renderedLeft) / scale;
    const rawSy = (viewfinderRect.top - renderedTop) / scale;
    const rawSw = viewfinderRect.width / scale;
    const rawSh = viewfinderRect.height / scale;

    baseSx = Math.max(0, Math.min(vw - 1, rawSx));
    baseSy = Math.max(0, Math.min(vh - 1, rawSy));
    baseSw = Math.max(1, Math.min(vw - baseSx, rawSw));
    baseSh = Math.max(1, Math.min(vh - baseSy, rawSh));
  }

  // Center-crop without distortion (object-fit: cover) into the photo area
  const targetRatio = photoWidth / imageAreaHeight;
  const sourceRatio = baseSw / baseSh;

  let sx = baseSx;
  let sy = baseSy;
  let sw = baseSw;
  let sh = baseSh;

  if (sourceRatio > targetRatio) {
    sw = baseSh * targetRatio;
    sx = baseSx + (baseSw - sw) / 2;
  } else {
    sh = baseSw / targetRatio;
    sy = baseSy + (baseSh - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, photoWidth, imageAreaHeight);
  ctx.clip();

  ctx.drawImage(
    video,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    photoWidth,
    imageAreaHeight,
  );
  ctx.restore();

  // Sober white bottom banner
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, imageAreaHeight, photoWidth, bannerHeight);

  // Subtle top hairline divider
  ctx.fillStyle = 'rgba(15, 23, 42, 0.09)';
  ctx.fillRect(0, imageAreaHeight, photoWidth, 2);

  // Banner title & date
  const bannerTitle =
    settings.bannerText.trim() ||
    'Kermesse – École Saint-Pierre – Chemillé-en-Anjou';
  const bannerDate = settings.bannerDate.trim();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = isLandscape ? 32 : 38;
  ctx.fillStyle = '#0F172A';
  while (fontSize > 20) {
    ctx.font = `700 ${fontSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
    if (ctx.measureText(bannerTitle).width <= photoWidth - 96) {
      break;
    }
    fontSize -= 2;
  }

  if (isLandscape) {
    const titleY = bannerDate
      ? imageAreaHeight + 42
      : imageAreaHeight + bannerHeight / 2;
    ctx.fillText(bannerTitle, photoWidth / 2, titleY, photoWidth - 80);

    if (bannerDate) {
      ctx.fillStyle = '#475569';
      ctx.font =
        '600 22px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
      ctx.fillText(
        bannerDate,
        photoWidth / 2,
        imageAreaHeight + 84,
        photoWidth - 80,
      );
    }
  } else {
    const titleY = bannerDate
      ? imageAreaHeight + 78
      : imageAreaHeight + bannerHeight / 2;
    ctx.fillText(bannerTitle, photoWidth / 2, titleY, photoWidth - 80);

    if (bannerDate) {
      ctx.fillStyle = '#475569';
      ctx.font =
        '600 26px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
      ctx.fillText(
        bannerDate,
        photoWidth / 2,
        imageAreaHeight + 136,
        photoWidth - 80,
      );
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Échec de génération JPEG'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger la photo'));
    };
    img.src = url;
  });
}

export async function composeMiniatures4Blob(sourceBlob: Blob): Promise<Blob> {
  const img = await loadImageFromBlob(sourceBlob);
  const srcW = img.naturalWidth || 1800;
  const srcH = img.naturalHeight || 1200;
  const isPortrait = srcH > srcW;

  const sheetW = isPortrait ? 1200 : 1800;
  const sheetH = isPortrait ? 1800 : 1200;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte canvas indisponible');
  }

  // White paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetW, sheetH);

  const cellW = sheetW / 2;
  const cellH = sheetH / 2;
  const margin = 24;
  const maxDrawW = cellW - margin * 2;
  const maxDrawH = cellH - margin * 2;

  const scale = Math.min(maxDrawW / srcW, maxDrawH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const cellX = col * cellW;
      const cellY = row * cellH;
      const dx = cellX + (cellW - drawW) / 2;
      const dy = cellY + (cellH - drawH) / 2;

      ctx.drawImage(img, dx, dy, drawW, drawH);

      // Very subtle hairline around the miniature so the white bottom banner stays crisp on white paper
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(dx, dy, drawW, drawH);
    }
  }

  // Discreet light-gray scissor cut lines between the 2x2 cells
  ctx.save();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 12]);

  // Vertical center cut line
  ctx.beginPath();
  ctx.moveTo(sheetW / 2, 12);
  ctx.lineTo(sheetW / 2, sheetH - 12);
  ctx.stroke();

  // Horizontal center cut line
  ctx.beginPath();
  ctx.moveTo(12, sheetH / 2);
  ctx.lineTo(sheetW - 12, sheetH / 2);
  ctx.stroke();
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Échec de génération JPEG'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}
