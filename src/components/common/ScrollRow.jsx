import { Icon } from '@/components/common/Icon';
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll';
import { cx } from '@/utils/classNames';

const ScrollArrow = ({ side, onClick }) => (
  <div className={`scroll-row__edge scroll-row__edge--${side}`}>
    <button
      type="button"
      className="scroll-row__arrow"
      aria-label={side === 'start' ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
    >
      <Icon name={side === 'start' ? 'left' : 'right'} />
    </button>
  </div>
);

export const ScrollRow = ({ className, children, ...trackProps }) => {
  const { trackRef, hiddenContent, scrollByPage } = useHorizontalScroll();

  return (
    <div className={cx('scroll-row', hiddenContent.before && 'has-more-start', hiddenContent.after && 'has-more-end')}>
      <div className={cx('scroll-row__track', className)} ref={trackRef} {...trackProps}>
        {children}
      </div>

      {hiddenContent.before && <ScrollArrow side="start" onClick={() => scrollByPage(-1)} />}
      {hiddenContent.after && <ScrollArrow side="end" onClick={() => scrollByPage(1)} />}
    </div>
  );
};
