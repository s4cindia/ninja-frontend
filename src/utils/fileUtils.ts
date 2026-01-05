export function isEpubFile(file: { mimeType: string; originalName: string }): boolean {
  return file.mimeType.includes('epub') || file.originalName.toLowerCase().endsWith('.epub');
}
