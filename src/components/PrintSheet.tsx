import React from 'react';

interface PrintSheetProps {
  imageUrl: string | null;
}

export const PrintSheet: React.FC<PrintSheetProps> = ({imageUrl}) => {
  if (!imageUrl) return null;

  return (
    <div id="print-photo-root" aria-hidden="true">
      <img src={imageUrl} alt="Photo imprimée de la kermesse" />
    </div>
  );
};
