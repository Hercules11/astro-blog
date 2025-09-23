import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './LikeButton.css';

const LikeButton = ({ postId = 'default' }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // 从 localStorage 读取点赞状态
  useEffect(() => {
    const storedLikes = localStorage.getItem(`likes_${postId}`);
    const hasLiked = localStorage.getItem(`liked_${postId}`);

    if (storedLikes) {
      setLikes(parseInt(storedLikes, 10));
    }
    if (hasLiked === 'true') {
      setLiked(true);
    }
  }, [postId]);

  const handleLike = () => {
    setIsAnimating(true);

    if (liked) {
      // 取消点赞
      setLiked(false);
      setLikes(prev => {
        const newLikes = Math.max(0, prev - 1);
        localStorage.setItem(`likes_${postId}`, newLikes.toString());
        localStorage.setItem(`liked_${postId}`, 'false');
        return newLikes;
      });
    } else {
      // 点赞
      setLiked(true);
      setLikes(prev => {
        const newLikes = prev + 1;
        localStorage.setItem(`likes_${postId}`, newLikes.toString());
        localStorage.setItem(`liked_${postId}`, 'true');
        return newLikes;
      });
    }

    // 重置动画状态
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div class="like-button-container">
      <button
        onClick={handleLike}
        class={`like-button ${liked ? 'liked' : ''} ${isAnimating ? 'animating' : ''}`}
        aria-label={liked ? 'Unlike this post' : 'Like this post'}
        aria-pressed={liked}
      >
        <svg
          class="thumb-icon"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span class="like-count">{likes}</span>
      </button>
      {liked && (
        <div class="sparkles">
          <span class="sparkle">✨</span>
          <span class="sparkle">💫</span>
          <span class="sparkle">⭐</span>
        </div>
      )}
    </div>
  );
};

export default LikeButton;