/** Symbole NadlanHub : un N dont les deux contre-formes sont des débattements de porte. Jamais inversé en RTL. */
export const N_PATH = "M0 0H64V64H0Z M48 0V28A28 28 0 0 1 20 0Z M16 64V36A28 28 0 0 1 44 64Z";
export const DOOR_PATH = "M16 64V36A28 28 0 0 1 44 64Z";

export function Mark({ size = 16, color = "currentColor", door = "var(--signal)" }: { size?: number; color?: string; door?: string | null }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0 }}>
      <path fillRule="evenodd" fill={color} d={N_PATH} />
      {door && <path fill={door} d={DOOR_PATH} />}
    </svg>
  );
}

/** Logo complet : fichiers vectorisés de la charte (le mot-symbole n'est pas du texte). */
export const Logo = ({ height = 24, onDark = false }: { height?: number; onDark?: boolean }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={onDark ? "/brand/nadlanhub-logo-sur-sombre.svg" : "/brand/nadlanhub-logo.svg"} alt="NadlanHub" height={height} style={{ height, width: "auto", display: "block" }} />
);
