import { useState } from "react";
import { api } from "../../../lib/api";
import { Image as ImageIcon, Send, X } from "lucide-react";
import styles from "./CreatePost.module.css";

interface CreatePostProps {
  currentUser: string | null;
  currentUserAvatar?: string | null;
  onPostCreated: () => void;
}

export const CreatePost = ({
  currentUser,
  currentUserAvatar,
  onPostCreated,
}: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await api.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedImageUrl = uploadRes.data.imageUrl;
      }

      await api.post("/posts", { content, imageUrl: uploadedImageUrl });
      setContent("");
      removeImage();
      onPostCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to publish post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <div className={styles.composerTop}>
        <div className={styles.avatarInitial}>
          {currentUserAvatar ? (
            <img src={currentUserAvatar} alt="Avatar" className={styles.avatarImg} />
          ) : currentUser ? (
            currentUser.slice(0, 1).toUpperCase()
          ) : (
            "G"
          )}
        </div>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What is happening?!"
          rows={3}
        />
      </div>

      {previewUrl && (
        <div className={styles.previewContainer}>
          <img src={previewUrl} alt="Upload preview" className={styles.previewImg} />
          <button type="button" onClick={removeImage} className={styles.removeImgBtn}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.composerBottom}>
        <label className={styles.addImageBtn}>
          <ImageIcon size={18} />
          <span>{imageFile ? "Image Attached" : "Add Image"}</span>
          <input
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleImageChange}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className={styles.publishBtn}
        >
          <Send size={15} />
          <span>{loading ? "Publishing..." : "Publish"}</span>
        </button>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}
    </form>
  );
};