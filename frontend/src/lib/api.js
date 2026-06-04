import { API_BASE_URL, LOCAL_STORAGE_KEYS } from '../constants/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getHeaders(isMultipart = false) {
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const isMultipart = options.body instanceof FormData;
    
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(isMultipart),
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('docsy_token');
          window.dispatchEvent(new Event('auth-unauthorized'));
        }
        let errorMessage = 'An error occurred';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // ignore parsing error
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Request Failed for ${path}:`, error);
      throw error;
    }
  }

  get(path) {
    return this.request(path, { method: 'GET' });
  }

  post(path, body) {
    const isMultipart = body instanceof FormData;
    return this.request(path, {
      method: 'POST',
      body: isMultipart ? body : JSON.stringify(body),
    });
  }

  upload(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseUrl}${path}`;
      
      xhr.open('POST', url);
      
      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        });
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          if (xhr.status === 401) {
            localStorage.removeItem('docsy_token');
            window.dispatchEvent(new Event('auth-unauthorized'));
          }
          let errorMessage = 'An error occurred';
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.detail || errorMessage;
          } catch {
            // ignore
          }
          reject(new Error(errorMessage));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error'));
      };
      
      xhr.send(formData);
    });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
