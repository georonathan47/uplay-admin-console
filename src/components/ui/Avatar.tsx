interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

/**
 * Falls back to an initial when a profile has no avatar — most UPlay profiles
 * don't, so this is the common case rather than the exception.
 */
export function Avatar({ name, url, size = 40 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0 bg-dark-800"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-secondary-400 to-secondary-600 text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}
