const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.webm', '.m4v', '.mov'];

export const isVideoFileName = (fileName) =>
  VIDEO_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
