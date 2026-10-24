// Perception layer. The guided room check (tap what you see) is the base; the photo scan is layered on top
// and falls back to it on any failure. Neither writes advice: the knowledge base does.
export { cuesForRoom, findingsFromTaps, findingsToTasks, verifyFix, type RoomCue } from "./guided";
export { CUE_ICON } from "./cueIcons";
export { DetectError, type DetectFailure, type PerceptionProvider } from "./provider";
export { HostedProvider, providerStatus, type ProviderName, type ProviderStatus } from "./hosted";
export { stripAndResize, fitSize } from "./exif";
export { assessCanvas, assessPixels, type QualityIssue } from "./quality";
export { hasFace, faceDetectorAvailable } from "./faces";
