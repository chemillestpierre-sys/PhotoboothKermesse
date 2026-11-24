import {PhotoboothSettings} from '../types';

export const PHOTO_WIDTH = 1200;
export const PHOTO_HEIGHT = 1800;
const BANNER_HEIGHT = 196;
const IMAGE_AREA_HEIGHT = PHOTO_HEIGHT - BANNER_HEIGHT; // 1604

export async function composePhotoBlob(
  video: HTMLVideoElement,
  settings: PhotoboothSettings,
): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_WIDTH;
  canvas.height = PHOTO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Contexte canvas indisponible');
  }

  // White base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error('Flux vidéo non prêt');
  }

  // Center-crop without distortion (object-fit: cover)
  const targetRatio = PHOTO_WIDTH / IMAGE_AREA_HEIGHT;
  const videoRatio = vw / vh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, PHOTO_WIDTH, IMAGE_AREA_HEIGHT);
  ctx.clip();

  ctx.drawImage(
    video,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    PHOTO_WIDTH,
    IMAGE_AREA_HEIGHT,
  );
  ctx.restore();

  // Sober white bottom banner
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, IMAGE_AREA_HEIGHT, PHOTO_WIDTH, BANNER_HEIGHT);

  // Subtle top hairline divider
  ctx.fillStyle = 'rgba(15, 23, 42, 0.09)';
  ctx.fillRect(0, IMAGE_AREA_HEIGHT, PHOTO_WIDTH, 2);

  // Banner title
  const bannerTitle =
    settings.bannerText.trim() ||
    'Kermesse – École Saint-Pierre – Chemillé-en-Anjou';
  const bannerDate = settings.bannerDate.trim();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = 38;
  ctx.fillStyle = '#0F172A';
  while (fontSize > 22) {
    ctx.font = `700 ${fontSize}px "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;
    if (ctx.measureText(bannerTitle).width <= PHOTO_WIDTH - 96) {
      break;
    }
    fontSize -= 2;
  }

  const titleY = bannerDate
    ? IMAGE_AREA_HEIGHT + 78
    : IMAGE_AREA_HEIGHT + BANNER_HEIGHT / 2;
  ctx.fillText(bannerTitle, PHOTO_WIDTH / 2, titleY, PHOTO_WIDTH - 80);

  if (bannerDate) {
    ctx.fillStyle = '#475569';
    ctx.font =
      '600 26px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    ctx.fillText(
      bannerDate,
      PHOTO_WIDTH / 2,
      IMAGE_AREA_HEIGHT + 136,
      PHOTO_WIDTH - 80,
    );
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
