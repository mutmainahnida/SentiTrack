interface MaterialIconProps {
  name: string;
  className?: string;
  filled?: number;
}

export default function MaterialIcon({ name, className = "", filled }: MaterialIconProps) {
  const style = filled
    ? { fontVariationSettings: `'FILL' ${filled}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }
    : {};
  return (
    <span className={`material-symbols-outlined ${className}`} style={style}>
      {name}
    </span>
  );
}