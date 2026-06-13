import Image from "next/image";
import { ExternalLink, Newspaper } from "lucide-react";
import { Badge, Card } from "./ui";
import { timeAgo } from "@/lib/utils";

export function NewsCard({
  news,
}: {
  news: {
    title: string;
    source: string;
    url: string | null;
    summary: string;
    imageUrl: string | null;
    category: string;
    publishedAt: Date;
  };
}) {
  const url = news.url?.trim();
  const hasUrl = Boolean(url);
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative h-40 w-full bg-muted">
        {news.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={news.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Newspaper className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3">
          <Badge className="bg-black/60 text-white">{news.category}</Badge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {hasUrl ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="group">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
              {news.title}
            </h3>
          </a>
        ) : (
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{news.title}</h3>
        )}
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{news.summary}</p>
        <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
          <span className="font-medium">{news.source}</span>
          <span>{timeAgo(news.publishedAt)}</span>
        </div>
        {hasUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Baca di sumber asli <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Sumber tidak tersedia
          </span>
        )}
      </div>
    </Card>
  );
}
