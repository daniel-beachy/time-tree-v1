import { useEffect, useState } from 'react';
import { GROUP_COLORS, GROUP_ICONS, type Species } from '../lib/data';
import { wikiSummary, wikiTitleFromUrl } from '../lib/live';

/** Species photo from iNaturalist, falling back to Wikipedia, falling back to a group icon. */
export function SpeciesPhoto({ sp, size, round, className }: { sp: Species; size?: number; round?: boolean; className?: string }) {
  const [src, setSrc] = useState<string | null>(sp.photo);
  const [credit, setCredit] = useState<string | null>(sp.photoCredit);
  useEffect(() => {
    setSrc(sp.photo);
    setCredit(sp.photoCredit);
    if (sp.photo) return;
    let live = true;
    wikiSummary(wikiTitleFromUrl(sp.wiki) || sp.sci).then((w) => {
      if (live && w?.thumbnail) { setSrc(w.thumbnail.source); setCredit('Wikipedia'); }
    });
    return () => { live = false; };
  }, [sp]);
  const style = { width: size, height: size, borderRadius: round ? '50%' : undefined, '--c': GROUP_COLORS[sp.group] || GROUP_COLORS.other } as React.CSSProperties;
  return (
    <div className={'sp-photo ' + (className || '')} style={style} title={credit ? `Photo: ${credit}` : undefined}>
      {src ? <img src={src} alt={sp.name} loading="lazy" onError={() => setSrc(null)} /> : <span className="sp-photo-icon">{GROUP_ICONS[sp.group] || '✨'}</span>}
    </div>
  );
}
