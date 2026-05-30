import { File } from 'expo-file-system';

export type NativeUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

/** FormData compatible with `expo/fetch` (RN `{ uri, name, type }` is not supported). */
export function buildUploadFormData(
  file: NativeUploadFile,
  fields: Record<string, string> = {},
): FormData {
  const form = new FormData();
  form.append('file', new File(file.uri));
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return form;
}
