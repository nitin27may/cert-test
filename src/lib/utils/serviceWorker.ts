/**
 * Service Worker Registration Utility
 * 
 * Handles service worker registration, updates, and lifecycle management
 */

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private updateFound = false;

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', this.registration);

      // Handle updates
      this.setupUpdateHandling();

      // Handle controller change (new service worker takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
        window.location.reload();
      });

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Setup update handling
   */
  private setupUpdateHandling(): void {
    if (!this.registration) return;

    // Check for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('Service Worker update found');
      this.updateFound = true;
    });

    // Handle new service worker installation
    this.registration.addEventListener('installing', (event) => {
      const newWorker = event.target as ServiceWorker;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New service worker installed and waiting');
          this.showUpdateNotification();
        }
      });
    });
  }

  /**
   * Show update notification to user
   */
  private showUpdateNotification(): void {
    if (!this.updateFound) return;

    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <span>New version available!</span>
        <button 
          onclick="window.location.reload()" 
          class="bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
        >
          Update
        </button>
        <button 
          onclick="this.parentElement.parentElement.remove()" 
          class="text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Check if service worker is ready
   */
  async isReady(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      await navigator.serviceWorker.ready;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const unregistered = await this.registration.unregister();
      if (unregistered) {
        this.registration = null;
        console.log('Service Worker unregistered');
      }
      return unregistered;
    } catch (error) {
      console.error('Failed to unregister Service Worker:', error);
      return false;
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: any): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Request background sync
   */
  async requestBackgroundSync(tag: string): Promise<boolean> {
    if (!this.registration || !('sync' in this.registration)) {
      console.log('Background Sync not supported');
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('Background sync requested:', tag);
      return true;
    } catch (error) {
      console.error('Failed to request background sync:', error);
      return false;
    }
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Add online/offline event listeners
   */
  setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.onNetworkRestored();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      this.onNetworkLost();
    });
  }

  /**
   * Handle network restoration
   */
  private async onNetworkRestored(): Promise<void> {
    // Request background sync for any pending offline data
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.registration.sync.register('exam-sync');
        console.log('Background sync requested after network restoration');
      } catch (error) {
        console.error('Failed to request background sync after network restoration:', error);
      }
    }
  }

  /**
   * Handle network loss
   */
  private onNetworkLost(): void {
    console.log('Working offline - data will be queued for sync');
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Auto-register service worker when module is imported
if (typeof window !== 'undefined') {
  serviceWorkerManager.register().then(() => {
    serviceWorkerManager.setupNetworkListeners();
  });
}
