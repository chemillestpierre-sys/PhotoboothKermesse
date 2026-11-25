import {useCallback, useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');

    const checkIsInstalled = () =>
      standaloneMedia.matches ||
      fullscreenMedia.matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone ===
        true;

    setIsInstalled(checkIsInstalled());

    const handleDisplayModeChange = () => {
      setIsInstalled(checkIsInstalled());
    };

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    standaloneMedia.addEventListener('change', handleDisplayModeChange);
    fullscreenMedia.addEventListener('change', handleDisplayModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneMedia.removeEventListener('change', handleDisplayModeChange);
      fullscreenMedia.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOfflineReady() {
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkReadiness = useCallback(async () => {
    setChecking(true);
    try {
      if (!('serviceWorker' in navigator)) {
        setIsOfflineReady(false);
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      const hasActiveSW = Boolean(
        navigator.serviceWorker.controller ||
          registration?.active?.state === 'activated',
      );

      if (!hasActiveSW) {
        setIsOfflineReady(false);
        return;
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        if (cacheNames.length === 0) {
          setIsOfflineReady(false);
          return;
        }
        let totalCached = 0;
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          totalCached += keys.length;
          if (totalCached > 0) break;
        }
        setIsOfflineReady(totalCached > 0);
      } else {
        setIsOfflineReady(hasActiveSW);
      }
    } catch {
      setIsOfflineReady(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkReadiness();

    if (!('serviceWorker' in navigator)) return;
    const handleControllerChange = () => {
      void checkReadiness();
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, [checkReadiness]);

  return {isOfflineReady, checking, refresh: checkReadiness};
}
