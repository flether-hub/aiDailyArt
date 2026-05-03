const API_BASE = '/api';
const TOKEN_KEY = 'admin_token';

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'An error occurred');
  }

  return response.json();
};

export const uploadFileWithProgress = (endpoint: string, formData: FormData, onProgress: (loaded: number, total: number) => void, signal?: AbortSignal): Promise<any> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${endpoint}`);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed'));
        } catch (e) {
          reject(new Error('Upload failed'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
};

export const downloadFileWithProgress = async (id: number, filename: string, onProgress: (loaded: number, total: number | null) => void) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Unauthorized');
  
  const response = await fetch(`${API_BASE}/files/${id}/download`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Download failed');

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;
  let loaded = 0;

  const reader = response.body?.getReader();
  if (!reader) {
    const a = document.createElement('a');
    a.href = `${API_BASE}/files/${id}/download?token=${token}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: filename });
      const writable = await handle.createWritable();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          await writable.write(value);
          loaded += value.length;
          onProgress(loaded, total);
        }
      }
      await writable.close();
      return;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    console.warn('File System Access API failed, falling back to memory', err);
  }

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, total);
    }
  }

  const blob = new Blob(chunks);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
