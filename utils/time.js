export function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now - date) / 1000);

  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "w", seconds: 604800 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
    { label: "s", seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(secondsAgo / interval.seconds);
    if (count >= 1) {
      return `${count}${interval.label}`;
    }
  }

  return "just now";
}
