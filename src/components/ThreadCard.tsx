import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ThreadCardProps {
  thread: {
    id: string;
    title: string;
    authorName: string;
    replyCount: number;
    lastReplyAt: Date;
    createdAt: Date;
    categorySlug: string;
  };
}

const ThreadCard = ({ thread }: ThreadCardProps) => (
  <Link to={`/forum/${thread.categorySlug}/${thread.id}`} className="block group">
    <div className="p-4 rounded-xl border border-border/50 bg-card transition-all duration-200 group-hover:border-primary/30 group-hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="font-display font-semibold group-hover:text-primary transition-colors truncate">
            {thread.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            by {thread.authorName} · {formatDistanceToNow(thread.createdAt, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
          <MessageSquare className="w-4 h-4" />
          <span>{thread.replyCount}</span>
        </div>
      </div>
    </div>
  </Link>
);

export default ThreadCard;
