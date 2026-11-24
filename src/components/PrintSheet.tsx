import React from 'react';
import {PhotoOrientation} from '../types';

interface PrintSheetProps {
  imageUrl: string | null;
  orientation: PhotoOrientation;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({
  imageUrl,
  orientation,
}) => {
  if (!imageUrl) return null;

  return (
    <div
      id="print-photo-root"
      data-orientation={orientation}
      aria-hidden="true">
      {orientation === 'portrait' && (
        <style>{`@page { size: 10cm 15cm; margin: 0; }`}</style>
      )}
      <img src={imageUrl} alt="Photo imprimée de la kermesse" />
    </div>
  );
};
