import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import type { Post, UserProfile } from "../../posts/types/types";
import { PostCard } from "../../posts/components/PostCard";
import { EditProfileModal } from "./EditProfileModal";
import { ArrowLeft, Calendar } from "lucide-react";
import styles from "./ProfileView.module.css";

interface ProfileViewProps {
  username: string;
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onBack: () => void;
  onRequireLogin: () => void;
  onOpenProfile?: (username: string) => void;
  onProfileUpdated?: () => void;
}

export const ProfileView = ({
  username,
  currentUser,
  currentUserAvatar,
  onBack,
  onRequireLogin,
  onOpenProfile,
  onProfileUpdated,
}: ProfileViewProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${username}`);
      setProfile(res.data.profile);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (!profile || followLoading) return;

    setFollowLoading(true);
    const wasFollowing = profile.isFollowing;

    // Optimistic update
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: !wasFollowing,
            followersCount: wasFollowing
              ? Math.max(0, prev.followersCount - 1)
              : prev.followersCount + 1,
          }
        : null
    );

    try {
      if (wasFollowing) {
        await api.delete(`/users/${username}/follow`);
      } else {
        await api.post(`/users/${username}/follow`);
      }
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
      // Revert optimistic update
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: wasFollowing,
              followersCount: wasFollowing
                ? prev.followersCount + 1
                : Math.max(0, prev.followersCount - 1),
            }
          : null
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const formattedJoinDate = profile
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.statusMessage}>Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <span className={styles.topBarUsername}>Profile</span>
        </div>
        <div className={styles.statusMessage}>User not found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sticky top bar */}
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack} title="Back to Timeline">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.topBarInfo}>
          <span className={styles.topBarUsername}>{profile.username}</span>
          <span className={styles.topBarPostCount}>{posts.length} Posts</span>
        </div>
      </div>

      {/* Banner */}
      <div className={styles.banner} />

      {/* Profile Details Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt={profile.username}
                className={styles.avatarImg}
              />
            ) : (
              profile.username.slice(0, 1).toUpperCase()
            )}
          </div>

          <div>
            {profile.isSelf ? (
              <button
                type="button"
                className={`${styles.actionButton} ${styles.editProfileBtn}`}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`${styles.actionButton} ${
                  profile.isFollowing ? styles.followingBtn : styles.followBtn
                }`}
              >
                {profile.isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        <div className={styles.namesRow}>
          <h2 className={styles.displayName}>{profile.username}</h2>
          {profile.isGuestSandbox && <span className={styles.guestBadge}>Guest</span>}
        </div>
        <div className={styles.handle}>@{profile.username}</div>

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        <div className={styles.metaRow}>
          <Calendar size={15} />
          <span>Joined {formattedJoinDate}</span>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{profile.followingCount}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{profile.followersCount}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
        </div>
      </div>

      {/* User Posts Timeline */}
      <div>
        <span className={styles.timelineTitle}>Posts</span>
        {posts.length === 0 ? (
          <div className={styles.statusMessage}>No posts yet.</div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              currentUserAvatar={currentUserAvatar}
              onRequireLogin={onRequireLogin}
              onPostUpdated={fetchProfile}
              onOpenProfile={onOpenProfile}
            />
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <EditProfileModal
          initialBio={profile.bio}
          initialProfilePictureUrl={profile.profilePictureUrl}
          username={profile.username}
          onClose={() => setIsEditing(false)}
          onProfileUpdated={(updated) => {
            setProfile((prev) => (prev ? { ...prev, ...updated } : null));
            onProfileUpdated?.();
          }}
        />
      )}
    </div>
  );
};

