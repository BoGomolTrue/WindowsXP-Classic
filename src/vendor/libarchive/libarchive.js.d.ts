export class Archive {
  static init(options: { workerUrl: string }): { workerUrl: string }
  static open(file: File): Promise<Archive>
  hasEncryptedData(): Promise<boolean>
  usePassword(password: string): Promise<void>
  extractFiles(extractCallback?: (info: { current: number; total: number }) => void): Promise<Record<string, unknown>>
}
