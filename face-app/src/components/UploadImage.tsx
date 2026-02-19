import type { ChangeEvent } from 'react';

interface UploadImageProps {
  onImageSelected: (file: File) => void;
}

export function UploadImage({ onImageSelected }: UploadImageProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  return (
    <section className="card">
      <h2>Imagen manual</h2>
      <input type="file" accept="image/*" onChange={handleChange} />
    </section>
  );
}
