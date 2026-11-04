import { Icon } from '@/components/common/Icon';

export const PictureInPictureNote = ({ onReturn }) => (
  <div className="player__pip">
    <Icon name="pip" />
    <p>Playing in picture-in-picture</p>

    <button type="button" className="btn btn--sm player__pip-return" onClick={onReturn}>
      Bring it back
    </button>
  </div>
);
