export function isClientDocumentMissing(value: string | null | undefined): boolean {
  return !value?.trim();
}
