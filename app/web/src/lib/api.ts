// ============================================
// WAYFIND API CLIENT
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('wayfind_token', token);
    } else {
      localStorage.removeItem('wayfind_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('wayfind_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
        },
      };
    }
  }

  // Auth
  async getChallenge(walletAddress: string) {
    return this.request<{ message: string; nonce: string; expiresAt: string }>(
      '/auth/challenge',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    );
  }

  async verifySignature(walletAddress: string, signature: string, message: string) {
    return this.request<{ token: string; user: any }>(
      '/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, message }),
      }
    );
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Videos
  async getVideos(params?: {
    venueId?: string;
    routeId?: string;
    creatorId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ videos: any[]; pagination: any }>(`/videos${query ? `?${query}` : ''}`);
  }

  async getVideo(id: string) {
    return this.request<any>(`/videos/${id}`);
  }

  async createVideo(data: { routeId: string; title: string; description?: string }) {
    return this.request<any>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVideo(id: string, data: { title?: string; description?: string; status?: string }) {
    return this.request<any>(`/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteVideo(id: string) {
    return this.request<any>(`/videos/${id}`, { method: 'DELETE' });
  }

  async rateVideo(id: string, rating: number, feedback?: string) {
    return this.request<any>(`/videos/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, feedback }),
    });
  }

  // Overlays
  async getOverlays(videoId: string) {
    return this.request<any[]>(`/overlays?videoId=${videoId}`);
  }

  async createOverlay(data: any) {
    return this.request<any>('/overlays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createOverlaysBulk(videoId: string, overlays: any[]) {
    return this.request<any[]>('/overlays/bulk', {
      method: 'POST',
      body: JSON.stringify({ videoId, overlays }),
    });
  }

  async updateOverlay(id: string, data: any) {
    return this.request<any>(`/overlays/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOverlay(id: string) {
    return this.request<any>(`/overlays/${id}`, { method: 'DELETE' });
  }

  async deleteAllOverlays(videoId: string) {
    return this.request<any>(`/overlays/video/${videoId}`, { method: 'DELETE' });
  }

  // Venues
  async getVenues(params?: { type?: string; city?: string; bountyActive?: boolean }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ venues: any[]; pagination: any }>(`/venues${query ? `?${query}` : ''}`);
  }

  async getVenue(id: string) {
    return this.request<any>(`/venues/${id}`);
  }

  async createVenue(data: any) {
    return this.request<any>('/venues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Routes
  async getRoutes(params?: { venueId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ routes: any[]; pagination: any }>(`/routes${query ? `?${query}` : ''}`);
  }

  async getRoute(id: string) {
    return this.request<any>(`/routes/${id}`);
  }

  async createRoute(data: any) {
    return this.request<any>('/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Creators
  async getCreators() {
    return this.request<{ creators: any[] }>('/creators');
  }

  async getCreator(id: string) {
    return this.request<any>(`/creators/${id}`);
  }

  async becomeCreator(data: { bio?: string; payoutAddress: string }) {
    return this.request<any>('/creators/become', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCreatorEarnings(id: string) {
    return this.request<any>(`/creators/${id}/earnings`);
  }

  // Sessions
  async startSession(data: {
    videoId: string;
    venueId: string;
    accessMethod: 'NFC' | 'QR' | 'LINK' | 'APP';
    platform?: string;
    browser?: string;
    hasMotion?: boolean;
    hasHaptics?: boolean;
    hasTTS?: boolean;
  }) {
    return this.request<any>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSession(id: string, data: { completionPercent: number; completed?: boolean }) {
    return this.request<any>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async endSession(id: string, completionPercent: number) {
    return this.request<any>(`/sessions/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({ completionPercent }),
    });
  }

  // Tokens
  async getTokenConfig() {
    return this.request<any>('/tokens/config');
  }

  async getTokenBalance(address: string) {
    return this.request<any>(`/tokens/balance/${address}`);
  }

  async claimRewards() {
    return this.request<any>('/tokens/claim', { method: 'POST' });
  }

  // Uploads
  async getDirectUploadUrl(videoId: string, maxDurationSeconds?: number) {
    return this.request<{ uploadURL: string; uid: string }>('/uploads/direct', {
      method: 'POST',
      body: JSON.stringify({ videoId, maxDurationSeconds }),
    });
  }

  async getUploadStatus(uid: string) {
    return this.request<any>(`/uploads/status/${uid}`);
  }

  // Analytics
  async getVenueAnalytics(venueId: string, period?: 'day' | 'week' | 'month' | 'year') {
    const query = period ? `?period=${period}` : '';
    return this.request<any>(`/analytics/venue/${venueId}${query}`);
  }

  async getCreatorAnalytics(creatorId: string) {
    return this.request<any>(`/analytics/creator/${creatorId}`);
  }

  async getVideoAnalytics(videoId: string) {
    return this.request<any>(`/analytics/video/${videoId}`);
  }

  // Translation
  async translateOverlay(overlayId: string, targetLanguages: string[]) {
    return this.request<any>('/translate/overlay', {
      method: 'POST',
      body: JSON.stringify({ overlayId, targetLanguages }),
    });
  }

  async translateAllOverlays(videoId: string, targetLanguages: string[]) {
    return this.request<any>('/translate/video', {
      method: 'POST',
      body: JSON.stringify({ videoId, targetLanguages }),
    });
  }
}

export const api = new ApiClient();
