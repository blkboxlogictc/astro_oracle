// Thin wrapper around the Webpushr global injected by the CDN script tag.
// The script is loaded via index.html — window.webpushr is available on all pages.

function wp(action: string, options?: Record<string, unknown>) {
  (window as any).webpushr?.(action, options);
}

export function requestPushPermission(): Promise<string> {
  return new Promise((resolve, reject) => {
    wp('subscribe', {
      onSuccess: (token: string) => resolve(token),
      onFailure: () => reject(new Error('Push permission denied')),
    });
  });
}

export function identifyUser(userId: string) {
  wp('identify', { uid: userId });
}

export function addToSegment(segmentName: string) {
  wp('addSegment', { name: segmentName });
}

export function removeFromSegment(segmentName: string) {
  wp('removeSegment', { name: segmentName });
}
