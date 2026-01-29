/**
 * Platform-detecting directions URL builder.
 * Opens Apple Maps on iOS, Google Maps on everything else.
 */

/**
 * Detect if the user is on an iOS device
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Get a directions URL that opens the appropriate native maps app.
 * On iOS: opens Apple Maps
 * On Android/Desktop: opens Google Maps
 */
export function getDirectionsUrl(lat: number, lng: number): string {
  if (isIOS()) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}
