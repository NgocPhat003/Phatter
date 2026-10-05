import { useState } from "react";
import { api } from "../../../lib/api";
import { X, Camera } from "lucide-react";
import styles from "./EditProfileModal.module.css";

interface EditProfileModalProps {
  initialBio: string | null;
  initialProfilePictureUrl: string | null;
  username: string;
  onClose: () => void;
  onProfileUpdated: (updated: { bio: string | null; profilePictureUrl: string | null }) => void;
}

export const EditProfileModal = ({
  initialBio,
  initialProfilePictureUrl,
  username,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) => {
  const [bio, setBio] = useState(initialBio || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProfilePictureUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let finalAvatarUrl = initialProfilePictureUrl;

      // If user uploaded a new image file, upload to Cloudinary via /uploads
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await api.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalAvatarUrl = uploadRes.data.imageUrl;
      }

      const res = await api.patch("/users/me", {
        bio: bio.trim() || null,
        profilePictureUrl: finalAvatarUrl,
      });

      onProfileUpdated({
        bio: res.data.user?.bio ?? bio.trim() ?? null,
        profilePictureUrl: res.data.user?.profilePictureUrl ?? finalAvatarUrl,
      });
      onClose();
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.response?.data?.error || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h3 className={styles.title}>Edit Profile</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSave}>
          <div className={styles.body}>
            {/* Avatar Section */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarPreview}>
                {previewUrl ? (
                  <img src={previewUrl} alt={username} className={styles.avatarImg} />
                ) : (
                  username.slice(0, 1).toUpperCase()
                )}
              </div>
              <label className={styles.uploadBtn}>
                <Camera size={16} />
                <span>{imageFile ? "Change Image" : "Upload Picture"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className={styles.hiddenInput}
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Bio Input */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <span>Bio</span>
                <span className={styles.charCount}>{bio.length}/160</span>
              </label>
              <textarea
                className={styles.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                placeholder="Tell the realm about yourself..."
                rows={3}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
