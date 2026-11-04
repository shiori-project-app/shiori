import { cx } from '@/utils/classNames';

export const Toast = ({ message, visible }) => (
  <div className={cx('toast', visible && 'is-visible')} role="status" aria-live="polite">
    {message}
  </div>
);
