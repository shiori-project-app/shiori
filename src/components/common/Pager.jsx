import { Fragment, memo } from 'react';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/utils/classNames';
import { lastReachablePage, visiblePageNumbers } from '@/utils/pagination';

const PageButtons = ({ pageInfo, onChange }) => {
  const currentPage = pageInfo.currentPage;
  const lastPage = lastReachablePage(pageInfo);

  if (lastPage <= 1 && currentPage <= 1) return null;

  const pageNumbers = visiblePageNumbers(currentPage, lastPage);

  const followsGap = (pageNumber, index) => pageNumber - (pageNumbers[index - 1] ?? 0) > 1;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="pager__btn"
        disabled={currentPage <= 1}
        aria-label="Previous page"
        onClick={() => onChange(currentPage - 1)}
      >
        <Icon name="left" />
      </button>

      {pageNumbers.map((pageNumber, index) => (
        <Fragment key={pageNumber}>
          {followsGap(pageNumber, index) && <span className="pager__gap">…</span>}

          <button
            type="button"
            className={cx('pager__btn', pageNumber === currentPage && 'is-active')}
            aria-current={pageNumber === currentPage ? 'page' : undefined}
            aria-label={`Page ${pageNumber}`}
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </button>
        </Fragment>
      ))}

      <button
        type="button"
        className="pager__btn"
        disabled={currentPage >= lastPage}
        aria-label="Next page"
        onClick={() => onChange(currentPage + 1)}
      >
        <Icon name="right" />
      </button>
    </nav>
  );
};

export const Pager = memo(PageButtons);
