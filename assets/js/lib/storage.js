/**
 * Storage client
 * Supabase Storage'a dosya yükleme (image + document).
 * Image'lar için client-side resize yapar (1920px max), EXIF orientation düzeltir.
 * - publicBucket: project-images (anon okur, authenticated yazar)
 * - privateBucket: project-documents (sadece authenticated)
 */

import { getClient } from './db.js';
import { SUPABASE_CONFIG } from '../config.js';
import { toast } from './ui.js';

const MAX_IMAGE_DIMENSION = 1920;
const JPEG_QUALITY = 0.85;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function getBucket(name) {
  return SUPABASE_CONFIG.storage[name];
}

function genPath(prefix, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const id = crypto.randomUUID().slice(0, 8);
  const ts = Date.now();
  return `${prefix}/${ts}-${id}.${ext}`;
}

/* -------------------- IMAGE PROCESSING -------------------- */

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * EXIF orientation'a göre döndürülmüş, max 1920px ölçekli JPEG blob üretir.
 */
export async function resizeImage(file, maxDim = MAX_IMAGE_DIMENSION) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return file;
  const img = await loadImage(file);
  let { width, height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // EXIF orientation için createImageBitmap kullan
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
  } catch {
    ctx.drawImage(img, 0, 0, width, height);
  }
  URL.revokeObjectURL(img.src);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) return resolve(file);
      // Yeni File (aynı isim)
      resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
    }, 'image/jpeg', JPEG_QUALITY);
  });
}

/* -------------------- UPLOAD -------------------- */

async function upload(bucket, path, file, opts = {}) {
  const c = await getClient();
  if (!c) throw new Error('Çevrimdışı mod');

  const { data, error } = await c.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: opts.upsert ?? true,
      contentType: file.type
    });
  if (error) throw error;
  return data;
}

export function getPublicUrl(bucket, path) {
  return `${SUPABASE_CONFIG.url}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Proje görseli yükle (resize + public url)
 * @param {File} file
 * @param {(p:number)=>void} onProgress
 * @returns {Promise<{path:string, publicUrl:string, size:number}>}
 */
export async function uploadProjectImage(file, onProgress) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Desteklenmeyen görsel formatı: ' + file.type);
  }
  onProgress?.(10);
  const resized = await resizeImage(file);
  onProgress?.(50);
  const path = genPath('projects', resized);
  await upload(getBucket('publicBucket'), path, resized);
  onProgress?.(100);
  return {
    path,
    publicUrl: getPublicUrl(getBucket('publicBucket'), path),
    size: resized.size
  };
}

/**
 * Proje belgesi yükle (PDF, DOC vb.) — private bucket
 */
export async function uploadProjectDocument(file, onProgress) {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    throw new Error('Desteklenmeyen belge formatı: ' + file.type);
  }
  onProgress?.(50);
  const path = genPath('documents', file);
  await upload(getBucket('privateBucket'), path, file);
  onProgress?.(100);
  return { path, size: file.size, mime_type: file.type };
}

export async function deleteFile(bucket, path) {
  const c = await getClient();
  if (!c) return;
  const { error } = await c.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const c = await getClient();
  if (!c) return null;
  const { data, error } = await c.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/* -------------------- UI HELPERS -------------------- */

export function validateImage(file) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Sadece JPG, PNG, WebP, GIF desteklenir.';
  }
  if (file.size > 20 * 1024 * 1024) return 'Dosya 20MB\'dan büyük olamaz.';
  return null;
}

export function validateDocument(file) {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return 'Sadece PDF, JPG, PNG, DOC desteklenir.';
  }
  if (file.size > 50 * 1024 * 1024) return 'Dosya 50MB\'dan büyük olamaz.';
  return null;
}

export { ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES };