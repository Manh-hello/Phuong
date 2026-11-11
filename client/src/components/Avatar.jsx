export default function Avatar({ name = '?', url, size = 36 }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return url
    ? <img className="avatar" src={url} alt={name} style={{ width: size, height: size }} />
    : <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 55% 38%)` }}>{initials}</span>;
}
