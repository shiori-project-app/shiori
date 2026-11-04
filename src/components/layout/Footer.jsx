import { ANILIST_SITE_URL, JIKAN_SITE_URL } from '@/config/api.config';

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export const Footer = () => (
  <p className="footer">
    Titles, scores, studios, genres, synopses, artwork and air dates are loaded live from{' '}
    <ExternalLink href={ANILIST_SITE_URL}>AniList</ExternalLink>, with episode names from AniList and{' '}
    <ExternalLink href={JIKAN_SITE_URL}>Jikan</ExternalLink> (MyAnimeList). Episodes play from your own download folder.
  </p>
);
