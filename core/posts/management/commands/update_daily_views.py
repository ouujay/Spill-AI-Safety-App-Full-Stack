from django.core.management.base import BaseCommand
from django.db.models import Min
from django.utils import timezone
from datetime import timedelta, date

from posts.models import SeenPost, SeenReply, PostViewDaily, ReplyViewDaily

class Command(BaseCommand):
    help = "Backfill or rebuild PostViewDaily / ReplyViewDaily from SeenPost / SeenReply"

    def add_arguments(self, parser):
        parser.add_argument("--since-days", type=int, default=30, help="Only backfill last N days (default 30).")

    def handle(self, *args, **opts):
        since_days = opts["since_days"]
        cutoff = timezone.now().date() - timedelta(days=since_days)
        self.stdout.write(self.style.NOTICE(f"Backfilling daily views since {cutoff} ..."))

        # Post
        PostViewDaily.objects.filter(day__gte=cutoff).delete()
        qs = (SeenPost.objects
              .filter(seen_at__date__gte=cutoff)
              .values("post_id", "seen_at__date")
              .distinct())
        bulk = {}
        for row in qs:
            key = (row["post_id"], row["seen_at__date"])
            bulk[key] = bulk.get(key, 0) + 1
        objs = [PostViewDaily(post_id=pid, day=dy, unique_count=count) for (pid, dy), count in bulk.items()]
        PostViewDaily.objects.bulk_create(objs, ignore_conflicts=True)

        # Reply
        ReplyViewDaily.objects.filter(day__gte=cutoff).delete()
        qs = (SeenReply.objects
              .filter(seen_at__date__gte=cutoff)
              .values("reply_id", "seen_at__date")
              .distinct())
        bulk = {}
        for row in qs:
            key = (row["reply_id"], row["seen_at__date"])
            bulk[key] = bulk.get(key, 0) + 1
        objs = [ReplyViewDaily(reply_id=rid, day=dy, unique_count=count) for (rid, dy), count in bulk.items()]
        ReplyViewDaily.objects.bulk_create(objs, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS("Daily views upsert complete."))
