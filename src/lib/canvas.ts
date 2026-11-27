import themeLogoUrl from '../assets/images/logo_graines_artistes_1795511260781.jpg';
import {PhotoboothSettings} from '../types';

const SCHOOL_LOGO_URL = '/logo-ecole.svg';
const logoImageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadLogoImage(src: string): Promise<HTMLImageElement | null> {
  const existing = logoImageCache.get(src);
  if (existing) {
    return existing;
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .catch(() => {})
          .finally(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      logoImageCache.delete(src);
      resolve(null);
    };
    img.src = src;
  });

  logoImageCache.set(src, promise);
  return promise;
}

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
  const showLogos = settings.showBannerLogos !== false;

  const [, logos] = await Promise.all([
    document.fonts?.ready ?? Promise.resolve(),
    showLogos
      ? Promise.all([
          loadLogoImage(SCHOOL_LOGO_URL),
          loadLogoImage(themeLogoUrl),
        ])
      : Promise.resolve([null, null] as const),
  ]);

  const [schoolLogo, themeLogo] = logos;

  const isLandscape = settings.photoOrientation !== 'portrait';
  const photoWidth = isLandscape ? 1800 : 1200;
  const photoHeight = isLandscape ? 1200 : 1800;
  const bannerHeight = Math.round(photoHeight * 0.14);
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

  // Sober white bottom banner (14% of photo height)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, imageAreaHeight, photoWidth, bannerHeight);

  // Subtle top hairline divider
  ctx.fillStyle = 'rgba(15, 23, 42, 0.09)';
  ctx.fillRect(0, imageAreaHeight, photoWidth, 2);

  // Draw school logo on the left and theme logo on the right (80% of banner height)
  const edgeMarginX = Math.round(bannerHeight * 0.16);
  const logoTargetH = Math.round(bannerHeight * 0.8);
  const maxLogoW = Math.round(photoWidth * 0.22);
  const textGap = Math.round(bannerHeight * 0.16);

  let leftOccupied = 48;
  let rightOccupied = 48;

  if (showLogos && schoolLogo) {
    const natW = schoolLogo.naturalWidth || 400;
    const natH = schoolLogo.naturalHeight || 400;
    const scale = Math.min(maxLogoW / natW, logoTargetH / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    const drawX = edgeMarginX;
    const drawY = imageAreaHeight + (bannerHeight - drawH) / 2;
    ctx.drawImage(schoolLogo, drawX, drawY, drawW, drawH);
    leftOccupied = edgeMarginX + drawW + textGap;
  }

  if (showLogos && themeLogo) {
    const natW = themeLogo.naturalWidth || 400;
    const natH = themeLogo.naturalHeight || 400;
    const scale = Math.min(maxLogoW / natW, logoTargetH / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;
    const drawX = photoWidth - edgeMarginX - drawW;
    const drawY = imageAreaHeight + (bannerHeight - drawH) / 2;
    ctx.drawImage(themeLogo, drawX, drawY, drawW, drawH);
    rightOccupied = edgeMarginX + drawW + textGap;
  }

  // Banner title & date centered between logos, auto-shrinking so it never overlaps
  const bannerTitle =
    settings.bannerText.trim() ||
    'Kermesse – École Saint-Pierre – Chemillé-en-Anjou';
  const bannerDate = settings.bannerDate.trim();

  const textLeft = leftOccupied;
  const textRight = photoWidth - rightOccupied;
  const maxTextWidth = Math.max(120, textRight - textLeft);
  const textCenterX = (textLeft + textRight) / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let titleFontSize = isLandscape ? 38 : 42;
  ctx.fillStyle = '#0F172A';
  while (titleFontSize > 14) {
    ctx.font = `700 ${titleFontSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
    if (ctx.measureText(bannerTitle).width <= maxTextWidth) {
      break;
    }
    titleFontSize -= 2;
  }

  const titleY = bannerDate
    ? imageAreaHeight + Math.round(bannerHeight * 0.37)
    : imageAreaHeight + bannerHeight / 2;
  ctx.fillText(bannerTitle, textCenterX, titleY, maxTextWidth);

  if (bannerDate) {
    let dateFontSize = isLandscape ? 26 : 28;
    ctx.fillStyle = '#475569';
    while (dateFontSize > 12) {
      ctx.font = `600 ${dateFontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
      if (ctx.measureText(bannerDate).width <= maxTextWidth) {
        break;
      }
      dateFontSize -= 1;
    }
    const dateY = imageAreaHeight + Math.round(bannerHeight * 0.69);
    ctx.fillText(bannerDate, textCenterX, dateY, maxTextWidth);
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
