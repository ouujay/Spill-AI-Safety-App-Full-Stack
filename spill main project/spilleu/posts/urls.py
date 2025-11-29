# posts/urls.py

from django.urls import path
from .views import (
    CreatePostView,
    CreateReplyView,
    FeedView,
    GlobalSearchView,
    HashtagPostsView,
    MarkPostSeenView,
    PostDetailView,
    PostRepliesView,
    RemoveVoteReactionView,
    SavePostView,
    BatchActionsView,
    SavedPostsListView,
    VoteReactionView,
    FlagVoteView,  # NEW
    RemoveFlagVoteView,  # NEW
    ReportPostView,
    UniversityPostsView,
    UserPostsView,
    cloudinary_signature,
)

urlpatterns = [
    # Posts
    path("create/", CreatePostView.as_view(), name="create-post"),
    path("posts/<int:post_id>/", PostDetailView.as_view(), name="post-detail"),
    path("posts/<int:post_id>/replies/", PostRepliesView.as_view(), name="post-replies"),
    path("<int:post_id>/", PostDetailView.as_view(), name="post-detail"),
    path("<int:post_id>/replies/", PostRepliesView.as_view(), name="post-replies"),

    # FIXED: Reply creation - moved up and removed extra 'posts/' prefix
    path("<int:post_id>/reply/", CreateReplyView.as_view(), name="create-reply"),

    # Voting Systems
    # Like system (Tea posts and comments)
    path("react/<int:post_id>/", VoteReactionView.as_view(), name="vote-reaction"),
    path("react/<int:post_id>/remove/", RemoveVoteReactionView.as_view(), name="remove-vote-reaction"),
    
    # Flag voting system (Red/Green posts)
    path("flagvote/<int:post_id>/", FlagVoteView.as_view(), name="flag-vote"),
    path("flagvote/<int:post_id>/remove/", RemoveFlagVoteView.as_view(), name="remove-flag-vote"),

    # Views / Impressions
    path("seen/post/", MarkPostSeenView.as_view(), name="mark-post-seen"),

    # Feed with person search
    path("feed/", FeedView.as_view(), name="feed"),
    
    # Batch actions (updated for new voting system)
    path("batch/", BatchActionsView.as_view(), name="batch"),

    # Saved posts
    path("save/", SavePostView.as_view(), name="save-post"),
    path("saved/", SavedPostsListView.as_view(), name="saved-posts-list"),

    # Reports
    path("report/", ReportPostView.as_view(), name="report-post"),
    path("users/me/posts/", UserPostsView.as_view(), name="current-user-posts"),
    # Discovery
    path("hashtags/<str:name>/posts/", HashtagPostsView.as_view(), name="hashtag-posts"),
    path("universities/<int:university_id>/posts/", UniversityPostsView.as_view(), name="university-posts"),
    path("users/<int:user_id>/posts/", UserPostsView.as_view(), name="user-posts"),
    
    # Cloudinary
    path("uploads/signature/", cloudinary_signature, name="cloudinary-sign"),

    # Search (posts | people | universities | hashtags)
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    
]