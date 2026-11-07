import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

type Bucket = 'avatars' | 'events' | 'posts';
export type Picked = { uri: string; type: 'image' | 'video'; width?: number; height?: number; mime?: string; size?: number };

export async function pick(opts: { video?: boolean; multiple?: boolean; square?: boolean } = {}): Promise<Picked[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('MOSHCHAT braucht Zugriff auf deine Fotos. Du kannst ihn in den Einstellungen deines Handys erlauben.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: opts.video ? ['images', 'videos'] : ['images'],
    allowsEditing: !!opts.square && !opts.multiple,
    aspect: opts.square ? [1, 1] : undefined,
    allowsMultipleSelection: !!opts.multiple,
    selectionLimit: opts.multiple ? 10 : 1,
    quality: 1,
    videoMaxDuration: 120,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({
    uri: a.uri, type: a.type === 'video' ? 'video' : 'image', width: a.width, height: a.height, mime: a.mimeType ?? undefined, size: a.fileSize ?? undefined,
  }));
}

/** Downscales a photo to at most `max` px on the long side and saves it as JPEG. */
async function shrink(p: Picked, max: number) {
  const ctx = ImageManipulator.manipulate(p.uri);
  if ((p.width ?? 0) > max || (p.height ?? 0) > max) {
    if ((p.width ?? 0) >= (p.height ?? 0)) ctx.resize({ width: max }); else ctx.resize({ height: max });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: out.uri, width: out.width, height: out.height };
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** Uploads into `<bucket>/<userId>/...` and returns the storage path. */
export async function upload(bucket: Bucket, userId: string, p: Picked, maxPx = 1600) {
  if (p.type === 'video') {
    if ((p.size ?? 0) > 50 * 1024 * 1024) throw new Error('Das Video ist größer als 50 MB. Bitte kürze es.');
    const ext = p.mime === 'video/quicktime' ? 'mov' : 'mp4';
    const path = `${userId}/${Date.now()}-${rand()}.${ext}`;
    const bytes = await new File(p.uri).bytes();
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: p.mime ?? 'video/mp4' });
    if (error) throw error;
    return { path, width: p.width, height: p.height };
  }
  const s = await shrink(p, maxPx);
  const path = `${userId}/${Date.now()}-${rand()}.jpg`;
  const bytes = await new File(s.uri).bytes();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;
  return { path, width: s.width, height: s.height };
}
