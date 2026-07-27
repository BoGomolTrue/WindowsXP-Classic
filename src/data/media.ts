export const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'bmp', 'png', 'gif', 'webp'])
export const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'wma', 'ogg'])

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(name))
}

export function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.has(extensionOf(name))
}
