/**
 * Resize and compress an image file before uploading.
 * Falls back to JPEG, then to original file if all else fails.
 * Has a 10-second timeout to prevent hanging.
 */
export function resizeImage(file, { maxWidth = 800, maxHeight = 800, quality = 0.8 } = {}) {
  return new Promise((resolve) => {
    // Timeout — if resize takes too long, just use the original
    const timeout = setTimeout(() => {
      console.warn('Image resize timeout, using original');
      resolve(file);
    }, 10000);

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.onload = () => {
        try {
          URL.revokeObjectURL(url);

          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);

          // Try WebP
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                clearTimeout(timeout);
                resolve(new File([blob], 'image.webp', { type: 'image/webp' }));
                return;
              }
              // Fallback to JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  clearTimeout(timeout);
                  if (jpegBlob && jpegBlob.size > 0) {
                    resolve(new File([jpegBlob], 'image.jpg', { type: 'image/jpeg' }));
                  } else {
                    resolve(file);
                  }
                },
                'image/jpeg',
                quality
              );
            },
            'image/webp',
            quality
          );
        } catch (e) {
          clearTimeout(timeout);
          console.warn('Image resize error:', e);
          resolve(file);
        }
      };

      img.src = url;
    } catch (e) {
      clearTimeout(timeout);
      console.warn('Image load error:', e);
      resolve(file);
    }
  });
}
