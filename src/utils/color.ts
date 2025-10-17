// Random color generation for cursors - optimized for maximum visual distinction
export const CURSOR_COLORS = [
  "#FF6B6B", // Bright Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#F8C471", // Orange
  "#BB8FCE", // Light Purple
  "#F1948A", // Light Red
  "#87CEEB", // Sky Blue
  "#D7BDE2", // Light Purple
  "#FFA07A", // Light Salmon
  "#20B2AA", // Light Sea Green
  "#F0E68C", // Khaki
  "#FFB6C1", // Light Pink
  "#32CD32", // Lime Green
  "#FF4500", // Orange Red
  "#8A2BE2", // Blue Violet
  "#DC143C", // Crimson
  "#00CED1", // Dark Turquoise
  "#FFD700", // Gold
  "#8B008B", // Dark Magenta
  "#228B22", // Forest Green
  "#B22222", // Fire Brick
  "#4169E1", // Royal Blue
];

// Generate a random color for a user
export function generateUserColor(userId: string): string {
  // Use a more robust hash function with multiple rounds for better distribution
  let hash = 0;

  // First pass: djb2 hash algorithm
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) + hash + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Second pass: add additional entropy
  let secondaryHash = 0;
  for (let i = userId.length - 1; i >= 0; i--) {
    secondaryHash = (secondaryHash << 3) + secondaryHash + userId.charCodeAt(i);
    secondaryHash = secondaryHash & secondaryHash;
  }

  // Combine both hashes with some additional mixing
  const combinedHash = Math.abs(hash ^ secondaryHash);
  const finalHash =
    combinedHash + userId.length * 31 + userId.charCodeAt(0) * 17;

  // Use a more sophisticated distribution to avoid clustering
  // Multiply by a large prime to spread out the distribution
  const distributedHash = finalHash * 2654435761; // Large prime number
  const colorIndex = Math.abs(distributedHash) % CURSOR_COLORS.length;

  return CURSOR_COLORS[colorIndex];
}
