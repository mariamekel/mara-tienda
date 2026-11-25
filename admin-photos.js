// Sube una foto al bucket product-images y devuelve su URL pública
export async function subirFoto(sb, file) {
  const blob = await reducir(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

// Reduce la foto a 1600 px máximo para que no pese demasiado en el celular
async function reducir(file) {
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
  } catch (e) {
    return file;
  }
}
