// Coordination between the background polling sync and active UI interactions.
// While the user is dragging a seat or a local write is in flight, we defer
// applying a remote refresh so it can't clobber an in-progress edit or revert
// an optimistic update that hasn't been persisted yet.
export const syncLock = {
  dragging: false,
  pendingWrites: 0,
};

export function beginWrite() {
  syncLock.pendingWrites++;
}

export function endWrite() {
  syncLock.pendingWrites = Math.max(0, syncLock.pendingWrites - 1);
}

export function setDragging(active: boolean) {
  syncLock.dragging = active;
}

export function shouldDeferSync() {
  return syncLock.dragging || syncLock.pendingWrites > 0;
}
