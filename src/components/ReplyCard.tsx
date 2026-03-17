import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import InitialAvatar from "@/components/InitialAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Reply {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
  authorId: string;
}

interface ReplyCardProps {
  reply: Reply;
  currentUserId: string | null;
  onEdit: (id: string, newBody: string) => void;
  onDelete: (id: string) => void;
}

const ReplyCard = ({ reply, currentUserId, onEdit, onDelete }: ReplyCardProps) => {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);

  const isAuthor = reply.authorId === currentUserId;

  const handleSave = () => {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    onEdit(reply.id, trimmed);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditBody(reply.body);
    setEditing(false);
  };

  return (
    <div className="flex gap-3 py-4 border-b last:border-b-0">
      <InitialAvatar name={reply.authorName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{reply.authorName}</span>
          <span className="text-muted-foreground">
            {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
          </span>
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value.slice(0, 5000))}
              rows={4}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{reply.body}</p>
        )}

        {isAuthor && !editing && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(reply.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplyCard;
