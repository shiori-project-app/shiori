import { Link } from 'react-router';
import { APP_NAME } from '@/config/app.config';
import { ROUTES } from '@/constants/routes';

const BOOKMARK_PATH =
  'M8.5 2.5h15a1.5 1.5 0 0 1 1.5 1.5v24.6a.7.7 0 0 1-1.1.57L16 23.5l-7.9 5.67A.7.7 0 0 1 7 28.6V4a1.5 1.5 0 0 1 1.5-1.5z';

const TORII_GATE_PATH =
  'M9.5 7.2C12 8 20 8 22.5 7.2l-.4 1.7c-2.6.6-9.6.6-12.2 0zM10.6 11h10.8v1.2H10.6zM15.4 9.3h1.2V11h-1.2zM12.3 9.2h1.5l-.2 8.3h-1.7zM18.2 9.2h1.5l.4 8.3h-1.7z';

export const Logo = () => (
  <Link className="logo" to={ROUTES.home} aria-label={`${APP_NAME} home`}>
    <svg viewBox="6 2 20 28" aria-hidden="true">
      <path className="logo__ribbon" d={BOOKMARK_PATH} />
      <path className="logo__torii" d={TORII_GATE_PATH} />
    </svg>

    <span>{APP_NAME.toUpperCase()}</span>
  </Link>
);
